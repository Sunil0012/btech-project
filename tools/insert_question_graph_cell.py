import json
from pathlib import Path


NOTEBOOK = Path("DARS_ASSISTments_Comparison.ipynb")


markdown_source = [
    "## Question Knowledge Graph from ASSISTments\n",
    "\n",
    "The graph below treats each `problem_id` as a question node. Edges combine two signals: questions connected by the same skill tag, and questions that appear consecutively in a learner sequence. The visualization intentionally uses a bounded high-support subgraph so the notebook remains readable and does not attempt to draw every question in the dataset.\n",
]


code_source = r'''# QUESTION GRAPH VISUALIZATION: nodes are ASSISTments questions (problem_id)
import networkx as nx
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

graph_start = time.time()
graph_cols = ['user_id', 'problem_id', 'skill_id', 'skill', 'start_time', 'correct']
print("Loading minimal columns for question graph construction...")
graph_df = pd.read_csv(csv_path, usecols=lambda c: c in graph_cols)

graph_df = graph_df.dropna(subset=['user_id', 'problem_id', 'start_time']).copy()
graph_df['start_time'] = pd.to_datetime(graph_df['start_time'], errors='coerce')
graph_df = graph_df.dropna(subset=['start_time']).copy()
graph_df['correct'] = pd.to_numeric(graph_df['correct'], errors='coerce')

# Use skill_id when present; fall back to skill text for rows without skill_id.
graph_df['skill_key'] = graph_df['skill_id'].astype('string')
if 'skill' in graph_df.columns:
    graph_df['skill_key'] = graph_df['skill_key'].fillna(graph_df['skill'].astype('string'))
graph_df = graph_df.dropna(subset=['skill_key']).copy()

# Bound the plotted graph to the most frequent skills and most attempted questions.
MAX_SKILLS = 8
MAX_QUESTIONS_PER_SKILL = 18
MAX_SEQUENCE_EDGES = 260

top_skills = graph_df['skill_key'].value_counts().head(MAX_SKILLS).index.tolist()
skill_slice = graph_df[graph_df['skill_key'].isin(top_skills)].copy()

question_stats = (
    skill_slice.groupby(['skill_key', 'problem_id'])
    .agg(attempts=('correct', 'size'), accuracy=('correct', 'mean'))
    .reset_index()
)

selected_questions = set()
for skill_key, part in question_stats.groupby('skill_key'):
    keep = part.sort_values('attempts', ascending=False).head(MAX_QUESTIONS_PER_SKILL)
    selected_questions.update(keep['problem_id'].tolist())

plot_df = skill_slice[skill_slice['problem_id'].isin(selected_questions)].copy()
plot_stats = (
    plot_df.groupby('problem_id')
    .agg(
        attempts=('correct', 'size'),
        accuracy=('correct', 'mean'),
        skill_key=('skill_key', lambda x: x.mode().iloc[0] if not x.mode().empty else str(x.iloc[0]))
    )
    .reset_index()
)

G = nx.Graph()
for row in plot_stats.itertuples(index=False):
    G.add_node(
        str(row.problem_id),
        skill=str(row.skill_key),
        attempts=int(row.attempts),
        accuracy=float(row.accuracy) if pd.notna(row.accuracy) else np.nan,
    )

# Same-skill edges: connect high-support questions inside each skill as a chain.
for skill_key, part in plot_stats.groupby('skill_key'):
    ordered = part.sort_values('attempts', ascending=False)['problem_id'].astype(str).tolist()
    for left, right in zip(ordered, ordered[1:]):
        G.add_edge(left, right, edge_type='same_skill', weight=1.0)

# Sequential edges: connect questions that occur consecutively for the same learner.
seq_df = plot_df.sort_values(['user_id', 'start_time'])[['user_id', 'problem_id']]
edge_counts = {}
for _, user_part in seq_df.groupby('user_id', sort=False):
    problems = user_part['problem_id'].astype(str).tolist()
    for left, right in zip(problems, problems[1:]):
        if left == right:
            continue
        edge = tuple(sorted((left, right)))
        edge_counts[edge] = edge_counts.get(edge, 0) + 1

for (left, right), count in sorted(edge_counts.items(), key=lambda item: item[1], reverse=True)[:MAX_SEQUENCE_EDGES]:
    if G.has_edge(left, right):
        G[left][right]['edge_type'] = 'same_skill+sequence'
        G[left][right]['weight'] += count
    else:
        G.add_edge(left, right, edge_type='sequence', weight=count)

print(f"Question graph built in {time.time() - graph_start:.2f}s: {G.number_of_nodes():,} question nodes, {G.number_of_edges():,} edges.")

# Plot the bounded question graph.
plt.figure(figsize=(18, 13))
pos = nx.spring_layout(G, seed=42, k=0.55, weight='weight', iterations=80)

skills = sorted({data['skill'] for _, data in G.nodes(data=True)})
cmap = plt.cm.get_cmap('tab10', max(1, len(skills)))
skill_color = {skill: cmap(i % 10) for i, skill in enumerate(skills)}
node_colors = [skill_color[G.nodes[node]['skill']] for node in G.nodes()]
node_sizes = [90 + 38 * np.log1p(G.nodes[node]['attempts']) for node in G.nodes()]

same_skill_edges = [(u, v) for u, v, d in G.edges(data=True) if d.get('edge_type') == 'same_skill']
sequence_edges = [(u, v) for u, v, d in G.edges(data=True) if d.get('edge_type') == 'sequence']
mixed_edges = [(u, v) for u, v, d in G.edges(data=True) if d.get('edge_type') == 'same_skill+sequence']

nx.draw_networkx_edges(G, pos, edgelist=same_skill_edges, width=0.8, alpha=0.25, edge_color='#64748B')
nx.draw_networkx_edges(G, pos, edgelist=sequence_edges, width=0.7, alpha=0.18, edge_color='#2563EB')
nx.draw_networkx_edges(G, pos, edgelist=mixed_edges, width=1.4, alpha=0.45, edge_color='#16A34A')
nx.draw_networkx_nodes(G, pos, node_size=node_sizes, node_color=node_colors, linewidths=0.5, edgecolors='white', alpha=0.92)

# Label only the most attempted questions to keep the plot readable.
top_label_nodes = sorted(G.nodes(), key=lambda n: G.nodes[n]['attempts'], reverse=True)[:28]
labels = {node: node for node in top_label_nodes}
nx.draw_networkx_labels(G, pos, labels=labels, font_size=8, font_color='#0F172A')

legend_handles = [
    Line2D([0], [0], marker='o', color='w', label=f"Skill {skill}", markerfacecolor=skill_color[skill], markersize=9)
    for skill in skills[:10]
]
edge_handles = [
    Line2D([0], [0], color='#64748B', lw=2, label='Same-skill edge'),
    Line2D([0], [0], color='#2563EB', lw=2, label='Learner sequence edge'),
    Line2D([0], [0], color='#16A34A', lw=2, label='Both edge types'),
]
plt.legend(handles=legend_handles + edge_handles, loc='upper left', bbox_to_anchor=(1.01, 1.0), frameon=True, fontsize=9)
plt.title('ASSISTments Question Graph: Problem Nodes with Skill and Sequence Edges', fontsize=16, fontweight='bold')
plt.axis('off')
plt.tight_layout()

output_path = 'paper_figures/assistments_question_graph.png'
plt.savefig(output_path, dpi=220, bbox_inches='tight')
plt.show()
print(f"Saved graph plot to {output_path}")
'''


def make_cell(cell_type, source):
    return {
        "cell_type": cell_type,
        "metadata": {},
        "source": source if isinstance(source, list) else [line + "\n" for line in source.splitlines()],
        **({"outputs": [], "execution_count": None} if cell_type == "code" else {}),
    }


with NOTEBOOK.open("r", encoding="utf-8") as f:
    nb = json.load(f)

marker = "QUESTION GRAPH VISUALIZATION"
nb["cells"] = [
    cell for cell in nb["cells"]
    if marker not in "".join(cell.get("source", []))
    and "Question Knowledge Graph from ASSISTments" not in "".join(cell.get("source", []))
]

insert_at = 5
nb["cells"].insert(insert_at, make_cell("markdown", markdown_source))
nb["cells"].insert(insert_at + 1, make_cell("code", code_source))

with NOTEBOOK.open("w", encoding="utf-8") as f:
    json.dump(nb, f, ensure_ascii=False, indent=1)