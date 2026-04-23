import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "GATE_DA_Student_Progress_Analytics.ipynb"


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
        """# GATE DA Student Progress Analytics

This notebook is a full student-account analytics and recommendation-replay notebook.

Use it when you want to:
- inspect one student's profile, streak, account metadata, and activity
- review completed tests with per-question right/wrong outcomes
- reconstruct question timelines from `review_payload`
- compute report-style thresholds, weak-topic flags, rapid-guess thresholds, and score bands
- replay the adaptive recommendation engine step by step
- render an interactive graph over the complete project question dataset with the student's path overlaid

It reads:
- `profiles`
- `test_history`
- `user_progress`
- `answered_questions`
- `activity_events`

and exports the complete project question inventory from:
- practice bank
- adaptive subject-wise bank
- adaptive mix bank
- full GATE/mock papers

If row-level security blocks the request, paste a valid Supabase session token in the config cell below.
You can also provide email/password and let the notebook fetch a fresh session automatically.
"""
    ),
    code(
        """import base64
import json
import math
import re
import subprocess
import uuid
from collections import Counter, defaultdict, deque
from pathlib import Path
from urllib.parse import urlencode

import matplotlib.pyplot as plt
import networkx as nx
import numpy as np
import pandas as pd
import requests

from IPython.display import HTML, display
from matplotlib.gridspec import GridSpec

try:
    import plotly.graph_objects as go
    PLOTLY_AVAILABLE = True
except Exception:
    PLOTLY_AVAILABLE = False

ROOT = Path.cwd()
ENV_PATH = ROOT / ".env"
EXPORTER = ROOT / "tools" / "export_question_bank.mjs"
EXPORT_JSON = ROOT / "tmp_question_bank_export.json"

WEAK_TOPIC_THRESHOLD_REPORT = 0.60
REMEDIATION_STEPS_REPORT = 3
REMEDIATION_ACCURACY_REPORT = 0.75
PREDICTOR_UNLOCK_ELO_REPORT = 2500
PREDICTOR_UNLOCK_COMPLETION_REPORT = 0.70
PREDICTOR_UNLOCK_COMPLETION_UI = 1.00
REPORT_SCORE_WEIGHTS = {"accuracy": 0.40, "elo": 0.30, "consistency": 0.20, "improvement": 0.10}

DIFF_ORDER = {"easy": 0, "medium": 1, "hard": 2}
DIFF_SYMBOL = {"easy": "circle", "medium": "diamond", "hard": "square"}
STATUS_COLORS = {"correct": "#2ea043", "wrong": "#f85149", "unseen": "#8b949e"}
EDGE_KIND_COLORS = {"same-topic": "#3fb950", "subject-flow": "#58a6ff", "subject-bridge": "#f2cc60"}


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


ENV = read_env_file(ENV_PATH)
SUPABASE_URL = ENV.get("VITE_STUDENT_SUPABASE_URL")
SUPABASE_KEY = ENV.get("VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase URL or publishable key in .env")
"""
    ),
    code(
        """# ============================================================
# 1. CONFIG
# ============================================================

PLACEHOLDER_STUDENT_ID = "paste-student-user-id-here"
STUDENT_ID = globals().get("STUDENT_ID", None)

SUPABASE_ACCESS_TOKEN = globals().get("SUPABASE_ACCESS_TOKEN", None)
LOGIN_EMAIL = globals().get("LOGIN_EMAIL", None)
LOGIN_PASSWORD = globals().get("LOGIN_PASSWORD", None)

SIMULATION_TEST_ID = globals().get("SIMULATION_TEST_ID", None)
SIMULATION_START_ELO = int(globals().get("SIMULATION_START_ELO", 1600))
SIMULATION_BANK_MODE = str(globals().get("SIMULATION_BANK_MODE", "complete")).strip().lower()
SIMULATION_STEPS_AHEAD = int(globals().get("SIMULATION_STEPS_AHEAD", 8))


def validate_student_id(student_id: str) -> str:
    student_id = str(student_id).strip()
    if not student_id or student_id == PLACEHOLDER_STUDENT_ID:
        student_id = input("Enter STUDENT_ID (UUID): ").strip()
    if not student_id or student_id == PLACEHOLDER_STUDENT_ID:
        raise ValueError("A valid STUDENT_ID is required to continue.")
    try:
        uuid.UUID(student_id)
    except Exception as exc:
        raise ValueError(f"STUDENT_ID is not a valid UUID: {student_id}") from exc
    return student_id


def decode_jwt_payload(token: str | None):
    if not token or not isinstance(token, str) or token.count(".") < 2:
        return None
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return json.loads(base64.urlsafe_b64decode(payload.encode("utf-8")).decode("utf-8"))
    except Exception:
        return None


def fetch_access_token_with_password(email: str, password: str) -> str:
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={
            "apikey": SUPABASE_KEY,
            "Content-Type": "application/json",
        },
        json={"email": email, "password": password},
        timeout=30,
    )
    if not response.ok:
        detail = response.text
        try:
            detail = response.json().get("msg") or response.json().get("message") or detail
        except Exception:
            pass
        if response.status_code == 400 and "invalid_credentials" in response.text:
            raise RuntimeError(
                "Supabase login failed because LOGIN_EMAIL or LOGIN_PASSWORD is invalid. "
                "Update those values, or clear them and provide a fresh SUPABASE_ACCESS_TOKEN instead."
            )
        raise RuntimeError(f"Supabase login failed: {response.status_code} {detail}")
    body = response.json()
    access_token = body.get("access_token")
    if not access_token:
        raise RuntimeError("Supabase login succeeded but no access token was returned.")
    return access_token


def auth_headers(access_token: str | None = None):
    bearer = access_token or SUPABASE_ACCESS_TOKEN or SUPABASE_KEY
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {bearer}",
        "Accept": "application/json",
    }


def supabase_select(table: str, or_filter: str | None = None, **filters):
    global SUPABASE_ACCESS_TOKEN
    params = {"select": "*"}
    if or_filter:
        params["or"] = or_filter
    for key, value in filters.items():
        params[key] = f"eq.{value}"
    url = f"{SUPABASE_URL}/rest/v1/{table}?{urlencode(params)}"
    response = requests.get(url, headers=auth_headers(), timeout=30)
    if (
        response.status_code == 401
        and "JWT expired" in response.text
        and LOGIN_EMAIL
        and LOGIN_PASSWORD
    ):
        SUPABASE_ACCESS_TOKEN = fetch_access_token_with_password(LOGIN_EMAIL, LOGIN_PASSWORD)
        response = requests.get(url, headers=auth_headers(SUPABASE_ACCESS_TOKEN), timeout=30)
    if not response.ok:
        if response.status_code == 401 and "JWT expired" in response.text:
            raise RuntimeError(
                "Supabase JWT expired. Clear SUPABASE_ACCESS_TOKEN and either paste a fresh token "
                "or set LOGIN_EMAIL and LOGIN_PASSWORD so the notebook can fetch a new session."
            )
        raise RuntimeError(
            f"Supabase query failed for {table}: {response.status_code} {response.text}"
        )
    return response.json()


def safe_supabase_select(table: str, *, allow_missing_table: bool = False, **filters):
    try:
        return supabase_select(table, **filters)
    except RuntimeError as exc:
        message = str(exc)
        if allow_missing_table and (
            "PGRST205" in message
            or "Could not find the table" in message
            or f"for {table}: 404" in message
        ):
            print(
                f"Table '{table}' is not available yet. Skipping it for now. "
                "Apply the latest Supabase migration if you want this data."
            )
            return []
        raise
"""
    ),
    code(
        """# ============================================================
# 2. EXPORT COMPLETE QUESTION DATASET + LOAD STUDENT TABLES
# ============================================================

STUDENT_ID = validate_student_id(STUDENT_ID)
print("Using STUDENT_ID:", STUDENT_ID)

jwt_payload = decode_jwt_payload(SUPABASE_ACCESS_TOKEN)
if jwt_payload:
    token_sub = jwt_payload.get("sub")
    token_email = jwt_payload.get("email")
    token_exp = jwt_payload.get("exp")
    print("JWT subject:", token_sub)
    print("JWT email:", token_email)
    if token_sub and token_sub != STUDENT_ID:
        print("Warning: the JWT subject does not match STUDENT_ID. RLS may block this student's rows.")
    if token_exp:
        exp_ts = pd.to_datetime(int(token_exp), unit="s", utc=True)
        print("JWT expiry (UTC):", exp_ts)

if not SUPABASE_ACCESS_TOKEN and LOGIN_EMAIL and LOGIN_PASSWORD:
    try:
        SUPABASE_ACCESS_TOKEN = fetch_access_token_with_password(LOGIN_EMAIL, LOGIN_PASSWORD)
        print("Authenticated with email/password and obtained a session token.")
    except RuntimeError as exc:
        raise RuntimeError(
            "Notebook authentication failed before loading student data. "
            "Either set valid LOGIN_EMAIL/LOGIN_PASSWORD, or clear them and paste a fresh "
            "SUPABASE_ACCESS_TOKEN in the config cell."
        ) from exc
elif not SUPABASE_ACCESS_TOKEN:
    print(
        "No explicit session token provided. Queries will use only the publishable key, "
        "which may return empty data because of row-level security."
    )

subprocess.run(["node", str(EXPORTER), str(EXPORT_JSON)], check=True, cwd=ROOT)
export_payload = json.loads(EXPORT_JSON.read_text(encoding="utf-8"))

subjects_meta = export_payload.get("subjects", [])
subject_lookup = {item.get("id"): item for item in subjects_meta}
topic_lookup = {
    (subject.get("id"), topic.get("id")): topic
    for subject in subjects_meta
    for topic in subject.get("topics", [])
}


def get_subject_name(subject_id: str | None) -> str:
    subject = subject_lookup.get(subject_id or "")
    return subject.get("name") if subject else (subject_id or "unknown-subject")


def get_topic_name(subject_id: str | None, topic_id: str | None) -> str:
    topic = topic_lookup.get((subject_id or "", topic_id or ""))
    return topic.get("name") if topic else (topic_id or "unknown-topic")


def normalize_question_record(question: dict, source_tag: str, source_group: str) -> dict:
    row = dict(question)
    row["source_tag"] = source_tag
    row["source_group"] = source_group
    row["subjectName"] = get_subject_name(row.get("subjectId"))
    row["topicName"] = get_topic_name(row.get("subjectId"), row.get("topicId"))
    return row


question_rows = []
for item in export_payload.get("questions", []):
    question_rows.append(normalize_question_record(item, "practice-bank", "practice"))
for item in export_payload.get("adaptiveQuestions", []):
    question_rows.append(normalize_question_record(item, "adaptive-subject-bank", "adaptive"))
for item in export_payload.get("adaptiveMixQuestions", []):
    question_rows.append(normalize_question_record(item, "adaptive-mix-bank", "adaptive"))
for test in export_payload.get("tests", []):
    for question in test.get("questions", []):
        row = normalize_question_record(question, f"full-test::{test.get('id')}", "full-test")
        row["fullTestId"] = test.get("id")
        row["fullTestLabel"] = test.get("label")
        question_rows.append(row)

question_bank_full = pd.DataFrame(question_rows)
if question_bank_full.empty:
    raise RuntimeError("The project question export is empty.")

for column, default_value in {
    "difficulty": "medium",
    "eloRating": 1400,
    "marks": 1,
    "negativeMarks": 0,
    "type": "mcq",
}.items():
    if column not in question_bank_full.columns:
        question_bank_full[column] = default_value

question_bank_full["difficulty"] = question_bank_full["difficulty"].fillna("medium").str.lower()
question_bank_full["eloRating"] = pd.to_numeric(question_bank_full["eloRating"], errors="coerce").fillna(1400)
question_bank_full["marks"] = pd.to_numeric(question_bank_full["marks"], errors="coerce").fillna(1)
question_bank_full["negativeMarks"] = pd.to_numeric(question_bank_full["negativeMarks"], errors="coerce").fillna(0)

question_bank_full = (
    question_bank_full.sort_values(["id", "source_tag"])
    .groupby("id", as_index=False)
    .agg(
        {
            "subjectId": "first",
            "topicId": "first",
            "subjectName": "first",
            "topicName": "first",
            "question": "first",
            "options": "first",
            "correctAnswer": "first",
            "correctAnswers": "first" if "correctAnswers" in question_bank_full.columns else lambda values: None,
            "correctNat": "first" if "correctNat" in question_bank_full.columns else lambda values: None,
            "type": "first",
            "explanation": "first",
            "difficulty": "first",
            "eloRating": "first",
            "marks": "first",
            "negativeMarks": "first",
            "source_tag": lambda values: sorted(set(str(value) for value in values if pd.notna(value))),
            "source_group": lambda values: sorted(set(str(value) for value in values if pd.notna(value))),
            "fullTestId": lambda values: sorted(set(str(value) for value in values if pd.notna(value))),
            "fullTestLabel": lambda values: sorted(set(str(value) for value in values if pd.notna(value))),
        }
    )
)

adaptive_live_ids = {
    item.get("id")
    for item in export_payload.get("adaptiveMixQuestions", []) + export_payload.get("adaptiveQuestions", [])
    if item.get("id")
}
question_bank_full["is_live_adaptive_eligible"] = question_bank_full["id"].isin(adaptive_live_ids)
question_lookup = {row["id"]: row for row in question_bank_full.to_dict("records")}

profiles_df = pd.DataFrame(supabase_select("profiles", user_id=STUDENT_ID))
test_history_df = pd.DataFrame(supabase_select("test_history", user_id=STUDENT_ID))
user_progress_df = pd.DataFrame(supabase_select("user_progress", user_id=STUDENT_ID))
answered_df = pd.DataFrame(supabase_select("answered_questions", user_id=STUDENT_ID))
activity_df = pd.DataFrame(
    safe_supabase_select(
        "activity_events",
        allow_missing_table=True,
        or_filter=f"(actor_id.eq.{STUDENT_ID},target_user_id.eq.{STUDENT_ID})",
    )
)

if profiles_df.empty and test_history_df.empty and user_progress_df.empty and answered_df.empty and activity_df.empty:
    print(
        "No visible rows were returned. If this student has activity, the most likely cause is row-level security. "
        "Provide SUPABASE_ACCESS_TOKEN or LOGIN_EMAIL/LOGIN_PASSWORD in the config cell."
    )

for df_name, date_columns in [
    ("profiles_df", ["created_at", "updated_at", "last_active"]),
    ("test_history_df", ["completed_at"]),
    ("user_progress_df", ["last_practiced"]),
    ("answered_df", ["answered_at"]),
    ("activity_df", ["created_at"]),
]:
    df = globals()[df_name]
    if df.empty:
        continue
    for column in date_columns:
        if column in df.columns:
            df[column] = pd.to_datetime(df[column], errors="coerce", utc=True)

if not test_history_df.empty:
    test_history_df = test_history_df.sort_values(["completed_at", "id"]).reset_index(drop=True)
    test_history_df["accuracy_pct"] = np.where(
        test_history_df["total_questions"] > 0,
        100 * test_history_df["correct_answers"] / test_history_df["total_questions"],
        np.nan,
    )
    test_history_df["score_pct"] = np.where(
        test_history_df["max_score"] > 0,
        100 * test_history_df["score"] / test_history_df["max_score"],
        np.nan,
    )


def parse_review_payload(value):
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            return json.loads(text)
        except Exception:
            return None
    if isinstance(value, dict):
        return value
    return None


def is_unanswered_answer(answer):
    if answer is None:
        return True
    if isinstance(answer, float) and pd.isna(answer):
        return True
    if isinstance(answer, str) and not answer.strip():
        return True
    if isinstance(answer, list) and len(answer) == 0:
        return True
    return False


def normalize_answer(answer):
    if isinstance(answer, list):
        return [item for item in answer if item is not None]
    return answer


def is_question_correct(question_record: dict | None, answer):
    if question_record is None or is_unanswered_answer(answer):
        return False

    answer = normalize_answer(answer)
    qtype = question_record.get("type", "mcq")

    if qtype == "mcq":
        return answer == question_record.get("correctAnswer")

    if qtype == "msq":
        correct_answers = question_record.get("correctAnswers") or []
        return sorted(answer) == sorted(correct_answers) if isinstance(answer, list) else False

    if qtype == "nat":
        correct_nat = question_record.get("correctNat") or {}
        try:
            numeric_value = float(answer)
        except Exception:
            return False
        minimum = correct_nat.get("min")
        maximum = correct_nat.get("max")
        if minimum is None or maximum is None:
            return False
        return float(minimum) <= numeric_value <= float(maximum)

    return False


def get_review_state(question_record: dict | None, answer):
    if is_unanswered_answer(answer):
        return "unanswered"
    return "correct" if is_question_correct(question_record, answer) else "wrong"


def resolve_question_record(question_id: str, snapshot_by_id: dict | None = None):
    if snapshot_by_id and question_id in snapshot_by_id:
        return snapshot_by_id[question_id]
    return question_lookup.get(question_id)


question_timeline_rows = []
for row in test_history_df.itertuples(index=False):
    payload = parse_review_payload(getattr(row, "review_payload", None))
    if not payload:
        continue

    question_ids = payload.get("question_ids") or payload.get("questionIds") or []
    answers = payload.get("answers") or []
    question_reviews = payload.get("question_reviews") or payload.get("questionReviews") or []
    question_snapshots = payload.get("question_snapshots") or payload.get("questionSnapshots") or []

    snapshot_by_id = {
        item.get("id"): {
            **item,
            "subjectName": get_subject_name(item.get("subjectId")),
            "topicName": get_topic_name(item.get("subjectId"), item.get("topicId")),
        }
        for item in question_snapshots
        if isinstance(item, dict) and item.get("id")
    }
    review_by_id = {
        item.get("questionId"): item
        for item in question_reviews
        if isinstance(item, dict) and item.get("questionId")
    }

    for index, question_id in enumerate(question_ids, start=1):
        question_record = resolve_question_record(question_id, snapshot_by_id)
        answer = answers[index - 1] if index - 1 < len(answers) else None
        review = review_by_id.get(question_id, {})

        correct_value = review.get("correct")
        if correct_value is None:
            correct_value = is_question_correct(question_record, answer) if question_record else None

        question_timeline_rows.append(
            {
                "test_id": row.id,
                "test_type": row.test_type,
                "completed_at": row.completed_at,
                "subject_id": row.subject_id,
                "topic_id": row.topic_id,
                "score": row.score,
                "max_score": row.max_score,
                "step_number": index,
                "question_id": question_id,
                "question_text": question_record.get("question") if question_record else question_id,
                "question_type": question_record.get("type") if question_record else None,
                "difficulty": question_record.get("difficulty") if question_record else None,
                "question_elo": float(question_record.get("eloRating", np.nan)) if question_record else np.nan,
                "marks": float(question_record.get("marks", np.nan)) if question_record else np.nan,
                "subjectId": question_record.get("subjectId") if question_record else None,
                "topicId": question_record.get("topicId") if question_record else None,
                "subjectName": question_record.get("subjectName") if question_record else get_subject_name(row.subject_id),
                "topicName": question_record.get("topicName") if question_record else get_topic_name(row.subject_id, row.topic_id),
                "answer": answer,
                "answer_state": get_review_state(question_record, answer),
                "answered": not is_unanswered_answer(answer),
                "correct": bool(correct_value) if correct_value is not None else None,
                "time_spent_seconds": review.get("timeSpentSeconds"),
                "rapid_guess_warning": review.get("rapidGuessWarning"),
                "rapid_guess_threshold_seconds": review.get("rapidGuessThresholdSeconds"),
                "elo_adjustment": review.get("eloAdjustment"),
                "warning_text": review.get("warningText"),
                "remediation_for_question_id": review.get("remediationForQuestionId"),
            }
        )

student_question_timeline_df = pd.DataFrame(question_timeline_rows)
if not student_question_timeline_df.empty:
    student_question_timeline_df["completed_at"] = pd.to_datetime(
        student_question_timeline_df["completed_at"], errors="coerce", utc=True
    )
    student_question_timeline_df = student_question_timeline_df.sort_values(
        ["completed_at", "test_id", "step_number"]
    ).reset_index(drop=True)

if not answered_df.empty:
    answered_enriched_df = answered_df.merge(
        question_bank_full[
            ["id", "subjectId", "topicId", "subjectName", "topicName", "difficulty", "eloRating", "marks", "type"]
        ],
        left_on="question_id",
        right_on="id",
        how="left",
    )
else:
    answered_enriched_df = answered_df.copy()

print("Unique questions in consolidated dataset:", len(question_bank_full))
print("Adaptive-eligible questions in live banks:", int(question_bank_full["is_live_adaptive_eligible"].sum()))
print("Tests loaded for student:", len(test_history_df))
print("Question timeline rows reconstructed from review_payload:", len(student_question_timeline_df))

display(profiles_df)
display(test_history_df.head(10))
display(student_question_timeline_df.head(20))
display(activity_df.head(20))
"""
    ),
    code(
        """# ============================================================
# 3. ACCOUNT, PERFORMANCE, THRESHOLDS, AND REPORT-STYLE SCORE MODEL
# ============================================================

profile = profiles_df.iloc[0].to_dict() if not profiles_df.empty else {}
current_elo = int(profile.get("elo_rating", 1500) or 1500)

question_attempts_df = student_question_timeline_df.copy()
answered_attempts_df = (
    question_attempts_df[question_attempts_df["answered"] == True].copy()
    if not question_attempts_df.empty
    else pd.DataFrame()
)
correct_attempts_df = (
    answered_attempts_df[answered_attempts_df["correct"] == True].copy()
    if not answered_attempts_df.empty
    else pd.DataFrame()
)
wrong_attempts_df = (
    answered_attempts_df[answered_attempts_df["correct"] == False].copy()
    if not answered_attempts_df.empty
    else pd.DataFrame()
)

account_summary_df = pd.DataFrame(
    [
        {
            "student_user_id": STUDENT_ID,
            "profile_row_id": profile.get("id"),
            "full_name": profile.get("full_name"),
            "email": profile.get("email"),
            "role": profile.get("role"),
            "elo_rating": current_elo,
            "streak_count": profile.get("streak_count"),
            "study_goal": profile.get("study_goal"),
            "theme": profile.get("theme"),
            "last_active": profile.get("last_active"),
            "created_at": profile.get("created_at"),
            "updated_at": profile.get("updated_at"),
        }
    ]
)

test_summary_df = (
    test_history_df.groupby("test_type", dropna=False)
    .agg(
        tests_completed=("id", "count"),
        total_questions=("total_questions", "sum"),
        questions_attempted=("questions_attempted", "sum"),
        correct_answers=("correct_answers", "sum"),
        mean_accuracy_pct=("accuracy_pct", "mean"),
        mean_score_pct=("score_pct", "mean"),
        total_duration_seconds=("duration_seconds", "sum"),
    )
    .reset_index()
    .sort_values(["tests_completed", "mean_accuracy_pct"], ascending=[False, False])
    if not test_history_df.empty
    else pd.DataFrame(
        columns=[
            "test_type",
            "tests_completed",
            "total_questions",
            "questions_attempted",
            "correct_answers",
            "mean_accuracy_pct",
            "mean_score_pct",
            "total_duration_seconds",
        ]
    )
)

if not user_progress_df.empty:
    user_progress_df["accuracy_pct"] = np.where(
        user_progress_df["total"] > 0,
        100 * user_progress_df["correct"] / user_progress_df["total"],
        np.nan,
    )

subject_progress_df = (
    user_progress_df[(user_progress_df["topic_id"].isna()) | (user_progress_df["topic_id"] == "__overall__")].copy()
    if not user_progress_df.empty
    else pd.DataFrame()
)

if not subject_progress_df.empty:
    subject_progress_df["subjectName"] = subject_progress_df["subject_id"].map(get_subject_name)
    subject_progress_df = subject_progress_df.rename(
        columns={"subject_id": "subjectId", "correct": "correctAnswers", "total": "totalAnswers"}
    )
else:
    if answered_attempts_df.empty:
        subject_progress_df = pd.DataFrame(
            columns=["subjectId", "subjectName", "correctAnswers", "totalAnswers", "accuracy_pct"]
        )
    else:
        subject_progress_df = (
            answered_attempts_df.groupby(["subjectId", "subjectName"], dropna=False)["correct"]
            .agg(["count", "sum"])
            .reset_index()
            .rename(columns={"count": "totalAnswers", "sum": "correctAnswers"})
        )
        subject_progress_df["accuracy_pct"] = np.where(
            subject_progress_df["totalAnswers"] > 0,
            100 * subject_progress_df["correctAnswers"] / subject_progress_df["totalAnswers"],
            np.nan,
        )

topic_progress_df = (
    user_progress_df[
        user_progress_df["topic_id"].notna() & (user_progress_df["topic_id"] != "__overall__")
    ].copy()
    if not user_progress_df.empty
    else pd.DataFrame()
)
if not topic_progress_df.empty:
    topic_progress_df["subjectName"] = topic_progress_df["subject_id"].map(get_subject_name)
    topic_progress_df["topicName"] = topic_progress_df.apply(
        lambda row: get_topic_name(row["subject_id"], row["topic_id"]), axis=1
    )
    topic_progress_df = topic_progress_df.rename(
        columns={
            "subject_id": "subjectId",
            "topic_id": "topicId",
            "correct": "correctAnswers",
            "total": "totalAnswers",
        }
    )
else:
    if answered_attempts_df.empty:
        topic_progress_df = pd.DataFrame(
            columns=[
                "subjectId",
                "topicId",
                "subjectName",
                "topicName",
                "correctAnswers",
                "totalAnswers",
                "accuracy_pct",
            ]
        )
    else:
        topic_progress_df = (
            answered_attempts_df.groupby(["subjectId", "topicId", "subjectName", "topicName"], dropna=False)["correct"]
            .agg(["count", "sum"])
            .reset_index()
            .rename(columns={"count": "totalAnswers", "sum": "correctAnswers"})
        )

if not topic_progress_df.empty and "accuracy_pct" not in topic_progress_df.columns:
    topic_progress_df["accuracy_pct"] = np.where(
        topic_progress_df["totalAnswers"] > 0,
        100 * topic_progress_df["correctAnswers"] / topic_progress_df["totalAnswers"],
        np.nan,
    )

weak_topics_report_df = (
    topic_progress_df[topic_progress_df["accuracy_pct"] < WEAK_TOPIC_THRESHOLD_REPORT * 100]
    .sort_values(["accuracy_pct", "totalAnswers"], ascending=[True, False])
    .reset_index(drop=True)
    if not topic_progress_df.empty
    else pd.DataFrame(columns=topic_progress_df.columns)
)

question_outcome_summary_df = pd.DataFrame(
    [
        {"metric": "tests_completed", "value": int(len(test_history_df))},
        {"metric": "unique_tests_completed", "value": int(test_history_df["id"].nunique()) if not test_history_df.empty else 0},
        {"metric": "questions_answered", "value": int(len(answered_attempts_df)) if not answered_attempts_df.empty else 0},
        {"metric": "correct_answers", "value": int(len(correct_attempts_df)) if not correct_attempts_df.empty else 0},
        {"metric": "wrong_answers", "value": int(len(wrong_attempts_df)) if not wrong_attempts_df.empty else 0},
        {
            "metric": "unique_questions_attempted",
            "value": int(answered_attempts_df["question_id"].nunique()) if not answered_attempts_df.empty else 0,
        },
        {
            "metric": "coverage_percent_of_full_dataset",
            "value": round(
                100
                * (
                    answered_attempts_df["question_id"].nunique() / max(len(question_bank_full), 1)
                    if not answered_attempts_df.empty
                    else 0
                ),
                2,
            ),
        },
        {
            "metric": "rapid_guess_flags",
            "value": int(
                question_attempts_df["rapid_guess_warning"].fillna(False).astype(bool).sum()
            )
            if not question_attempts_df.empty
            else 0,
        },
    ]
)

activity_summary_df = (
    activity_df.groupby("event_type").size().reset_index(name="count").sort_values("count", ascending=False)
    if not activity_df.empty
    else pd.DataFrame(columns=["event_type", "count"])
)

available_full_tests_count = len(export_payload.get("tests", []))
available_topic_count = sum(len(subject.get("topics", [])) for subject in subjects_meta)
available_subject_count = len(subjects_meta)

full_mock_completion_live = (
    min(
        1.0,
        test_history_df[test_history_df["test_type"] == "full-mock"]["id"].nunique() / max(available_full_tests_count, 1),
    )
    if not test_history_df.empty
    else 0.0
)
topic_wise_completion_live = (
    min(
        1.0,
        test_history_df[
            (test_history_df["test_type"] == "topic-wise") & test_history_df["topic_id"].notna()
        ]["topic_id"].nunique()
        / max(available_topic_count, 1),
    )
    if not test_history_df.empty
    else 0.0
)
adaptive_completion_live = (
    min(
        1.0,
        test_history_df[
            (test_history_df["test_type"] == "adaptive") & test_history_df["subject_id"].notna()
        ]["subject_id"].nunique()
        / max(available_subject_count, 1),
    )
    if not test_history_df.empty
    else 0.0
)

accuracy_raw = (
    len(correct_attempts_df) / max(len(answered_attempts_df), 1)
    if not answered_attempts_df.empty
    else 0.0
)
accuracy_norm = max(0.0, min(1.0, (accuracy_raw - 0.50) / 0.35))
elo_norm = max(0.0, min(1.0, (current_elo - 1600) / 1200))

subject_accuracy_values = (
    (subject_progress_df["accuracy_pct"].dropna() / 100).tolist()
    if not subject_progress_df.empty
    else []
)
if subject_accuracy_values:
    subject_mean = float(np.mean(subject_accuracy_values))
    subject_std = float(np.std(subject_accuracy_values))
    consistency_raw = 1 - subject_std / max(subject_mean + 0.01, 0.01)
    consistency_norm = max(0.0, min(1.0, consistency_raw))
else:
    subject_mean = np.nan
    subject_std = np.nan
    consistency_raw = np.nan
    consistency_norm = 0.0

if not answered_attempts_df.empty and "completed_at" in answered_attempts_df.columns:
    latest_answered_at = answered_attempts_df["completed_at"].max()
    recent_cutoff = latest_answered_at - pd.Timedelta(days=14)
    recent_df = answered_attempts_df[answered_attempts_df["completed_at"] >= recent_cutoff]
    prior_df = answered_attempts_df[answered_attempts_df["completed_at"] < recent_cutoff]
    recent_accuracy = len(recent_df[recent_df["correct"] == True]) / max(len(recent_df), 1) if len(recent_df) > 0 else accuracy_raw
    prior_accuracy = len(prior_df[prior_df["correct"] == True]) / max(len(prior_df), 1) if len(prior_df) > 0 else accuracy_raw
    improvement_delta = recent_accuracy - prior_accuracy
else:
    recent_accuracy = accuracy_raw
    prior_accuracy = accuracy_raw
    improvement_delta = 0.0

improvement_raw = min(0.15, improvement_delta) if improvement_delta > 0 else max(-0.15, improvement_delta)
improvement_norm = max(0.0, min(1.0, (improvement_raw + 0.15) / 0.30))

score_basis = (
    REPORT_SCORE_WEIGHTS["accuracy"] * accuracy_norm
    + REPORT_SCORE_WEIGHTS["elo"] * elo_norm
    + REPORT_SCORE_WEIGHTS["consistency"] * consistency_norm
    + REPORT_SCORE_WEIGHTS["improvement"] * improvement_norm
)
expected_score_report = 40 + 50 * score_basis
minimum_score_report = expected_score_report - 10 * (1 - score_basis)
maximum_score_report = expected_score_report + 10 * score_basis
completion_rate_all = (
    answered_attempts_df["question_id"].nunique() / max(len(question_bank_full), 1)
    if not answered_attempts_df.empty
    else 0.0
)
confidence_report = max(0.50, min(1.00, 0.50 + 0.40 * score_basis + 0.10 * completion_rate_all))

predictor_unlocked_report = (
    current_elo >= PREDICTOR_UNLOCK_ELO_REPORT
    and full_mock_completion_live >= PREDICTOR_UNLOCK_COMPLETION_REPORT
    and topic_wise_completion_live >= PREDICTOR_UNLOCK_COMPLETION_REPORT
    and adaptive_completion_live >= PREDICTOR_UNLOCK_COMPLETION_REPORT
)
predictor_unlocked_ui = (
    current_elo >= PREDICTOR_UNLOCK_ELO_REPORT
    and full_mock_completion_live >= PREDICTOR_UNLOCK_COMPLETION_UI
    and topic_wise_completion_live >= PREDICTOR_UNLOCK_COMPLETION_UI
    and adaptive_completion_live >= PREDICTOR_UNLOCK_COMPLETION_UI
)

threshold_summary_df = pd.DataFrame(
    [
        {"threshold_area": "weak_topic_report", "value": "60%", "notes": "Topic accuracy below 60% is treated as weak in the report."},
        {"threshold_area": "rapid_guess_alpha_0", "value": "10s", "notes": "Baseline minimum solve time."},
        {"threshold_area": "rapid_guess_alpha_1", "value": "0.02", "notes": "Seconds per question-stem character."},
        {"threshold_area": "rapid_guess_alpha_2", "value": "0.01", "notes": "Seconds per option-set character."},
        {"threshold_area": "rapid_guess_alpha_3", "value": "30s", "notes": "Extra time for high-complexity questions."},
        {"threshold_area": "remediation_steps_report", "value": REMEDIATION_STEPS_REPORT, "notes": "Report remediation step threshold."},
        {"threshold_area": "remediation_accuracy_report", "value": REMEDIATION_ACCURACY_REPORT, "notes": "Report remediation accuracy threshold."},
        {"threshold_area": "predictor_unlock_report_completion", "value": "70%", "notes": "Report unlock requirement for full-mock/topic-wise/adaptive coverage."},
        {"threshold_area": "predictor_unlock_ui_completion", "value": "100%", "notes": "Current UI component threshold in GateScorePrediction.tsx."},
        {"threshold_area": "predictor_unlock_elo", "value": PREDICTOR_UNLOCK_ELO_REPORT, "notes": "Report and UI both use 2500 ELO for unlock."},
    ]
)

score_formula_df = pd.DataFrame(
    [
        {"component": "accuracy_raw", "value": round(accuracy_raw, 4)},
        {"component": "accuracy_norm", "value": round(accuracy_norm, 4)},
        {"component": "elo_norm", "value": round(elo_norm, 4)},
        {"component": "consistency_raw", "value": round(consistency_raw, 4) if pd.notna(consistency_raw) else np.nan},
        {"component": "consistency_norm", "value": round(consistency_norm, 4)},
        {"component": "recent_accuracy", "value": round(recent_accuracy, 4)},
        {"component": "prior_accuracy", "value": round(prior_accuracy, 4)},
        {"component": "improvement_delta", "value": round(improvement_delta, 4)},
        {"component": "improvement_norm", "value": round(improvement_norm, 4)},
        {"component": "score_basis", "value": round(score_basis, 4)},
        {"component": "expected_score_report", "value": round(expected_score_report, 2)},
        {"component": "minimum_score_report", "value": round(minimum_score_report, 2)},
        {"component": "maximum_score_report", "value": round(maximum_score_report, 2)},
        {"component": "confidence_report", "value": round(confidence_report, 4)},
        {"component": "completion_rate_all", "value": round(completion_rate_all, 4)},
        {"component": "full_mock_completion_live", "value": round(full_mock_completion_live, 4)},
        {"component": "topic_wise_completion_live", "value": round(topic_wise_completion_live, 4)},
        {"component": "adaptive_completion_live", "value": round(adaptive_completion_live, 4)},
        {"component": "predictor_unlocked_report", "value": predictor_unlocked_report},
        {"component": "predictor_unlocked_ui", "value": predictor_unlocked_ui},
    ]
)

rapid_guess_rows_df = (
    question_attempts_df[question_attempts_df["rapid_guess_warning"].fillna(False) == True]
    .sort_values(["completed_at", "step_number"])
    .reset_index(drop=True)
    if not question_attempts_df.empty
    else pd.DataFrame()
)

display(account_summary_df)
display(test_summary_df)
display(question_outcome_summary_df)
display(subject_progress_df.head(20))
display(topic_progress_df.head(20))
display(weak_topics_report_df.head(20))
display(activity_summary_df.head(20))
display(threshold_summary_df)
display(score_formula_df)
if not rapid_guess_rows_df.empty:
    display(
        rapid_guess_rows_df[
            [
                "completed_at",
                "test_id",
                "step_number",
                "question_id",
                "question_text",
                "time_spent_seconds",
                "rapid_guess_threshold_seconds",
                "warning_text",
            ]
        ].head(20)
    )
"""
    ),
    code(
        """# ============================================================
# 4. LIVE ADAPTIVE ENGINE REPLAY HELPERS
# ============================================================

GRAPH_NEIGHBOR_WEIGHT = 34
GRAPH_FALLBACK_WEIGHT = 14

RAPID_GUESS_ALPHA_0 = 10
RAPID_GUESS_ALPHA_1 = 0.02
RAPID_GUESS_ALPHA_2 = 0.01
RAPID_GUESS_ALPHA_3 = 30
RAPID_GUESS_MAX_PENALTY = 20
MULTI_STEP_PATTERN = re.compile(
    r"\\b(select all that apply|which of the following statements|using the following|based on the following)\\b",
    re.IGNORECASE,
)
COMPUTATION_PATTERN = re.compile(
    r"\\b(calculate|compute|determine|evaluate|solve|derive|trace|determinant|eigenvalue|probability|expected value|variance|standard deviation|time complexity|space complexity)\\b",
    re.IGNORECASE,
)


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def round_num(value, decimals=4):
    return float(np.round(value, decimals))


def get_topic_label(topic_id: str | None) -> str:
    if not topic_id:
        return "general"
    topic_name = None
    for (subject_id, lookup_topic_id), topic in topic_lookup.items():
        if lookup_topic_id == topic_id:
            topic_name = topic.get("name")
            break
    return topic_name or str(topic_id).replace("-", " ")


def choose_anchor_question(question_records):
    if not question_records:
        return None
    average_elo = np.mean([item.get("eloRating", 1400) for item in question_records])

    def anchor_score(item):
        if item.get("difficulty") == "medium":
            penalty = 0
        elif item.get("difficulty") == "easy":
            penalty = 20
        else:
            penalty = 30
        return abs(item.get("eloRating", 1400) - average_elo) + penalty, item.get("id")

    return sorted(question_records, key=anchor_score)[0]


def get_transition_weight(from_question, to_question):
    if from_question.get("id") == to_question.get("id"):
        return 0.0
    if from_question.get("subjectId") != to_question.get("subjectId"):
        return 0.0

    same_topic = from_question.get("topicId") == to_question.get("topicId")
    difficulty_gap = DIFF_ORDER.get(to_question.get("difficulty"), 1) - DIFF_ORDER.get(from_question.get("difficulty"), 1)
    elo_delta = float(to_question.get("eloRating", 1400)) - float(from_question.get("eloRating", 1400))
    elo_closeness = 1 - clamp(abs(elo_delta) / 320, 0, 1)
    progression_fit = 1 - clamp(abs(elo_delta - 35) / 320, 0, 1)
    if difficulty_gap == 0:
        difficulty_fit = 0.92
    elif difficulty_gap == 1:
        difficulty_fit = 1.0
    elif difficulty_gap == -1:
        difficulty_fit = 0.72
    else:
        difficulty_fit = 0.35
    type_fit = 1.0 if from_question.get("type") == to_question.get("type") else 0.68
    mark_fit = 1.0 if from_question.get("marks") == to_question.get("marks") else 0.8

    return round_num(
        clamp(
            (0.46 if same_topic else 0.16)
            + elo_closeness * 0.20
            + progression_fit * 0.12
            + difficulty_fit * 0.10
            + type_fit * 0.07
            + mark_fit * 0.05,
            0.05,
            0.99,
        )
    )


def create_graph_edge(source_id, target_id, weight, kind, same_topic):
    return {
        "sourceId": source_id,
        "targetId": target_id,
        "weight": round_num(weight),
        "kind": kind,
        "sameTopic": same_topic,
    }


def upsert_graph_edge(edge_buckets, edge):
    source_bucket = edge_buckets[edge["sourceId"]]
    existing = source_bucket.get(edge["targetId"])
    if (
        existing is None
        or edge["weight"] > existing["weight"]
        or (
            edge["weight"] == existing["weight"]
            and edge["kind"] == "same-topic"
            and existing["kind"] != "same-topic"
        )
    ):
        source_bucket[edge["targetId"]] = edge


def build_question_recommendation_graph(question_records):
    edge_buckets = defaultdict(dict)
    question_by_id = {item["id"]: item for item in question_records}
    subject_map = defaultdict(list)
    for question in question_records:
        subject_map[question.get("subjectId")].append(question)

    sorted_subject_ids = sorted(subject_map.keys(), key=lambda value: str(value))
    subject_anchors = []

    for subject_id in sorted_subject_ids:
        subject_questions = subject_map.get(subject_id, [])
        topic_map = defaultdict(list)
        for question in subject_questions:
            topic_map[question.get("topicId")].append(question)

        topic_anchors = []
        for topic_id, topic_questions in sorted(topic_map.items(), key=lambda item: str(item[0])):
            anchor_question = choose_anchor_question(topic_questions)
            if anchor_question:
                topic_anchors.append({"topicId": topic_id, "question": anchor_question})

        subject_anchor = choose_anchor_question(subject_questions)
        if subject_anchor:
            subject_anchors.append({"subjectId": subject_id, "questionId": subject_anchor["id"]})

        for topic_anchor in topic_anchors:
            anchor_question = topic_anchor["question"]
            if not subject_anchor or subject_anchor["id"] == anchor_question["id"]:
                continue
            bridge_weight = round_num((get_transition_weight(subject_anchor, anchor_question) + 0.22) / 2)
            upsert_graph_edge(
                edge_buckets,
                create_graph_edge(subject_anchor["id"], anchor_question["id"], bridge_weight, "subject-flow", False),
            )
            upsert_graph_edge(
                edge_buckets,
                create_graph_edge(anchor_question["id"], subject_anchor["id"], bridge_weight, "subject-flow", False),
            )

        for index in range(1, len(topic_anchors)):
            previous_anchor = topic_anchors[index - 1]["question"]
            next_anchor = topic_anchors[index]["question"]
            bridge_weight = round_num((get_transition_weight(previous_anchor, next_anchor) + 0.18) / 2)
            upsert_graph_edge(
                edge_buckets,
                create_graph_edge(previous_anchor["id"], next_anchor["id"], bridge_weight, "subject-flow", False),
            )
            upsert_graph_edge(
                edge_buckets,
                create_graph_edge(next_anchor["id"], previous_anchor["id"], bridge_weight, "subject-flow", False),
            )

        topic_anchor_by_id = {item["topicId"]: item["question"] for item in topic_anchors}

        for question in subject_questions:
            same_topic_candidates = []
            cross_topic_candidates = []
            for candidate in subject_questions:
                if candidate["id"] == question["id"]:
                    continue
                weight = get_transition_weight(question, candidate)
                bucket = same_topic_candidates if candidate.get("topicId") == question.get("topicId") else cross_topic_candidates
                bucket.append({"candidate": candidate, "weight": weight})

            same_topic_candidates = sorted(same_topic_candidates, key=lambda item: item["weight"], reverse=True)[:4]
            cross_topic_candidates = sorted(cross_topic_candidates, key=lambda item: item["weight"], reverse=True)[:2]

            for item in same_topic_candidates:
                upsert_graph_edge(
                    edge_buckets,
                    create_graph_edge(question["id"], item["candidate"]["id"], item["weight"], "same-topic", True),
                )
            for item in cross_topic_candidates:
                upsert_graph_edge(
                    edge_buckets,
                    create_graph_edge(question["id"], item["candidate"]["id"], item["weight"], "subject-flow", False),
                )

            topic_anchor = topic_anchor_by_id.get(question.get("topicId"))
            if topic_anchor and topic_anchor["id"] != question["id"]:
                upsert_graph_edge(
                    edge_buckets,
                    create_graph_edge(question["id"], topic_anchor["id"], 0.50, "same-topic", True),
                )

            if subject_anchor and subject_anchor["id"] != question["id"]:
                upsert_graph_edge(
                    edge_buckets,
                    create_graph_edge(question["id"], subject_anchor["id"], 0.34, "subject-flow", False),
                )

    for index in range(1, len(subject_anchors)):
        previous_question = question_by_id.get(subject_anchors[index - 1]["questionId"])
        next_question = question_by_id.get(subject_anchors[index]["questionId"])
        if not previous_question or not next_question:
            continue
        upsert_graph_edge(
            edge_buckets,
            create_graph_edge(previous_question["id"], next_question["id"], 0.24, "subject-bridge", False),
        )
        upsert_graph_edge(
            edge_buckets,
            create_graph_edge(next_question["id"], previous_question["id"], 0.24, "subject-bridge", False),
        )

    edges_by_source = {}
    edges = []
    for source_id, bucket in edge_buckets.items():
        sorted_edges = sorted(bucket.values(), key=lambda item: item["weight"], reverse=True)
        edges_by_source[source_id] = sorted_edges
        edges.extend(sorted_edges)

    return {
        "nodes": [
            {
                "id": question["id"],
                "questionId": question["id"],
                "subjectId": question.get("subjectId"),
                "topicId": question.get("topicId"),
                "difficulty": question.get("difficulty", "medium"),
                "eloRating": question.get("eloRating", 1400),
                "type": question.get("type", "mcq"),
            }
            for question in question_records
        ],
        "edges": edges,
        "edgesBySource": edges_by_source,
    }


def get_recent_reward_signal(session_attempts):
    recent_attempts = session_attempts[-4:]
    if not recent_attempts:
        return 0.0

    total = 0.0
    for attempt in recent_attempts:
        reward = 1.05 if attempt.get("correct") else -1.0
        if attempt.get("correct") and attempt.get("difficulty") == "hard":
            reward += 0.28
        if (not attempt.get("correct")) and attempt.get("difficulty") == "easy":
            reward -= 0.20
        if attempt.get("remediationForQuestionId") and attempt.get("correct"):
            reward += 0.18
        if attempt.get("rapidGuessWarning"):
            reward -= 0.42
        total += reward
    return round_num(total)


def get_momentum(session_attempts):
    last_three = session_attempts[-3:]
    last_two = session_attempts[-2:]
    reward_signal = get_recent_reward_signal(session_attempts)

    if len(last_three) == 3 and all(item.get("correct") for item in last_three) and reward_signal >= 1.4:
        return "hot"
    if (len(last_two) == 2 and all(not item.get("correct") for item in last_two)) or reward_signal <= -1.35:
        return "cold"
    return "steady"


def get_target_elo(student_elo, attempts, momentum):
    last_attempt = attempts[-1] if attempts else None
    target_elo = float(student_elo)
    reward_signal = get_recent_reward_signal(attempts)
    if momentum == "hot":
        target_elo += 75
    if momentum == "cold":
        target_elo -= 90
    if last_attempt:
        target_elo += 35 if last_attempt.get("correct") else -60
    target_elo += reward_signal * 24
    return int(clamp(round(target_elo), 1100, 1800))


def get_target_difficulty(target_elo):
    if target_elo < 1300:
        return "easy"
    if target_elo < 1500:
        return "medium"
    return "hard"


def get_topic_stats(session_attempts):
    stats = defaultdict(lambda: {"correct": 0, "total": 0})
    for attempt in session_attempts:
        current = stats[attempt.get("topicId")]
        current["correct"] += 1 if attempt.get("correct") else 0
        current["total"] += 1
    return stats


def get_recent_topic_count(session_attempts, topic_id):
    return sum(1 for attempt in session_attempts[-3:] if attempt.get("topicId") == topic_id)


def get_focus_topic_id(session_attempts):
    topic_stats = get_topic_stats(session_attempts)
    focus_topic_id = session_attempts[-1].get("topicId") if session_attempts else "general"
    lowest_accuracy = float("inf")
    for topic_id, stats in topic_stats.items():
        accuracy = stats["correct"] / max(stats["total"], 1)
        if accuracy < lowest_accuracy:
            lowest_accuracy = accuracy
            focus_topic_id = topic_id
    return focus_topic_id or "general"


def get_adaptive_policy_state(session_attempts):
    return {
        "momentum": get_momentum(session_attempts),
        "focusTopicId": get_focus_topic_id(session_attempts),
    }


def get_question_graph_neighbors_within_hops(source_question_id, available_by_id, max_hops, graph):
    visited = {source_question_id}
    queue = deque([{"questionId": source_question_id, "hopDistance": 0}])
    best_by_question_id = {}

    while queue:
        current = queue.popleft()
        if current["hopDistance"] >= max_hops:
            continue

        for edge in graph["edgesBySource"].get(current["questionId"], []):
            next_hop_distance = current["hopDistance"] + 1
            candidate_question = available_by_id.get(edge["targetId"])
            if candidate_question is not None:
                existing = best_by_question_id.get(edge["targetId"])
                if (
                    existing is None
                    or next_hop_distance < existing["hopDistance"]
                    or (
                        next_hop_distance == existing["hopDistance"]
                        and edge["weight"] > (existing["edge"]["weight"] if existing["edge"] else 0)
                    )
                ):
                    best_by_question_id[edge["targetId"]] = {
                        "question": candidate_question,
                        "edge": edge,
                        "hopDistance": next_hop_distance,
                    }

            if edge["targetId"] not in visited and next_hop_distance < max_hops:
                visited.add(edge["targetId"])
                queue.append({"questionId": edge["targetId"], "hopDistance": next_hop_distance})

    return sorted(
        best_by_question_id.values(),
        key=lambda item: (item["hopDistance"], -(item["edge"]["weight"] if item["edge"] else 0)),
    )


def get_remediation_target(session_attempts):
    unresolved_question_id = None
    for attempt in session_attempts:
        if attempt.get("correct"):
            if attempt.get("questionId") == unresolved_question_id:
                unresolved_question_id = None
            continue
        unresolved_question_id = attempt.get("questionId")
    if not unresolved_question_id:
        return None
    for attempt in reversed(session_attempts):
        if attempt.get("questionId") == unresolved_question_id:
            return attempt
    return None


def get_remediation_progress(session_attempts, target_question_id):
    attempts = [item for item in session_attempts if item.get("remediationForQuestionId") == target_question_id]
    return {
        "attempts": attempts,
        "stepsCompleted": len(attempts),
        "accuracy": sum(1 for item in attempts if item.get("correct")) / max(len(attempts), 1) if attempts else 0.0,
        "rapidGuessHits": sum(1 for item in attempts if item.get("rapidGuessWarning")),
    }


def get_preferred_neighbor_hop(momentum, reward_signal, last_attempt_correct, hop_limit):
    if not last_attempt_correct:
        return 1
    if momentum == "hot" and reward_signal >= 2.25:
        return min(3, hop_limit)
    if momentum == "hot" or reward_signal >= 0.9:
        return min(2, hop_limit)
    return 1


def get_question_graph_edge(source_question_id, target_question_id, graph):
    return next(
        (edge for edge in graph["edgesBySource"].get(source_question_id, []) if edge["targetId"] == target_question_id),
        None,
    )


def score_candidate(
    candidate,
    target_elo,
    target_difficulty,
    session_attempts,
    topic_stats,
    remediation_target_question_id=None,
    reward_signal=0.0,
):
    last_attempt = session_attempts[-1] if session_attempts else None
    elo_distance = abs(float(candidate.get("eloRating", 1400)) - float(target_elo))
    score = 120 - elo_distance / 12

    difficulty_gap = abs(
        DIFF_ORDER.get(candidate.get("difficulty"), 1) - DIFF_ORDER.get(target_difficulty, 1)
    )
    score += 14 if difficulty_gap == 0 else 4 if difficulty_gap == 1 else -10

    candidate_topic_stats = topic_stats.get(candidate.get("topicId"))
    if candidate_topic_stats:
        accuracy = candidate_topic_stats["correct"] / max(candidate_topic_stats["total"], 1)
        score += (1 - accuracy) * 26
    else:
        score += 5

    if not last_attempt:
        score += 3 if candidate.get("difficulty") == "medium" else 0
        return score

    recent_topic_count = get_recent_topic_count(session_attempts, candidate.get("topicId"))
    if candidate.get("topicId") == last_attempt.get("topicId"):
        score += 14 if last_attempt.get("correct") else 24
        if last_attempt.get("correct") and candidate.get("eloRating", 1400) > last_attempt.get("eloRating", 1400):
            score += 16
        if (not last_attempt.get("correct")) and candidate.get("eloRating", 1400) <= last_attempt.get("eloRating", 1400):
            score += 18
    else:
        score += 8 if recent_topic_count == 0 else 0

    if recent_topic_count >= 2 and last_attempt.get("correct") and candidate.get("topicId") == last_attempt.get("topicId"):
        score -= 12

    if candidate.get("type") != "mcq" and target_difficulty != "easy":
        score += 2

    if remediation_target_question_id:
        remediation_attempts = [
            item for item in session_attempts if item.get("remediationForQuestionId") == remediation_target_question_id
        ]
        rapid_guess_hits = sum(1 for item in remediation_attempts if item.get("rapidGuessWarning"))
        if rapid_guess_hits > 0 and candidate.get("type") == "mcq":
            score -= 3

    if reward_signal >= 1.4:
        score += 7 if candidate.get("eloRating", 1400) >= target_elo else 2
        if candidate.get("difficulty") == "hard":
            score += 3
    elif reward_signal <= -1:
        if candidate.get("difficulty") == "easy":
            score += 7
        elif candidate.get("difficulty") == "medium":
            score += 2
        else:
            score -= 8
        if candidate.get("eloRating", 1400) > target_elo:
            score -= 6

    return score


def build_reasons(
    candidate,
    target_elo,
    target_difficulty,
    momentum,
    session_attempts,
    topic_stats,
    policy_state,
    graph_metadata,
    remediation_target_question_id=None,
    reward_signal=0.0,
):
    reasons = [f"Targets your current level around ELO {target_elo} with a {target_difficulty} question."]
    last_attempt = session_attempts[-1] if session_attempts else None
    topic_label = get_topic_label(candidate.get("topicId"))
    topic_performance = topic_stats.get(candidate.get("topicId"))
    focus_topic_label = get_topic_label(policy_state.get("focusTopicId"))

    if graph_metadata and graph_metadata.get("mode") == "retry" and remediation_target_question_id == candidate.get("id"):
        reasons.append("This question is returning after enough related follow-up work to retry it with better context.")
    elif not last_attempt:
        reasons.append(f"Starts with a balanced entry point in {topic_label}.")
    elif candidate.get("topicId") == last_attempt.get("topicId") and last_attempt.get("correct"):
        reasons.append("Builds on your last correct answer by pushing the same topic one step further.")
    elif candidate.get("topicId") == last_attempt.get("topicId") and not last_attempt.get("correct"):
        reasons.append(f"Reinforces {topic_label} immediately after a miss so the concept settles before moving on.")
    else:
        reasons.append(f"Rotates to {topic_label} to keep the test challenging without repeating the same pattern.")

    if topic_performance:
        accuracy = topic_performance["correct"] / max(topic_performance["total"], 1)
        if accuracy < 0.6:
            reasons.append(f"{topic_label} is still a weak spot in this session, so it gets extra priority.")

    if policy_state.get("focusTopicId") != "general":
        reasons.append(f"The current session focus is {focus_topic_label} based on your recent attempts.")

    if graph_metadata and graph_metadata.get("mode") == "remediation" and graph_metadata.get("remediationForQuestionId"):
        reasons.append("This is part of a short remediation path connected to the question you just missed.")
    elif graph_metadata and graph_metadata.get("mode") == "retry" and graph_metadata.get("remediationForQuestionId"):
        reasons.append("The engine is bringing back the original missed question after enough progress on related steps.")
    elif graph_metadata and graph_metadata.get("mode") == "neighbor" and graph_metadata.get("fromQuestionId"):
        reasons.append("The next question stays on a neighboring node in the recommendation graph.")
    elif graph_metadata and graph_metadata.get("mode") == "fallback":
        reasons.append("The engine widened the graph search because the closest neighboring nodes were already used.")
    elif graph_metadata and graph_metadata.get("mode") == "seed":
        reasons.append(f"This node acts as the graph entry point for {topic_label}.")

    if graph_metadata and graph_metadata.get("hopDistance") and graph_metadata.get("hopDistance") > 1:
        reasons.append(
            f"It sits on circle {graph_metadata['hopDistance']} of the graph path, so the engine is still following the same learning trail."
        )

    if momentum == "hot":
        reasons.append("Your recent streak is strong, so the engine is raising the challenge slightly.")
    elif momentum == "cold":
        reasons.append("Recent misses lowered the difficulty target a bit to help you recover faster.")

    if reward_signal >= 1.4:
        reasons.append("Recent reward signals are positive, so the engine is comfortable stretching you a bit further.")
    elif reward_signal <= -1:
        reasons.append("Recent penalties pulled the recommendation back toward recovery and steadier accuracy.")

    return reasons


def recommend_next_best_adaptive_question(
    *,
    student_elo,
    question_bank_records,
    graph,
    subject_id=None,
    topic_id=None,
    current_question_id=None,
    constrain_to_topic=False,
    answered_question_ids=None,
    session_question_ids=None,
    session_attempts=None,
    hop_limit=3,
):
    session_attempts = session_attempts or []
    answered_question_ids = answered_question_ids or set()
    session_question_ids = session_question_ids or set()

    policy_state = get_adaptive_policy_state(session_attempts)
    momentum = policy_state["momentum"]
    reward_signal = get_recent_reward_signal(session_attempts)
    target_elo = get_target_elo(student_elo, session_attempts, momentum)
    target_difficulty = get_target_difficulty(target_elo)
    topic_stats = get_topic_stats(session_attempts)
    current_question_id = current_question_id or (session_attempts[-1]["questionId"] if session_attempts else None)
    hop_limit = int(clamp(hop_limit, 1, 3))

    remediation_target = get_remediation_target(session_attempts)
    remediation_target_question = (
        next((item for item in question_bank_records if item["id"] == remediation_target["questionId"]), None)
        if remediation_target
        else None
    )
    remediation_progress = (
        get_remediation_progress(session_attempts, remediation_target["questionId"])
        if remediation_target
        else None
    )
    retry_eligible = bool(
        remediation_target
        and remediation_progress
        and remediation_progress["stepsCompleted"] >= hop_limit
        and remediation_progress["accuracy"] >= 0.34
    )

    excluded_ids = set(answered_question_ids) | set(session_question_ids)
    if retry_eligible and remediation_target:
        excluded_ids.discard(remediation_target["questionId"])

    available = [
        question
        for question in question_bank_records
        if (not subject_id or question.get("subjectId") == subject_id)
        and question["id"] not in excluded_ids
        and (not constrain_to_topic or not topic_id or question.get("topicId") == topic_id)
    ]
    available_by_id = {item["id"]: item for item in available}

    candidate_pool = list(available)
    graph_mode = "fallback" if current_question_id else "seed"
    graph_neighbor_count = 0
    graph_edge_by_question_id = {}
    hop_distance_by_question_id = {}

    if retry_eligible and remediation_target and remediation_target_question and remediation_target["questionId"] in available_by_id:
        retry_question = available_by_id[remediation_target["questionId"]]
        graph_mode = "retry"
        candidate_pool = [retry_question]
        hop_distance_by_question_id[retry_question["id"]] = 0
    elif remediation_target and remediation_target_question:
        remediation_neighbors = [
            item
            for item in get_question_graph_neighbors_within_hops(
                remediation_target["questionId"], available_by_id, hop_limit, graph
            )
            if item["question"]["id"] != remediation_target["questionId"]
        ]
        remediation_neighbors = sorted(
            remediation_neighbors,
            key=lambda item: (
                0 if item["question"].get("topicId") == remediation_target_question.get("topicId") else 1,
                item["hopDistance"],
                -(item["edge"]["weight"] if item["edge"] else 0),
            ),
        )

        if remediation_neighbors:
            graph_mode = "remediation"
            graph_neighbor_count = len(remediation_neighbors)
            preferred_circle = int(
                clamp(remediation_progress["stepsCompleted"] + 1 if remediation_progress else 1, 1, hop_limit)
            )
            circle_scoped_neighbors = [item for item in remediation_neighbors if item["hopDistance"] == preferred_circle]
            remediation_pool = circle_scoped_neighbors if circle_scoped_neighbors else remediation_neighbors
            candidate_pool = []
            for item in remediation_pool:
                if item["edge"]:
                    graph_edge_by_question_id[item["question"]["id"]] = item["edge"]
                hop_distance_by_question_id[item["question"]["id"]] = item["hopDistance"]
                candidate_pool.append(item["question"])

    if (graph_mode in {"fallback", "seed"}) and current_question_id:
        graph_neighbors = get_question_graph_neighbors_within_hops(
            current_question_id, available_by_id, hop_limit, graph
        )
        graph_neighbor_count = len(graph_neighbors)
        if graph_neighbors:
            preferred_circle = get_preferred_neighbor_hop(
                momentum,
                reward_signal,
                session_attempts[-1].get("correct") if session_attempts else None,
                hop_limit,
            )
            circle_scoped_neighbors = [item for item in graph_neighbors if item["hopDistance"] == preferred_circle]
            neighbor_pool = circle_scoped_neighbors if circle_scoped_neighbors else graph_neighbors
            graph_mode = "neighbor"
            candidate_pool = []
            for item in neighbor_pool:
                if item["edge"]:
                    graph_edge_by_question_id[item["question"]["id"]] = item["edge"]
                hop_distance_by_question_id[item["question"]["id"]] = item["hopDistance"]
                candidate_pool.append(item["question"])

    if not available or not candidate_pool:
        return {
            "question": None,
            "reasons": [],
            "targetDifficulty": target_difficulty,
            "targetElo": target_elo,
            "momentum": momentum,
            "graph": None,
            "ranked_candidates": [],
        }

    heuristic_ranked = []
    for candidate in candidate_pool:
        heuristic_score = score_candidate(
            candidate,
            target_elo,
            target_difficulty,
            session_attempts,
            topic_stats,
            remediation_target["questionId"] if remediation_target else None,
            reward_signal,
        )
        heuristic_ranked.append({"candidate": candidate, "heuristicScore": heuristic_score})
    heuristic_ranked = sorted(
        heuristic_ranked,
        key=lambda item: (-item["heuristicScore"], item["candidate"]["id"]),
    )

    ranked_candidates = []
    for item in heuristic_ranked:
        candidate = item["candidate"]
        graph_edge = graph_edge_by_question_id.get(candidate["id"]) or (
            get_question_graph_edge(current_question_id, candidate["id"], graph) if current_question_id else None
        )
        graph_boost = (
            graph_edge["weight"] * (GRAPH_NEIGHBOR_WEIGHT if graph_mode == "neighbor" else GRAPH_FALLBACK_WEIGHT)
            if graph_edge
            else 0
        )
        ranked_candidates.append(
            {
                "candidate": candidate,
                "heuristicScore": item["heuristicScore"],
                "graphBoost": graph_boost,
                "combinedScore": item["heuristicScore"] + graph_boost,
                "graphEdge": graph_edge,
                "hopDistance": hop_distance_by_question_id.get(candidate["id"]),
            }
        )

    ranked_candidates = sorted(
        ranked_candidates,
        key=lambda item: (
            -item["combinedScore"],
            -item["graphBoost"],
            -item["heuristicScore"],
            abs(float(item["candidate"].get("eloRating", 1400)) - target_elo),
        ),
    )

    selected = ranked_candidates[0]
    graph_metadata = {
        "mode": graph_mode,
        "fromQuestionId": current_question_id,
        "edgeWeight": selected["graphEdge"]["weight"] if selected["graphEdge"] else None,
        "edgeKind": selected["graphEdge"]["kind"] if selected["graphEdge"] else None,
        "neighborCount": graph_neighbor_count,
        "hopDistance": selected["hopDistance"],
        "remediationForQuestionId": remediation_target["questionId"] if remediation_target else None,
    }

    return {
        "question": selected["candidate"],
        "reasons": build_reasons(
            selected["candidate"],
            target_elo,
            target_difficulty,
            momentum,
            session_attempts,
            topic_stats,
            policy_state,
            graph_metadata,
            remediation_target["questionId"] if remediation_target else None,
            reward_signal,
        ),
        "targetDifficulty": target_difficulty,
        "targetElo": target_elo,
        "momentum": momentum,
        "graph": graph_metadata,
        "ranked_candidates": ranked_candidates,
        "rewardSignal": reward_signal,
    }


def get_stem_length(question):
    return len(str(question.get("question", "")).strip())


def get_options_length(question):
    return sum(len(str(option).strip()) for option in (question.get("options") or []))


def get_rapid_guess_complexity_index(question):
    combined_text = " ".join([str(question.get("question", ""))] + [str(option) for option in (question.get("options") or [])])
    complexity_index = 0
    if question.get("difficulty") == "medium" or question.get("type") == "msq":
        complexity_index = max(complexity_index, 0.5)
    if (
        question.get("difficulty") == "hard"
        or question.get("type") == "nat"
        or MULTI_STEP_PATTERN.search(str(question.get("question", "")))
        or COMPUTATION_PATTERN.search(combined_text)
    ):
        complexity_index = 1
    return complexity_index


def get_rapid_guess_threshold_seconds(question):
    raw_threshold = (
        RAPID_GUESS_ALPHA_0
        + RAPID_GUESS_ALPHA_1 * get_stem_length(question)
        + RAPID_GUESS_ALPHA_2 * get_options_length(question)
        + RAPID_GUESS_ALPHA_3 * get_rapid_guess_complexity_index(question)
    )
    return max(RAPID_GUESS_ALPHA_0, round(raw_threshold))


def get_rapid_guess_penalty(question, time_spent_seconds):
    threshold = get_rapid_guess_threshold_seconds(question)
    if time_spent_seconds >= threshold:
        return 0
    severity = 1 - time_spent_seconds / max(threshold, 1)
    return max(0, round(severity * RAPID_GUESS_MAX_PENALTY))


def get_standard_elo_gain(student_elo, question_elo):
    expected = 1 / (1 + math.pow(10, (float(question_elo) - float(student_elo)) / 400))
    return max(0, round(32 * (1 - expected)))


def get_rapid_guess_adjusted_elo_gain(student_elo, question, time_spent_seconds, correct):
    if not correct:
        return {"standardGain": 0, "penalty": 0, "appliedPenalty": 0, "adjustedGain": 0}
    standard_gain = get_standard_elo_gain(student_elo, question.get("eloRating", 1400))
    penalty = get_rapid_guess_penalty(question, time_spent_seconds)
    adjusted_gain = max(0, standard_gain - penalty)
    return {
        "standardGain": standard_gain,
        "penalty": penalty,
        "appliedPenalty": standard_gain - adjusted_gain,
        "adjustedGain": adjusted_gain,
    }


FULL_GRAPH = build_question_recommendation_graph(question_bank_full.to_dict("records"))
"""
    ),
    code(
        """# ============================================================
# 5. REPLAY ADAPTIVE SESSIONS AND EXPLAIN EVERY RECOMMENDATION STEP
# ============================================================

selected_session_id = None
selected_session_steps_df = pd.DataFrame()
simulation_sessions_df = pd.DataFrame()
simulation_steps_df = pd.DataFrame()
simulation_candidates_df = pd.DataFrame()
future_recommendations_df = pd.DataFrame()

adaptive_history_df = (
    test_history_df[test_history_df["test_type"] == "adaptive"].copy()
    if not test_history_df.empty
    else pd.DataFrame()
)

if adaptive_history_df.empty:
    print("No adaptive sessions were found for this student.")
else:
    adaptive_history_df = adaptive_history_df.sort_values(["completed_at", "id"]).reset_index(drop=True)
    simulation_sessions_df = adaptive_history_df[
        [
            "id",
            "completed_at",
            "subject_id",
            "topic_id",
            "score",
            "max_score",
            "correct_answers",
            "total_questions",
            "duration_seconds",
        ]
    ].copy()
    display(simulation_sessions_df)

    if SIMULATION_TEST_ID and SIMULATION_TEST_ID in set(adaptive_history_df["id"]):
        selected_session_id = SIMULATION_TEST_ID
    else:
        selected_session_id = adaptive_history_df.iloc[-1]["id"]

    selected_session_row = adaptive_history_df[adaptive_history_df["id"] == selected_session_id].iloc[0]
    selected_session_steps_df = (
        student_question_timeline_df[student_question_timeline_df["test_id"] == selected_session_id]
        .sort_values(["step_number", "question_id"])
        .reset_index(drop=True)
    )

    prior_attempts_df = student_question_timeline_df[
        (student_question_timeline_df["completed_at"] < selected_session_row["completed_at"])
        & (student_question_timeline_df["answered"] == True)
    ].copy()
    prior_answered_ids = set(prior_attempts_df["question_id"].tolist())

    if SIMULATION_BANK_MODE == "live":
        simulation_bank_df = question_bank_full[question_bank_full["is_live_adaptive_eligible"]].copy()
    else:
        simulation_bank_df = question_bank_full.copy()

    if pd.notna(selected_session_row["subject_id"]) and str(selected_session_row["subject_id"]).strip():
        session_subject_id = str(selected_session_row["subject_id"])
    else:
        session_subject_id = None

    simulation_bank_records = simulation_bank_df.to_dict("records")
    running_elo = float(SIMULATION_START_ELO)
    session_attempts = []
    session_served_ids = set()
    step_rows = []
    candidate_rows = []

    for row in selected_session_steps_df.itertuples(index=False):
        recommendation = recommend_next_best_adaptive_question(
            student_elo=running_elo,
            question_bank_records=simulation_bank_records,
            graph=FULL_GRAPH,
            subject_id=session_subject_id,
            topic_id=None,
            current_question_id=session_attempts[-1]["questionId"] if session_attempts else None,
            constrain_to_topic=False,
            answered_question_ids=prior_answered_ids,
            session_question_ids=session_served_ids,
            session_attempts=session_attempts,
            hop_limit=3,
        )

        actual_question = question_lookup.get(row.question_id, {})
        actual_question_fallback = {
            "id": row.question_id,
            "subjectId": row.subjectId,
            "topicId": row.topicId,
            "difficulty": row.difficulty,
            "eloRating": row.question_elo if pd.notna(row.question_elo) else 1400,
            "type": row.question_type,
            "question": row.question_text,
            "options": [],
            "marks": row.marks if pd.notna(row.marks) else 1,
            "negativeMarks": 0,
        }
        if not actual_question:
            actual_question = actual_question_fallback

        recommended_question = recommendation.get("question")
        recommended_question_id = recommended_question.get("id") if recommended_question else None
        reasons_text = " | ".join(recommendation.get("reasons", []))

        ranked_candidates = recommendation.get("ranked_candidates", [])
        for rank, candidate_info in enumerate(ranked_candidates[:8], start=1):
            candidate = candidate_info["candidate"]
            candidate_rows.append(
                {
                    "test_id": selected_session_id,
                    "step_number": row.step_number,
                    "rank": rank,
                    "candidate_question_id": candidate.get("id"),
                    "candidate_subject": candidate.get("subjectId"),
                    "candidate_topic": candidate.get("topicId"),
                    "candidate_difficulty": candidate.get("difficulty"),
                    "candidate_elo": candidate.get("eloRating"),
                    "heuristic_score": round(candidate_info.get("heuristicScore", 0), 4),
                    "graph_boost": round(candidate_info.get("graphBoost", 0), 4),
                    "combined_score": round(candidate_info.get("combinedScore", 0), 4),
                    "graph_edge_kind": candidate_info.get("graphEdge", {}).get("kind") if candidate_info.get("graphEdge") else None,
                    "graph_edge_weight": candidate_info.get("graphEdge", {}).get("weight") if candidate_info.get("graphEdge") else None,
                    "hop_distance": candidate_info.get("hopDistance"),
                    "selected": candidate.get("id") == recommended_question_id,
                }
            )

        step_rows.append(
            {
                "test_id": selected_session_id,
                "completed_at": row.completed_at,
                "step_number": row.step_number,
                "student_elo_before_step": round(running_elo, 2),
                "actual_question_id": row.question_id,
                "actual_question_text": row.question_text,
                "actual_subject": row.subjectName,
                "actual_topic": row.topicName,
                "actual_difficulty": row.difficulty,
                "actual_question_elo": row.question_elo,
                "answered": row.answered,
                "correct": row.correct,
                "time_spent_seconds": row.time_spent_seconds,
                "rapid_guess_warning": row.rapid_guess_warning,
                "rapid_guess_threshold_seconds": row.rapid_guess_threshold_seconds,
                "recommended_question_id": recommended_question_id,
                "recommended_question_text": recommended_question.get("question") if recommended_question else None,
                "recommended_matches_actual": recommended_question_id == row.question_id,
                "target_elo": recommendation.get("targetElo"),
                "target_difficulty": recommendation.get("targetDifficulty"),
                "momentum": recommendation.get("momentum"),
                "reward_signal": recommendation.get("rewardSignal"),
                "graph_mode": recommendation.get("graph", {}).get("mode") if recommendation.get("graph") else None,
                "graph_from_question_id": recommendation.get("graph", {}).get("fromQuestionId") if recommendation.get("graph") else None,
                "graph_edge_kind": recommendation.get("graph", {}).get("edgeKind") if recommendation.get("graph") else None,
                "graph_edge_weight": recommendation.get("graph", {}).get("edgeWeight") if recommendation.get("graph") else None,
                "graph_hop_distance": recommendation.get("graph", {}).get("hopDistance") if recommendation.get("graph") else None,
                "graph_neighbor_count": recommendation.get("graph", {}).get("neighborCount") if recommendation.get("graph") else None,
                "remediation_for_question_id": row.remediation_for_question_id,
                "reasons": reasons_text,
            }
        )

        time_spent_seconds = row.time_spent_seconds if pd.notna(row.time_spent_seconds) else 0
        elo_outcome = get_rapid_guess_adjusted_elo_gain(
            running_elo,
            actual_question,
            time_spent_seconds,
            bool(row.correct),
        )
        running_elo += elo_outcome["adjustedGain"]

        if row.answered:
            prior_answered_ids.add(row.question_id)
        session_served_ids.add(row.question_id)
        session_attempts.append(
            {
                "questionId": row.question_id,
                "topicId": row.topicId,
                "difficulty": row.difficulty,
                "eloRating": actual_question.get("eloRating", row.question_elo if pd.notna(row.question_elo) else 1400),
                "correct": bool(row.correct),
                "rapidGuessWarning": bool(row.rapid_guess_warning) if pd.notna(row.rapid_guess_warning) else False,
                "remediationForQuestionId": row.remediation_for_question_id,
            }
        )

    simulation_steps_df = pd.DataFrame(step_rows)
    simulation_candidates_df = pd.DataFrame(candidate_rows)

    all_adaptive_steps_df = (
        student_question_timeline_df[student_question_timeline_df["test_type"] == "adaptive"]
        .sort_values(["completed_at", "test_id", "step_number"])
        .reset_index(drop=True)
    )
    forecast_attempts = []
    forecast_answered_ids = set(
        student_question_timeline_df[student_question_timeline_df["answered"] == True]["question_id"].tolist()
    )
    forecast_served_ids = set()
    forecast_running_elo = float(SIMULATION_START_ELO)
    for row in all_adaptive_steps_df.itertuples(index=False):
        question_record = question_lookup.get(row.question_id)
        if question_record:
            outcome = get_rapid_guess_adjusted_elo_gain(
                forecast_running_elo,
                question_record,
                row.time_spent_seconds if pd.notna(row.time_spent_seconds) else 0,
                bool(row.correct),
            )
            forecast_running_elo += outcome["adjustedGain"]
        forecast_attempts.append(
            {
                "questionId": row.question_id,
                "topicId": row.topicId,
                "difficulty": row.difficulty,
                "eloRating": question_record.get("eloRating", row.question_elo if pd.notna(row.question_elo) else 1400)
                if question_record
                else 1400,
                "correct": bool(row.correct),
                "rapidGuessWarning": bool(row.rapid_guess_warning) if pd.notna(row.rapid_guess_warning) else False,
                "remediationForQuestionId": row.remediation_for_question_id,
            }
        )

    future_rows = []
    for future_step in range(1, SIMULATION_STEPS_AHEAD + 1):
        recommendation = recommend_next_best_adaptive_question(
            student_elo=forecast_running_elo if forecast_attempts else current_elo,
            question_bank_records=simulation_bank_records,
            graph=FULL_GRAPH,
            subject_id=session_subject_id,
            topic_id=None,
            current_question_id=forecast_attempts[-1]["questionId"] if forecast_attempts else None,
            constrain_to_topic=False,
            answered_question_ids=forecast_answered_ids,
            session_question_ids=forecast_served_ids,
            session_attempts=forecast_attempts,
            hop_limit=3,
        )
        future_question = recommendation.get("question")
        if not future_question:
            break

        future_rows.append(
            {
                "forecast_step": future_step,
                "question_id": future_question.get("id"),
                "subject": get_subject_name(future_question.get("subjectId")),
                "topic": get_topic_name(future_question.get("subjectId"), future_question.get("topicId")),
                "difficulty": future_question.get("difficulty"),
                "question_elo": future_question.get("eloRating"),
                "target_elo": recommendation.get("targetElo"),
                "target_difficulty": recommendation.get("targetDifficulty"),
                "momentum": recommendation.get("momentum"),
                "graph_mode": recommendation.get("graph", {}).get("mode") if recommendation.get("graph") else None,
                "graph_edge_kind": recommendation.get("graph", {}).get("edgeKind") if recommendation.get("graph") else None,
                "graph_hop_distance": recommendation.get("graph", {}).get("hopDistance") if recommendation.get("graph") else None,
                "reasons": " | ".join(recommendation.get("reasons", [])),
            }
        )

        forecast_served_ids.add(future_question["id"])
        forecast_answered_ids.add(future_question["id"])
        forecast_attempts.append(
            {
                "questionId": future_question["id"],
                "topicId": future_question.get("topicId"),
                "difficulty": future_question.get("difficulty"),
                "eloRating": future_question.get("eloRating", 1400),
                "correct": True,
                "rapidGuessWarning": False,
                "remediationForQuestionId": recommendation.get("graph", {}).get("remediationForQuestionId"),
            }
        )
        forecast_running_elo += get_standard_elo_gain(forecast_running_elo, future_question.get("eloRating", 1400))

    future_recommendations_df = pd.DataFrame(future_rows)

    simulation_summary_df = pd.DataFrame(
        [
            {
                "selected_session_id": selected_session_id,
                "simulation_bank_mode": SIMULATION_BANK_MODE,
                "simulation_start_elo": SIMULATION_START_ELO,
                "session_steps": len(simulation_steps_df),
                "recommended_matches_actual_pct": round(
                    100 * simulation_steps_df["recommended_matches_actual"].mean(), 2
                )
                if not simulation_steps_df.empty
                else np.nan,
                "session_accuracy_pct": round(
                    100 * simulation_steps_df["correct"].fillna(False).mean(), 2
                )
                if not simulation_steps_df.empty
                else np.nan,
            }
        ]
    )

    display(simulation_summary_df)
    display(simulation_steps_df)
    display(simulation_candidates_df.head(80))
    display(future_recommendations_df)
"""
    ),
    code(
        """# ============================================================
# 6. INTERACTIVE FULL-DATASET GRAPH + DASHBOARD PLOTS
# ============================================================

graph_nx = nx.Graph()
for node in FULL_GRAPH["nodes"]:
    graph_nx.add_node(node["id"])
for edge in FULL_GRAPH["edges"]:
    graph_nx.add_edge(
        edge["sourceId"],
        edge["targetId"],
        weight=edge["weight"],
        edge_kind=edge["kind"],
    )

if graph_nx.number_of_nodes() > 0:
    pos = nx.spring_layout(graph_nx, seed=42, k=0.42, iterations=180, weight="weight")
else:
    pos = {}

degree_map = dict(graph_nx.degree()) if graph_nx.number_of_nodes() > 0 else {}
try:
    if graph_nx.number_of_nodes() > 2:
        betweenness_map = nx.betweenness_centrality(
            graph_nx,
            k=min(250, max(30, graph_nx.number_of_nodes() - 1)),
            normalized=True,
            seed=42,
            weight="weight",
        )
    else:
        betweenness_map = {node_id: 0 for node_id in graph_nx.nodes}
except Exception:
    betweenness_map = {node_id: 0 for node_id in graph_nx.nodes}

latest_outcome_by_question = {}
if not question_attempts_df.empty:
    for row in question_attempts_df.sort_values(["completed_at", "step_number"]).itertuples(index=False):
        if not row.answered:
            continue
        latest_outcome_by_question[row.question_id] = "correct" if row.correct else "wrong"

path_step_map = {}
path_question_ids = []
if not simulation_steps_df.empty:
    for row in simulation_steps_df.itertuples(index=False):
        path_step_map[row.actual_question_id] = int(row.step_number)
        path_question_ids.append(row.actual_question_id)

graph_nodes_rows = []
for question in question_bank_full.to_dict("records"):
    node_id = question["id"]
    x, y = pos.get(node_id, (0, 0))
    status = latest_outcome_by_question.get(node_id, "unseen")
    path_step = path_step_map.get(node_id)
    graph_nodes_rows.append(
        {
            "id": node_id,
            "x": float(x),
            "y": float(y),
            "subjectId": question.get("subjectId"),
            "topicId": question.get("topicId"),
            "subjectName": question.get("subjectName"),
            "topicName": question.get("topicName"),
            "difficulty": question.get("difficulty"),
            "eloRating": float(question.get("eloRating", 1400)),
            "marks": float(question.get("marks", 1)),
            "type": question.get("type"),
            "status": status,
            "path_step": path_step,
            "degree": int(degree_map.get(node_id, 0)),
            "betweenness": float(betweenness_map.get(node_id, 0)),
            "question_text": question.get("question"),
            "is_live_adaptive_eligible": bool(question.get("is_live_adaptive_eligible")),
        }
    )

graph_nodes_df = pd.DataFrame(graph_nodes_rows)

path_edge_rows = []
for index in range(1, len(path_question_ids)):
    left = path_question_ids[index - 1]
    right = path_question_ids[index]
    edge = get_question_graph_edge(left, right, FULL_GRAPH) or get_question_graph_edge(right, left, FULL_GRAPH)
    path_edge_rows.append(
        {
            "sourceId": left,
            "targetId": right,
            "edge_kind": edge.get("kind") if edge else None,
            "edge_weight": edge.get("weight") if edge else None,
        }
    )
path_edges_df = pd.DataFrame(path_edge_rows)


def build_hover_text(row):
    lines = [
        f"<b>{row['id']}</b>",
        f"Subject: {row['subjectName']}",
        f"Topic: {row['topicName']}",
        f"Difficulty: {row['difficulty']}",
        f"ELO: {row['eloRating']:.0f}",
        f"Type: {row['type']}",
        f"Marks: {row['marks']}",
        f"Degree: {row['degree']}",
        f"Betweenness: {row['betweenness']:.4f}",
        f"Student status: {row['status']}",
        f"Live adaptive eligible: {row['is_live_adaptive_eligible']}",
        f"Question: {str(row['question_text'])[:180]}",
    ]
    if pd.notna(row["path_step"]):
        lines.insert(1, f"Path step: {int(row['path_step'])}")
    return "<br>".join(lines)


graph_nodes_df["hover_text"] = graph_nodes_df.apply(build_hover_text, axis=1)

if PLOTLY_AVAILABLE and not graph_nodes_df.empty:
    edge_x = []
    edge_y = []
    for edge in FULL_GRAPH["edges"]:
        source = pos.get(edge["sourceId"])
        target = pos.get(edge["targetId"])
        if not source or not target:
            continue
        edge_x.extend([source[0], target[0], None])
        edge_y.extend([source[1], target[1], None])

    all_edge_trace = go.Scatter(
        x=edge_x,
        y=edge_y,
        mode="lines",
        line=dict(width=0.35, color="rgba(120, 138, 160, 0.18)"),
        hoverinfo="skip",
        name="Recommendation edges",
    )

    node_trace = go.Scatter(
        x=graph_nodes_df["x"],
        y=graph_nodes_df["y"],
        mode="markers",
        hoverinfo="text",
        text=graph_nodes_df["hover_text"],
        marker=dict(
            size=np.clip(5 + graph_nodes_df["degree"] * 0.45, 5, 14),
            color=graph_nodes_df["status"].map(STATUS_COLORS),
            line=dict(width=np.where(graph_nodes_df["is_live_adaptive_eligible"], 1.2, 0.5), color="#f0f6fc"),
            symbol=graph_nodes_df["difficulty"].map(DIFF_SYMBOL),
            opacity=0.82,
        ),
        name="All questions",
    )

    path_edge_traces = []
    for edge_kind, group_df in path_edges_df.groupby("edge_kind", dropna=False):
        path_x = []
        path_y = []
        for item in group_df.itertuples(index=False):
            source = pos.get(item.sourceId)
            target = pos.get(item.targetId)
            if not source or not target:
                continue
            path_x.extend([source[0], target[0], None])
            path_y.extend([source[1], target[1], None])
        path_edge_traces.append(
            go.Scatter(
                x=path_x,
                y=path_y,
                mode="lines",
                line=dict(width=2.8, color=EDGE_KIND_COLORS.get(edge_kind, "#79c0ff")),
                hoverinfo="skip",
                name=f"Student path: {edge_kind or 'unknown'}",
            )
        )

    path_nodes_df = graph_nodes_df[graph_nodes_df["path_step"].notna()].sort_values("path_step")
    path_node_trace = go.Scatter(
        x=path_nodes_df["x"],
        y=path_nodes_df["y"],
        mode="markers+text",
        text=path_nodes_df["path_step"].astype(int).astype(str),
        textposition="top center",
        hoverinfo="text",
        textfont=dict(color="#f0f6fc", size=11),
        marker=dict(
            size=18,
            color="#1f6feb",
            line=dict(width=2, color="#ffffff"),
            opacity=0.95,
        ),
        name="Student adaptive path",
        hovertext=path_nodes_df["hover_text"],
    )

    figure = go.Figure(data=[all_edge_trace, node_trace, *path_edge_traces, path_node_trace])
    figure.update_layout(
        title="Full Question Graph With Student Adaptive Path Overlay",
        width=1400,
        height=900,
        paper_bgcolor="#0d1117",
        plot_bgcolor="#0d1117",
        font=dict(color="#f0f6fc"),
        hoverlabel=dict(bgcolor="#161b22", font=dict(color="#f0f6fc")),
        xaxis=dict(showgrid=False, zeroline=False, visible=False),
        yaxis=dict(showgrid=False, zeroline=False, visible=False),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0),
        margin=dict(l=10, r=10, t=60, b=10),
    )
    figure.show()
else:
    vis_nodes = []
    for row in graph_nodes_df.itertuples(index=False):
        vis_nodes.append(
            {
                "id": row.id,
                "label": str(int(row.path_step)) if pd.notna(row.path_step) else "",
                "title": row.hover_text,
                "x": row.x * 1400,
                "y": row.y * 1400,
                "physics": False,
                "shape": "dot",
                "size": 18 if pd.notna(row.path_step) else max(6, min(14, 5 + row.degree * 0.4)),
                "color": {
                    "background": "#1f6feb" if pd.notna(row.path_step) else STATUS_COLORS.get(row.status, "#8b949e"),
                    "border": "#ffffff",
                },
                "font": {"color": "#f0f6fc", "size": 11},
            }
        )

    vis_edges = []
    for edge in FULL_GRAPH["edges"]:
        vis_edges.append(
            {
                "from": edge["sourceId"],
                "to": edge["targetId"],
                "color": {"color": "rgba(120,138,160,0.18)"},
                "width": 0.6,
                "arrows": "to",
            }
        )
    for edge in path_edges_df.itertuples(index=False):
        vis_edges.append(
            {
                "from": edge.sourceId,
                "to": edge.targetId,
                "color": {"color": EDGE_KIND_COLORS.get(edge.edge_kind, "#79c0ff")},
                "width": 3.2,
                "arrows": "to",
            }
        )

    container_id = f"student-graph-{uuid.uuid4().hex}"
    html = f'''
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/dist/vis-network.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/vis-network.min.js"></script>
<div style="background:#0d1117;border:1px solid #30363d;border-radius:18px;padding:16px;">
  <div style="margin-bottom:10px;color:#f0f6fc;font-weight:700;font-size:18px;">Full Question Graph With Student Adaptive Path Overlay</div>
  <div style="margin-bottom:10px;color:#8b949e;font-size:12px;">Step numbers label the selected adaptive session path. Hover any node for subject, topic, difficulty, ELO, status, and graph metrics.</div>
  <div id="{container_id}" style="height:860px;border-radius:14px;background:#010409;"></div>
</div>
<script>
(() => {{
  const container = document.getElementById("{container_id}");
  const nodes = new vis.DataSet({json.dumps(vis_nodes)});
  const edges = new vis.DataSet({json.dumps(vis_edges)});
  const network = new vis.Network(container, {{ nodes, edges }}, {{
    physics: false,
    interaction: {{ hover: true, navigationButtons: true, keyboard: true }},
    nodes: {{ borderWidth: 1.2 }},
    edges: {{ smooth: false }},
  }});
  network.fit();
}})();
</script>
'''
    display(HTML(html))

fig = plt.figure(figsize=(22, 18), facecolor="#0d1117")
grid = GridSpec(3, 2, figure=fig, hspace=0.35, wspace=0.2)
panel = "#161b22"
text_c = "#f0f6fc"
grid_c = "#30363d"


def style_ax(ax, title):
    ax.set_facecolor(panel)
    ax.set_title(title, color=text_c, fontsize=13, pad=12)
    ax.tick_params(colors=text_c)
    for spine in ax.spines.values():
        spine.set_color(grid_c)
    ax.grid(color=grid_c, alpha=0.35, linestyle="--", linewidth=0.6)
    ax.set_axisbelow(True)


ax1 = fig.add_subplot(grid[0, 0])
style_ax(ax1, "Test Accuracy Over Time")
if not test_history_df.empty:
    ax1.plot(test_history_df["completed_at"], test_history_df["accuracy_pct"], color="#58a6ff", lw=2, marker="o")
    ax1.set_ylabel("Accuracy %", color=text_c)
else:
    ax1.text(0.5, 0.5, "No test history", color=text_c, ha="center", va="center")

ax2 = fig.add_subplot(grid[0, 1])
style_ax(ax2, "Subject Accuracy")
if not subject_progress_df.empty:
    ordered_subjects = subject_progress_df.sort_values("accuracy_pct", ascending=True)
    ax2.barh(ordered_subjects["subjectName"], ordered_subjects["accuracy_pct"], color="#3fb950")
    ax2.set_xlabel("Accuracy %", color=text_c)
else:
    ax2.text(0.5, 0.5, "No subject progress data", color=text_c, ha="center", va="center")

ax3 = fig.add_subplot(grid[1, 0])
style_ax(ax3, "Weak Topics Under Report Threshold (60%)")
if not weak_topics_report_df.empty:
    top_weak = weak_topics_report_df.head(12).sort_values("accuracy_pct", ascending=True)
    labels = (top_weak["subjectName"].fillna("unknown") + " / " + top_weak["topicName"].fillna("unknown")).tolist()
    ax3.barh(labels, top_weak["accuracy_pct"], color="#f85149")
    ax3.axvline(60, color="#f2cc60", linestyle="--", linewidth=1.2)
    ax3.set_xlabel("Accuracy %", color=text_c)
else:
    ax3.text(0.5, 0.5, "No weak topics", color=text_c, ha="center", va="center")

ax4 = fig.add_subplot(grid[1, 1])
style_ax(ax4, "Test-Type Mix")
if not test_summary_df.empty:
    ax4.bar(test_summary_df["test_type"], test_summary_df["tests_completed"], color="#f2cc60")
    ax4.set_ylabel("Completed tests", color=text_c)
    ax4.tick_params(axis="x", rotation=25)
else:
    ax4.text(0.5, 0.5, "No completed tests", color=text_c, ha="center", va="center")

ax5 = fig.add_subplot(grid[2, 0])
style_ax(ax5, "Replay Match: Recommended vs Actual")
if not simulation_steps_df.empty:
    step_colors = ["#2ea043" if value else "#f85149" for value in simulation_steps_df["recommended_matches_actual"]]
    ax5.bar(simulation_steps_df["step_number"].astype(int), np.ones(len(simulation_steps_df)), color=step_colors)
    ax5.set_xlabel("Adaptive step", color=text_c)
    ax5.set_ylabel("Match flag", color=text_c)
    ax5.set_yticks([1])
    ax5.set_yticklabels(["match"], color=text_c)
else:
    ax5.text(0.5, 0.5, "No adaptive replay available", color=text_c, ha="center", va="center")

ax6 = fig.add_subplot(grid[2, 1])
style_ax(ax6, "Future Recommendation Difficulty")
if not future_recommendations_df.empty:
    difficulty_num = future_recommendations_df["difficulty"].map(DIFF_ORDER).fillna(1)
    ax6.plot(
        future_recommendations_df["forecast_step"],
        difficulty_num,
        color="#1f6feb",
        lw=2,
        marker="o",
    )
    ax6.set_yticks([0, 1, 2])
    ax6.set_yticklabels(["easy", "medium", "hard"], color=text_c)
    ax6.set_xlabel("Forecast step", color=text_c)
else:
    ax6.text(0.5, 0.5, "No future recommendations", color=text_c, ha="center", va="center")

fig.suptitle("Student Account, Performance, and Recommendation Replay Dashboard", color=text_c, fontsize=18)
plt.show()
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
            "codemirror_mode": {"name": "ipython", "version": 3},
            "file_extension": ".py",
            "mimetype": "text/x-python",
            "name": "python",
            "nbconvert_exporter": "python",
            "pygments_lexer": "ipython3",
            "version": "3.11",
        },
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}


OUTPUT.write_text(json.dumps(notebook, indent=1), encoding="utf-8")
print(f"Wrote {OUTPUT}")
