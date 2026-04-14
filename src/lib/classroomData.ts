import {
  ensureFreshTeacherSession,
  teacherClassroomSupabase,
  teacherSupabase,
} from "@/integrations/supabase/teacher-client";
import type {
  ActivityEventRow,
  AssignmentRow,
  CourseSummary,
  EnrollmentRow,
  EnrollmentWithCourse,
  ProfileRow,
  SubmissionRow,
  TeacherRow,
  TestHistoryRow,
  UserProgressRow,
} from "@/lib/classroom";
import { generateJoinCode } from "@/lib/classroom";
import {
  toDomainProfileRow,
  toDomainProgressRow,
  toDomainTestHistoryRow,
  toDomainActivityEventRow,
  normalizeJoinCode,
} from "@/lib/classroom";
import type { User } from "@supabase/supabase-js";
import { logTeacherActivityEvent } from "@/lib/activityEvents";

const classroomRealtimeTables = [
  "teachers",
  "courses",
  "enrollments",
  "assignments",
  "submissions",
] as const;

const publicRealtimeTables = [
  "activity_events",
  "profiles",
  "user_progress",
  "test_history",
] as const;

const classroomClient = teacherClassroomSupabase as any;
const publicStudentColumnCandidates = ["student_id", "student_external_id"] as const;

type PublicStudentColumn = (typeof publicStudentColumnCandidates)[number];

let enrollmentStudentColumnCache: PublicStudentColumn | null = null;
let submissionStudentColumnCache: PublicStudentColumn | null = null;

export interface TeacherWorkspace {
  teacher: TeacherRow | null;
  teacherProfile: ProfileRow | null;
  courses: CourseSummary[];
  enrollments: EnrollmentWithCourse[];
  students: ProfileRow[];
  activityEvents: ActivityEventRow[];
  progressRows: UserProgressRow[];
  testHistoryRows: TestHistoryRow[];
  assignments: AssignmentRow[];
  submissions: SubmissionRow[];
}

interface ErrorWithCode {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
}

