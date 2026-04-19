import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  ensureFreshTeacherSession,
  teacherSupabase,
  TEACHER_SUPABASE_PUBLISHABLE_KEY,
  TEACHER_SUPABASE_URL,
  IS_TEACHER_SUPABASE_CONFIGURED,
} from "@/integrations/supabase/teacher-client";
import {
  generateJoinCode,
  type CourseSummary,
  type ProfileRow,
  type TeacherRow,
} from "@/lib/classroom";
import { ensureTeacherProfileRecord, fetchTeacherWorkspace } from "@/lib/classroomData";
import { logTeacherActivityEvent } from "@/lib/activityEvents";
import { ensureCourseFilesBucket } from "@/lib/courseFiles";

function getTeacherDisplayName(user: User) {
  const fullName = user.user_metadata?.full_name;
  return typeof fullName === "string" && fullName.trim()
    ? fullName.trim()
    : user.email?.split("@")[0] || "Teacher";
}

interface SignUpResult {
  role: "teacher";
  needsEmailConfirmation: boolean;
}

interface AuthResponseSessionPayload {
  access_token?: string;
  refresh_token?: string;
}

interface TeacherAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: ProfileRow | null;
  role: "teacher" | null;
  teacherProfile: TeacherRow | null;
  teacherCourses: CourseSummary[];
  classroomReady: boolean;
  classroomError: Error | null;
  signUp: (email: string, password: string, name: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<"teacher">;
  signOut: () => Promise<void>;
  refreshClassroom: () => Promise<void>;
}

const TeacherAuthContext = createContext<TeacherAuthContextType | undefined>(undefined);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isFetchFailure(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes("failed to fetch");
}

async function parseAuthError(response: Response) {
  try {
    const body = await response.json();
    return body?.msg || body?.message || `Auth request failed with status ${response.status}.`;
  } catch {
    return `Auth request failed with status ${response.status}.`;
  }
}

async function requestAuthEndpoint<T>(path: string, body: Record<string, unknown>) {
  if (!IS_TEACHER_SUPABASE_CONFIGURED) {
    throw new Error("Teacher Supabase auth is not configured. Restart the app after verifying the teacher environment variables.");
  }

  const response = await fetch(`${TEACHER_SUPABASE_URL}${path}`, {
    method: "POST",
    headers: {
      apikey: TEACHER_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseAuthError(response));
  }

  return response.json() as Promise<T>;
}

async function applySessionFromAuthPayload(payload: AuthResponseSessionPayload) {
  if (!payload.access_token || !payload.refresh_token) return null;

  const { data, error } = await teacherSupabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });

  if (error) throw error;
  return data.session;
}

