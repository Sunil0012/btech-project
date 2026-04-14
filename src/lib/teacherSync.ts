import type { AssignmentAnswerValue, AssignmentSummary, EnrollmentWithCourse, SubmissionRow } from "@/lib/classroom";
import {
  studentSupabase,
  studentTeacherSupabase,
  STUDENT_SUPABASE_PUBLISHABLE_KEY,
  STUDENT_SUPABASE_URL,
} from "@/integrations/supabase/student-client";
import { TEACHER_SUPABASE_PUBLISHABLE_KEY, TEACHER_SUPABASE_URL } from "@/integrations/supabase/teacher-client";

const CLASSROOM_CACHE_PREFIX = "teacher-sync-classrooms";
const ASSIGNMENT_CACHE_PREFIX = "teacher-sync-assignments";
const sharedClassroomClient = studentTeacherSupabase as any;
const IS_SHARED_SUPABASE =
  Boolean(STUDENT_SUPABASE_URL) &&
  STUDENT_SUPABASE_URL === TEACHER_SUPABASE_URL &&
  STUDENT_SUPABASE_PUBLISHABLE_KEY === TEACHER_SUPABASE_PUBLISHABLE_KEY;

const publicStudentColumnCandidates = ["student_id", "student_external_id"] as const;

type PublicStudentColumn = (typeof publicStudentColumnCandidates)[number];

let enrollmentStudentColumnCache: PublicStudentColumn | null = null;
let submissionStudentColumnCache: PublicStudentColumn | null = null;

export interface StudentIdentityPayload {
  studentExternalId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl?: string | null;
  eloRating?: number;
}

export interface CourseInviteDetails {
  id: string;
  title: string;
  description: string | null;
  joinCode: string;
  teacherName: string | null;
}

interface TeacherSyncRequest<TPayload> {
  action:
    | "join-classroom"
    | "leave-classroom"
    | "list-student-classrooms"
    | "list-student-assignments"
    | "get-assignment-attempt"
    | "submit-assignment"
    | "sync-student-progress"
    | "sync-student-test-history";
  payload: TPayload;
}

function getErrorText(error: unknown) {
  if (!(error && typeof error === "object")) return "";

  const typedError = error as { message?: string; details?: string; hint?: string };
  return [typedError.message, typedError.details, typedError.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isMissingPublicStudentColumnError(error: unknown, column: PublicStudentColumn) {
  const typedError = error as { code?: string };
  const text = getErrorText(error);

  return (
    typedError?.code === "42703" ||
    typedError?.code === "PGRST204" ||
    (text.includes(column.toLowerCase()) &&
      (text.includes("column") || text.includes("schema cache") || text.includes("could not find")))
  );
}

async function resolvePublicStudentColumn(table: "enrollments" | "submissions") {
  const cachedColumn = table === "enrollments" ? enrollmentStudentColumnCache : submissionStudentColumnCache;
  if (cachedColumn) {
    return cachedColumn;
  }

  for (const column of publicStudentColumnCandidates) {
    const { error } = await sharedClassroomClient
      .from(table)
      .select(column)
      .limit(1);

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

    throw error;
  }

  throw new Error(`The public ${table} table is missing the student link column.`);
}

function normalizeEnrollmentRow(row: any) {
  return {
    ...row,
    student_id: row.student_id || row.student_external_id,
  };
}

function normalizeSubmissionRow(row: any) {
  return {
    ...row,
    student_id: row.student_id || row.student_external_id,
  };
}

async function readTeacherSyncResponseMessage(response?: Response) {
  if (!response) return "";

  try {
    const contentType = response.headers.get("content-type")?.toLowerCase() || "";
    if (contentType.includes("application/json")) {
      const body = await response.clone().json();

      if (typeof body?.message === "string" && body.message.trim()) {
        return body.message.trim();
      }

      if (typeof body?.msg === "string" && body.msg.trim()) {
        return body.msg.trim();
      }
    }

    const text = await response.clone().text();
    return text.trim();
  } catch {
    return "";
  }
}

function readCachedJson<T>(key: string, fallback: T) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeCachedJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore local cache failures and keep app flow alive.
  }
}

function isFunctionUnavailable(error: unknown, responseMessage = "") {
  const message = `${error instanceof Error ? error.message : ""} ${responseMessage}`.toLowerCase().trim();
  return (
    (error instanceof Error &&
      (error.name === "FunctionsFetchError" || error.name === "FunctionsRelayError")) ||
    message.includes("failed to send a request to the edge function") ||
    message.includes("relay error invoking the edge function") ||
    message.includes("function not found") ||
    message === "not found"
  );
}

