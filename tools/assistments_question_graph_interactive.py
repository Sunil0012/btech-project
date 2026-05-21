"""
Build an interactive ASSISTments question graph.

Nodes are questions (`problem_id`). Edges are built from:
1. same-skill membership, connecting high-support questions within each skill;
2. learner sequence transitions, connecting questions attempted consecutively by
   the same learner.

The script can render a bounded browser-friendly graph or attempt an all-node
HTML export. For the ASSISTments 2012-2013 file, the full graph has roughly
179k question nodes, so the default render is intentionally capped. Every
rendered node has a visible problem_id label and a detailed hover tooltip.

Example:
    python tools/assistments_question_graph_interactive.py

All rendered nodes from all questions, with a larger cap:
    python tools/assistments_question_graph_interactive.py --max-nodes 10000

Attempt all questions in the HTML:
    python tools/assistments_question_graph_interactive.py --all-nodes
"""

from __future__ import annotations

import argparse
import html
import time
from pathlib import Path

import networkx as nx
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from pyvis.network import Network


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = ROOT / "2012-2013-data-with-predictions-4-final.csv"
DEFAULT_OUTPUT = ROOT / "paper_figures" / "assistments_question_graph_interactive.html"
DEFAULT_NODE_EXPORT = ROOT / "paper_figures" / "assistments_question_nodes.csv"
DEFAULT_EDGE_EXPORT = ROOT / "paper_figures" / "assistments_question_edges.csv"