function getErrorText(error: unknown) {
  if (!(error && typeof error === "object")) return "";

  const typedError = error as ErrorWithCode;
  return [typedError.message, typedError.details, typedError.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isMissingClassroomTableError(error: unknown) {
  const typedError = error as ErrorWithCode;
  const text = getErrorText(error);

  return (
    typedError?.code === "42P01" ||
    typedError?.code === "PGRST204" ||
    typedError?.code === "PGRST205" ||
    text.includes("relation") ||
    text.includes("does not exist") ||
    text.includes("schema cache") ||
    text.includes("could not find the table")
  );
}

function isMissingPublicStudentColumnError(error: unknown, column: PublicStudentColumn) {
  const typedError = error as ErrorWithCode;
  const text = getErrorText(error);

  return (
    typedError?.code === "42703" ||
    typedError?.code === "PGRST204" ||
    (text.includes(column.toLowerCase()) &&
      (text.includes("column") || text.includes("schema cache") || text.includes("could not find")))
  );
}

function isTeacherPolicyError(error: unknown) {
  const typedError = error as ErrorWithCode;
  const text = getErrorText(error);

  return (
    typedError?.code === "42501" ||
    text.includes("row-level security") ||
    text.includes("permission denied")
  );
}

function isExpiredJwtError(error: unknown) {
  const typedError = error as ErrorWithCode;
  const text = getErrorText(error);

  return (
    typedError?.code === "PGRST301" ||
    text.includes("jwt") ||
    text.includes("token is expired") ||
    text.includes("invalid claims") ||
    text.includes("verify signature")
  );
}

function isTeacherSessionError(error: unknown) {
  const text = getErrorText(error);

  return (
    isExpiredJwtError(error) ||
    text.includes("refresh token") ||
    text.includes("auth session missing") ||
    text.includes("session_not_found") ||
    text.includes("invalid refresh token")
  );
}

function explainTeacherWorkspaceError(error: unknown, action: string) {
  if (isTeacherSessionError(error)) {
    return `Your teacher session expired while trying to ${action}. Please sign out, sign back in, and try again.`;
  }

  if (isExpiredJwtError(error)) {
    return `Your teacher session expired while trying to ${action}. Please try again. If it keeps happening, sign out and sign back in.`;
  }

  if (isMissingClassroomTableError(error)) {
    return `Supabase is missing the public classroom tables needed to ${action}. Apply the latest classroom migrations in the linked project and try again.`;
  }

  if (isTeacherPolicyError(error)) {
    return `Supabase blocked the request to ${action}. Confirm the teacher row exists and the teacher RLS policies were applied in gate-da-students-portal.`;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return `Supabase could not ${action}.`;
}

function getTeacherActorName(user: User | null) {
  if (!user) return null;

  const fullName = user.user_metadata?.full_name;
  return typeof fullName === "string" && fullName.trim()
    ? fullName.trim()
    : user.email?.split("@")[0] || "Teacher";
}

async function requireTeacherSession(action: string) {
  try {
    const session = await ensureFreshTeacherSession();
    if (!session?.user) {
      throw new Error("Teacher session missing");
    }
    return session;
  } catch (error) {
    throw new Error(explainTeacherWorkspaceError(error, action));
  }
}

async function withTeacherSessionRetry<T>(action: string, operation: () => Promise<T>) {
  try {
    await ensureFreshTeacherSession();
    return await operation();
  } catch (error) {
    if (!isExpiredJwtError(error)) {
      throw error;
    }

    await ensureFreshTeacherSession();

    try {
      return await operation();
    } catch (retryError) {
      throw new Error(explainTeacherWorkspaceError(retryError, action));
    }
  }
}

async function resolvePublicStudentColumn(
  table: "enrollments" | "submissions",
  action: string
) {
  const cachedColumn = table === "enrollments" ? enrollmentStudentColumnCache : submissionStudentColumnCache;
  if (cachedColumn) {
    return cachedColumn;
  }

  for (const column of publicStudentColumnCandidates) {
    const { error } = await withTeacherSessionRetry(action, async () =>
      classroomClient
        .from(table)
        .select(column)
        .limit(1)
        .then((result) => result)
    );

    if (!error) {
      if (table === "enrollments") {
        enrollmentStudentColumnCache = column;
      } else {
        submissionStudentColumnCache = column;
      }
      return column;
    }

    if (isMissingPublicStudentColumnError(error, column)) {
      continue;
    }

    throw new Error(explainTeacherWorkspaceError(error, action));
  }

  throw new Error(`Supabase is missing the student-link column needed to ${action}. Apply the latest classroom migrations and try again.`);
}

function normalizeEnrollmentRow(row: any): EnrollmentRow {
  return {
    course_id: row.course_id,
    id: row.id,
    joined_at: row.joined_at,
    student_id: row.student_id || row.student_external_id,
  };
}

function normalizeSubmissionRow(row: any): SubmissionRow {
  return {
    answers: row.answers,
    assignment_id: row.assignment_id,
    correct_answers: row.correct_answers,
    id: row.id,
    score: row.score,
    student_id: row.student_id || row.student_external_id,
    submitted_at: row.submitted_at,
    total_questions: row.total_questions,
    violations: row.violations,
  };
}

function getUserMetaString(
  user: {
    user_metadata?: Record<string, unknown> | null;
  } | null,
  key: string
) {
  const value = user?.user_metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

function getTeacherFallbackDisplayName(user: User) {
  return getUserMetaString(user, "full_name")?.trim() || user.email?.split("@")[0] || "Teacher";
}

export async function ensureTeacherProfileRecord(userId: string) {
  const session = await requireTeacherSession("repair the teacher workspace");
  const sessionUser = session.user;

  if (!sessionUser || sessionUser.id !== userId) {
    throw new Error("Please sign in to your teacher account and try again.");
  }

  const upsertPayload = {
    user_id: sessionUser.id,
    full_name: getTeacherFallbackDisplayName(sessionUser),
    email: sessionUser.email || getUserMetaString(sessionUser, "email") || null,
    role: "teacher",
  };

  const { data: existingProfile, error: fetchError } = await teacherSupabase
    .from("profiles")
    .select("*")
    .eq("user_id", sessionUser.id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(explainTeacherWorkspaceError(fetchError, "repair the teacher workspace"));
  }

  if (!existingProfile) {
    const { data, error } = await teacherSupabase
      .from("profiles")
      .insert(upsertPayload)
      .select("*")
      .single();

    if (error) {
      throw new Error(explainTeacherWorkspaceError(error, "repair the teacher workspace"));
    }

    return toDomainProfileRow(data);
  }

  const updates: Record<string, string | null> = {};

  if (!existingProfile.full_name?.trim() && upsertPayload.full_name) {
    updates.full_name = upsertPayload.full_name;
  }

  if (!existingProfile.email && upsertPayload.email) {
    updates.email = upsertPayload.email;
  }

  if (existingProfile.role !== "teacher") {
    updates.role = "teacher";
  }

  if (Object.keys(updates).length === 0) {
    return toDomainProfileRow(existingProfile);
  }

  const { data, error } = await teacherSupabase
    .from("profiles")
    .update(updates)
    .eq("user_id", sessionUser.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(explainTeacherWorkspaceError(error, "repair the teacher workspace"));
  }

  return toDomainProfileRow(data);
}

async function fetchTeacherRecord(userId: string) {
  const { data, error } = await withTeacherSessionRetry("load the teacher workspace", async () =>
    classroomClient
      .from("teachers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .then((result) => result)
  );

  if (error) {
    throw new Error(explainTeacherWorkspaceError(error, "load the teacher workspace"));
  }
  return data;
}

export async function ensureTeacherRecord(userId: string) {
  await requireTeacherSession("provision the teacher workspace");
  await ensureTeacherProfileRecord(userId);
  let teacher = await fetchTeacherRecord(userId);

  if (teacher) {
    return teacher;
  }

  const { data: authData, error: authError } = await teacherSupabase.auth.getUser();
  if (authError) throw authError;

  const sessionUser = authData.user;
  if (!sessionUser || sessionUser.id !== userId) {
    return null;
  }

  const preferredTeacherUid = normalizeJoinCode(
    getUserMetaString(sessionUser, "teacher_uid") || generateJoinCode()
  );

  for (let attempt = 0; attempt < 5 && !teacher; attempt += 1) {
    const teacherUid = attempt === 0 ? preferredTeacherUid : generateJoinCode();
    const { data, error } = await withTeacherSessionRetry("provision the teacher workspace", async () =>
      classroomClient
        .from("teachers")
        .insert({
          user_id: userId,
          teacher_uid: teacherUid,
        })
        .select("*")
        .single()
        .then((result) => result)
    );

    if (!error) {
      teacher = data;
      break;
    }

    if (error.code === "23505") {
      teacher = await fetchTeacherRecord(userId);
      if (teacher) break;
      continue;
    }

    throw new Error(explainTeacherWorkspaceError(error, "provision the teacher workspace"));
  }

  return teacher;
}

async function fetchStudentProfiles(studentIds: string[]) {
  if (studentIds.length === 0) return [] as ProfileRow[];

  const profileResult = await teacherSupabase
    .from("profiles")
    .select("*")
    .in("user_id", studentIds);

  if (profileResult.error) throw profileResult.error;
  return (profileResult.data || []).map(toDomainProfileRow);
}

async function fetchStudentProgress(studentIds: string[]) {
  if (studentIds.length === 0) return [] as UserProgressRow[];

  const progressResult = await teacherSupabase
    .from("user_progress")
    .select("*")
    .in("user_id", studentIds);

  if (progressResult.error) throw progressResult.error;
  return (progressResult.data || []).map(toDomainProgressRow);
}

async function fetchStudentTestHistory(studentIds: string[]) {
  if (studentIds.length === 0) return [] as TestHistoryRow[];

  const testResult = await teacherSupabase
    .from("test_history")
    .select("*")
    .in("user_id", studentIds)
    .order("completed_at", { ascending: false });

  if (testResult.error) throw testResult.error;
  return (testResult.data || []).map(toDomainTestHistoryRow);
}

async function fetchStudentActivityEvents(studentIds: string[]) {
  if (studentIds.length === 0) return [] as ActivityEventRow[];

  const [actorResult, targetResult] = await Promise.all([
    teacherSupabase
      .from("activity_events")
      .select("*")
      .in("actor_id", studentIds)
      .order("created_at", { ascending: false }),
    teacherSupabase
      .from("activity_events")
      .select("*")
      .in("target_user_id", studentIds)
      .order("created_at", { ascending: false }),
  ]);

  if (actorResult.error || targetResult.error) {
    const error = actorResult.error || targetResult.error;
    if (isMissingClassroomTableError(error)) {
      return [] as ActivityEventRow[];
    }
    throw error;
  }

  const merged = new Map<string, ActivityEventRow>();
  [...(actorResult.data || []), ...(targetResult.data || [])].forEach((row) => {
    const activity = toDomainActivityEventRow(row);
    merged.set(activity.id, activity);
  });

  return [...merged.values()].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

export async function fetchTeacherWorkspace(userId: string): Promise<TeacherWorkspace> {
  await requireTeacherSession("load the teacher workspace");
  const ensuredTeacherProfile = await ensureTeacherProfileRecord(userId);
  const teacher = await ensureTeacherRecord(userId);

  const { data: teacherProfileRecord, error: teacherProfileError } = await teacherSupabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (teacherProfileError) throw teacherProfileError;
  const teacherProfile = teacherProfileRecord ? toDomainProfileRow(teacherProfileRecord) : ensuredTeacherProfile;

  if (!teacher) {
    return {
      teacher: null,
      teacherProfile,
      courses: [],
      enrollments: [],
      students: [],
      activityEvents: [],
      progressRows: [],
      testHistoryRows: [],
      assignments: [],
      submissions: [],
    };
  }

  const coursesResult = await withTeacherSessionRetry("load the teacher workspace", async () =>
    classroomClient
      .from("courses")
      .select("*")
      .eq("teacher_id", teacher.id)
      .order("created_at", { ascending: false })
      .then((result) => result)
  );

  if (coursesResult.error) throw coursesResult.error;

  const courseList = ((coursesResult.data || []) as any[]).map((course) => ({
    ...course,
    teacher,
    teacherProfile,
  })) as CourseSummary[];

  const courseIds = courseList.map((course) => course.id);
  if (courseIds.length === 0) {
    return {
      teacher,
      teacherProfile,
      courses: courseList,
      enrollments: [],
      students: [],
      activityEvents: [],
      progressRows: [],
      testHistoryRows: [],
      assignments: [],
      submissions: [],
    };
  }

  const [enrollmentsResult, assignmentsResult] = await Promise.all([
    withTeacherSessionRetry("load the teacher workspace", async () =>
      classroomClient
        .from("enrollments")
        .select("*")
        .in("course_id", courseIds)
        .order("joined_at", { ascending: false })
        .then((result) => result)
    ),
    withTeacherSessionRetry("load the teacher workspace", async () =>
      classroomClient
        .from("assignments")
        .select("*")
        .in("course_id", courseIds)
        .order("created_at", { ascending: false })
        .then((result) => result)
    ),
  ]);

  if (enrollmentsResult.error) throw enrollmentsResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;

  const enrollmentRows = (enrollmentsResult.data || []).map(normalizeEnrollmentRow);
  const assignmentList = (assignmentsResult.data || []) as AssignmentRow[];
  const assignmentIds = assignmentList.map((assignment) => assignment.id);
  const studentIds = [...new Set(enrollmentRows.map((enrollment) => enrollment.student_id))];

  const submissionsResult = assignmentIds.length === 0
    ? { data: [], error: null }
    : await withTeacherSessionRetry("load the teacher workspace", async () =>
        classroomClient
          .from("submissions")
          .select("*")
          .in("assignment_id", assignmentIds)
          .order("submitted_at", { ascending: false })
          .then((result) => result)
      );

  if (submissionsResult.error) throw submissionsResult.error;

  const [students, activityEvents, progressRows, testHistoryRows] = await Promise.all([
    fetchStudentProfiles(studentIds),
    fetchStudentActivityEvents(studentIds),
    fetchStudentProgress(studentIds),
    fetchStudentTestHistory(studentIds),
  ]);

  const courseMap = new Map(courseList.map((course) => [course.id, course]));
  const enrollments = enrollmentRows.map((enrollment) => ({
    ...enrollment,
    course: courseMap.get(enrollment.course_id) || null,
  })) satisfies EnrollmentWithCourse[];

  return {
    teacher,
    teacherProfile,
    courses: courseList,
    enrollments,
    students,
    activityEvents,
    progressRows,
    testHistoryRows,
    assignments: assignmentList,
    submissions: (submissionsResult.data || []).map(normalizeSubmissionRow),
  };
}

export async function createCourseForTeacher(teacherId: string, input: { title: string; description: string }) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const joinCode = generateJoinCode();

    const { data, error } = await withTeacherSessionRetry("create a course", async () =>
      classroomClient
        .from("courses")
        .insert({
          teacher_id: teacherId,
          title: input.title,
          description: input.description,
          join_code: joinCode,
        })
        .select("*")
        .single()
        .then((result) => result)
    );

    if (!error) {
      return data;
    }

    if (error.code === "23505") {
      continue;
    }

    throw new Error(explainTeacherWorkspaceError(error, "create a course"));
  }

  throw new Error("We could not generate a unique join code for the new course. Please try again.");
}

export async function createCourseForSignedInTeacher(input: { title: string; description: string }) {
  await requireTeacherSession("create a course");
  const { data: authData, error: authError } = await teacherSupabase.auth.getUser();
  if (authError) throw authError;

  const sessionUser = authData.user;
  if (!sessionUser) {
    throw new Error("Please sign in to your teacher account and try again.");
  }

  await ensureTeacherProfileRecord(sessionUser.id);
  const teacher = await ensureTeacherRecord(sessionUser.id);
  if (!teacher) {
    throw new Error("Could not provision the teacher workspace.");
  }

  const course = await createCourseForTeacher(teacher.id, input);
  await logTeacherActivityEvent({
    actorId: sessionUser.id,
    actorRole: "teacher",
    actorName: getTeacherActorName(sessionUser),
    eventType: "course_created",
    courseId: course.id,
    metadata: {
      title: course.title,
      join_code: course.join_code,
    },
  });
  return course;
}

export async function deleteCourseForSignedInTeacher(courseId: string) {
  await requireTeacherSession("delete the course");
  const { data: authData, error: authError } = await teacherSupabase.auth.getUser();
  if (authError) throw authError;

  const sessionUser = authData.user;
  if (!sessionUser) {
    throw new Error("Please sign in to your teacher account and try again.");
  }

  const { data: existingCourse } = await withTeacherSessionRetry("load the course before deletion", async () =>
    classroomClient
      .from("courses")
      .select("id,title,join_code")
      .eq("id", courseId)
      .maybeSingle()
      .then((result) => result)
  );

  const { error } = await withTeacherSessionRetry("delete the course", async () =>
    classroomClient
      .from("courses")
      .delete()
      .eq("id", courseId)
      .then((result) => result)
  );

  if (error) {
    throw new Error(explainTeacherWorkspaceError(error, "delete the course"));
  }

  await logTeacherActivityEvent({
    actorId: sessionUser.id,
    actorRole: "teacher",
    actorName: getTeacherActorName(sessionUser),
    eventType: "course_deleted",
    courseId,
    metadata: {
      title: existingCourse?.title || null,
      join_code: existingCourse?.join_code || null,
    },
  });
}

export async function removeStudentFromCourseForSignedInTeacher(input: { courseId: string; studentId: string }) {
  await requireTeacherSession("remove the student from the course");
  const { data: authData, error: authError } = await teacherSupabase.auth.getUser();
  if (authError) throw authError;

  const sessionUser = authData.user;
  if (!sessionUser) {
    throw new Error("Please sign in to your teacher account and try again.");
  }
  const { data: courseInfo } = await withTeacherSessionRetry("load course context", async () =>
    classroomClient
      .from("courses")
      .select("id,title")
      .eq("id", input.courseId)
      .maybeSingle()
      .then((result) => result)
  );
  const enrollmentStudentColumn = await resolvePublicStudentColumn(
    "enrollments",
    "remove the student from the course"
  );
  const submissionStudentColumn = await resolvePublicStudentColumn(
    "submissions",
    "remove the student submissions"
  );

  const { data: assignments, error: assignmentsError } = await withTeacherSessionRetry("load course assignments", async () =>
    classroomClient
      .from("assignments")
      .select("id")
      .eq("course_id", input.courseId)
      .then((result) => result)
  );

  if (assignmentsError) {
    throw new Error(explainTeacherWorkspaceError(assignmentsError, "load course assignments"));
  }

  const assignmentIds = (assignments || []).map((assignment) => assignment.id);

  if (assignmentIds.length > 0) {
    const { error: submissionsError } = await withTeacherSessionRetry("remove the student submissions", async () =>
      classroomClient
        .from("submissions")
        .delete()
        .eq(submissionStudentColumn, input.studentId)
        .in("assignment_id", assignmentIds)
        .then((result) => result)
    );

    if (submissionsError) {
      throw new Error(explainTeacherWorkspaceError(submissionsError, "remove the student submissions"));
    }
  }

  const { error } = await withTeacherSessionRetry("remove the student from the course", async () =>
    classroomClient
      .from("enrollments")
      .delete()
      .eq("course_id", input.courseId)
      .eq(enrollmentStudentColumn, input.studentId)
      .then((result) => result)
  );

  if (error) {
    throw new Error(explainTeacherWorkspaceError(error, "remove the student from the course"));
  }

  await logTeacherActivityEvent({
    actorId: sessionUser.id,
    actorRole: "teacher",
    actorName: getTeacherActorName(sessionUser),
    eventType: "course_student_removed",
    targetUserId: input.studentId,
    courseId: input.courseId,
    metadata: {
      course_title: courseInfo?.title || null,
    },
  });
}

export async function createAssignmentForCourse(input: {
  courseId: string;
  title: string;
  description: string;
  type: "homework" | "test";
  subjectId: string;
  topicId?: string;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  questionCount: number;
  timerMinutes: number;
  dueDate?: string;
  questionIds: string[];
}) {
  await requireTeacherSession("create an assignment");
  const { data: authData, error: authError } = await teacherSupabase.auth.getUser();
  if (authError) throw authError;
  const sessionUser = authData.user;

  const { data, error } = await withTeacherSessionRetry("create an assignment", async () =>
    classroomClient
      .from("assignments")
      .insert({
        course_id: input.courseId,
        title: input.title,
        description: input.description,
        type: input.type,
        subject_id: input.subjectId,
        topic_id: input.topicId || null,
        difficulty: input.difficulty,
        question_count: input.questionCount,
        timer_minutes: input.timerMinutes,
        due_date: input.dueDate || null,
        question_ids: input.questionIds,
      })
      .select("*")
      .single()
      .then((result) => result)
  );

  if (error) throw error;
  if (sessionUser) {
    await logTeacherActivityEvent({
      actorId: sessionUser.id,
      actorRole: "teacher",
      actorName: getTeacherActorName(sessionUser),
      eventType: "assignment_created",
      courseId: input.courseId,
      assignmentId: data.id,
      subjectId: input.subjectId,
      topicId: input.topicId || null,
      metadata: {
        title: input.title,
        type: input.type,
        difficulty: input.difficulty,
        question_count: input.questionCount,
        timer_minutes: input.timerMinutes,
      },
    });
  }
  return data;
}

export function subscribeToClassroomChanges(channelName: string, onChange: () => void) {
  const channel = teacherSupabase.channel(channelName);
  let refreshTimeout: number | undefined;

  const queueRefresh = () => {
    if (refreshTimeout) {
      window.clearTimeout(refreshTimeout);
    }

    refreshTimeout = window.setTimeout(() => {
      refreshTimeout = undefined;
      onChange();
    }, 250);
  };

  classroomRealtimeTables.forEach((table) => {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
      },
      queueRefresh
    );
  });

  publicRealtimeTables.forEach((table) => {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
      },
      queueRefresh
    );
  });

  channel.subscribe();

  return () => {
    if (refreshTimeout) {
      window.clearTimeout(refreshTimeout);
    }

    void teacherSupabase.removeChannel(channel);
  };
}
