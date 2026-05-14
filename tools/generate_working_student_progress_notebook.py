import nbformat as nbf
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "GATE_DA_Student_Progress_Analytics_WORKING.ipynb"


def md(text: str):
    return nbf.v4.new_markdown_cell(text)


def code(text: str):
    return nbf.v4.new_code_cell(text)


nb = nbf.v4.new_notebook()
nb["metadata"] = {
    "kernelspec": {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3",
    },
    "language_info": {
        "name": "python",
        "pygments_lexer": "ipython3",
    },
}

cells = [
    md(
        """# GATE DA Student Progress Analytics - Working Notebook

This is a clean replacement notebook built to run end to end.

What it does:
- reads project question data from `tmp_question_bank_export.json`, refreshing it with `tools/export_question_bank.mjs` when Node is available
- uses the Supabase settings already present in `.env`
- uses the existing default student id from the earlier notebook, unless you override `STUDENT_ID`
- continues with deterministic demo progress if Supabase rows are hidden by row-level security
- produces analytics tables, charts, CSV exports, and an interactive HTML question graph

The old notebook's video cells were intentionally left out here because they require long ffmpeg renders and were the source of the latest runtime failure. Run this notebook from top to bottom first; add video rendering only after the analytics output is correct.
"""
    ),
    code(
        r'''# ============================================================
# 1. SETUP AND CONFIGURATION
# ============================================================
from __future__ import annotations

import base64
import hashlib
import json
import math
import os
import subprocess
import textwrap
import uuid
from pathlib import Path
from urllib.parse import urlencode

import matplotlib.pyplot as plt
import networkx as nx
import numpy as np
import pandas as pd
import requests
from IPython.display import HTML, display

try:
    import plotly.graph_objects as go
    PLOTLY_AVAILABLE = True
except Exception:
    PLOTLY_AVAILABLE = False

ROOT = Path.cwd()
ENV_PATH = ROOT / ".env"
EXPORTER = ROOT / "tools" / "export_question_bank.mjs"
EXPORT_JSON = ROOT / "tmp_question_bank_export.json"
REFRESH_QUESTION_EXPORT = False

# This id was already present in your previous notebook. Change it here if needed.
DEFAULT_STUDENT_ID = "12efa469-0330-42e1-bc64-82bed3402ae8"


def read_env_file(path: Path) -> dict:
    env = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def mask(value: str | None, keep: int = 6) -> str:
    if not value:
        return "<missing>"
    if len(value) <= keep * 2:
        return "<set>"
    return f"{value[:keep]}...{value[-keep:]}"


ENV = {**read_env_file(ENV_PATH), **os.environ}
SUPABASE_URL = ENV.get("VITE_STUDENT_SUPABASE_URL") or ENV.get("SUPABASE_URL")
SUPABASE_KEY = ENV.get("VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY") or ENV.get("SUPABASE_KEY")

STUDENT_ID = str(globals().get("STUDENT_ID", ENV.get("STUDENT_ID", DEFAULT_STUDENT_ID))).strip()
SUPABASE_ACCESS_TOKEN = globals().get("SUPABASE_ACCESS_TOKEN", ENV.get("SUPABASE_ACCESS_TOKEN"))
LOGIN_EMAIL = globals().get("LOGIN_EMAIL", ENV.get("LOGIN_EMAIL"))
LOGIN_PASSWORD = globals().get("LOGIN_PASSWORD", ENV.get("LOGIN_PASSWORD"))

try:
    uuid.UUID(STUDENT_ID)
    STUDENT_ID_IS_VALID = True
except Exception:
    STUDENT_ID_IS_VALID = False

print("Project root:", ROOT)
print("Student id:", STUDENT_ID if STUDENT_ID_IS_VALID else f"invalid ({STUDENT_ID})")
print("Supabase URL:", mask(SUPABASE_URL))
print("Supabase key:", mask(SUPABASE_KEY))
print("Session token:", "provided" if SUPABASE_ACCESS_TOKEN else "not provided")
print("Plotly available:", PLOTLY_AVAILABLE)
'''
    ),
    md(
        """## If You Need Real Student Rows

If the notebook says it is using demo fallback data, Supabase row-level security is hiding the student's private rows from this local notebook.

To use real rows, set one of these before running the notebook:

```python
STUDENT_ID = "student-user-uuid"
SUPABASE_ACCESS_TOKEN = "fresh-access-token-from-the-student-browser-session"
```

or set `LOGIN_EMAIL` and `LOGIN_PASSWORD` if password login is enabled for the student account.
"""
    ),
    code(
        r'''# ============================================================
# 2. LOAD THE COMPLETE PROJECT QUESTION BANK
# ============================================================

def refresh_question_export() -> None:
    if EXPORT_JSON.exists() and not REFRESH_QUESTION_EXPORT:
        print("Using cached question export:", EXPORT_JSON.name)
        print("Set REFRESH_QUESTION_EXPORT = True in the setup cell if you want to rebuild it.")
        return
    if not EXPORTER.exists():
        print("Question exporter not found; using cached JSON if available.")
        return
    try:
        subprocess.run(
            ["node", str(EXPORTER), str(EXPORT_JSON)],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
            timeout=60,
        )
        print("Refreshed question export:", EXPORT_JSON.name)
    except Exception as exc:
        if EXPORT_JSON.exists():
            print("Question export refresh failed; using cached JSON.")
            print("Reason:", exc)
        else:
            raise RuntimeError("Question export failed and no cached tmp_question_bank_export.json exists.") from exc


refresh_question_export()
export_payload = json.loads(EXPORT_JSON.read_text(encoding="utf-8"))

subjects_meta = export_payload.get("subjects", [])
subject_lookup = {item.get("id"): item for item in subjects_meta}
topic_lookup = {
    (subject.get("id"), topic.get("id")): topic
    for subject in subjects_meta
    for topic in subject.get("topics", [])
}


def subject_name(subject_id: str | None) -> str:
    subject = subject_lookup.get(subject_id or "")
    return subject.get("name") if subject else (subject_id or "Unknown subject")


def topic_name(subject_id: str | None, topic_id: str | None) -> str:
    topic = topic_lookup.get((subject_id or "", topic_id or ""))
    return topic.get("name") if topic else (topic_id or "Unknown topic")


def normalized_question(question: dict, source: str, group: str, test_meta: dict | None = None) -> dict:
    row = dict(question)
    row["source"] = source
    row["source_group"] = group
    row["subjectName"] = subject_name(row.get("subjectId"))
    row["topicName"] = topic_name(row.get("subjectId"), row.get("topicId"))
    if test_meta:
        row["fullTestId"] = test_meta.get("id")
        row["fullTestLabel"] = test_meta.get("label")
    return row


rows = []
for item in export_payload.get("questions", []):
    rows.append(normalized_question(item, "practice-bank", "practice"))
for item in export_payload.get("adaptiveQuestions", []):
    rows.append(normalized_question(item, "adaptive-subject-bank", "adaptive"))
for item in export_payload.get("adaptiveMixQuestions", []):
    rows.append(normalized_question(item, "adaptive-mix-bank", "adaptive"))
for test in export_payload.get("tests", []):
    for item in test.get("questions", []):
        rows.append(normalized_question(item, f"full-test::{test.get('id')}", "full-test", test))

question_bank = pd.DataFrame(rows)
if question_bank.empty:
    raise RuntimeError("The question bank export is empty.")

for column, default in {
    "id": "",
    "subjectId": "unknown-subject",
    "topicId": "unknown-topic",
    "subjectName": "Unknown subject",
    "topicName": "Unknown topic",
    "question": "",
    "difficulty": "medium",
    "eloRating": 1400,
    "marks": 1,
    "negativeMarks": 0,
    "type": "mcq",
    "correctAnswer": None,
    "correctAnswers": None,
    "correctNat": None,
}.items():
    if column not in question_bank.columns:
        question_bank[column] = default

question_bank["difficulty"] = question_bank["difficulty"].fillna("medium").astype(str).str.lower()
question_bank["eloRating"] = pd.to_numeric(question_bank["eloRating"], errors="coerce").fillna(1400)
question_bank["marks"] = pd.to_numeric(question_bank["marks"], errors="coerce").fillna(1)
question_bank["negativeMarks"] = pd.to_numeric(question_bank["negativeMarks"], errors="coerce").fillna(0)

question_bank = (
    question_bank.sort_values(["id", "source"])
    .groupby("id", as_index=False)
    .agg({
        "subjectId": "first",
        "topicId": "first",
        "subjectName": "first",
        "topicName": "first",
        "question": "first",
        "difficulty": "first",
        "eloRating": "first",
        "marks": "first",
        "negativeMarks": "first",
        "type": "first",
        "correctAnswer": "first",
        "correctAnswers": "first",
        "correctNat": "first",
        "source": lambda values: sorted({str(value) for value in values if pd.notna(value)}),
        "source_group": lambda values: sorted({str(value) for value in values if pd.notna(value)}),
    })
)

adaptive_ids = {
    item.get("id")
    for item in export_payload.get("adaptiveQuestions", []) + export_payload.get("adaptiveMixQuestions", [])
    if item.get("id")
}
question_bank["adaptiveEligible"] = question_bank["id"].isin(adaptive_ids)
question_lookup = {row["id"]: row for row in question_bank.to_dict("records")}

print("Unique questions:", len(question_bank))
print("Adaptive eligible:", int(question_bank["adaptiveEligible"].sum()))
print("Subjects:", question_bank["subjectName"].nunique())
display(
    question_bank.groupby("subjectName")
    .agg(questions=("id", "count"), adaptive=("adaptiveEligible", "sum"), avg_elo=("eloRating", "mean"))
    .sort_values("questions", ascending=False)
    .round({"avg_elo": 0})
)
'''
    ),
    code(
        r'''# ============================================================
# 3. LOAD STUDENT DATA FROM SUPABASE WHEN AVAILABLE
# ============================================================

def decode_jwt_payload(token: str | None):
    if not token or token.count(".") < 2:
        return None
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return json.loads(base64.urlsafe_b64decode(payload.encode("utf-8")).decode("utf-8"))
    except Exception:
        return None


def fetch_access_token_with_password(email: str, password: str) -> str | None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
            json={"email": email, "password": password},
            timeout=12,
        )
    except requests.RequestException as exc:
        print("Password login request failed:", exc)
        return None
    if not response.ok:
        print("Password login failed:", response.status_code, response.text[:180])
        return None
    return response.json().get("access_token")


jwt_payload = decode_jwt_payload(SUPABASE_ACCESS_TOKEN)
if jwt_payload:
    print("JWT subject:", jwt_payload.get("sub"))
    print("JWT email:", jwt_payload.get("email"))
    if jwt_payload.get("sub") and jwt_payload.get("sub") != STUDENT_ID:
        print("Warning: token subject differs from STUDENT_ID.")

if not SUPABASE_ACCESS_TOKEN and LOGIN_EMAIL and LOGIN_PASSWORD:
    SUPABASE_ACCESS_TOKEN = fetch_access_token_with_password(LOGIN_EMAIL, LOGIN_PASSWORD)
    if SUPABASE_ACCESS_TOKEN:
        print("Fetched a Supabase access token with email/password.")


def supabase_headers() -> dict:
    bearer = SUPABASE_ACCESS_TOKEN or SUPABASE_KEY
    return {
        "apikey": SUPABASE_KEY or "",
        "Authorization": f"Bearer {bearer or ''}",
        "Accept": "application/json",
    }


def supabase_select(table: str, *, filters: dict | None = None, limit: int | None = None) -> list[dict]:
    if not (SUPABASE_URL and SUPABASE_KEY and STUDENT_ID_IS_VALID):
        return []
    params = {"select": "*"}
    for key, value in (filters or {}).items():
        if value is not None:
            params[key] = f"eq.{value}"
    if limit:
        params["limit"] = str(limit)
    url = f"{SUPABASE_URL}/rest/v1/{table}?{urlencode(params)}"
    try:
        response = requests.get(url, headers=supabase_headers(), timeout=12)
    except requests.RequestException as exc:
        print(f"{table}: network request failed; using empty table. {exc.__class__.__name__}")
        return []
    if not response.ok:
        print(f"{table}: {response.status_code}; continuing without it. {response.text[:180]}")
        return []
    try:
        return response.json()
    except Exception:
        return []


profiles_df = pd.DataFrame(supabase_select("profiles", filters={"user_id": STUDENT_ID}))
test_history_df = pd.DataFrame(supabase_select("test_history", filters={"user_id": STUDENT_ID}))
user_progress_df = pd.DataFrame(supabase_select("user_progress", filters={"user_id": STUDENT_ID}))
answered_df = pd.DataFrame(supabase_select("answered_questions", filters={"user_id": STUDENT_ID}))

for frame, date_columns in [
    (profiles_df, ["created_at", "updated_at", "last_active"]),
    (test_history_df, ["completed_at", "created_at"]),
    (user_progress_df, ["last_practiced", "created_at", "updated_at"]),
    (answered_df, ["answered_at", "created_at"]),
]:
    for column in date_columns:
        if column in frame.columns:
            frame[column] = pd.to_datetime(frame[column], errors="coerce", utc=True)

print("Supabase rows loaded:")
print("profiles:", len(profiles_df))
print("test_history:", len(test_history_df))
print("user_progress:", len(user_progress_df))
print("answered_questions:", len(answered_df))

REAL_SUPABASE_DATA_VISIBLE = any(len(df) for df in [profiles_df, test_history_df, user_progress_df, answered_df])
if not REAL_SUPABASE_DATA_VISIBLE:
    print("No private student rows were visible. The rest of the notebook will use deterministic demo progress so every cell still works.")
'''
    ),
    code(
        r'''# ============================================================
# 4. BUILD ATTEMPT-LEVEL DATA
# ============================================================

def parse_jsonish(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
        try:
            return json.loads(value)
        except Exception:
            return None
    return None


def is_blank_answer(answer) -> bool:
    if answer is None:
        return True
    if isinstance(answer, float) and pd.isna(answer):
        return True
    if isinstance(answer, str) and not answer.strip():
        return True
    if isinstance(answer, list) and len(answer) == 0:
        return True
    return False


def answer_is_correct(question: dict | None, answer) -> bool:
    if not question or is_blank_answer(answer):
        return False
    qtype = str(question.get("type", "mcq")).lower()
    if qtype == "mcq":
        return answer == question.get("correctAnswer")
    if qtype == "msq":
        correct_answers = question.get("correctAnswers") or []
        return isinstance(answer, list) and sorted(answer) == sorted(correct_answers)
    if qtype == "nat":
        correct_nat = question.get("correctNat") or {}
        try:
            value = float(answer)
            return float(correct_nat.get("min")) <= value <= float(correct_nat.get("max"))
        except Exception:
            return False
    return False


def rows_from_test_history(frame: pd.DataFrame) -> list[dict]:
    rows = []
    if frame.empty or "review_payload" not in frame.columns:
        return rows
    for test in frame.itertuples(index=False):
        payload = parse_jsonish(getattr(test, "review_payload", None))
        if not payload:
            continue
        question_ids = payload.get("question_ids") or payload.get("questionIds") or []
        answers = payload.get("answers") or []
        reviews = payload.get("question_reviews") or payload.get("questionReviews") or []
        review_by_id = {item.get("questionId"): item for item in reviews if isinstance(item, dict)}
        completed_at = getattr(test, "completed_at", pd.NaT)
        session_id = getattr(test, "id", "session")
        for step, question_id in enumerate(question_ids, start=1):
            question = question_lookup.get(question_id)
            answer = answers[step - 1] if step - 1 < len(answers) else None
            review = review_by_id.get(question_id, {})
            correct = review.get("correct")
            if correct is None:
                correct = answer_is_correct(question, answer)
            rows.append({
                "session_id": session_id,
                "completed_at": completed_at,
                "step": step,
                "question_id": question_id,
                "subjectName": question.get("subjectName") if question else subject_name(getattr(test, "subject_id", None)),
                "topicName": question.get("topicName") if question else topic_name(getattr(test, "subject_id", None), getattr(test, "topic_id", None)),
                "difficulty": question.get("difficulty") if question else "medium",
                "eloRating": question.get("eloRating") if question else np.nan,
                "correct": bool(correct),
                "answered": not is_blank_answer(answer),
                "time_spent_seconds": review.get("timeSpentSeconds", np.nan),
                "source": "test_history.review_payload",
            })
    return rows


def rows_from_answered_questions(frame: pd.DataFrame) -> list[dict]:
    rows = []
    if frame.empty or "question_id" not in frame.columns:
        return rows
    for item in frame.itertuples(index=False):
        question_id = getattr(item, "question_id", None)
        question = question_lookup.get(question_id)
        if not question:
            continue
        correct = getattr(item, "was_correct", None)
        if correct is None:
            correct = getattr(item, "correct", False)
        rows.append({
            "session_id": "answered_questions",
            "completed_at": getattr(item, "answered_at", pd.NaT),
            "step": len(rows) + 1,
            "question_id": question_id,
            "subjectName": question.get("subjectName"),
            "topicName": question.get("topicName"),
            "difficulty": question.get("difficulty"),
            "eloRating": question.get("eloRating"),
            "correct": bool(correct),
            "answered": True,
            "time_spent_seconds": getattr(item, "time_spent_seconds", np.nan),
            "source": "answered_questions",
        })
    return rows


def stable_number(text: str, modulo: int) -> int:
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return int(digest[:12], 16) % modulo


def build_demo_attempts(bank: pd.DataFrame, questions_per_session: int = 12, sessions: int = 7) -> pd.DataFrame:
    adaptive = bank[bank["adaptiveEligible"]].copy()
    if adaptive.empty:
        adaptive = bank.copy()
    adaptive = adaptive.sort_values(["subjectName", "topicName", "eloRating", "id"]).reset_index(drop=True)
    picked = []
    subjects = adaptive["subjectName"].dropna().unique().tolist()
    for session_index in range(sessions):
        subject = subjects[session_index % max(len(subjects), 1)] if subjects else None
        pool = adaptive[adaptive["subjectName"] == subject] if subject else adaptive
        if pool.empty:
            pool = adaptive
        start = (session_index * 17) % len(pool)
        take = pd.concat([pool.iloc[start:], pool.iloc[:start]]).head(questions_per_session)
        for step, (_, row) in enumerate(take.iterrows(), start=1):
            base = {"easy": 0.78, "medium": 0.62, "hard": 0.46}.get(str(row["difficulty"]).lower(), 0.58)
            learning_bonus = min(0.18, session_index * 0.025)
            noise = stable_number(str(row["id"]) + str(session_index), 100) / 1000
            correct = (base + learning_bonus + noise) >= 0.64
            picked.append({
                "session_id": f"demo-session-{session_index + 1}",
                "completed_at": pd.Timestamp("2026-04-01", tz="UTC") + pd.Timedelta(days=session_index * 3),
                "step": step,
                "question_id": row["id"],
                "subjectName": row["subjectName"],
                "topicName": row["topicName"],
                "difficulty": row["difficulty"],
                "eloRating": row["eloRating"],
                "correct": bool(correct),
                "answered": True,
                "time_spent_seconds": int(35 + stable_number(str(row["id"]), 95)),
                "source": "deterministic_demo_fallback",
            })
    return pd.DataFrame(picked)


attempt_rows = rows_from_test_history(test_history_df) + rows_from_answered_questions(answered_df)
attempts_df = pd.DataFrame(attempt_rows)
DATA_SOURCE = "Supabase student rows"
if attempts_df.empty:
    attempts_df = build_demo_attempts(question_bank)
    DATA_SOURCE = "Demo fallback - replace STUDENT_ID/token for real private rows"

attempts_df["completed_at"] = pd.to_datetime(attempts_df["completed_at"], errors="coerce", utc=True)
attempts_df["correct"] = attempts_df["correct"].fillna(False).astype(bool)
attempts_df["answered"] = attempts_df["answered"].fillna(True).astype(bool)
attempts_df["eloRating"] = pd.to_numeric(attempts_df["eloRating"], errors="coerce")
attempts_df = attempts_df.sort_values(["completed_at", "session_id", "step"], na_position="last").reset_index(drop=True)

sessions_df = (
    attempts_df.groupby("session_id", dropna=False)
    .agg(
        completed_at=("completed_at", "max"),
        questions=("question_id", "count"),
        correct=("correct", "sum"),
        avg_elo=("eloRating", "mean"),
        source=("source", "first"),
    )
    .reset_index()
)
sessions_df["accuracy_pct"] = np.where(sessions_df["questions"] > 0, 100 * sessions_df["correct"] / sessions_df["questions"], np.nan)
sessions_df = sessions_df.sort_values("completed_at", na_position="last").reset_index(drop=True)

print("Data source:", DATA_SOURCE)
print("Attempt rows:", len(attempts_df))
print("Sessions:", len(sessions_df))
display(attempts_df.head(10))
'''
    ),
    code(
        r'''# ============================================================
# 5. SUMMARY METRICS AND WEAK TOPICS
# ============================================================

total_attempts = len(attempts_df)
total_correct = int(attempts_df["correct"].sum())
overall_accuracy = 100 * total_correct / total_attempts if total_attempts else np.nan
unique_questions = attempts_df["question_id"].nunique()
coverage_pct = 100 * unique_questions / max(len(question_bank), 1)

summary_df = pd.DataFrame([
    {"metric": "Data source", "value": DATA_SOURCE},
    {"metric": "Sessions", "value": len(sessions_df)},
    {"metric": "Attempts", "value": total_attempts},
    {"metric": "Correct", "value": total_correct},
    {"metric": "Overall accuracy", "value": f"{overall_accuracy:.1f}%"},
    {"metric": "Unique questions attempted", "value": unique_questions},
    {"metric": "Question-bank coverage", "value": f"{coverage_pct:.1f}%"},
])

display(summary_df)

subject_perf_df = (
    attempts_df.groupby("subjectName", dropna=False)
    .agg(attempts=("question_id", "count"), correct=("correct", "sum"), avg_elo=("eloRating", "mean"))
    .reset_index()
)
subject_perf_df["accuracy_pct"] = np.where(subject_perf_df["attempts"] > 0, 100 * subject_perf_df["correct"] / subject_perf_df["attempts"], np.nan)
subject_perf_df = subject_perf_df.sort_values(["accuracy_pct", "attempts"], ascending=[True, False]).round({"accuracy_pct": 1, "avg_elo": 0})

topic_perf_df = (
    attempts_df.groupby(["subjectName", "topicName"], dropna=False)
    .agg(attempts=("question_id", "count"), correct=("correct", "sum"), avg_elo=("eloRating", "mean"))
    .reset_index()
)
topic_perf_df["accuracy_pct"] = np.where(topic_perf_df["attempts"] > 0, 100 * topic_perf_df["correct"] / topic_perf_df["attempts"], np.nan)
topic_perf_df["priority"] = np.where(
    topic_perf_df["attempts"] >= 2,
    (100 - topic_perf_df["accuracy_pct"]) * np.log1p(topic_perf_df["attempts"]),
    0,
)
topic_perf_df = topic_perf_df.sort_values("priority", ascending=False).round({"accuracy_pct": 1, "avg_elo": 0, "priority": 1})

print("Subject performance")
display(subject_perf_df)
print("Top weak topics / remediation priorities")
display(topic_perf_df.head(12))
'''
    ),
    code(
        r'''# ============================================================
# 6. ANALYTICS CHARTS
# ============================================================

plt.style.use("seaborn-v0_8-whitegrid")
fig, axes = plt.subplots(2, 2, figsize=(16, 10))
fig.suptitle("GATE DA Student Progress Analytics", fontsize=16, fontweight="bold")

ax = axes[0, 0]
if not sessions_df.empty:
    x = sessions_df["completed_at"].dt.tz_convert(None) if sessions_df["completed_at"].notna().any() else range(len(sessions_df))
    ax.plot(x, sessions_df["accuracy_pct"], marker="o", linewidth=2, color="#2563eb")
    for i, row in sessions_df.iterrows():
        x_value = x.iloc[i] if hasattr(x, "iloc") else i
        ax.annotate(f"{row['accuracy_pct']:.0f}%", (x_value, row["accuracy_pct"]), textcoords="offset points", xytext=(0, 8), ha="center", fontsize=8)
ax.set_title("Accuracy by Session")
ax.set_ylim(0, 105)
ax.set_ylabel("Accuracy %")

ax = axes[0, 1]
plot_subjects = subject_perf_df.sort_values("accuracy_pct", ascending=True)
colors = np.where(plot_subjects["accuracy_pct"] >= 70, "#16a34a", np.where(plot_subjects["accuracy_pct"] >= 50, "#f59e0b", "#dc2626"))
ax.barh(plot_subjects["subjectName"], plot_subjects["accuracy_pct"], color=colors)
ax.set_title("Accuracy by Subject")
ax.set_xlim(0, 100)
ax.set_xlabel("Accuracy %")

ax = axes[1, 0]
difficulty_order = ["easy", "medium", "hard"]
diff_df = attempts_df.assign(difficulty=attempts_df["difficulty"].fillna("medium").astype(str).str.lower())
diff_perf = diff_df.groupby("difficulty").agg(attempts=("question_id", "count"), correct=("correct", "sum")).reindex(difficulty_order).fillna(0)
diff_perf["wrong"] = diff_perf["attempts"] - diff_perf["correct"]
ax.bar(diff_perf.index, diff_perf["correct"], label="Correct", color="#16a34a")
ax.bar(diff_perf.index, diff_perf["wrong"], bottom=diff_perf["correct"], label="Wrong", color="#dc2626")
ax.set_title("Attempts by Difficulty")
ax.set_ylabel("Questions")
ax.legend()

ax = axes[1, 1]
weak = topic_perf_df.head(8).sort_values("priority")
labels = [textwrap.shorten(f"{r.subjectName}: {r.topicName}", width=42, placeholder="...") for r in weak.itertuples(index=False)]
ax.barh(labels, weak["priority"], color="#7c3aed")
ax.set_title("Highest Remediation Priority")
ax.set_xlabel("Priority score")

plt.tight_layout()
plt.show()
'''
    ),
    code(
        r'''# ============================================================
# 7. NEXT BEST TOPICS AND QUESTIONS
# ============================================================

attempted_ids = set(attempts_df["question_id"].dropna().astype(str))
latest_accuracy_by_topic = topic_perf_df.set_index(["subjectName", "topicName"])["accuracy_pct"].to_dict()
weak_topic_keys = [tuple(row) for row in topic_perf_df.head(5)[["subjectName", "topicName"]].to_numpy()]

candidate_rows = []
for subject, topic in weak_topic_keys:
    pool = question_bank[
        (question_bank["subjectName"] == subject)
        & (question_bank["topicName"] == topic)
        & (~question_bank["id"].isin(attempted_ids))
    ].copy()
    if pool.empty:
        pool = question_bank[
            (question_bank["subjectName"] == subject)
            & (question_bank["topicName"] == topic)
        ].copy()
    if pool.empty:
        continue
    pool["distance_from_target_elo"] = (pool["eloRating"] - attempts_df["eloRating"].mean()).abs()
    pool = pool.sort_values(["distance_from_target_elo", "adaptiveEligible", "eloRating"], ascending=[True, False, True]).head(3)
    for _, row in pool.iterrows():
        candidate_rows.append({
            "subject": subject,
            "topic": topic,
            "topic_accuracy_pct": latest_accuracy_by_topic.get((subject, topic)),
            "question_id": row["id"],
            "difficulty": row["difficulty"],
            "eloRating": row["eloRating"],
            "adaptiveEligible": row["adaptiveEligible"],
            "question_preview": textwrap.shorten(str(row["question"]), width=120, placeholder="..."),
        })

next_questions_df = pd.DataFrame(candidate_rows)
print("Recommended next practice questions")
display(next_questions_df)
'''
    ),
    code(
        r'''# ============================================================
# 8. INTERACTIVE QUESTION GRAPH EXPORT
# ============================================================

status_by_question = {}
for row in attempts_df.sort_values(["completed_at", "session_id", "step"]).itertuples(index=False):
    status_by_question[row.question_id] = "correct" if row.correct else "wrong"

subject_order = sorted(question_bank["subjectName"].dropna().unique().tolist())
topic_order = {
    subject: sorted(question_bank.loc[question_bank["subjectName"] == subject, "topicName"].dropna().unique().tolist())
    for subject in subject_order
}


def stable_jitter(text: str, scale: float = 0.08) -> tuple[float, float]:
    digest = hashlib.md5(text.encode("utf-8")).hexdigest()
    a = int(digest[:8], 16) / 0xFFFFFFFF
    b = int(digest[8:16], 16) / 0xFFFFFFFF
    return (a - 0.5) * scale, (b - 0.5) * scale


def node_position(row) -> tuple[float, float]:
    subject = row["subjectName"]
    topic = row["topicName"]
    subject_index = subject_order.index(subject) if subject in subject_order else 0
    subject_angle = 2 * math.pi * subject_index / max(len(subject_order), 1)
    topics = topic_order.get(subject, [topic])
    topic_index = topics.index(topic) if topic in topics else 0
    topic_radius = 0.45 + 0.07 * topic_index
    elo_offset = (float(row["eloRating"]) - 1400) / 4000
    jx, jy = stable_jitter(str(row["id"]))
    x = math.cos(subject_angle) * (1.0 + topic_radius + elo_offset) + jx
    y = math.sin(subject_angle) * (1.0 + topic_radius + elo_offset) + jy
    return x, y


graph_df = question_bank.copy()
positions = graph_df.apply(node_position, axis=1)
graph_df["x"] = [p[0] for p in positions]
graph_df["y"] = [p[1] for p in positions]
graph_df["status"] = graph_df["id"].map(status_by_question).fillna("unseen")
graph_df["attempted"] = graph_df["status"] != "unseen"

status_color = {"correct": "#16a34a", "wrong": "#dc2626", "unseen": "#94a3b8"}
size = np.where(graph_df["attempted"], 11, 5)
line_width = np.where(graph_df["adaptiveEligible"], 1.0, 0.3)

ordered_attempts = attempts_df.sort_values(["completed_at", "session_id", "step"])["question_id"].dropna().astype(str).tolist()
path_edges = list(zip(ordered_attempts[:-1], ordered_attempts[1:]))

prefix = STUDENT_ID[:8] if STUDENT_ID_IS_VALID else "student"
html_path = ROOT / f"student_progress_graph_{prefix}.html"

if PLOTLY_AVAILABLE:
    edge_x, edge_y = [], []
    pos_lookup = graph_df.set_index("id")[["x", "y"]].to_dict("index")
    for left, right in path_edges:
        if left in pos_lookup and right in pos_lookup:
            edge_x.extend([pos_lookup[left]["x"], pos_lookup[right]["x"], None])
            edge_y.extend([pos_lookup[left]["y"], pos_lookup[right]["y"], None])

    edge_trace = go.Scatter(
        x=edge_x,
        y=edge_y,
        mode="lines",
        line=dict(width=2.5, color="#2563eb"),
        hoverinfo="skip",
        name="Attempt path",
    )
    hover = graph_df.apply(
        lambda row: (
            f"<b>{row['id']}</b><br>"
            f"Subject: {row['subjectName']}<br>"
            f"Topic: {row['topicName']}<br>"
            f"Difficulty: {row['difficulty']}<br>"
            f"ELO: {row['eloRating']:.0f}<br>"
            f"Status: {row['status']}<br>"
            f"Question: {textwrap.shorten(str(row['question']), width=180, placeholder='...')}"
        ),
        axis=1,
    )
    node_trace = go.Scatter(
        x=graph_df["x"],
        y=graph_df["y"],
        mode="markers",
        text=hover,
        hoverinfo="text",
        marker=dict(
            size=size,
            color=graph_df["status"].map(status_color),
            line=dict(width=line_width, color="#0f172a"),
            opacity=np.where(graph_df["attempted"], 0.96, 0.45),
        ),
        name="Questions",
    )
    figure = go.Figure([edge_trace, node_trace])
    figure.update_layout(
        title=f"Student Progress Question Graph ({DATA_SOURCE})",
        height=780,
        template="plotly_white",
        showlegend=True,
        xaxis=dict(visible=False),
        yaxis=dict(visible=False),
        margin=dict(l=10, r=10, t=60, b=10),
    )
    figure.write_html(html_path, include_plotlyjs="cdn")
    print("Saved interactive graph:", html_path)
    figure.show()
else:
    fig, ax = plt.subplots(figsize=(12, 10))
    for left, right in path_edges:
        left_row = graph_df[graph_df["id"] == left]
        right_row = graph_df[graph_df["id"] == right]
        if not left_row.empty and not right_row.empty:
            ax.plot([left_row.iloc[0]["x"], right_row.iloc[0]["x"]], [left_row.iloc[0]["y"], right_row.iloc[0]["y"]], color="#2563eb", alpha=0.55)
    ax.scatter(graph_df["x"], graph_df["y"], c=graph_df["status"].map(status_color), s=size * 6, alpha=0.75)
    ax.set_title(f"Student Progress Question Graph ({DATA_SOURCE})")
    ax.axis("off")
    plt.show()
'''
    ),
    code(
        r'''# ============================================================
# 9. EXPORT CSV REPORTS
# ============================================================

prefix = STUDENT_ID[:8] if STUDENT_ID_IS_VALID else "student"
summary_path = ROOT / f"student_progress_summary_{prefix}.csv"
subject_path = ROOT / f"student_subject_performance_{prefix}.csv"
topic_path = ROOT / f"student_topic_priorities_{prefix}.csv"
next_path = ROOT / f"student_next_questions_{prefix}.csv"

summary_df.to_csv(summary_path, index=False)
subject_perf_df.to_csv(subject_path, index=False)
topic_perf_df.to_csv(topic_path, index=False)
next_questions_df.to_csv(next_path, index=False)

print("Saved:")
print(summary_path)
print(subject_path)
print(topic_path)
print(next_path)
if PLOTLY_AVAILABLE:
    print(html_path)
'''
    ),
    md(
        """## Notebook Complete

If the `Data source` metric says `Demo fallback`, the notebook ran correctly but could not see private Supabase rows. Add a valid `SUPABASE_ACCESS_TOKEN`, or run it while authenticated with student credentials, then re-run all cells.

The generated CSV and HTML files are saved in the project root next to this notebook.
"""
    ),
]

nb["cells"] = cells
nbf.write(nb, OUTPUT)
print(f"Wrote {OUTPUT}")
