import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TeacherSyncAction =
  | "join-classroom"
  | "list-student-classrooms"
  | "list-student-assignments"
  | "get-assignment-attempt"
  | "submit-assignment"
  | "sync-student-progress"
  | "sync-student-test-history";

type TeacherSyncBody = {
  action?: TeacherSyncAction;
  payload?: Record<string, unknown>;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getStudentClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") || "",
      },
    },
  });
}

function getTeacherClient() {
  const teacherSupabaseUrl = Deno.env.get("TEACHER_SUPABASE_URL") || "";
  const teacherServiceRoleKey = Deno.env.get("TEACHER_SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!teacherSupabaseUrl || !teacherServiceRoleKey) {
    throw new Error("Missing TEACHER_SUPABASE_URL or TEACHER_SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(teacherSupabaseUrl, teacherServiceRoleKey);
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function fallbackTeacherName(email: string | null | undefined) {
  return email?.split("@")[0] || "Teacher";
}

async function findTeacherAuthUserByCode(
  teacherClient: ReturnType<typeof getTeacherClient>,
  code: string
) {
  const normalizedCode = normalizeCode(code);
  let page = 1;

  while (page <= 10) {
    const { data, error } = await teacherClient.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw error;

    const matchedUser = (data?.users || []).find((authUser) => {
      const metadata = authUser.user_metadata || {};
      const teacherUid = typeof metadata.teacher_uid === "string" ? normalizeCode(metadata.teacher_uid) : "";
      const courseJoinCode = typeof metadata.course_join_code === "string" ? normalizeCode(metadata.course_join_code) : "";
      const role = typeof metadata.role === "string" ? metadata.role.toLowerCase() : "";

      return role === "teacher" && (teacherUid === normalizedCode || courseJoinCode === normalizedCode);
    });

    if (matchedUser) return matchedUser;
    if (!data?.users?.length || data.users.length < 100) break;
    page += 1;
  }

  return null;
}

async function provisionTeacherWorkspaceFromAuthCode(
  teacherClient: ReturnType<typeof getTeacherClient>,
  code: string
) {
  const normalizedCode = normalizeCode(code);
  const authUser = await findTeacherAuthUserByCode(teacherClient, normalizedCode);
  if (!authUser) return null;

  const metadata = authUser.user_metadata || {};
  const teacherUid =
    (typeof metadata.teacher_uid === "string" && normalizeCode(metadata.teacher_uid)) ||
    (typeof metadata.course_join_code === "string" && normalizeCode(metadata.course_join_code)) ||
    normalizedCode;
  const fullName =
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    fallbackTeacherName(authUser.email);
  const courseTitle =
    (typeof metadata.course_title === "string" && metadata.course_title.trim()) ||
    `${fullName}'s Classroom`;
  const courseDescription =
    (typeof metadata.course_description === "string" && metadata.course_description.trim()) ||
    "Primary classroom for teacher-led assignments and analytics.";

  const { error: profileError } = await teacherClient.from("profiles").upsert(
    {
      user_id: authUser.id,
      full_name: fullName,
      email: authUser.email || null,
      role: "teacher",
    },
    {
      onConflict: "user_id",
    }
  );

  if (profileError) throw profileError;

  const { data: teacherRecord, error: teacherError } = await teacherClient
    .from("teachers")
    .upsert(
      {
        user_id: authUser.id,
        teacher_uid: teacherUid,
      },
      {
        onConflict: "user_id",
      }
    )
    .select("*")
    .single();

  if (teacherError) throw teacherError;

  let { data: course, error: courseError } = await teacherClient
    .from("courses")
    .select("*")
    .eq("join_code", normalizedCode)
    .maybeSingle();

  if (courseError) throw courseError;

  if (!course) {
    const createdCourse = await teacherClient
      .from("courses")
      .insert({
        teacher_id: teacherRecord.id,
        title: courseTitle,
        description: courseDescription,
        join_code: normalizedCode,
      })
      .select("*")
      .single();

    if (createdCourse.error) throw createdCourse.error;
    course = createdCourse.data;
  }

  return course;
}

async function resolveTeacherCourseFromTeacherUid(
  teacherClient: ReturnType<typeof getTeacherClient>,
  code: string
) {
  const normalizedCode = normalizeCode(code);
  const { data: teacher, error: teacherError } = await teacherClient
    .from("teachers")
    .select("*")
    .eq("teacher_uid", normalizedCode)
    .maybeSingle();

  if (teacherError) throw teacherError;
  if (!teacher) return null;

  const { data: matchingCourse, error: matchingCourseError } = await teacherClient
    .from("courses")
    .select("*")
    .eq("teacher_id", teacher.id)
    .eq("join_code", normalizedCode)
    .maybeSingle();

  if (matchingCourseError) throw matchingCourseError;
  if (matchingCourse) return matchingCourse;

  const { data: firstCourseRows, error: firstCourseError } = await teacherClient
    .from("courses")
    .select("*")
    .eq("teacher_id", teacher.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (firstCourseError) throw firstCourseError;
  const existingCourse = firstCourseRows?.[0];
  if (existingCourse) return existingCourse;

  const { data: teacherProfile, error: profileError } = await teacherClient
    .from("profiles")
    .select("*")
    .eq("user_id", teacher.user_id)
    .maybeSingle();

  if (profileError) throw profileError;

  const fullName = teacherProfile?.full_name?.trim() || fallbackTeacherName(teacherProfile?.email);
  const createdCourse = await teacherClient
    .from("courses")
    .insert({
      teacher_id: teacher.id,
      title: `${fullName}'s Classroom`,
      description: "Primary classroom for teacher-led assignments and analytics.",
      join_code: normalizedCode,
    })
    .select("*")
    .single();

  if (createdCourse.error) throw createdCourse.error;
  return createdCourse.data;
}

function requireStudentIdentity(authUserId: string, payload: Record<string, unknown>) {
  const studentExternalId =
    typeof payload.studentExternalId === "string"
      ? payload.studentExternalId
      : typeof payload.student === "object" && payload.student && typeof (payload.student as Record<string, unknown>).studentExternalId === "string"
        ? ((payload.student as Record<string, unknown>).studentExternalId as string)
        : "";

  if (!studentExternalId || studentExternalId !== authUserId) {
    throw new Error("Student identity does not match the authenticated user.");
  }

  return studentExternalId;
}

async function upsertStudentProfileMirror(
  teacherClient: ReturnType<typeof getTeacherClient>,
  student: Record<string, unknown>
) {
  const studentExternalId = typeof student.studentExternalId === "string" ? student.studentExternalId : "";
  if (!studentExternalId) {
    throw new Error("Missing studentExternalId.");
  }

  const { error } = await teacherClient.from("student_profiles_mirror").upsert(
    {
      student_external_id: studentExternalId,
      full_name: typeof student.fullName === "string" ? student.fullName : null,
      email: typeof student.email === "string" ? student.email : null,
      avatar_url: typeof student.avatarUrl === "string" ? student.avatarUrl : null,
      elo_rating: typeof student.eloRating === "number" ? student.eloRating : 1500,
      last_active: new Date().toISOString(),
    },
    {
      onConflict: "student_external_id",
    }
  );

  if (error) throw error;
}

async function listStudentClassroomsFor(
  teacherClient: ReturnType<typeof getTeacherClient>,
  studentExternalId: string
) {
  const { data: enrollments, error: enrollmentsError } = await teacherClient
    .from("enrollments")
    .select("*")
    .eq("student_external_id", studentExternalId)
    .order("joined_at", { ascending: false });

  if (enrollmentsError) throw enrollmentsError;

  const courseIds = [...new Set((enrollments || []).map((row) => row.course_id))];
  if (courseIds.length === 0) return [];

  const [{ data: courses, error: coursesError }, { data: teachers, error: teachersError }] = await Promise.all([
    teacherClient.from("courses").select("*").in("id", courseIds),
    teacherClient.from("teachers").select("*"),
  ]);

  if (coursesError) throw coursesError;
  if (teachersError) throw teachersError;

  const teacherUserIds = [...new Set((teachers || []).map((teacher) => teacher.user_id))];
  const { data: teacherProfiles, error: profilesError } = teacherUserIds.length === 0
    ? { data: [], error: null }
    : await teacherClient.from("profiles").select("*").in("user_id", teacherUserIds);

  if (profilesError) throw profilesError;

  const teacherMap = new Map((teachers || []).map((teacher) => [teacher.id, teacher]));
  const profileMap = new Map((teacherProfiles || []).map((profile) => [profile.user_id, profile]));
  const courseMap = new Map(
    (courses || []).map((course) => {
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

  return (enrollments || []).map((enrollment) => ({
    id: enrollment.id,
    course_id: enrollment.course_id,
    joined_at: enrollment.joined_at,
    student_id: enrollment.student_external_id,
    course: courseMap.get(enrollment.course_id) || null,
  }));
}

async function listStudentAssignmentsFor(
  teacherClient: ReturnType<typeof getTeacherClient>,
  studentExternalId: string
) {
  const classrooms = await listStudentClassroomsFor(teacherClient, studentExternalId);
  const courseIds = [...new Set(classrooms.map((row) => row.course_id))];
  if (courseIds.length === 0) return [];

  const { data: assignments, error: assignmentsError } = await teacherClient
    .from("assignments")
    .select("*")
    .in("course_id", courseIds)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (assignmentsError) throw assignmentsError;

  const assignmentIds = (assignments || []).map((assignment) => assignment.id);
  const { data: submissions, error: submissionsError } = assignmentIds.length === 0
    ? { data: [], error: null }
    : await teacherClient
        .from("submissions")
        .select("*")
        .eq("student_external_id", studentExternalId)
        .in("assignment_id", assignmentIds);

  if (submissionsError) throw submissionsError;

  const classroomMap = new Map(classrooms.map((classroom) => [classroom.course_id, classroom.course]));
  const submissionMap = new Map((submissions || []).map((submission) => [
    submission.assignment_id,
    {
      ...submission,
      student_id: submission.student_external_id,
    },
  ]));

  return (assignments || []).map((assignment) => ({
    ...assignment,
    course: classroomMap.get(assignment.course_id) || null,
    submission: submissionMap.get(assignment.id) || null,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const studentClient = getStudentClient(req);
    const teacherClient = getTeacherClient();
    const {
      data: { user },
      error: userError,
    } = await studentClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ ok: false, message: "Student authentication is required." }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as TeacherSyncBody;
    const action = body.action;
    const payload = body.payload || {};

    if (!action) {
      return jsonResponse({ ok: false, message: "Missing action." }, 400);
    }

    const studentExternalId = requireStudentIdentity(user.id, payload);

    if (action === "join-classroom") {
      const code = typeof payload.code === "string" ? normalizeCode(payload.code) : "";
      const student = (payload.student || {}) as Record<string, unknown>;

      if (!code) {
        return jsonResponse({ ok: false, message: "Missing classroom code." }, 400);
      }

      await upsertStudentProfileMirror(teacherClient, student);

      const { data: course, error: courseError } = await teacherClient
        .from("courses")
        .select("*")
        .eq("join_code", code)
        .maybeSingle();

      if (courseError) throw courseError;
      const resolvedCourse =
        course ||
        (await resolveTeacherCourseFromTeacherUid(teacherClient, code)) ||
        (await provisionTeacherWorkspaceFromAuthCode(teacherClient, code));
      if (!resolvedCourse) {
        return jsonResponse({ ok: false, message: "No course found for that code." }, 404);
      }

      const { error: enrollmentError } = await teacherClient.from("enrollments").upsert(
        {
          course_id: resolvedCourse.id,
          student_external_id: studentExternalId,
        },
        {
          onConflict: "student_external_id,course_id",
        }
      );

      if (enrollmentError) throw enrollmentError;

      return jsonResponse(await listStudentClassroomsFor(teacherClient, studentExternalId));
    }

    if (action === "list-student-classrooms") {
      return jsonResponse(await listStudentClassroomsFor(teacherClient, studentExternalId));
    }

    if (action === "list-student-assignments") {
      return jsonResponse(await listStudentAssignmentsFor(teacherClient, studentExternalId));
    }

    if (action === "get-assignment-attempt") {
      const assignmentId = typeof payload.assignmentId === "string" ? payload.assignmentId : "";
      if (!assignmentId) {
        return jsonResponse({ ok: false, message: "Missing assignmentId." }, 400);
      }

      const { data: assignment, error: assignmentError } = await teacherClient
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .maybeSingle();

      if (assignmentError) throw assignmentError;
      if (!assignment) {
        return jsonResponse({ assignment: null, submission: null });
      }

      const { data: submission, error: submissionError } = await teacherClient
        .from("submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("student_external_id", studentExternalId)
        .maybeSingle();

      if (submissionError) throw submissionError;

      return jsonResponse({
        assignment,
        submission: submission
          ? {
              ...submission,
              student_id: submission.student_external_id,
            }
          : null,
      });
    }

    if (action === "submit-assignment") {
      const assignmentId = typeof payload.assignmentId === "string" ? payload.assignmentId : "";
      const student = (payload.student || {}) as Record<string, unknown>;

      if (!assignmentId) {
        return jsonResponse({ ok: false, message: "Missing assignmentId." }, 400);
      }

      await upsertStudentProfileMirror(teacherClient, student);

      const { data: assignment, error: assignmentError } = await teacherClient
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .maybeSingle();

      if (assignmentError) throw assignmentError;
      if (!assignment) {
        return jsonResponse({ ok: false, message: "Assignment not found." }, 404);
      }

      const { data: enrollment, error: enrollmentError } = await teacherClient
        .from("enrollments")
        .select("id")
        .eq("course_id", assignment.course_id)
        .eq("student_external_id", studentExternalId)
        .maybeSingle();

      if (enrollmentError) throw enrollmentError;
      if (!enrollment) {
        return jsonResponse({ ok: false, message: "Student is not enrolled in the assignment course." }, 403);
      }

      const { data: submission, error: submissionError } = await teacherClient
        .from("submissions")
        .upsert(
          {
            assignment_id: assignmentId,
            student_external_id: studentExternalId,
            answers: payload.answers || {},
            score: typeof payload.score === "number" ? payload.score : 0,
            correct_answers: typeof payload.correctAnswers === "number" ? payload.correctAnswers : 0,
            total_questions: typeof payload.totalQuestions === "number" ? payload.totalQuestions : 0,
            violations: typeof payload.violations === "number" ? payload.violations : 0,
          },
          {
            onConflict: "assignment_id,student_external_id",
          }
        )
        .select("*")
        .single();

      if (submissionError) throw submissionError;

      return jsonResponse({
        ...submission,
        student_id: submission.student_external_id,
      });
    }

    if (action === "sync-student-progress") {
      const student = (payload.student || {}) as Record<string, unknown>;
      const subjectScores = (payload.subjectScores || {}) as Record<string, { correct?: number; total?: number }>;

      await upsertStudentProfileMirror(teacherClient, student);

      const rows = Object.entries(subjectScores).map(([subjectId, score]) => ({
        student_external_id: studentExternalId,
        subject_id: subjectId,
        topic_id: "__overall__",
        correct: typeof score?.correct === "number" ? score.correct : 0,
        total: typeof score?.total === "number" ? score.total : 0,
        last_practiced: typeof payload.lastActive === "string" ? payload.lastActive : new Date().toISOString(),
      }));

      if (rows.length > 0) {
        const { error } = await teacherClient.from("student_progress_snapshots").upsert(rows, {
          onConflict: "student_external_id,subject_id,topic_id",
        });

        if (error) throw error;
      }

      return jsonResponse({ ok: true });
    }

    if (action === "sync-student-test-history") {
      const student = (payload.student || {}) as Record<string, unknown>;
      const testHistory = (payload.testHistory || {}) as Record<string, unknown>;

      await upsertStudentProfileMirror(teacherClient, student);

      const { error } = await teacherClient.from("student_test_history_mirror").insert({
        student_external_id: studentExternalId,
        test_type: typeof testHistory.testType === "string" ? testHistory.testType : "practice",
        subject_id: typeof testHistory.subjectId === "string" ? testHistory.subjectId : null,
        topic_id: typeof testHistory.topicId === "string" ? testHistory.topicId : null,
        score: typeof testHistory.score === "number" ? testHistory.score : 0,
        max_score: typeof testHistory.maxScore === "number" ? testHistory.maxScore : 0,
        questions_attempted: typeof testHistory.questionsAttempted === "number" ? testHistory.questionsAttempted : 0,
        correct_answers: typeof testHistory.correctAnswers === "number" ? testHistory.correctAnswers : 0,
        total_questions: typeof testHistory.totalQuestions === "number" ? testHistory.totalQuestions : 0,
        violations: typeof testHistory.violations === "number" ? testHistory.violations : 0,
        duration_seconds: typeof testHistory.durationSeconds === "number" ? testHistory.durationSeconds : null,
        completed_at: typeof testHistory.completedAt === "string" ? testHistory.completedAt : new Date().toISOString(),
      });

      if (error) throw error;

      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, message: `Unsupported action: ${action}` }, 400);
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Teacher sync failed.",
      },
      500
    );
  }
});