async function directListStudentClassrooms(studentExternalId: string): Promise<EnrollmentWithCourse[]> {
  const studentColumn = await resolvePublicStudentColumn("enrollments");

  const enrollmentsResult = await sharedClassroomClient
    .from("enrollments")
    .select("*")
    .eq(studentColumn, studentExternalId)
    .order("joined_at", { ascending: false });

  if (enrollmentsResult.error) throw enrollmentsResult.error;

  const enrollments = (enrollmentsResult.data || []).map(normalizeEnrollmentRow);
  const courseIds = [...new Set(enrollments.map((enrollment: any) => enrollment.course_id))];
  if (courseIds.length === 0) return [];

  const [{ data: courses, error: coursesError }, { data: teachers, error: teachersError }] = await Promise.all([
    sharedClassroomClient.from("courses").select("*").in("id", courseIds),
    sharedClassroomClient.from("teachers").select("*"),
  ]);

  if (coursesError) throw coursesError;
  if (teachersError) throw teachersError;

  const teacherUserIds = [...new Set((teachers || []).map((teacher: any) => teacher.user_id))];
  const { data: teacherProfiles, error: profilesError } = teacherUserIds.length === 0
    ? { data: [], error: null }
    : await studentSupabase.from("profiles").select("*").in("user_id", teacherUserIds);

  if (profilesError) throw profilesError;

  const teacherMap = new Map((teachers || []).map((teacher: any) => [teacher.id, teacher]));
  const profileMap = new Map((teacherProfiles || []).map((profile: any) => [profile.user_id, profile]));
  const courseMap = new Map(
    (courses || []).map((course: any) => {
      const teacher = teacherMap.get(course.teacher_id) || null;
      return [
        course.id,
        {
          ...course,
          teacher,
          teacherProfile: teacher ? profileMap.get(teacher.user_id) || null : null,
        },
      ];
    })
  );

  return enrollments.map((enrollment: any) => ({
    ...enrollment,
    course: courseMap.get(enrollment.course_id) || null,
  }));
}

async function directJoinClassroom(code: string, student: StudentIdentityPayload) {
  const studentColumn = await resolvePublicStudentColumn("enrollments");
  const enrollmentPayload: Record<string, string> = {
    [studentColumn]: student.studentExternalId,
    course_id: "",
  };
  const enrollmentConflict = `${studentColumn},course_id`;

  const { data: course, error: courseError } = await sharedClassroomClient
    .from("courses")
    .select("*")
    .eq("join_code", code.trim().toUpperCase())
    .maybeSingle();

  if (courseError) throw courseError;
  if (!course) throw new Error("No course found for that code.");

  enrollmentPayload.course_id = course.id;

  const result = await sharedClassroomClient.from("enrollments").upsert(
    enrollmentPayload,
    {
      onConflict: enrollmentConflict,
    }
  );

  if (result.error) throw result.error;

  return directListStudentClassrooms(student.studentExternalId);
}

async function directLeaveClassroom(courseId: string, studentExternalId: string) {
  const studentColumn = await resolvePublicStudentColumn("enrollments");

  const deleteResult = await sharedClassroomClient
    .from("enrollments")
    .delete()
    .eq("course_id", courseId)
    .eq(studentColumn, studentExternalId);

  if (deleteResult.error) throw deleteResult.error;

  return directListStudentClassrooms(studentExternalId);
}

async function directGetCourseInviteDetails(code: string): Promise<CourseInviteDetails | null> {
  const { data: course, error: courseError } = await sharedClassroomClient
    .from("courses")
    .select("*")
    .eq("join_code", code.trim().toUpperCase())
    .maybeSingle();

  if (courseError) throw courseError;
  if (!course) return null;

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    joinCode: course.join_code,
    teacherName: null,
  };
}

