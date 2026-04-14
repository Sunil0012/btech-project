import { createClient } from "@supabase/supabase-js";
import type { StudentDatabase } from "./student-types";

const STUDENT_SUPABASE_PROJECT_ID = import.meta.env.VITE_STUDENT_SUPABASE_PROJECT_ID?.trim();

export const STUDENT_SUPABASE_URL =
  import.meta.env.VITE_STUDENT_SUPABASE_URL?.trim() ||
  (STUDENT_SUPABASE_PROJECT_ID ? `https://${STUDENT_SUPABASE_PROJECT_ID}.supabase.co` : "");

export const STUDENT_SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY?.trim() || "";
export const IS_STUDENT_SUPABASE_CONFIGURED =
  Boolean(STUDENT_SUPABASE_URL) && Boolean(STUDENT_SUPABASE_PUBLISHABLE_KEY);

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

export const studentSupabase = createClient<StudentDatabase, "public">(
  STUDENT_SUPABASE_URL || "https://placeholder-student.supabase.co",
  STUDENT_SUPABASE_PUBLISHABLE_KEY || "missing-student-publishable-key",
  {
    auth: studentAuthOptions,
  }
);

// Shared classroom data currently lives in the same public schema/project.
export const studentTeacherSupabase = studentSupabase as any;
