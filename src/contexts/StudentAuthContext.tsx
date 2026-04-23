import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  studentSupabase,
  STUDENT_SUPABASE_PUBLISHABLE_KEY,
  STUDENT_SUPABASE_URL,
  IS_STUDENT_SUPABASE_CONFIGURED,
} from "@/integrations/supabase/student-client";
import type { StudentTablesInsert, StudentTablesUpdate } from "@/integrations/supabase/student-types";
import {
  normalizeJoinCode,
  normalizeRole,
  toDomainProfileRow,
  type EnrollmentWithCourse,
  type ProfileRow,
} from "@/lib/classroom";
import {
  joinClassroom,
  leaveClassroom,
  listStudentClassrooms,
  syncStudentProgress,
  syncStudentTestHistory,
  type StudentIdentityPayload,
} from "@/lib/teacherSync";
import { logStudentActivityEvent } from "@/lib/activityEvents";

const ELO_STORAGE_KEY = "gate_elo";
const ANSWERED_STORAGE_KEY = "gate_answered";
const SCORES_STORAGE_KEY = "gate_scores";
const OVERALL_TOPIC_ID = "__overall__";

type SubjectScoreMap = Record<string, { correct: number; total: number }>;

interface SignUpResult {
  role: "student";
  needsEmailConfirmation: boolean;
}

type TestHistoryInput = Omit<StudentTablesInsert<"test_history">, "user_id">;

interface AuthResponseSessionPayload {
  access_token?: string;
  refresh_token?: string;
}