async function directListStudentAssignments(studentExternalId: string): Promise<AssignmentSummary[]> {
  const classrooms = await directListStudentClassrooms(studentExternalId);
  const courseIds = [...new Set(classrooms.map((classroom) => classroom.course_id))];
  if (courseIds.length === 0) return [];
  const submissionStudentColumn = await resolvePublicStudentColumn("submissions");

  const [{ data: assignments, error: assignmentsError }] = await Promise.all([
    sharedClassroomClient
      .from("assignments")
      .select("*")
      .in("course_id", courseIds)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  if (assignmentsError) throw assignmentsError;

  const assignmentIds = (assignments || []).map((assignment: any) => assignment.id);
  const submissionsResult = assignmentIds.length === 0
    ? { data: [], error: null }
    : await sharedClassroomClient
        .from("submissions")
        .select("*")
        .eq(submissionStudentColumn, studentExternalId)
        .in("assignment_id", assignmentIds);

  if (submissionsResult.error) throw submissionsResult.error;

  const classroomMap = new Map(classrooms.map((classroom) => [classroom.course_id, classroom.course]));
  const submissionMap = new Map(
    (submissionsResult.data || []).map((submission: any) => {
      const normalizedSubmission = normalizeSubmissionRow(submission);
      return [normalizedSubmission.assignment_id, normalizedSubmission];
    })
  );

  return (assignments || []).map((assignment: any) => ({
    ...assignment,
    course: classroomMap.get(assignment.course_id) || null,
    submission: submissionMap.get(assignment.id) || null,
  }));
}

async function directGetStudentAssignmentAttempt(assignmentId: string, studentExternalId: string) {
  const submissionStudentColumn = await resolvePublicStudentColumn("submissions");

  const { data: assignment, error: assignmentError } = await sharedClassroomClient
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle();

  if (assignmentError) throw assignmentError;
  if (!assignment) return { assignment: null, submission: null };

  const submissionResult = await sharedClassroomClient
    .from("submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq(submissionStudentColumn, studentExternalId)
    .maybeSingle();

  if (submissionResult.error) throw submissionResult.error;

  return {
    assignment,
    submission: submissionResult.data ? normalizeSubmissionRow(submissionResult.data) : null,
  };
}

async function directSubmitAssignmentResult(input: {
  assignmentId: string;
  student: StudentIdentityPayload;
  answers: Record<string, AssignmentAnswerValue>;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  violations: number;
}) {
  const studentColumn = await resolvePublicStudentColumn("submissions");
  const submissionPayload: Record<string, AssignmentAnswerValue | number | string | Record<string, AssignmentAnswerValue>> = {
    assignment_id: input.assignmentId,
    [studentColumn]: input.student.studentExternalId,
    answers: input.answers,
    score: input.score,
    correct_answers: input.correctAnswers,
    total_questions: input.totalQuestions,
    violations: input.violations,
  };
  const submissionConflict = `assignment_id,${studentColumn}`;

  const result = await sharedClassroomClient
    .from("submissions")
    .upsert(
      submissionPayload,
      {
        onConflict: submissionConflict,
      }
    )
    .select("*")
    .single();

  if (result.error) throw result.error;
  return result.data;
}

async function invokeTeacherSync<TResponse, TPayload>(
  request: TeacherSyncRequest<TPayload>,
  fallback: TResponse
) {
  if (IS_SHARED_SUPABASE) {
    switch (request.action) {
      case "list-student-classrooms":
        return (await directListStudentClassrooms((request.payload as { studentExternalId: string }).studentExternalId)) as TResponse;
      case "join-classroom":
        return (await directJoinClassroom(
          (request.payload as { code: string }).code,
          (request.payload as { student: StudentIdentityPayload }).student
        )) as TResponse;
      case "leave-classroom":
        return (await directLeaveClassroom(
          (request.payload as { courseId: string }).courseId,
          (request.payload as { studentExternalId: string }).studentExternalId
        )) as TResponse;
      case "list-student-assignments":
        return (await directListStudentAssignments((request.payload as { studentExternalId: string }).studentExternalId)) as TResponse;
      case "get-assignment-attempt":
        return (await directGetStudentAssignmentAttempt(
          (request.payload as { assignmentId: string }).assignmentId,
          (request.payload as { studentExternalId: string }).studentExternalId
        )) as TResponse;
      case "submit-assignment":
        return (await directSubmitAssignmentResult(request.payload as Parameters<typeof directSubmitAssignmentResult>[0])) as TResponse;
      case "sync-student-progress":
      case "sync-student-test-history":
        return fallback;
      default:
        return fallback;
    }
  }

  const { data, error, response } = await studentSupabase.functions.invoke("teacher-sync", {
    body: request,
  });

  if (!error) {
    return (data as TResponse) ?? fallback;
  }

  const responseMessage = await readTeacherSyncResponseMessage(response);
  if (isFunctionUnavailable(error, responseMessage)) {
    return fallback;
  }

  throw new Error(
    responseMessage ||
      (error instanceof Error ? error.message : "Teacher classroom sync failed. Please try again.")
  );
}

export async function listStudentClassrooms(studentExternalId: string) {
  const cacheKey = `${CLASSROOM_CACHE_PREFIX}:${studentExternalId}`;
  const fallback = readCachedJson<EnrollmentWithCourse[]>(cacheKey, []);
  const data = await invokeTeacherSync<EnrollmentWithCourse[], { studentExternalId: string }>(
    {
      action: "list-student-classrooms",
      payload: { studentExternalId },
    },
    fallback
  );
  writeCachedJson(cacheKey, data);
  return data;
}

export async function joinClassroom(code: string, student: StudentIdentityPayload) {
  const classrooms = await invokeTeacherSync<EnrollmentWithCourse[], { code: string; student: StudentIdentityPayload }>(
    {
      action: "join-classroom",
      payload: { code, student },
    },
    []
  );

  writeCachedJson(`${CLASSROOM_CACHE_PREFIX}:${student.studentExternalId}`, classrooms);
  return classrooms;
}

export async function leaveClassroom(courseId: string, studentExternalId: string) {
  const classrooms = await invokeTeacherSync<EnrollmentWithCourse[], { courseId: string; studentExternalId: string }>(
    {
      action: "leave-classroom",
      payload: { courseId, studentExternalId },
    },
    []
  );

  writeCachedJson(`${CLASSROOM_CACHE_PREFIX}:${studentExternalId}`, classrooms);
  return classrooms;
}

export async function getCourseInviteDetails(joinCode: string) {
  if (!joinCode.trim()) return null;
  return directGetCourseInviteDetails(joinCode);
}

export async function listStudentAssignments(studentExternalId: string) {
  const cacheKey = `${ASSIGNMENT_CACHE_PREFIX}:${studentExternalId}`;
  const fallback = readCachedJson<AssignmentSummary[]>(cacheKey, []);
  const data = await invokeTeacherSync<AssignmentSummary[], { studentExternalId: string }>(
    {
      action: "list-student-assignments",
      payload: { studentExternalId },
    },
    fallback
  );
  writeCachedJson(cacheKey, data);
  return data;
}

export async function getStudentAssignmentAttempt(assignmentId: string, studentExternalId: string) {
  return invokeTeacherSync<
    { assignment: AssignmentSummary | null; submission: SubmissionRow | null },
    { assignmentId: string; studentExternalId: string }
  >(
    {
      action: "get-assignment-attempt",
      payload: { assignmentId, studentExternalId },
    },
    { assignment: null, submission: null }
  );
}

export async function submitAssignmentResult(input: {
  assignmentId: string;
  student: StudentIdentityPayload;
  answers: Record<string, AssignmentAnswerValue>;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  violations: number;
}) {
  return invokeTeacherSync<
    SubmissionRow | null,
    {
      assignmentId: string;
      student: StudentIdentityPayload;
      answers: Record<string, AssignmentAnswerValue>;
      score: number;
      correctAnswers: number;
      totalQuestions: number;
      violations: number;
    }
  >(
    {
      action: "submit-assignment",
      payload: input,
    },
    null
  );
}

export async function syncStudentProgress(input: {
  student: StudentIdentityPayload;
  lastActive: string;
  subjectScores: Record<string, { correct: number; total: number }>;
}) {
  try {
    await invokeTeacherSync<null, typeof input>(
      {
        action: "sync-student-progress",
        payload: input,
      },
      null
    );
  } catch (error) {
    console.warn("Could not sync student progress to teacher portal", error);
  }
}

export async function syncStudentTestHistory(input: {
  student: StudentIdentityPayload;
  testHistory: {
    testType: string;
    subjectId: string | null;
    topicId: string | null;
    score: number;
    maxScore: number;
    questionsAttempted: number;
    correctAnswers: number;
    totalQuestions: number;
    violations: number;
    durationSeconds: number | null;
    completedAt: string;
  };
}) {
  try {
    await invokeTeacherSync<null, typeof input>(
      {
        action: "sync-student-test-history",
        payload: input,
      },
      null
    );
  } catch (error) {
    console.warn("Could not sync student test history to teacher portal", error);
  }
}