PALETTE = [
    "#2563EB", "#E11D48", "#16A34A", "#9333EA", "#F59E0B",
    "#0891B2", "#DC2626", "#4F46E5", "#65A30D", "#0F766E",
    "#BE185D", "#7C3AED", "#EA580C", "#0284C7", "#475569",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create an interactive question graph from ASSISTments CSV.")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="Path to ASSISTments CSV.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output interactive HTML path.")
    parser.add_argument("--node-export", type=Path, default=DEFAULT_NODE_EXPORT, help="CSV export for question nodes.")
    parser.add_argument("--edge-export", type=Path, default=DEFAULT_EDGE_EXPORT, help="CSV export for graph edges.")
    parser.add_argument("--max-nodes", type=int, default=3000, help="Maximum nodes to render. Use 0 with --all-nodes for all.")
    parser.add_argument("--all-nodes", action="store_true", help="Attempt to render every question node.")
    parser.add_argument("--top-skills", type=int, default=0, help="Keep only top N skills by attempts. 0 means no skill filter.")
    parser.add_argument("--max-sequence-edges", type=int, default=12000, help="Maximum sequence edges to render/export.")
    parser.add_argument("--same-skill-neighbors", type=int, default=4, help="Same-skill neighbors connected around each question.")
    parser.add_argument("--min-attempts", type=int, default=2, help="Minimum attempts for a question to be eligible for rendering.")
    parser.add_argument("--label-top", type=int, default=350, help="Show visible labels for the top N attempted questions. Hover labels exist for all.")
    parser.add_argument("--cluster-gap", type=float, default=2400.0, help="Distance between skill cluster centers in the layout.")
    parser.add_argument("--spring-layout-limit", type=int, default=450, help="Use weighted spring layout only for skill clusters up to this size.")
    parser.add_argument("--renderer", choices=["plotly", "pyvis"], default="plotly", help="Interactive HTML renderer.")
    parser.add_argument("--physics", action="store_true", help="Enable interactive physics in the HTML.")
    return parser.parse_args()


def load_graph_frame(csv_path: Path) -> pd.DataFrame:
    cols = ["user_id", "problem_id", "skill_id", "skill", "start_time", "correct"]
    print(f"Loading graph columns from {csv_path} ...")
    df = pd.read_csv(csv_path, usecols=lambda col: col in cols)

    df = df.dropna(subset=["user_id", "problem_id", "start_time"]).copy()
    df["start_time"] = pd.to_datetime(df["start_time"], errors="coerce")
    df = df.dropna(subset=["start_time"]).copy()
    df["correct"] = pd.to_numeric(df["correct"], errors="coerce")

    df["skill_key"] = df["skill_id"].astype("string")
    if "skill" in df.columns:
        df["skill_key"] = df["skill_key"].fillna(df["skill"].astype("string"))
    df["skill_key"] = df["skill_key"].fillna("unknown")
    df["skill_key"] = df["skill_key"].astype(str).str.strip()
    df = df[
        ~df["skill_key"].str.lower().isin(["", "unknown", "nan", "none", "<na>"])
    ].copy()
    df["problem_id"] = df["problem_id"].astype(str)
    df["user_id"] = df["user_id"].astype(str)
    return df


def build_nodes(df: pd.DataFrame) -> pd.DataFrame:
    nodes = (
        df.groupby("problem_id")
        .agg(
            attempts=("correct", "size"),
            accuracy=("correct", "mean"),
            skill_key=("skill_key", lambda x: x.mode().iloc[0] if not x.mode().empty else "unknown"),
            unique_learners=("user_id", "nunique"),
        )
        .reset_index()
    )
    nodes["accuracy"] = nodes["accuracy"].fillna(nodes["accuracy"].mean())
    return nodes


def choose_render_nodes(nodes: pd.DataFrame, df: pd.DataFrame, args: argparse.Namespace) -> set[str]:
    eligible = nodes[nodes["attempts"] >= args.min_attempts].copy()

    if args.top_skills > 0:
        top_skills = df["skill_key"].value_counts().head(args.top_skills).index
        eligible = eligible[eligible["skill_key"].isin(top_skills)].copy()

    if args.all_nodes:
        return set(eligible["problem_id"])

    max_nodes = max(1, args.max_nodes)
    ranked = eligible.sort_values(["attempts", "unique_learners"], ascending=False).head(max_nodes)
    return set(ranked["problem_id"])


def build_same_skill_edges(nodes: pd.DataFrame, render_nodes: set[str], same_skill_neighbors: int) -> list[dict]:
    edges: list[dict] = []
    node_slice = nodes[nodes["problem_id"].isin(render_nodes)].copy()

    for skill_key, part in node_slice.groupby("skill_key"):
        ordered = part.sort_values("attempts", ascending=False)["problem_id"].tolist()
        for idx, source in enumerate(ordered):
            for target in ordered[idx + 1: idx + 1 + same_skill_neighbors]:
                edges.append({
                    "source": source,
                    "target": target,
                    "edge_type": "same_skill",
                    "weight": 1,
                    "skill_key": str(skill_key),
                })
    return edges


def build_sequence_edges(df: pd.DataFrame, render_nodes: set[str], max_edges: int) -> list[dict]:
    seq_df = (
        df[df["problem_id"].isin(render_nodes)]
        .sort_values(["user_id", "start_time"])[["user_id", "problem_id"]]
    )
    seq_df["next_problem"] = seq_df.groupby("user_id", sort=False)["problem_id"].shift(-1)
    seq_df = seq_df.dropna(subset=["next_problem"])
    seq_df = seq_df[seq_df["problem_id"] != seq_df["next_problem"]].copy()
    if seq_df.empty:
        return []

    left = seq_df["problem_id"].to_numpy(dtype=str)
    right = seq_df["next_problem"].to_numpy(dtype=str)
    source = np.where(left <= right, left, right)
    target = np.where(left <= right, right, left)
    edge_count_df = (
        pd.DataFrame({"source": source, "target": target})
        .value_counts(["source", "target"])
        .reset_index(name="count")
        .sort_values("count", ascending=False)
        .head(max_edges)
    )

    sequence_edges = []
    for row in edge_count_df.itertuples(index=False):
        sequence_edges.append({
            "source": row.source,
            "target": row.target,
            "edge_type": "sequence",
            "weight": int(row.count),
            "skill_key": "",
        })
    return sequence_edges


def merge_edges(edges: list[dict]) -> pd.DataFrame:
    if not edges:
        return pd.DataFrame(columns=["source", "target", "edge_type", "weight", "skill_key"])

    edge_df = pd.DataFrame(edges)
    edge_df[["source", "target"]] = np.sort(edge_df[["source", "target"]].values, axis=1)

    merged = (
        edge_df.groupby(["source", "target"])
        .agg(
            weight=("weight", "sum"),
            edge_type=("edge_type", lambda x: "+".join(sorted(set(x)))),
            skill_key=("skill_key", lambda x: next((v for v in x if v), "")),
        )
        .reset_index()
    )
    return merged


def edge_layout_weight(weight: float) -> float:
    return float(1.0 + np.log1p(max(0.0, weight)))


def edge_length(weight: float) -> float:
    # Stronger relationships should render closer together.
    return float(max(45.0, 360.0 / edge_layout_weight(weight)))


def build_clustered_positions(nodes: pd.DataFrame, edges: pd.DataFrame, args: argparse.Namespace) -> dict[str, tuple[float, float]]:
    """Create stable skill clusters, with intra-cluster distance affected by edge weight."""
    positions: dict[str, tuple[float, float]] = {}
    node_skill = nodes.set_index("problem_id")["skill_key"].astype(str).to_dict()
    skill_sizes = nodes["skill_key"].astype(str).value_counts()
    skills = skill_sizes.index.tolist()

    if not skills:
        return positions

    cols = int(np.ceil(np.sqrt(len(skills))))
    rows = int(np.ceil(len(skills) / cols))
    x_offset = -((cols - 1) * args.cluster_gap) / 2
    y_offset = -((rows - 1) * args.cluster_gap) / 2

    cluster_centers = {}
    for idx, skill in enumerate(skills):
        col = idx % cols
        row = idx // cols
        cluster_centers[skill] = (x_offset + col * args.cluster_gap, y_offset + row * args.cluster_gap)

    graph = nx.Graph()
    graph.add_nodes_from(nodes["problem_id"].astype(str))
    for row in edges.itertuples(index=False):
        graph.add_edge(
            str(row.source),
            str(row.target),
            layout_weight=edge_layout_weight(float(row.weight)),
        )

    rng = np.random.default_rng(42)
    for skill in skills:
        skill_nodes = [node for node, node_skill_key in node_skill.items() if node_skill_key == skill]
        center_x, center_y = cluster_centers[skill]

        if len(skill_nodes) == 1:
            positions[skill_nodes[0]] = (center_x, center_y)
            continue

        subgraph = graph.subgraph(skill_nodes).copy()
        cluster_radius = max(320.0, 60.0 * np.sqrt(len(skill_nodes)))

        if subgraph.number_of_edges() > 0 and len(skill_nodes) <= args.spring_layout_limit:
            local_pos = nx.spring_layout(
                subgraph,
                seed=42,
                weight="layout_weight",
                k=max(0.08, 1.0 / np.sqrt(len(skill_nodes))),
                iterations=120,
                scale=cluster_radius,
            )
            for node, (x, y) in local_pos.items():
                positions[node] = (float(center_x + x), float(center_y + y))
        else:
            # Large skill clusters use a deterministic spiral/ring layout. This
            # keeps --all-nodes generation practical while preserving skill
            # clustering. Edge length still encodes weight in the interactive HTML.
            skill_nodes = sorted(
                skill_nodes,
                key=lambda node: graph.degree(node, weight="layout_weight"),
                reverse=True,
            )
            angles = np.linspace(0, 2 * np.pi, len(skill_nodes), endpoint=False)
            jitter = rng.normal(0, 20, size=(len(skill_nodes), 2))
            for idx, node in enumerate(skill_nodes):
                ring = 1.0 + idx / max(1, len(skill_nodes) - 1)
                radius = cluster_radius * ring
                positions[node] = (
                    float(center_x + radius * np.cos(angles[idx]) + jitter[idx, 0]),
                    float(center_y + radius * np.sin(angles[idx]) + jitter[idx, 1]),
                )

    return positions


def build_network(nodes: pd.DataFrame, edges: pd.DataFrame, args: argparse.Namespace) -> Network:
    net = Network(
        height="900px",
        width="100%",
        bgcolor="#ffffff",
        font_color="#0f172a",
        notebook=False,
        cdn_resources="in_line",
    )
    net.toggle_physics(args.physics)

    skills = sorted(nodes["skill_key"].astype(str).unique())
    color_by_skill = {skill: PALETTE[idx % len(PALETTE)] for idx, skill in enumerate(skills)}
    positions = build_clustered_positions(nodes, edges, args)
    labeled_nodes = set(
        nodes.sort_values(["attempts", "unique_learners"], ascending=False)
        .head(max(0, args.label_top))["problem_id"]
        .astype(str)
    )

    max_attempts = max(1, int(nodes["attempts"].max()))
    for row in nodes.itertuples(index=False):
        problem_id = str(row.problem_id)
        skill = str(row.skill_key)
        attempts = int(row.attempts)
        accuracy = float(row.accuracy) if pd.notna(row.accuracy) else 0.0
        learners = int(row.unique_learners)

        size = 8 + 26 * np.log1p(attempts) / np.log1p(max_attempts)
        title = (
            f"<b>Question:</b> {html.escape(problem_id)}<br>"
            f"<b>Skill:</b> {html.escape(skill)}<br>"
            f"<b>Attempts:</b> {attempts:,}<br>"
            f"<b>Unique learners:</b> {learners:,}<br>"
            f"<b>Accuracy:</b> {accuracy:.3f}"
        )
        x, y = positions.get(problem_id, (None, None))
        net.add_node(
            problem_id,
            label=problem_id if problem_id in labeled_nodes else "",
            title=title,
            color=color_by_skill.get(skill, "#64748B"),
            size=float(size),
            group=skill,
            x=x,
            y=y,
            physics=bool(args.physics),
        )

    for row in edges.itertuples(index=False):
        edge_type = str(row.edge_type)
        color = "#16A34A" if "+" in edge_type else ("#2563EB" if edge_type == "sequence" else "#64748B")
        width = 0.3 + min(5.0, np.log1p(float(row.weight)))
        title = f"{html.escape(edge_type)} edge<br>weight: {int(row.weight):,}"
        net.add_edge(
            str(row.source),
            str(row.target),
            value=float(row.weight),
            width=float(width),
            color=color,
            title=title,
            length=edge_length(float(row.weight)),
        )

    net.set_options("""
    {
      "nodes": {
        "shape": "dot",
        "font": { "size": 10, "face": "arial", "strokeWidth": 4, "strokeColor": "#ffffff" },
        "borderWidth": 1
      },
      "edges": {
        "smooth": { "type": "continuous", "roundness": 0.15 },
        "color": { "inherit": false }
      },
      "interaction": {
        "hover": true,
        "tooltipDelay": 80,
        "hideEdgesOnDrag": true,
        "navigationButtons": true,
        "keyboard": true
      },
      "physics": {
        "enabled": false,
        "barnesHut": {
          "gravitationalConstant": -70000,
          "centralGravity": 0.05,
          "springConstant": 0.02,
          "damping": 0.55,
          "avoidOverlap": 0.25
        },
        "stabilization": { "iterations": 140 }
      }
    }
    """)
    return net


def build_plotly_figure(nodes: pd.DataFrame, edges: pd.DataFrame, args: argparse.Namespace) -> go.Figure:
    positions = build_clustered_positions(nodes, edges, args)
    node_lookup = nodes.set_index("problem_id").to_dict("index")

    edge_x = []
    edge_y = []
    for row in edges.itertuples(index=False):
        source = str(row.source)
        target = str(row.target)
        if source not in positions or target not in positions:
            continue
        x0, y0 = positions[source]
        x1, y1 = positions[target]
        edge_x.extend([x0, x1, None])
        edge_y.extend([y0, y1, None])

    edge_trace = go.Scattergl(
        x=edge_x,
        y=edge_y,
        mode="lines",
        line=dict(width=0.45, color="rgba(71,85,105,0.22)"),
        hoverinfo="skip",
        name="weighted edges",
    )

    skills = nodes["skill_key"].astype(str).value_counts().index.tolist()
    color_by_skill = {skill: PALETTE[idx % len(PALETTE)] for idx, skill in enumerate(skills)}
    max_attempts = max(1, int(nodes["attempts"].max()))
    traces = [edge_trace]

    for skill in skills:
        part = nodes[nodes["skill_key"].astype(str) == skill].copy()
        xs = []
        ys = []
        sizes = []
        hover = []
        for row in part.itertuples(index=False):
            problem_id = str(row.problem_id)
            if problem_id not in positions:
                continue
            x, y = positions[problem_id]
            xs.append(x)
            ys.append(y)
            sizes.append(4 + 14 * np.log1p(int(row.attempts)) / np.log1p(max_attempts))
            hover.append(
                f"<b>Question:</b> {html.escape(problem_id)}<br>"
                f"<b>Skill:</b> {html.escape(str(row.skill_key))}<br>"
                f"<b>Attempts:</b> {int(row.attempts):,}<br>"
                f"<b>Unique learners:</b> {int(row.unique_learners):,}<br>"
                f"<b>Accuracy:</b> {float(row.accuracy):.3f}"
            )

        traces.append(
            go.Scattergl(
                x=xs,
                y=ys,
                mode="markers",
                marker=dict(
                    size=sizes,
                    color=color_by_skill.get(skill, "#64748B"),
                    opacity=0.82,
                    line=dict(width=0.35, color="white"),
                ),
                text=hover,
                hoverinfo="text",
                name=f"Skill {skill}",
            )
        )

    label_part = nodes.sort_values(["attempts", "unique_learners"], ascending=False).head(max(0, args.label_top))
    label_x = []
    label_y = []
    label_text = []
    for row in label_part.itertuples(index=False):
        problem_id = str(row.problem_id)
        if problem_id not in positions:
            continue
        x, y = positions[problem_id]
        label_x.append(x)
        label_y.append(y)
        label_text.append(problem_id)

    traces.append(
        go.Scattergl(
            x=label_x,
            y=label_y,
            mode="text",
            text=label_text,
            textfont=dict(size=9, color="#0F172A"),
            hoverinfo="skip",
            showlegend=False,
        )
    )

    fig = go.Figure(data=traces)
    fig.update_layout(
        title=(
            "ASSISTments Question Graph: skill_key clusters, question nodes, "
            "weighted same-skill and sequence edges"
        ),
        width=1600,
        height=1000,
        template="plotly_white",
        hovermode="closest",
        legend=dict(itemsizing="constant", font=dict(size=9), orientation="v"),
        margin=dict(l=20, r=20, t=70, b=20),
        xaxis=dict(visible=False),
        yaxis=dict(visible=False, scaleanchor="x", scaleratio=1),
    )
    return fig


def main() -> None:
    args = parse_args()
    start = time.time()

    if args.all_nodes:
        print(
            "WARNING: --all-nodes may create a very large HTML file and can be slow "
            "or unusable in a browser for the full ASSISTments graph."
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.node_export.parent.mkdir(parents=True, exist_ok=True)
    args.edge_export.parent.mkdir(parents=True, exist_ok=True)

    df = load_graph_frame(args.csv)
    nodes_all = build_nodes(df)
    render_nodes = choose_render_nodes(nodes_all, df, args)
    nodes = nodes_all[nodes_all["problem_id"].isin(render_nodes)].copy()

    print(f"Total question nodes in dataset: {len(nodes_all):,}")
    print(f"Rendering question nodes: {len(nodes):,}")

    same_skill_edges = build_same_skill_edges(nodes_all, render_nodes, args.same_skill_neighbors)
    sequence_edges = build_sequence_edges(df, render_nodes, args.max_sequence_edges)
    edges = merge_edges(same_skill_edges + sequence_edges)

    nodes.to_csv(args.node_export, index=False)
    edges.to_csv(args.edge_export, index=False)
    print(f"Exported rendered nodes to {args.node_export}")
    print(f"Exported rendered edges to {args.edge_export}")

    graph = nx.from_pandas_edgelist(edges, source="source", target="target") if not edges.empty else nx.Graph()
    graph.add_nodes_from(nodes["problem_id"].astype(str))
    print(f"Interactive graph: {graph.number_of_nodes():,} nodes, {graph.number_of_edges():,} edges")

    if args.renderer == "plotly":
        fig = build_plotly_figure(nodes, edges, args)
        fig.write_html(str(args.output), include_plotlyjs="cdn", full_html=True)
    else:
        net = build_network(nodes, edges, args)
        html_text = net.generate_html(notebook=False)
        args.output.write_text(html_text, encoding="utf-8")
    print(f"Saved interactive graph to {args.output}")
    print(f"Completed in {time.time() - start:.2f}s")


if __name__ == "__main__":
    main()