interface StudentAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: ProfileRow | null;
  role: "student" | null;
  enrolledCourses: EnrollmentWithCourse[];
  hasRequiredCourse: boolean;
  signUp: (email: string, password: string, name: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<"student">;
  signOut: () => Promise<void>;
  refreshClassroom: () => Promise<void>;
  joinCourseByCode: (code: string) => Promise<void>;
  leaveCourse: (courseId: string) => Promise<void>;
  studentElo: number;
  setStudentElo: (elo: number) => void;
  answeredQuestions: Set<string>;
  addAnsweredQuestion: (id: string, wasCorrect?: boolean) => void;
  subjectScores: SubjectScoreMap;
  updateSubjectScore: (subjectId: string, correct: boolean, topicId?: string | null) => void;
  recordTestHistory: (entry: TestHistoryInput) => Promise<void>;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

function readStoredElo() {
  const raw = localStorage.getItem(ELO_STORAGE_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isNaN(parsed) ? 1500 : parsed;
}

function readStoredAnsweredQuestions() {
  try {
    const raw = localStorage.getItem(ANSWERED_STORAGE_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<string>();
  }
}

function readStoredSubjectScores() {
  try {
    const raw = localStorage.getItem(SCORES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SubjectScoreMap) : {};
  } catch {
    return {};
  }
}

function buildSubjectScoresFromRows(rows: Array<{ subject_id: string; correct: number; total: number; topic_id: string | null }>) {
  const overallRows = rows.filter((row) => row.topic_id === OVERALL_TOPIC_ID);
  if (overallRows.length > 0) {
    return overallRows.reduce<SubjectScoreMap>((accumulator, row) => {
      accumulator[row.subject_id] = { correct: row.correct, total: row.total };
      return accumulator;
    }, {});
  }

  return rows.reduce<SubjectScoreMap>((accumulator, row) => {
    const existing = accumulator[row.subject_id] || { correct: 0, total: 0 };
    accumulator[row.subject_id] = {
      correct: existing.correct + row.correct,
      total: existing.total + row.total,
    };
    return accumulator;
  }, {});
}

function getUserMetaString(user: User, key: string) {
  const value = user.user_metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isFetchFailure(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes("failed to fetch");
}

function isMissingReviewPayloadColumnError(error: { code?: string; message?: string; details?: string; hint?: string } | null) {
  if (!error) return false;

  const combinedMessage = `${error.message || ""} ${error.details || ""} ${error.hint || ""}`.toLowerCase();
  return (
    error.code === "42703" ||
    (combinedMessage.includes("review_payload") &&
      (combinedMessage.includes("column") || combinedMessage.includes("schema cache")))
  );
}

function getFallbackDisplayName(user: User) {
  return getUserMetaString(user, "full_name")?.trim() || user.email?.split("@")[0] || "Learner";
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
  if (!IS_STUDENT_SUPABASE_CONFIGURED) {
    throw new Error("Student Supabase auth is not configured. Restart the app after verifying the student environment variables.");
  }

  const response = await fetch(`${STUDENT_SUPABASE_URL}${path}`, {
    method: "POST",
    headers: {
      apikey: STUDENT_SUPABASE_PUBLISHABLE_KEY,
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

  const { data, error } = await studentSupabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });

  if (error) throw error;
  return data.session;
}

async function fetchStudentProfile(userId: string) {
  const { data, error } = await studentSupabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function ensureStudentProfile(sessionUser: User) {
  const existingProfile = await fetchStudentProfile(sessionUser.id);
  const fallbackName = getFallbackDisplayName(sessionUser);
  const fallbackEmail = sessionUser.email || getUserMetaString(sessionUser, "email") || null;

  if (!existingProfile) {
    const insertPayload: StudentTablesInsert<"profiles"> = {
      user_id: sessionUser.id,
      full_name: fallbackName,
      email: fallbackEmail,
      role: "student",
    };

    const { data, error } = await studentSupabase
      .from("profiles")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  const updates: StudentTablesUpdate<"profiles"> = {};

  if (!existingProfile.full_name?.trim() && fallbackName) {
    updates.full_name = fallbackName;
  }

  if (!existingProfile.email && fallbackEmail) {
    updates.email = fallbackEmail;
  }

  if (normalizeRole(existingProfile.role) !== "student") {
    updates.role = "student";
  }

  if (Object.keys(updates).length === 0) {
    return existingProfile;
  }

  const { data, error } = await studentSupabase
    .from("profiles")
    .update(updates)
    .eq("user_id", sessionUser.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

function buildStudentIdentity(user: User, profile: ProfileRow | null, eloRating?: number): StudentIdentityPayload {
  return {
    studentExternalId: user.id,
    email: profile?.email || user.email || null,
    fullName: profile?.full_name || getFallbackDisplayName(user),
    avatarUrl: profile?.avatar_url || null,
    eloRating: eloRating ?? profile?.elo_rating ?? 1500,
  };
}

export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrollmentWithCourse[]>([]);
  const [studentEloState, setStudentEloState] = useState(readStoredElo);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(readStoredAnsweredQuestions);
  const [subjectScores, setSubjectScores] = useState<SubjectScoreMap>(readStoredSubjectScores);
  const role = user ? "student" : null;
  const hasRequiredCourse = enrolledCourses.length > 0;

  const resetAppState = useCallback(() => {
    setProfile(null);
    setEnrolledCourses([]);
    setStudentEloState(readStoredElo());
    setAnsweredQuestions(readStoredAnsweredQuestions());
    setSubjectScores(readStoredSubjectScores());
  }, []);

  const persistLocalState = useCallback((elo: number, answered: Set<string>, scores: SubjectScoreMap) => {
    localStorage.setItem(ELO_STORAGE_KEY, elo.toString());
    localStorage.setItem(ANSWERED_STORAGE_KEY, JSON.stringify([...answered]));
    localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(scores));
  }, []);

  const refreshClassroom = useCallback(async () => {
    if (!user) {
      setEnrolledCourses([]);
      return;
    }

    const nextCourses = await listStudentClassrooms(user.id);
    setEnrolledCourses(nextCourses);
  }, [user]);

  const syncTeacherMirror = useCallback(async (
    currentUser: User,
    currentProfile: ProfileRow | null,
    nextScores: SubjectScoreMap,
    nextElo: number
  ) => {
    await syncStudentProgress({
      student: buildStudentIdentity(currentUser, currentProfile, nextElo),
      lastActive: new Date().toISOString(),
      subjectScores: nextScores,
    });
  }, []);

  const syncUserData = useCallback(async (sessionUser: User) => {
    const nextProfileRecord = await ensureStudentProfile(sessionUser);
    const nextProfile = toDomainProfileRow(nextProfileRecord);

    const [{ data: answeredData, error: answeredError }, { data: progressData, error: progressError }] = await Promise.all([
      studentSupabase
        .from("answered_questions")
        .select("question_id, was_correct")
        .eq("user_id", sessionUser.id),
      studentSupabase
        .from("user_progress")
        .select("subject_id, correct, total, topic_id")
        .eq("user_id", sessionUser.id),
    ]);

    if (answeredError) throw answeredError;
    if (progressError) throw progressError;

    const answeredSet = answeredData?.length
      ? new Set(
          answeredData
            .filter((item) => item.was_correct)
            .map((item) => item.question_id)
        )
      : readStoredAnsweredQuestions();
    const scoreMap = progressData?.length
      ? buildSubjectScoresFromRows(progressData)
      : readStoredSubjectScores();
    const elo = nextProfile.elo_rating ?? readStoredElo();

    setProfile(nextProfile);
    setStudentEloState(elo);
    setAnsweredQuestions(answeredSet);
    setSubjectScores(scoreMap);
    persistLocalState(elo, answeredSet, scoreMap);

    setEnrolledCourses(await listStudentClassrooms(sessionUser.id));
    return "student" as const;
  }, [persistLocalState]);

  const hydrateAuthState = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      resetAppState();
      setLoading(false);
      return null;
    }

    setLoading(true);
    try {
      return await syncUserData(nextSession.user);
    } finally {
      setLoading(false);
    }
  }, [resetAppState, syncUserData]);

  useEffect(() => {
    if (!IS_STUDENT_SUPABASE_CONFIGURED) {
      setLoading(false);
      setSession(null);
      setUser(null);
      return;
    }

    const {
      data: { subscription },
    } = studentSupabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrateAuthState(nextSession).catch((error) => {
        console.error("Could not hydrate student auth state", error);
      });
    });

    void studentSupabase.auth
      .getSession()
      .then(({ data }) => hydrateAuthState(data.session))
      .catch((error) => {
        console.error("Could not restore student auth session", error);
      });

    return () => subscription.unsubscribe();
  }, [hydrateAuthState]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    if (!IS_STUDENT_SUPABASE_CONFIGURED) {
      throw new Error("Student Supabase auth is not configured. Add your student publishable key in `.env` and restart the app.");
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new Error("Enter your full name to continue.");
    }

    const metadata = {
      full_name: normalizedName,
      email: normalizedEmail,
      role: "student",
    };

    let needsEmailConfirmation = true;
    let signedInUser: User | null = null;

    try {
      const { data, error } = await studentSupabase.auth.signUp({
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
      void logStudentActivityEvent({
        actorId: signedInUser.id,
        actorRole: "student",
        actorName: normalizedName,
        eventType: "student_signed_up",
        metadata: {
          email: normalizedEmail,
        },
      });
    }

    return {
      role: "student",
      needsEmailConfirmation,
    } satisfies SignUpResult;
  }, [hydrateAuthState]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!IS_STUDENT_SUPABASE_CONFIGURED) {
      throw new Error("Student Supabase auth is not configured. Add your student publishable key in `.env` and restart the app.");
    }

    const normalizedEmail = normalizeEmail(email);
    let nextSession: Session | null = null;

    try {
      const { data, error } = await studentSupabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) throw error;
      if (!data.session) throw new Error("We could not start a student login session. Please try again.");
      nextSession = data.session;
    } catch (error) {
      if (!isFetchFailure(error)) throw error;

      const data = await requestAuthEndpoint<AuthResponseSessionPayload>(
        "/auth/v1/token?grant_type=password",
        { email: normalizedEmail, password }
      );

      nextSession = await applySessionFromAuthPayload(data);
      if (!nextSession) {
        throw new Error("We could not start a student login session. Please try again.");
      }
    }

    await hydrateAuthState(nextSession);
    if (nextSession?.user) {
      void logStudentActivityEvent({
        actorId: nextSession.user.id,
        actorRole: "student",
        actorName: getFallbackDisplayName(nextSession.user),
        eventType: "student_signed_in",
        metadata: {
          email: normalizedEmail,
        },
      });
    }
    return "student" as const;
  }, [hydrateAuthState]);

  const signOut = useCallback(async () => {
    if (!IS_STUDENT_SUPABASE_CONFIGURED) {
      resetAppState();
      return;
    }

    if (user) {
      void logStudentActivityEvent({
        actorId: user.id,
        actorRole: "student",
        actorName: getFallbackDisplayName(user),
        eventType: "student_signed_out",
      });
    }

    await studentSupabase.auth.signOut();
    resetAppState();
  }, [resetAppState, user]);

  const setStudentElo = useCallback((elo: number) => {
    setStudentEloState(elo);
    localStorage.setItem(ELO_STORAGE_KEY, elo.toString());

    if (!user) return;

    void studentSupabase
      .from("profiles")
      .update({
        elo_rating: elo,
        last_active: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    void syncTeacherMirror(user, profile, subjectScores, elo);
  }, [profile, subjectScores, syncTeacherMirror, user]);

  const addAnsweredQuestion = useCallback((id: string, wasCorrect?: boolean) => {
    if (wasCorrect) {
      setAnsweredQuestions((previous) => {
        if (previous.has(id)) return previous;

        const next = new Set(previous);
        next.add(id);
        localStorage.setItem(ANSWERED_STORAGE_KEY, JSON.stringify([...next]));
        return next;
      });
    }

    if (!user || typeof wasCorrect !== "boolean") return;

    void logStudentActivityEvent({
      actorId: user.id,
      actorRole: "student",
      actorName: getFallbackDisplayName(user),
      eventType: "question_answered",
      questionId: id,
      metadata: {
        was_correct: wasCorrect,
      },
    });

    void studentSupabase
      .from("answered_questions")
      .upsert(
        {
          user_id: user.id,
          question_id: id,
          was_correct: wasCorrect,
        },
        {
          onConflict: "user_id,question_id",
        }
      );
  }, [user]);

  const updateSubjectScore = useCallback((subjectId: string, correct: boolean, topicId?: string | null) => {
    setSubjectScores((previous) => {
      const existing = previous[subjectId] || { correct: 0, total: 0 };
      const nextScores = {
        ...previous,
        [subjectId]: {
          correct: existing.correct + (correct ? 1 : 0),
          total: existing.total + 1,
        },
      };

      localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(nextScores));

      if (user) {
        const now = new Date().toISOString();

        void studentSupabase
          .from("user_progress")
          .upsert(
            {
              user_id: user.id,
              subject_id: subjectId,
              topic_id: OVERALL_TOPIC_ID,
              correct: nextScores[subjectId].correct,
              total: nextScores[subjectId].total,
              last_practiced: now,
            },
            {
              onConflict: "user_id,subject_id,topic_id",
            }
          );

        if (topicId && topicId !== OVERALL_TOPIC_ID) {
          void studentSupabase
            .from("user_progress")
            .select("correct,total")
            .eq("user_id", user.id)
            .eq("subject_id", subjectId)
            .eq("topic_id", topicId)
            .maybeSingle()
            .then(({ data }) => {
              const nextTopicCorrect = (data?.correct || 0) + (correct ? 1 : 0);
              const nextTopicTotal = (data?.total || 0) + 1;

              return studentSupabase.from("user_progress").upsert(
                {
                  user_id: user.id,
                  subject_id: subjectId,
                  topic_id: topicId,
                  correct: nextTopicCorrect,
                  total: nextTopicTotal,
                  last_practiced: now,
                },
                {
                  onConflict: "user_id,subject_id,topic_id",
                }
              );
            })
            .catch((error) => {
              console.error("Could not sync topic progress", error);
            });
        }

        void studentSupabase
          .from("profiles")
          .update({ last_active: now })
          .eq("user_id", user.id);

        void syncTeacherMirror(user, profile, nextScores, studentEloState);
      }

      return nextScores;
    });
  }, [profile, studentEloState, syncTeacherMirror, user]);

  const joinCourseByCode = useCallback(async (code: string) => {
    if (!IS_STUDENT_SUPABASE_CONFIGURED) {
      throw new Error("Student Supabase auth is not configured. Add your student publishable key in `.env` and restart the app.");
    }

    if (!user) throw new Error("Please sign in first.");

    const normalizedCode = normalizeJoinCode(code);
    if (!normalizedCode) throw new Error("Enter a valid course join code.");

    const nextCourses = await joinClassroom(normalizedCode, buildStudentIdentity(user, profile, studentEloState));
    if (nextCourses.length === 0) {
      throw new Error("No course matched that code. Ask your teacher to share the correct classroom code or create the course first.");
    }

    const joinedCourse = nextCourses.find((enrollment) => normalizeJoinCode(enrollment.course?.join_code || "") === normalizedCode)?.course;
    void logStudentActivityEvent({
      actorId: user.id,
      actorRole: "student",
      actorName: getFallbackDisplayName(user),
      eventType: "course_joined",
      courseId: joinedCourse?.id || null,
      metadata: {
        join_code: normalizedCode,
        joined_courses: nextCourses.length,
      },
    });

    setEnrolledCourses(nextCourses);
  }, [profile, studentEloState, user]);

  const leaveCourse = useCallback(async (courseId: string) => {
    if (!IS_STUDENT_SUPABASE_CONFIGURED) {
      throw new Error("Student Supabase auth is not configured. Add your student publishable key in `.env` and restart the app.");
    }

    if (!user) throw new Error("Please sign in first.");
    if (!courseId.trim()) throw new Error("Choose a valid course first.");

    const previousCourse = enrolledCourses.find((course) => course.course_id === courseId)?.course;
    const nextCourses = await leaveClassroom(courseId, user.id);
    void logStudentActivityEvent({
      actorId: user.id,
      actorRole: "student",
      actorName: getFallbackDisplayName(user),
      eventType: "course_left",
      courseId,
      metadata: {
        course_title: previousCourse?.title || null,
        remaining_courses: nextCourses.length,
      },
    });
    setEnrolledCourses(nextCourses);
  }, [enrolledCourses, user]);

  const recordTestHistory = useCallback(async (entry: TestHistoryInput) => {
    if (!IS_STUDENT_SUPABASE_CONFIGURED) {
      throw new Error("Student Supabase auth is not configured. Add your student publishable key in `.env` and restart the app.");
    }

    if (!user) return;

    const completedAt = entry.completed_at || new Date().toISOString();
    const historyEntry: StudentTablesInsert<"test_history"> = {
      ...entry,
      completed_at: completedAt,
      user_id: user.id,
    };
    
    console.log("recordTestHistory: Saving test with payload:", {
      testType: entry.test_type,
      hasReviewPayload: Boolean(entry.review_payload),
      reviewPayloadKeys: entry.review_payload ? Object.keys(entry.review_payload) : [],
    });
    
    let insertError: { code?: string; message?: string; details?: string; hint?: string } | null = null;

    const { error } = await studentSupabase.from("test_history").insert(historyEntry);

    if (error) {
      console.error("recordTestHistory: Insert error:", error);
    }

    if (error && isMissingReviewPayloadColumnError(error)) {
      console.warn("recordTestHistory: review_payload column missing, retrying without it");
      const { review_payload: _reviewPayload, ...legacyHistoryEntry } = historyEntry;
      const fallbackInsert = await studentSupabase.from("test_history").insert(legacyHistoryEntry);
      insertError = fallbackInsert.error;
    } else {
      insertError = error;
    }

    if (insertError) {
      console.error("recordTestHistory: Final error:", insertError);
      throw insertError;
    }

    console.log("recordTestHistory: Successfully saved test history");

    await syncStudentTestHistory({
      student: buildStudentIdentity(user, profile, studentEloState),
      testHistory: {
        testType: entry.test_type,
        subjectId: entry.subject_id || null,
        topicId: entry.topic_id || null,
        score: entry.score ?? 0,
        maxScore: entry.max_score ?? 0,
        questionsAttempted: entry.questions_attempted ?? 0,
        correctAnswers: entry.correct_answers ?? 0,
        totalQuestions: entry.total_questions ?? 0,
        violations: entry.violations ?? 0,
        durationSeconds: entry.duration_seconds ?? null,
        completedAt,
      },
    });

    await logStudentActivityEvent({
      actorId: user.id,
      actorRole: "student",
      actorName: getFallbackDisplayName(user),
      eventType: "test_completed",
      subjectId: entry.subject_id || null,
      topicId: entry.topic_id || null,
      metadata: {
        test_type: entry.test_type,
        score: entry.score ?? 0,
        max_score: entry.max_score ?? 0,
        questions_attempted: entry.questions_attempted ?? 0,
        correct_answers: entry.correct_answers ?? 0,
        total_questions: entry.total_questions ?? 0,
        violations: entry.violations ?? 0,
        duration_seconds: entry.duration_seconds ?? null,
        completed_at: completedAt,
      },
    });
  }, [profile, studentEloState, user]);

  const value = useMemo<StudentAuthContextType>(() => ({
    user,
    session,
    loading,
    profile,
    role,
    enrolledCourses,
    hasRequiredCourse,
    signUp,
    signIn,
    signOut,
    refreshClassroom,
    joinCourseByCode,
    leaveCourse,
    studentElo: studentEloState,
    setStudentElo,
    answeredQuestions,
    addAnsweredQuestion,
    subjectScores,
    updateSubjectScore,
    recordTestHistory,
  }), [
    addAnsweredQuestion,
    answeredQuestions,
    enrolledCourses,
    hasRequiredCourse,
    joinCourseByCode,
    leaveCourse,
    loading,
    profile,
    recordTestHistory,
    refreshClassroom,
    role,
    session,
    setStudentElo,
    signIn,
    signOut,
    signUp,
    studentEloState,
    subjectScores,
    updateSubjectScore,
    user,
  ]);

  return <StudentAuthContext.Provider value={value}>{children}</StudentAuthContext.Provider>;
}

export function useStudentAuth() {
  const context = useContext(StudentAuthContext);
  if (!context) throw new Error("useStudentAuth must be used within StudentAuthProvider");
  return context;
}
