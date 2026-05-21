from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "datasets" / "dars"
FIG_DIR = ROOT / "paper_figures"
FIG_DIR.mkdir(exist_ok=True)

metrics = pd.read_csv(DATA_DIR / "dars_all_model_metrics.csv")
bootstrap = pd.read_csv(DATA_DIR / "dars_model_metric_bootstrap_ci.csv")
route = pd.read_csv(DATA_DIR / "dars_graph_routing_metrics.csv")
remediation = pd.read_csv(DATA_DIR / "dars_remediation_metrics.csv")

model_order = ["DARS+ calibrated", "Glicko-2", "Fixed Elo K=32", "Static start", "DARS"]
palette = {
    "DARS+ calibrated": "#6d28d9",
    "DARS": "#2563eb",
    "Glicko-2": "#16a34a",
    "Fixed Elo K=32": "#f59e0b",
    "Static start": "#64748b",
}

metrics = metrics.set_index("model").loc[model_order].reset_index()

fig, axes = plt.subplots(1, 3, figsize=(14, 4.2))
for ax, col, title, higher_better in [
    (axes[0], "roc_auc", "ROC AUC", True),
    (axes[1], "brier", "Brier Score", False),
    (axes[2], "ece_10_bins", "Calibration Error", False),
]:
    bars = ax.bar(metrics["model"], metrics[col], color=[palette[m] for m in metrics["model"]])
    ax.set_title(title)
    ax.tick_params(axis="x", rotation=35)
    ax.grid(axis="y", alpha=0.25)
    for bar in bars:
        value = bar.get_height()
        ax.text(bar.get_x() + bar.get_width() / 2, value, f"{value:.3f}", ha="center", va="bottom", fontsize=8)
    if higher_better:
        ax.set_ylim(max(0, metrics[col].min() - 0.03), min(1, metrics[col].max() + 0.04))
    else:
        ax.set_ylim(0, metrics[col].max() * 1.18)
fig.tight_layout()
fig.savefig(FIG_DIR / "model_metric_comparison.png", dpi=220, bbox_inches="tight")
plt.close(fig)

fig, ax = plt.subplots(figsize=(8, 4.6))
auc = bootstrap[bootstrap["metric"].eq("roc_auc")].set_index("model").loc[model_order].reset_index()
means = auc["mean"]
low = auc["mean"] - auc["ci_low_2_5"]
high = auc["ci_high_97_5"] - auc["mean"]
ax.errorbar(
    means,
    auc["model"],
    xerr=[low, high],
    fmt="o",
    color="#111827",
    ecolor="#64748b",
    capsize=4,
)
ax.set_title("ROC AUC with 95% bootstrap intervals")
ax.set_xlabel("ROC AUC")
ax.grid(axis="x", alpha=0.25)
fig.tight_layout()
fig.savefig(FIG_DIR / "auc_bootstrap_intervals.png", dpi=220, bbox_inches="tight")
plt.close(fig)

route_summary = (
    route.assign(route_label=lambda df: df["recommendation_source"] + " (hop " + df["graph_hop_distance"].astype(str) + ")")
    .sort_values("n", ascending=False)
)
fig, ax = plt.subplots(figsize=(8.5, 4.4))
bars = ax.bar(route_summary["route_label"], route_summary["actual_accuracy"], color="#0f766e")
ax.set_ylim(0, 0.72)
ax.set_title("Accuracy by graph routing source")
ax.set_ylabel("Accuracy")
ax.tick_params(axis="x", rotation=25)
ax.grid(axis="y", alpha=0.25)
for bar, n in zip(bars, route_summary["n"]):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(), f"n={n:,}", ha="center", va="bottom", fontsize=8)
fig.tight_layout()
fig.savefig(FIG_DIR / "graph_route_accuracy.png", dpi=220, bbox_inches="tight")
plt.close(fig)

fig, ax = plt.subplots(figsize=(8, 4))
remediation_plot = remediation[
    remediation["metric"].isin(
        [
            "next_after_miss_with_remediation_accuracy",
            "next_after_miss_without_remediation_accuracy",
            "same_topic_after_miss_rate",
        ]
    )
].copy()
remediation_plot["label"] = remediation_plot["metric"].map(
    {
        "next_after_miss_with_remediation_accuracy": "After miss: remediation",
        "next_after_miss_without_remediation_accuracy": "After miss: no remediation",
        "same_topic_after_miss_rate": "Same-topic recovery path",
    }
)
bars = ax.bar(remediation_plot["label"], remediation_plot["value"], color=["#7c3aed", "#94a3b8", "#2563eb"])
ax.set_ylim(0, 1.05)
ax.set_title("Remediation and recovery outcomes")
ax.set_ylabel("Rate")
ax.tick_params(axis="x", rotation=20)
ax.grid(axis="y", alpha=0.25)
for bar, n in zip(bars, remediation_plot["n"]):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(), f"{bar.get_height():.3f}\\nn={n:,}", ha="center", va="bottom", fontsize=8)
fig.tight_layout()
fig.savefig(FIG_DIR / "remediation_recovery.png", dpi=220, bbox_inches="tight")
plt.close(fig)

print(f"Wrote figures to {FIG_DIR}")
