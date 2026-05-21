import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "DARS_vs_Glicko2_Comparison.ipynb"


def md(text: str) -> dict:
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": text.splitlines(keepends=True),
    }


def code(text: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": text.splitlines(keepends=True),
    }


cells = [
    md(
        """# DARS vs Glicko-2 Comparison on Bot Student Datasets

This notebook compares the project DARS rating signal against a Glicko-2 baseline using the generated bot-student CSV pack in `datasets/dars`.

The comparison uses `student_test_question_responses.csv` because it contains one row per question inside each adaptive test, with DARS before/after test ratings, question difficulty ratings, response outcomes, timestamps, and test ids. Each adaptive test is treated as one Glicko-2 rating period, which matches the DARS test-level columns in the CSV.

Main outputs:
- predictive metrics: Brier score, log loss, accuracy at 0.5, and ROC AUC
- calibration curves for DARS and Glicko-2
- per-student comparison table
- final rating scatter between DARS and Glicko-2
"""
    ),
    code(
        """from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

ROOT = Path.cwd()
DATA_DIR = ROOT / "datasets" / "dars"

BOT_STUDENTS_CSV = DATA_DIR / "bot_students_fte455.csv"
TEST_RESPONSES_CSV = DATA_DIR / "student_test_question_responses.csv"
TEST_SESSIONS_CSV = DATA_DIR / "student_test_sessions.csv"
SNAPSHOTS_CSV = DATA_DIR / "student_performance_snapshots.csv"
SUMMARY_OUTPUT_CSV = DATA_DIR / "dars_vs_glicko2_comparison_summary.csv"
STUDENT_OUTPUT_CSV = DATA_DIR / "dars_vs_glicko2_student_metrics.csv"

GLICKO2_SCALE = 173.7178
GLICKO2_INITIAL_RD = 350.0
GLICKO2_INITIAL_VOL = 0.06
GLICKO2_TAU = 0.5
ITEM_RD = 80.0
EPSILON = 1e-6

plt.rcParams["figure.figsize"] = (10, 5)
plt.rcParams["axes.grid"] = True
plt.rcParams["grid.alpha"] = 0.25
"""
    ),
    md("## Load and Validate Data\n"),
    code(
        """students = pd.read_csv(BOT_STUDENTS_CSV)
responses_raw = pd.read_csv(TEST_RESPONSES_CSV)
sessions = pd.read_csv(TEST_SESSIONS_CSV)
snapshots = pd.read_csv(SNAPSHOTS_CSV)

responses = responses_raw.copy()
responses = responses[responses["attempted"].eq(1)].copy()
responses["correctness"] = pd.to_numeric(responses["correctness"], errors="coerce")
responses = responses[responses["correctness"].isin([0, 1])].copy()

numeric_cols = [
    "question_order",
    "response_time",
    "DARS_rating_before_test",
    "DARS_rating_after_test",
    "question_elo",
    "correctness",
]
for col in numeric_cols:
    responses[col] = pd.to_numeric(responses[col], errors="coerce")

responses["timestamp_start"] = pd.to_datetime(responses["timestamp_start"], errors="coerce")
responses = responses.dropna(
    subset=["timestamp_start", "DARS_rating_before_test", "DARS_rating_after_test", "question_elo", "correctness"]
)
responses = responses.merge(
    students[["user_id", "starting_rating", "persona"]],
    on="user_id",
    how="left",
    validate="many_to_one",
)
responses = responses.sort_values(["user_id", "timestamp_start", "test_id", "question_order"]).reset_index(drop=True)

print(f"Bot students: {students['user_id'].nunique():,}")
print(f"Attempted question responses used: {len(responses):,}")
print(f"Adaptive tests represented: {responses['test_id'].nunique():,}")
print(f"Questions represented: {responses['question_id'].nunique():,}")

missing = responses[["starting_rating", "persona"]].isna().sum()
if missing.any():
    raise ValueError(f"Missing merged student metadata: {missing.to_dict()}")

responses.head()
"""
    ),
    md("## Metric Helpers\n"),
    code(
        """def elo_expected(rating: float, item_rating: float) -> float:
    return 1.0 / (1.0 + 10.0 ** ((item_rating - rating) / 400.0))


def clip_prob(values):
    return np.clip(np.asarray(values, dtype=float), 1e-6, 1 - 1e-6)


def brier_score(y_true, y_prob) -> float:
    y = np.asarray(y_true, dtype=float)
    p = clip_prob(y_prob)
    return float(np.mean((p - y) ** 2))


def log_loss(y_true, y_prob) -> float:
    y = np.asarray(y_true, dtype=float)
    p = clip_prob(y_prob)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def accuracy_at_half(y_true, y_prob) -> float:
    y = np.asarray(y_true, dtype=int)
    p = np.asarray(y_prob, dtype=float)
    return float(np.mean((p >= 0.5).astype(int) == y))


def roc_auc_score_binary(y_true, y_prob) -> float:
    y = np.asarray(y_true, dtype=int)
    p = np.asarray(y_prob, dtype=float)
    positives = y == 1
    negatives = y == 0
    n_pos = int(positives.sum())
    n_neg = int(negatives.sum())
    if n_pos == 0 or n_neg == 0:
        return float("nan")

    order = np.argsort(p)
    sorted_p = p[order]
    ranks = np.empty_like(sorted_p, dtype=float)
    start = 0
    while start < len(sorted_p):
        end = start + 1
        while end < len(sorted_p) and sorted_p[end] == sorted_p[start]:
            end += 1
        ranks[start:end] = (start + 1 + end) / 2.0
        start = end

    original_ranks = np.empty_like(ranks)
    original_ranks[order] = ranks
    rank_sum_pos = original_ranks[positives].sum()
    auc = (rank_sum_pos - n_pos * (n_pos + 1) / 2.0) / (n_pos * n_neg)
    return float(auc)


def metric_row(name: str, frame: pd.DataFrame, prob_col: str) -> dict:
    y = frame["correctness"].astype(float).to_numpy()
    p = frame[prob_col].astype(float).to_numpy()
    return {
        "model": name,
        "n": len(frame),
        "brier": brier_score(y, p),
        "log_loss": log_loss(y, p),
        "accuracy_at_0_5": accuracy_at_half(y, p),
        "roc_auc": roc_auc_score_binary(y, p),
        "mean_predicted_correct": float(np.mean(p)),
        "actual_accuracy": float(np.mean(y)),
    }
"""
    ),
    md("## Glicko-2 Implementation\n"),
    code(
        """def rating_to_mu(rating: float) -> float:
    return (float(rating) - 1500.0) / GLICKO2_SCALE


def rd_to_phi(rd: float) -> float:
    return float(rd) / GLICKO2_SCALE


def mu_to_rating(mu: float) -> float:
    return 1500.0 + GLICKO2_SCALE * float(mu)


def phi_to_rd(phi: float) -> float:
    return GLICKO2_SCALE * float(phi)


def glicko2_g(phi: float) -> float:
    return 1.0 / math.sqrt(1.0 + 3.0 * phi**2 / math.pi**2)


def glicko2_expected(mu: float, opp_mu: float, opp_phi: float) -> float:
    return 1.0 / (1.0 + math.exp(-glicko2_g(opp_phi) * (mu - opp_mu)))


@dataclass
class Glicko2State:
    rating: float
    rd: float = GLICKO2_INITIAL_RD
    volatility: float = GLICKO2_INITIAL_VOL


def glicko2_prediction(player: Glicko2State, item_rating: float, item_rd: float = ITEM_RD) -> float:
    return glicko2_expected(rating_to_mu(player.rating), rating_to_mu(item_rating), rd_to_phi(item_rd))


def _volatility_f(x: float, delta: float, phi: float, v: float, a: float, tau: float) -> float:
    exp_x = math.exp(x)
    numerator = exp_x * (delta**2 - phi**2 - v - exp_x)
    denominator = 2.0 * (phi**2 + v + exp_x) ** 2
    return numerator / denominator - (x - a) / (tau**2)


def glicko2_update_period(
    player: Glicko2State,
    item_ratings: list[float],
    outcomes: list[float],
    item_rd: float = ITEM_RD,
    tau: float = GLICKO2_TAU,
    epsilon: float = EPSILON,
) -> Glicko2State:
    if not item_ratings:
        phi = rd_to_phi(player.rd)
        phi_star = math.sqrt(phi**2 + player.volatility**2)
        return Glicko2State(player.rating, phi_to_rd(phi_star), player.volatility)

    mu = rating_to_mu(player.rating)
    phi = rd_to_phi(player.rd)
    sigma = player.volatility
    opp_mus = [rating_to_mu(r) for r in item_ratings]
    opp_phi = rd_to_phi(item_rd)
    gs = [glicko2_g(opp_phi) for _ in opp_mus]
    es = [glicko2_expected(mu, opp_mu, opp_phi) for opp_mu in opp_mus]

    v_inv = sum((g**2) * e * (1 - e) for g, e in zip(gs, es))
    if v_inv <= 0:
        return player
    v = 1.0 / v_inv
    delta = v * sum(g * (s - e) for g, s, e in zip(gs, outcomes, es))

    a = math.log(sigma**2)
    if delta**2 > phi**2 + v:
        b = math.log(delta**2 - phi**2 - v)
    else:
        k = 1
        while _volatility_f(a - k * tau, delta, phi, v, a, tau) < 0:
            k += 1
        b = a - k * tau

    f_a = _volatility_f(a, delta, phi, v, a, tau)
    f_b = _volatility_f(b, delta, phi, v, a, tau)
    while abs(b - a) > epsilon:
        c = a + (a - b) * f_a / (f_b - f_a)
        f_c = _volatility_f(c, delta, phi, v, a, tau)
        if f_c * f_b < 0:
            a = b
            f_a = f_b
        else:
            f_a /= 2.0
        b = c
        f_b = f_c

    new_sigma = math.exp(a / 2.0)
    phi_star = math.sqrt(phi**2 + new_sigma**2)
    new_phi = 1.0 / math.sqrt((1.0 / phi_star**2) + (1.0 / v))
    new_mu = mu + new_phi**2 * sum(g * (s - e) for g, s, e in zip(gs, outcomes, es))

    return Glicko2State(
        rating=float(mu_to_rating(new_mu)),
        rd=float(max(30.0, min(350.0, phi_to_rd(new_phi)))),
        volatility=float(new_sigma),
    )
"""
    ),
    md("## Replay DARS Predictions and Glicko-2 Rating Periods\n"),
    code(
        """work = responses.copy()
work["dars_prob"] = [
    elo_expected(rating, item)
    for rating, item in zip(work["DARS_rating_before_test"], work["question_elo"])
]

glicko_records = []
final_glicko_states = {}

for user_id, student_rows in work.groupby("user_id", sort=False):
    start_rating = float(student_rows["starting_rating"].iloc[0])
    state = Glicko2State(rating=start_rating)

    for test_id, period in student_rows.groupby("test_id", sort=False):
        period = period.sort_values(["timestamp_start", "question_order"])
        rating_before = state.rating
        rd_before = state.rd
        vol_before = state.volatility

        probs = [glicko2_prediction(state, item_rating) for item_rating in period["question_elo"].astype(float)]

        item_ratings = period["question_elo"].astype(float).tolist()
        outcomes = period["correctness"].astype(float).tolist()
        state_after = glicko2_update_period(state, item_ratings, outcomes)

        for row_index, probability in zip(period.index, probs):
            glicko_records.append(
                {
                    "row_index": row_index,
                    "glicko2_prob": probability,
                    "glicko2_rating_before_period": rating_before,
                    "glicko2_rd_before_period": rd_before,
                    "glicko2_vol_before_period": vol_before,
                    "glicko2_rating_after_period": state_after.rating,
                    "glicko2_rd_after_period": state_after.rd,
                    "glicko2_vol_after_period": state_after.volatility,
                }
            )

        state = state_after

    final_glicko_states[user_id] = state

glicko_df = pd.DataFrame(glicko_records).set_index("row_index")
work = work.join(glicko_df, how="left")

print(work[["dars_prob", "glicko2_prob"]].describe().round(4))
work.head()
"""
    ),
    md("## Overall Metrics\n"),
    code(
        """overall_metrics = pd.DataFrame(
    [
        metric_row("DARS", work, "dars_prob"),
        metric_row("Glicko-2", work, "glicko2_prob"),
    ]
)

overall_metrics.to_csv(SUMMARY_OUTPUT_CSV, index=False)
overall_metrics.round(5)
"""
    ),
    md("## Per-Student Metrics\n"),
    code(
        """student_rows = []
for user_id, frame in work.groupby("user_id"):
    if len(frame) < 10:
        continue
    dars = metric_row("DARS", frame, "dars_prob")
    glicko = metric_row("Glicko-2", frame, "glicko2_prob")
    final_state = final_glicko_states[user_id]
    student_rows.append(
        {
            "user_id": user_id,
            "persona": frame["persona"].iloc[0],
            "n": len(frame),
            "actual_accuracy": float(frame["correctness"].mean()),
            "dars_brier": dars["brier"],
            "glicko2_brier": glicko["brier"],
            "brier_delta_glicko_minus_dars": glicko["brier"] - dars["brier"],
            "dars_log_loss": dars["log_loss"],
            "glicko2_log_loss": glicko["log_loss"],
            "log_loss_delta_glicko_minus_dars": glicko["log_loss"] - dars["log_loss"],
            "dars_final_rating": float(frame["DARS_rating_after_test"].iloc[-1]),
            "glicko2_final_rating": final_state.rating,
            "glicko2_final_rd": final_state.rd,
        }
    )

student_metrics = pd.DataFrame(student_rows).sort_values("brier_delta_glicko_minus_dars", ascending=False)
student_metrics.to_csv(STUDENT_OUTPUT_CSV, index=False)

print(
    "Students where DARS has lower Brier score:",
    int((student_metrics["brier_delta_glicko_minus_dars"] > 0).sum()),
    "of",
    len(student_metrics),
)
student_metrics.head(10).round(4)
"""
    ),
    md("## Segment Metrics\n"),
    code(
        """segment_tables = []
for segment in ["persona", "difficulty_label", "question_count_in_test", "recommendation_source", "remediation_flag"]:
    rows = []
    for value, frame in work.groupby(segment):
        if len(frame) < 25:
            continue
        dars = metric_row("DARS", frame, "dars_prob")
        glicko = metric_row("Glicko-2", frame, "glicko2_prob")
        rows.append(
            {
                "segment": segment,
                "value": value,
                "n": len(frame),
                "actual_accuracy": float(frame["correctness"].mean()),
                "dars_brier": dars["brier"],
                "glicko2_brier": glicko["brier"],
                "brier_delta_glicko_minus_dars": glicko["brier"] - dars["brier"],
                "dars_log_loss": dars["log_loss"],
                "glicko2_log_loss": glicko["log_loss"],
            }
        )
    segment_tables.append(pd.DataFrame(rows))

segment_metrics = pd.concat(segment_tables, ignore_index=True)
segment_metrics.sort_values(["segment", "value"]).round(4)
"""
    ),
    md("## Calibration Curves\n"),
    code(
        """def calibration_table(frame: pd.DataFrame, prob_col: str, bins: int = 10) -> pd.DataFrame:
    temp = frame[[prob_col, "correctness"]].copy()
    temp["bin"] = pd.cut(temp[prob_col], bins=np.linspace(0, 1, bins + 1), include_lowest=True)
    return (
        temp.groupby("bin", observed=True)
        .agg(
            mean_predicted=(prob_col, "mean"),
            actual_accuracy=("correctness", "mean"),
            n=("correctness", "size"),
        )
        .reset_index()
    )


dars_cal = calibration_table(work, "dars_prob")
glicko_cal = calibration_table(work, "glicko2_prob")

fig, ax = plt.subplots()
ax.plot([0, 1], [0, 1], color="#666666", linestyle="--", linewidth=1, label="Perfect calibration")
ax.plot(dars_cal["mean_predicted"], dars_cal["actual_accuracy"], marker="o", label="DARS")
ax.plot(glicko_cal["mean_predicted"], glicko_cal["actual_accuracy"], marker="o", label="Glicko-2")
ax.set_title("Calibration: predicted probability vs actual correctness")
ax.set_xlabel("Mean predicted probability")
ax.set_ylabel("Actual correctness rate")
ax.set_xlim(0, 1)
ax.set_ylim(0, 1)
ax.legend()
plt.show()

pd.concat(
    [
        dars_cal.assign(model="DARS"),
        glicko_cal.assign(model="Glicko-2"),
    ],
    ignore_index=True,
)[["model", "bin", "mean_predicted", "actual_accuracy", "n"]].round(4)
"""
    ),
    md("## Metric and Rating Visuals\n"),
    code(
        """fig, axes = plt.subplots(1, 3, figsize=(16, 4))

for ax, metric, title in zip(
    axes,
    ["brier", "log_loss", "roc_auc"],
    ["Brier score (lower is better)", "Log loss (lower is better)", "ROC AUC (higher is better)"],
):
    ax.bar(overall_metrics["model"], overall_metrics[metric], color=["#2563eb", "#16a34a"])
    ax.set_title(title)
    ax.set_ylabel(metric)
    for idx, value in enumerate(overall_metrics[metric]):
        ax.text(idx, value, f"{value:.3f}", ha="center", va="bottom")

plt.tight_layout()
plt.show()

fig, ax = plt.subplots(figsize=(7, 6))
ax.scatter(
    student_metrics["dars_final_rating"],
    student_metrics["glicko2_final_rating"],
    c=student_metrics["actual_accuracy"],
    cmap="viridis",
    alpha=0.75,
)
low = min(student_metrics["dars_final_rating"].min(), student_metrics["glicko2_final_rating"].min())
high = max(student_metrics["dars_final_rating"].max(), student_metrics["glicko2_final_rating"].max())
ax.plot([low, high], [low, high], color="#666666", linestyle="--", linewidth=1)
ax.set_title("Final student ratings: DARS vs Glicko-2")
ax.set_xlabel("Final DARS rating")
ax.set_ylabel("Final Glicko-2 rating")
plt.show()
"""
    ),
    md("## Quick Interpretation Scaffold\n"),
    code(
        """dars_brier = float(overall_metrics.loc[overall_metrics["model"].eq("DARS"), "brier"].iloc[0])
glicko_brier = float(overall_metrics.loc[overall_metrics["model"].eq("Glicko-2"), "brier"].iloc[0])
dars_ll = float(overall_metrics.loc[overall_metrics["model"].eq("DARS"), "log_loss"].iloc[0])
glicko_ll = float(overall_metrics.loc[overall_metrics["model"].eq("Glicko-2"), "log_loss"].iloc[0])

winner_brier = "DARS" if dars_brier < glicko_brier else "Glicko-2"
winner_logloss = "DARS" if dars_ll < glicko_ll else "Glicko-2"

print(f"Brier winner: {winner_brier} (DARS={dars_brier:.4f}, Glicko-2={glicko_brier:.4f})")
print(f"Log-loss winner: {winner_logloss} (DARS={dars_ll:.4f}, Glicko-2={glicko_ll:.4f})")
print(f"Saved overall metrics to: {SUMMARY_OUTPUT_CSV}")
print(f"Saved per-student metrics to: {STUDENT_OUTPUT_CSV}")

segment_metrics.sort_values("brier_delta_glicko_minus_dars", ascending=False).head(12).round(4)
"""
    ),
    md(
        """## Notes for Reporting

- This is a simulated bot-student benchmark, so report it as a controlled validation dataset, not as evidence from live learners.
- DARS uses education-specific signals stored in the CSVs: response time, rapid guessing, momentum, graph routing, remediation, and the adaptive mix test context.
- Glicko-2 is used as an uncertainty-aware rating baseline. It sees correctness and item difficulty, but not the extra educational signals.
- If you later add real student logs, rerun the same notebook on those CSVs and compare whether the same model ranking holds.
"""
    ),
]


notebook = {
    "cells": cells,
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3",
        },
        "language_info": {
            "name": "python",
            "pygments_lexer": "ipython3",
        },
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}

OUTPUT.write_text(json.dumps(notebook, indent=2), encoding="utf-8")
print(f"Wrote {OUTPUT}")
