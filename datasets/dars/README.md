# DARS Dataset Pack for FTE455

Generated on: 2026-05-15

This folder contains the 220-student DARS bot dataset pack for the GATEWay DARS paper. The files are connected through `user_id`; question-level files also use `question_id`. The bot roster is aligned to course join code `FTE455`.

## Files

| File | Rows | Purpose |
| --- | ---: | --- |
| `student_interactions.csv` | 55,000 | Core temporal learner-response dataset for dynamic K-factor, momentum, time-efficiency, rapid-guess penalty, graph routing, remediation, and volatility analysis. |
| `question_knowledge_graph.csv` | 2,140 | Weighted question graph with same-topic, prerequisite, and cross-domain edges. |
| `student_test_sessions.csv` | 1,683 | Test-level adaptive-mix dataset where each row is one student test attempt, not one question. Each student has 5-10 tests using 30, 40, 50, and 65 question adaptive mixes. |
| `student_test_question_responses.csv` | 77,850 | Test-question detail dataset. Each row is one question inside a `test_id`, including skipped, correct, and incorrect responses. |
| `student_performance_snapshots.csv` | 220 | Student-level aggregate snapshot for prediction, risk scoring, and teacher intervention. |
| `bot_students_fte455.csv` | 220 | Human-readable bot roster with username, email, course join code, persona, and starting rating. |
| `manifest.json` | 1 | Generation parameters and row-count audit. |
| `dars_vs_glicko2_comparison_summary.csv` | 2 | Output from `DARS_vs_Glicko2_Comparison.ipynb` with overall model metrics. |
| `dars_vs_glicko2_student_metrics.csv` | 220 | Output from `DARS_vs_Glicko2_Comparison.ipynb` with per-student model metrics. |

## Required Columns Covered

`student_interactions.csv` includes:

`user_id`, `question_id`, `timestamp`, `correctness`, `response_time`, `rapid_guess_flag`, `rapid_guess_penalty`, `streak_before`, `DARS_rating_before`, `DARS_rating_after`, `momentum_state`, `topic`, `difficulty_label`, `graph_hop_distance`, `remediation_flag`, `recommendation_source`

Rapid guessing is modeled without hints. A row receives `rapid_guess_flag = 1` when `response_time` is below 35% of the difficulty-adjusted reference time. `rapid_guess_penalty` stores the rating penalty subtracted from the DARS update for that attempt.

`question_knowledge_graph.csv` includes:

`source_q`, `target_q`, `edge_type`, `weight`

`student_test_sessions.csv` includes:

`user_id`, `test_id`, `course_join_code`, `test_type`, `adaptive_mix_label`, `timestamp_start`, `timestamp_end`, `question_count`, `questions_attempted`, `correct_answers`, `wrong_answers`, `skipped_questions`, `score`, `max_score`, `accuracy`, `completion_rate`, `duration_seconds`, `avg_response_time`, `rapid_guess_count`, `rapid_guess_penalty_total`, `DARS_rating_before`, `DARS_rating_after`, `rating_delta`, `momentum_before`, `momentum_after`, `dominant_topics`, `weak_topics_after`, `recommendation_mode`

`student_test_question_responses.csv` includes:

`user_id`, `test_id`, `question_order`, `question_id`, `course_join_code`, `test_type`, `adaptive_mix_label`, `question_count_in_test`, `timestamp_start`, `timestamp_end`, `response_status`, `attempted`, `correctness`, `score_awarded`, `max_marks`, `negative_marks`, `response_time`, `rapid_guess_flag`, `rapid_guess_penalty`, `streak_before`, `streak_after`, `momentum_before`, `momentum_after`, `DARS_rating_before_test`, `DARS_rating_after_test`, `test_rating_delta`, `expected_success`, `attempt_probability`, `topic`, `topic_id`, `subject_id`, `difficulty_label`, `question_elo`, `graph_hop_distance`, `remediation_flag`, `recommendation_source`

Join keys:

- `bot_students_fte455.csv.user_id` -> all student datasets
- `student_test_sessions.test_id` -> `student_test_question_responses.test_id`
- `question_knowledge_graph.source_q/target_q` -> response `question_id`

`student_performance_snapshots.csv` includes:

`user_id`, `accuracy`, `consistency`, `volatility`, `completion_rate`, `weak_topics`, `predicted_score`

## Reproduce

From the project root:

```bash
npm run export:questions
npm run generate:dars-datasets -- --students 220 --min-tests 5 --max-tests 10 --question-counts 30,40,50,65 --join-code FTE455
```

The generator default is also 220 students, so `npm run generate:dars-datasets` is enough when you want the standard dataset pack.

## DARS vs Glicko-2 Notebook

The project root contains:

`DARS_vs_Glicko2_Comparison.ipynb`

It compares DARS with a Glicko-2 baseline using `student_test_question_responses.csv`. Each adaptive test is treated as one Glicko-2 rating period. The notebook exports:

- `dars_vs_glicko2_comparison_summary.csv`
- `dars_vs_glicko2_student_metrics.csv`

## Prior Live FTE455 Bot Trial

The Supabase simulator was previously run for 20 named bot students using:

```bash
npm run simulate:students -- --students 20 --tests-per-student 1 --questions-per-test 15 --join-code FTE455 --local-only --batch fte455trial20 --date-range-days 30
```

Result: 20/20 bot students were created and joined to `FTE455` in the `teacher` schema.

Live trial credentials and summary:

`simulator-output/fte455trial20-20260515062740-credentials.csv`

`simulator-output/fte455trial20-20260515062740-summary.json`

## Research Use Note

This pack is a controlled simulation dataset. For the final paper, present it as simulated validation data and combine it with real GATEWay interaction logs as soon as live users are available. The same schema now demonstrates 220 bot students and more than 55k temporal interactions without changing the modeling pipeline.
