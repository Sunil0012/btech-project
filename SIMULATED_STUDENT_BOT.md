# Simulated Adaptive Student Bot

This script creates simulated student accounts, runs adaptive mixed-subject tests, saves analytics rows, and exports every generated username/password.

Generated accounts now use realistic full names and email-style usernames, for example:

```text
aarav.sharma.<batch>.01@simulated.gate-da.local
priya.verma.<batch>.02@simulated.gate-da.local
```

## Setup

Add these values to `.env`:

```env
VITE_STUDENT_SUPABASE_URL=https://your-project.supabase.co
VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY=your-student-publishable-key

GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.5-flash-lite
SIM_STUDENT_PROMPT=Simulate a realistic GATE DA student taking an adaptive mixed-subject test. Do not behave perfectly. Reflect strengths, weak areas, fatigue, guessing, and gradual improvement.
```

If `GEMINI_API_KEY` is absent, the script uses the built-in local behavior model. If Gemini returns an API error such as `404` or `429`, the default behavior is to continue that test with the local model.

## Run

```bash
npm run export:questions
npm run simulate:students
```

The default run creates 200 students. Each one takes a random 5-10 adaptive mixed tests, with test sizes rotating through 30, 40, 50, and 65 questions. Completion dates are randomized across the recent history window so the analytics look like real ongoing practice rather than one bulk insert.

Credentials and summaries are written to `simulator-output/`, for example:

```text
simulator-output/<batch>-credentials.csv
simulator-output/<batch>-summary.json
```

Credentials from a `--dry-run` are preview-only and cannot be used to log in. Remove `--dry-run` when you want the script to create real Supabase auth users and login-ready passwords.

Do not reuse the same `--batch` after real users were created unless you are using the same generated password set. The simulator now creates deterministic passwords and writes the credential CSV before Supabase work starts, but older failed runs may have created a Supabase auth user before a password file was saved. If Supabase says an existing simulated user has different credentials, rerun with a fresh batch name such as `fallbackcheck2`.

Course joining uses `public.courses` first, then falls back to the schema in `VITE_TEACHER_SUPABASE_SCHEMA` such as `teacher.courses`. This matches projects where classroom tables were moved into the `teacher` schema.

## Useful Options

```bash
npm run simulate:students -- --students 20 --tests-per-student 3 --questions-per-test 15
npm run simulate:students -- --students 20 --tests-per-student 1 --questions-per-test 15 --join-code FTE455 --local-only --batch fte455trial20
npm run simulate:students -- --min-tests 5 --max-tests 10 --question-counts 30,40,50,65
npm run simulate:students -- --date-range-days 120
npm run simulate:students -- --join-code FTE455
npm run simulate:students -- --gemini-only
npm run simulate:students -- --dry-run --local-only
```

Use `--local-only` to skip Gemini calls even when a key is present.
Use `--gemini-only` to stop immediately if Gemini is missing, unavailable, or returns an error instead of falling back locally.
