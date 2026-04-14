# Brilliant Minds Hub

## Single Supabase Project Setup

Use one Supabase project, `gate-da-students-portal`, with two exposed schemas:

- `public` for student auth, profiles, progress, answered questions, and test history
- `teacher` for classroom management tables such as teachers, courses, enrollments, assignments, and submissions

In the Supabase dashboard for `gate-da-students-portal`, add `teacher` under `Settings -> API -> Exposed schemas` before using the teacher portal.

Frontend environment variables:

```bash
VITE_STUDENT_SUPABASE_URL=https://ukiuxecvybwvngwirjqt.supabase.co
VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY=PASTE_YOUR_SUPABASE_ANON_KEY_HERE
VITE_STUDENT_SUPABASE_PROJECT_ID=ukiuxecvybwvngwirjqt

VITE_TEACHER_SUPABASE_URL=https://ukiuxecvybwvngwirjqt.supabase.co
VITE_TEACHER_SUPABASE_PUBLISHABLE_KEY=PASTE_YOUR_SUPABASE_ANON_KEY_HERE
VITE_TEACHER_SUPABASE_PROJECT_ID=ukiuxecvybwvngwirjqt
VITE_TEACHER_SUPABASE_SCHEMA=teacher
```

Set both the student and teacher variables to the same project. The app keeps separate browser auth sessions, but both sides now talk to the same Supabase project.

Migration to move classroom tables into the `teacher` schema inside the shared project:

- `supabase/migrations/20260408103000_single_project_teacher_schema.sql`

The old `teacher-sync` edge function is only needed if you intentionally keep separate Supabase projects. In the shared `gate-da-students-portal` setup, classroom reads and writes happen directly against the `teacher` schema with RLS.

## Online AI Coach backend

The app now defaults to built-in fallback coaching unless you explicitly enable an online backend.

To use the Supabase Edge Function `ollama-proxy` as the online backend, set `VITE_AI_PROVIDER=ollama` in your frontend environment and deploy the function below.

Set these Supabase function secrets before deploying:

- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_AUTH_TOKEN` if your remote Ollama endpoint requires bearer auth

Recommended model:

- `OLLAMA_MODEL=llama3:latest`

Deploy the function after setting the secrets:

```bash
supabase secrets set OLLAMA_BASE_URL=https://your-remote-ollama-host
supabase secrets set OLLAMA_MODEL=llama3:latest
supabase secrets set OLLAMA_AUTH_TOKEN=your-token-if-needed
supabase functions deploy ollama-proxy
```
