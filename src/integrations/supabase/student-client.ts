import { createClient } from "@supabase/supabase-js";
import type { StudentDatabase } from "./student-types";
import type { TeacherDatabase } from "./teacher-types";

const STUDENT_SUPABASE_PROJECT_ID = import.meta.env.VITE_STUDENT_SUPABASE_PROJECT_ID?.trim();

const STUDENT_SUPABASE_REMOTE_URL =
  import.meta.env.VITE_STUDENT_SUPABASE_URL?.trim() ||
  (STUDENT_SUPABASE_PROJECT_ID ? `https://${STUDENT_SUPABASE_PROJECT_ID}.supabase.co` : "");

function shouldUseLocalSupabaseProxy() {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  );
}

export const STUDENT_SUPABASE_URL =
  shouldUseLocalSupabaseProxy() && STUDENT_SUPABASE_REMOTE_URL
    ? `${window.location.origin}/supabase-student`
    : STUDENT_SUPABASE_REMOTE_URL;

export const STUDENT_SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY?.trim() || "";
export const IS_STUDENT_SUPABASE_CONFIGURED =
  Boolean(STUDENT_SUPABASE_URL) && Boolean(STUDENT_SUPABASE_PUBLISHABLE_KEY);
export const STUDENT_CLASSROOM_SCHEMA =
  import.meta.env.VITE_TEACHER_SUPABASE_SCHEMA?.trim() || "teacher";

if (!IS_STUDENT_SUPABASE_CONFIGURED) {
  console.error(
    "Student Supabase configuration is incomplete. Check VITE_STUDENT_SUPABASE_URL or VITE_STUDENT_SUPABASE_PROJECT_ID and VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY."
  );
}

const studentAuthOptions = {
  storage: localStorage,
  storageKey: "gate-da-prep-student-auth",
  persistSession: true,
  autoRefreshToken: true,
} as const;

const studentClassroomAuthOptions = {
  storage: localStorage,
  storageKey: "gate-da-prep-student-classroom-auth",
  persistSession: true,
  autoRefreshToken: true,
} as const;

const SESSION_REFRESH_BUFFER_SECONDS = 60;

export const studentSupabase = createClient<StudentDatabase, "public">(
  STUDENT_SUPABASE_URL || "https://placeholder-student.supabase.co",
  STUDENT_SUPABASE_PUBLISHABLE_KEY || "missing-student-publishable-key",
  {
    auth: studentAuthOptions,
  }
);

export const studentTeacherSupabase = createClient<
  TeacherDatabase,
  "teacher" | "public"
>(
  STUDENT_SUPABASE_URL || "https://placeholder-student.supabase.co",
  STUDENT_SUPABASE_PUBLISHABLE_KEY || "missing-student-publishable-key",
  {
    auth: studentClassroomAuthOptions,
    db: {
      schema: STUDENT_CLASSROOM_SCHEMA as "teacher" | "public",
    },
  }
);

export async function ensureFreshStudentSession() {
  const { data, error } = await studentSupabase.auth.getSession();
  if (error) throw error;

  const session = data.session;
  if (!session) {
    await studentTeacherSupabase.auth.signOut({ scope: "local" });
    return null;
  }

  const expiresAt = session.expires_at ?? 0;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const isExpiringSoon = expiresAt > 0 && expiresAt <= nowInSeconds + SESSION_REFRESH_BUFFER_SECONDS;

  if (!isExpiringSoon || !session.refresh_token) {
    await studentTeacherSupabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    return session;
  }

  const { data: refreshedData, error: refreshError } = await studentSupabase.auth.refreshSession({
    refresh_token: session.refresh_token,
  });

  if (refreshError) throw refreshError;
  const refreshedSession = refreshedData.session ?? session;
  await studentTeacherSupabase.auth.setSession({
    access_token: refreshedSession.access_token,
    refresh_token: refreshedSession.refresh_token,
  });
  return refreshedSession;
}

studentSupabase.auth.onAuthStateChange((_event, session) => {
  window.setTimeout(() => {
    if (session?.access_token && session.refresh_token) {
      void studentTeacherSupabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    } else {
      void studentTeacherSupabase.auth.signOut({ scope: "local" });
    }
  }, 0);
});
