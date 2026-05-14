import { createClient } from "@supabase/supabase-js";
import type { TeacherDatabase } from "./teacher-types";

const TEACHER_SUPABASE_PROJECT_ID = import.meta.env.VITE_TEACHER_SUPABASE_PROJECT_ID?.trim();
export const TEACHER_SUPABASE_SCHEMA =
  import.meta.env.VITE_TEACHER_SUPABASE_SCHEMA?.trim() || "teacher";

const TEACHER_SUPABASE_REMOTE_URL =
  import.meta.env.VITE_TEACHER_SUPABASE_URL?.trim() ||
  (TEACHER_SUPABASE_PROJECT_ID ? `https://${TEACHER_SUPABASE_PROJECT_ID}.supabase.co` : "");

function shouldUseLocalSupabaseProxy() {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  );
}

export const TEACHER_SUPABASE_URL =
  shouldUseLocalSupabaseProxy() && TEACHER_SUPABASE_REMOTE_URL
    ? `${window.location.origin}/supabase-teacher`
    : TEACHER_SUPABASE_REMOTE_URL;

export const TEACHER_SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_TEACHER_SUPABASE_PUBLISHABLE_KEY?.trim() || "";
export const IS_TEACHER_SUPABASE_CONFIGURED =
  Boolean(TEACHER_SUPABASE_URL) && Boolean(TEACHER_SUPABASE_PUBLISHABLE_KEY);

if (!IS_TEACHER_SUPABASE_CONFIGURED) {
  console.error(
    "Teacher Supabase configuration is incomplete. Check VITE_TEACHER_SUPABASE_URL or VITE_TEACHER_SUPABASE_PROJECT_ID and VITE_TEACHER_SUPABASE_PUBLISHABLE_KEY."
  );
}

const teacherAuthOptions = {
  storage: localStorage,
  storageKey: "gate-da-prep-teacher-auth",
  persistSession: true,
  autoRefreshToken: true,
} as const;

const teacherClassroomAuthOptions = {
  storage: localStorage,
  storageKey: "gate-da-prep-teacher-classroom-auth",
  persistSession: true,
  autoRefreshToken: true,
} as const;

const SESSION_REFRESH_BUFFER_SECONDS = 60;

export const teacherSupabase = createClient<TeacherDatabase, "public">(
  TEACHER_SUPABASE_URL || "https://placeholder-teacher.supabase.co",
  TEACHER_SUPABASE_PUBLISHABLE_KEY || "missing-teacher-publishable-key",
  {
    auth: teacherAuthOptions,
  }
);

export const teacherClassroomSupabase = createClient<
  TeacherDatabase,
  "teacher" | "public"
>(
  TEACHER_SUPABASE_URL || "https://placeholder-teacher.supabase.co",
  TEACHER_SUPABASE_PUBLISHABLE_KEY || "missing-teacher-publishable-key",
  {
    auth: teacherClassroomAuthOptions,
    db: {
      schema: TEACHER_SUPABASE_SCHEMA as "teacher" | "public",
    },
  }
);

export async function ensureFreshTeacherSession() {
  const { data, error } = await teacherSupabase.auth.getSession();
  if (error) throw error;

  const session = data.session;
  if (!session) {
    await teacherClassroomSupabase.auth.signOut({ scope: "local" });
    return null;
  }

  const expiresAt = session.expires_at ?? 0;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const isExpiringSoon = expiresAt > 0 && expiresAt <= nowInSeconds + SESSION_REFRESH_BUFFER_SECONDS;

  if (!isExpiringSoon) {
    await teacherClassroomSupabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    return session;
  }

  if (!session.refresh_token) {
    await teacherClassroomSupabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    return session;
  }

  const { data: refreshedData, error: refreshError } = await teacherSupabase.auth.refreshSession({
    refresh_token: session.refresh_token,
  });

  if (refreshError) throw refreshError;
  const refreshedSession = refreshedData.session ?? session;
  await teacherClassroomSupabase.auth.setSession({
    access_token: refreshedSession.access_token,
    refresh_token: refreshedSession.refresh_token,
  });
  return refreshedSession;
}