function toError(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

function isTeacherSessionError(error: unknown) {
  if (!(error && typeof error === "object")) return false;

  const typedError = error as { code?: string; message?: string };
  const message = typedError.message?.toLowerCase() || "";

  return (
    typedError.code === "PGRST301" ||
    message.includes("session expired") ||
    message.includes("teacher session missing") ||
    message.includes("auth session missing") ||
    message.includes("refresh token") ||
    message.includes("session_not_found") ||
    message.includes("invalid refresh token") ||
    message.includes("jwt")
  );
}

export function TeacherAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherRow | null>(null);
  const [teacherCourses, setTeacherCourses] = useState<CourseSummary[]>([]);
  const [classroomReady, setClassroomReady] = useState(false);
  const [classroomError, setClassroomError] = useState<Error | null>(null);
  const role = user ? "teacher" : null;

  const resetAppState = useCallback(() => {
    setProfile(null);
    setTeacherProfile(null);
    setTeacherCourses([]);
    setClassroomReady(false);
    setClassroomError(null);
  }, []);

  const clearInvalidTeacherSession = useCallback(async () => {
    try {
      await teacherSupabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.warn("Could not clear the invalid teacher session locally", error);
    }

    setSession(null);
    setUser(null);
    resetAppState();
  }, [resetAppState]);

  const syncUserData = useCallback(async (sessionUser: User) => {
    try {
      const repairedProfile = await ensureTeacherProfileRecord(sessionUser.id);
      setProfile(repairedProfile);

      const workspace = await fetchTeacherWorkspace(sessionUser.id);
      const resolvedProfile = workspace.teacherProfile || repairedProfile;

      if (!workspace.teacher) {
        throw new Error("Could not provision the teacher workspace.");
      }

      setProfile(resolvedProfile);
      setTeacherProfile(workspace.teacher);
      setTeacherCourses(
        workspace.courses.map((course) => ({
          ...course,
          teacher: workspace.teacher,
          teacherProfile: resolvedProfile,
        })) satisfies CourseSummary[]
      );
      setClassroomReady(true);
      setClassroomError(null);

      // Ensure course files storage bucket exists
      await ensureCourseFilesBucket();

      return "teacher" as const;
    } catch (error) {
      const resolvedError = toError(error, "Could not load the teacher workspace.");
      setTeacherProfile(null);
      setTeacherCourses([]);
      setClassroomReady(false);
      setClassroomError(resolvedError);
      if (isTeacherSessionError(resolvedError)) {
        await clearInvalidTeacherSession();
      }
      throw resolvedError;
    }
  }, [clearInvalidTeacherSession]);

  const hydrateAuthState = useCallback(async (nextSession: Session | null) => {
    let resolvedSession = nextSession;

    if (nextSession?.user) {
      try {
        resolvedSession = await ensureFreshTeacherSession();
      } catch (error) {
        console.warn("Could not refresh teacher session during hydration", error);
        if (isTeacherSessionError(error)) {
          await clearInvalidTeacherSession();
          setLoading(false);
          return null;
        }
      }
    }

    setSession(resolvedSession);
    setUser(resolvedSession?.user ?? null);

    if (!resolvedSession?.user) {
      resetAppState();
      setLoading(false);
      return null;
    }

    setLoading(true);
    try {
      return await syncUserData(resolvedSession.user);
    } catch (error) {
      console.error("Could not hydrate teacher classroom state", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearInvalidTeacherSession, resetAppState, syncUserData]);

  useEffect(() => {
    if (!IS_TEACHER_SUPABASE_CONFIGURED) {
      setLoading(false);
      setSession(null);
      setUser(null);
      return;
    }

    const {
      data: { subscription },
    } = teacherSupabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrateAuthState(nextSession).catch((error) => {
        console.error("Could not hydrate teacher auth state", error);
      });
    });

    void teacherSupabase.auth
      .getSession()
      .then(({ data }) => hydrateAuthState(data.session))
      .catch((error) => {
        console.error("Could not restore teacher auth session", error);
      });

    return () => subscription.unsubscribe();
  }, [hydrateAuthState]);

  const refreshClassroom = useCallback(async () => {
    if (!user) return;

    const refreshedSession = await ensureFreshTeacherSession();
    if (!refreshedSession?.user) {
      await clearInvalidTeacherSession();
      throw new Error("Your teacher session expired. Please sign in again.");
    }

    await syncUserData(refreshedSession.user);
  }, [clearInvalidTeacherSession, syncUserData, user]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    if (!IS_TEACHER_SUPABASE_CONFIGURED) {
      throw new Error("Teacher Supabase auth is not configured. Add your teacher publishable key in `.env` and restart the app.");
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedName = name.trim();
    const generatedUid = generateJoinCode();

    if (!normalizedName) {
      throw new Error("Enter your full name to continue.");
    }

    const metadata = {
      full_name: normalizedName,
      email: normalizedEmail,
      role: "teacher",
      teacher_uid: generatedUid,
    };

    let needsEmailConfirmation = true;
    let signedInUser: User | null = null;

    try {
      const { data, error } = await teacherSupabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: metadata },
      });

      if (error) throw error;
      if (data.session) {
        await hydrateAuthState(data.session);
        signedInUser = data.session.user;
      }
      needsEmailConfirmation = !data.session;
    } catch (error) {
      if (!isFetchFailure(error)) throw error;

      const data = await requestAuthEndpoint<AuthResponseSessionPayload & { user?: unknown }>(
        "/auth/v1/signup",
        { email: normalizedEmail, password, data: metadata }
      );

      const restoredSession = await applySessionFromAuthPayload(data);
      if (restoredSession) {
        await hydrateAuthState(restoredSession);
        signedInUser = restoredSession.user;
      }
      needsEmailConfirmation = !restoredSession;
    }

    if (!needsEmailConfirmation && signedInUser) {
      void logTeacherActivityEvent({
        actorId: signedInUser.id,
        actorRole: "teacher",
        actorName: normalizedName,
        eventType: "teacher_signed_up",
        metadata: {
          email: normalizedEmail,
          teacher_uid: generatedUid,
        },
      });
    }

    return {
      role: "teacher",
      needsEmailConfirmation,
    } satisfies SignUpResult;
  }, [hydrateAuthState]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!IS_TEACHER_SUPABASE_CONFIGURED) {
      throw new Error("Teacher Supabase auth is not configured. Add your teacher publishable key in `.env` and restart the app.");
    }

    const normalizedEmail = normalizeEmail(email);
    let nextSession: Session | null = null;

    try {
      const { data, error } = await teacherSupabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) throw error;
      if (!data.session) throw new Error("We could not start a teacher login session. Please try again.");
      nextSession = data.session;
    } catch (error) {
      if (!isFetchFailure(error)) throw error;

      const data = await requestAuthEndpoint<AuthResponseSessionPayload>(
        "/auth/v1/token?grant_type=password",
        { email: normalizedEmail, password }
      );

      nextSession = await applySessionFromAuthPayload(data);
      if (!nextSession) {
        throw new Error("We could not start a teacher login session. Please try again.");
      }
    }

    await hydrateAuthState(nextSession);
    if (nextSession?.user) {
      void logTeacherActivityEvent({
        actorId: nextSession.user.id,
        actorRole: "teacher",
        actorName: getTeacherDisplayName(nextSession.user),
        eventType: "teacher_signed_in",
        metadata: {
          email: normalizedEmail,
        },
      });
    }
    return "teacher" as const;
  }, [hydrateAuthState]);

  const signOut = useCallback(async () => {
    if (!IS_TEACHER_SUPABASE_CONFIGURED) {
      resetAppState();
      return;
    }

    if (user) {
      void logTeacherActivityEvent({
        actorId: user.id,
        actorRole: "teacher",
        actorName: getTeacherDisplayName(user),
        eventType: "teacher_signed_out",
      });
    }

    await teacherSupabase.auth.signOut();
    resetAppState();
  }, [resetAppState, user]);

  const value = useMemo<TeacherAuthContextType>(() => ({
    user,
    session,
    loading,
    profile,
    role,
    teacherProfile,
    teacherCourses,
    classroomReady,
    classroomError,
    signUp,
    signIn,
    signOut,
    refreshClassroom,
  }), [
    classroomError,
    classroomReady,
    loading,
    profile,
    refreshClassroom,
    role,
    session,
    signIn,
    signOut,
    signUp,
    teacherCourses,
    teacherProfile,
    user,
  ]);

  return <TeacherAuthContext.Provider value={value}>{children}</TeacherAuthContext.Provider>;
}

export function useTeacherAuth() {
  const context = useContext(TeacherAuthContext);
  if (!context) throw new Error("useTeacherAuth must be used within TeacherAuthProvider");
  return context;
}
