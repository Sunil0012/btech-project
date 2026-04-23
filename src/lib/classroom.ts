import { questions, type Question } from "@/data/questions";
import { getSubjectById, getTopicById } from "@/data/subjects";
import type { StudentTables } from "@/integrations/supabase/student-types";
import type { TeacherTables } from "@/integrations/supabase/teacher-types";
import { parseAssignmentDescription } from "@/lib/assignmentContent";

export type AppRole = "student" | "teacher";
export type AssignmentType = "homework" | "test";
export type AssignmentDifficulty = "easy" | "medium" | "hard" | "mixed";
export type AssignmentAnswerValue = number | number[] | string | null;

export type StudentProfileRow = StudentTables<"profiles">;
export type TeacherProfileRecord = TeacherTables<{ schema: "public" }, "profiles">;
export type TeacherRow = TeacherTables<"teachers">;
export type CourseRow = TeacherTables<"courses">;
export type AssignmentRow = TeacherTables<"assignments">;
export type StudentProgressRow = StudentTables<"user_progress">;
export type StudentTestHistoryRow = StudentTables<"test_history">;
export type ActivityEventMetadata = StudentTables<"activity_events">["metadata"];

export interface ProfileRow {
  avatar_url: string | null;
  created_at: string;
  email: string | null;
  elo_rating: number;
  full_name: string | null;
  id: string;
  last_active: string | null;
  role: string;
  streak_count: number;
  study_goal: string | null;
  theme: string | null;
  updated_at: string;
  user_id: string;
}

export interface EnrollmentRow {
  course_id: string;
  id: string;
  joined_at: string;
  student_id: string;
}

export interface SubmissionRow {
  answers: TeacherTables<"submissions">["answers"];
  assignment_id: string;
  correct_answers: number;
  id: string;
  score: number;
  student_id: string;
  submitted_at: string;
  total_questions: number;
  violations: number;
}

export interface TestHistoryRow {
  completed_at: string;
  correct_answers: number;
  duration_seconds: number | null;
  id: string;
  max_score: number;
  questions_attempted: number;
  score: number;
  subject_id: string | null;
  test_type: string;
  topic_id: string | null;
  total_questions: number;
  user_id: string;
  violations: number;
}

export interface UserProgressRow {
  correct: number;
  id: string;
  last_practiced: string | null;
  subject_id: string;
  topic_id: string | null;
  total: number;
  user_id: string;
}

export interface ActivityEventRow {
  actor_id: string;
  actor_name: string | null;
  actor_role: string;
  assignment_id: string | null;
  course_id: string | null;
  created_at: string;
  event_type: string;
  id: string;
  metadata: ActivityEventMetadata;
  question_id: string | null;
  subject_id: string | null;
  target_user_id: string | null;
  topic_id: string | null;
}

export interface CourseSummary extends CourseRow {
  teacher?: TeacherRow | null;
  teacherProfile?: ProfileRow | null;
}

export interface EnrollmentWithCourse extends EnrollmentRow {
  course?: CourseSummary | null;
}

export interface AssignmentSummary extends AssignmentRow {
  course?: CourseSummary | null;
  submission?: SubmissionRow | null;
}

export interface AssignmentQuestionFilters {
  subjectId: string;
  topicId?: string;
  difficulty?: AssignmentDifficulty;
  questionCount: number;
  questionBank?: Question[];
}

export interface AssignmentResult {
  correctCount: number;
  totalQuestions: number;
  score: number;
  maxScore: number;
}

export function normalizeRole(role?: string | null): AppRole {
  return role === "teacher" ? "teacher" : "student";
}

export function normalizeJoinCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function buildCourseInvitePath(joinCode: string) {
  const normalizedCode = normalizeJoinCode(joinCode);
  return normalizedCode ? `/join-course/${normalizedCode}` : "";
}

export function buildCourseInviteLink(origin: string, joinCode: string) {
  const invitePath = buildCourseInvitePath(joinCode);
  return invitePath ? `${origin}${invitePath}` : "";
}

export function extractJoinCodeOrLink(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  const tryReadFromUrl = (raw: string, base?: string) => {
    try {
      const parsed = base ? new URL(raw, base) : new URL(raw);
      const inviteMatch = parsed.pathname.match(/\/join-course\/([^/]+)/i);
      if (inviteMatch?.[1]) {
        return normalizeJoinCode(decodeURIComponent(inviteMatch[1]));
      }

      const queryCode = parsed.searchParams.get("joinCode") || parsed.searchParams.get("teacherCode");
      if (queryCode) {
        return normalizeJoinCode(queryCode);
      }
    } catch {
      return "";
    }

    return "";
  };

  const directUrlCode = tryReadFromUrl(trimmedValue);
  if (directUrlCode) return directUrlCode;

  if (trimmedValue.startsWith("/")) {
    const relativeUrlCode = tryReadFromUrl(trimmedValue, "https://gate-da.local");
    if (relativeUrlCode) return relativeUrlCode;
  }

  return normalizeJoinCode(trimmedValue);
}

export function generateJoinCode(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function resolveDefaultCourseJoinCode(
  courses: Array<Pick<CourseRow, "join_code" | "created_at">> | undefined,
  ...preferredCodes: Array<string | null | undefined>
) {
  const normalizedPreferred = preferredCodes
    .map((code) => normalizeJoinCode(code || ""))
    .filter(Boolean);
  const courseList = [...(courses || [])];

  for (const preferredCode of normalizedPreferred) {
    const matchedCourse = courseList.find((course) => normalizeJoinCode(course.join_code) === preferredCode);
    if (matchedCourse?.join_code) {
      return normalizeJoinCode(matchedCourse.join_code);
    }
  }

  const oldestCourse = courseList
    .filter((course) => Boolean(course.join_code))
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())[0];

  if (oldestCourse?.join_code) {
    return normalizeJoinCode(oldestCourse.join_code);
  }

  return normalizedPreferred[0] || "";
}

export function toDomainProfileRow(profile: StudentProfileRow | TeacherProfileRecord): ProfileRow {
  return {
    ...profile,
    role: normalizeRole(profile.role),
  };
}

export function toDomainEnrollmentRow(enrollment: TeacherTables<"enrollments">): EnrollmentRow {
  return {
    course_id: enrollment.course_id,
    id: enrollment.id,
    joined_at: enrollment.joined_at,
    student_id: enrollment.student_id,
  };
}

export function toDomainSubmissionRow(submission: TeacherTables<"submissions">): SubmissionRow {
  return {
    answers: submission.answers,
    assignment_id: submission.assignment_id,
    correct_answers: submission.correct_answers,
    id: submission.id,
    score: submission.score,
    student_id: submission.student_id,
    submitted_at: submission.submitted_at,
    total_questions: submission.total_questions,
    violations: submission.violations,
  };
}

export function toDomainProgressRow(row: StudentProgressRow): UserProgressRow {
  return {
    correct: row.correct,
    id: row.id,
    last_practiced: row.last_practiced,
    subject_id: row.subject_id,
    topic_id: row.topic_id,
    total: row.total,
    user_id: row.user_id,
  };
}

export function toDomainTestHistoryRow(row: StudentTestHistoryRow): TestHistoryRow {
  return {
    completed_at: row.completed_at,
    correct_answers: row.correct_answers,
    duration_seconds: row.duration_seconds,
    id: row.id,
    max_score: row.max_score,
    questions_attempted: row.questions_attempted,
    score: row.score,
    subject_id: row.subject_id,
    test_type: row.test_type,
    topic_id: row.topic_id,
    total_questions: row.total_questions,
    user_id: row.user_id,
    violations: row.violations,
  };
}

export function toDomainActivityEventRow(
  row: StudentTables<"activity_events"> | TeacherTables<{ schema: "public" }, "activity_events">
): ActivityEventRow {
  return {
    actor_id: row.actor_id,
    actor_name: row.actor_name,
    actor_role: row.actor_role,
    assignment_id: row.assignment_id,
    course_id: row.course_id,
    created_at: row.created_at,
    event_type: row.event_type,
    id: row.id,
    metadata: row.metadata,
    question_id: row.question_id,
    subject_id: row.subject_id,
    target_user_id: row.target_user_id,
    topic_id: row.topic_id,
  };
}

export function pickAssignmentQuestions({
  subjectId,
  topicId,
  difficulty = "mixed",
  questionCount,
  questionBank = questions,
}: AssignmentQuestionFilters) {
  const filtered = questionBank.filter((question) => {
    if (question.subjectId !== subjectId) return false;
    if (topicId && question.topicId !== topicId) return false;
    if (difficulty !== "mixed" && question.difficulty !== difficulty) return false;
    return true;
  });

  const source = filtered.length >= questionCount
    ? filtered
    : questionBank.filter((question) => {
        if (question.subjectId !== subjectId) return false;
        if (topicId && question.topicId !== topicId) return false;
        return true;
      });

  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, questionCount);
}

export function getQuestionsByAssignment(assignment: Pick<AssignmentRow, "question_ids" | "description">): Question[] {
  const parsedContent = parseAssignmentDescription(assignment.description);
  if (parsedContent.questionSource === "manual-quiz" && parsedContent.manualQuestions.length > 0) {
    // Validate manual questions are properly formed (have required fields)
    return parsedContent.manualQuestions.filter((q) => q && q.id && q.question && typeof q.type === 'string');
  }

  if (!assignment.question_ids?.length) return [];
  const idSet = new Set(assignment.question_ids);
  return questions.filter((question) => idSet.has(question.id));
}

export function isQuestionCorrect(question: Question, answer: AssignmentAnswerValue) {
  if (question.type === "mcq") {
    return typeof answer === "number" && answer === question.correctAnswer;
  }

  if (question.type === "msq") {
    if (!Array.isArray(answer) || !question.correctAnswers) return false;
    return (
      answer.length === question.correctAnswers.length &&
      question.correctAnswers.every((correctIndex) => answer.includes(correctIndex))
    );
  }

  if (question.type === "nat") {
    if (typeof answer !== "string" || !question.correctNat) return false;
    const numericValue = Number.parseFloat(answer);
    if (Number.isNaN(numericValue)) return false;
    return numericValue >= question.correctNat.min && numericValue <= question.correctNat.max;
  }

  return false;
}

export function isQuestionAnswered(question: Question, answer: AssignmentAnswerValue) {
  if (question.type === "mcq") return typeof answer === "number";
  if (question.type === "msq") return Array.isArray(answer) && answer.length > 0;
  if (question.type === "nat") return typeof answer === "string" && answer.trim() !== "";
  return false;
}

export function gradeAssignment(
  assignmentQuestions: Question[],
  answers: Record<string, AssignmentAnswerValue>
): AssignmentResult {
  const maxScore = assignmentQuestions.reduce((sum, question) => sum + question.marks, 0);

  const scored = assignmentQuestions.reduce(
    (accumulator, question) => {
      const answer = answers[question.id] ?? null;

      if (!isQuestionAnswered(question, answer)) {
        return accumulator;
      }

      if (isQuestionCorrect(question, answer)) {
        accumulator.correctCount += 1;
        accumulator.score += question.marks;
      } else if (question.negativeMarks > 0) {
        accumulator.score -= question.negativeMarks;
      }

      return accumulator;
    },
    {
      correctCount: 0,
      score: 0,
    }
  );

  return {
    correctCount: scored.correctCount,
    totalQuestions: assignmentQuestions.length,
    score: Number(scored.score.toFixed(2)),
    maxScore,
  };
}

export function getAssignmentSubjectLabel(assignment: Pick<AssignmentRow, "subject_id" | "topic_id">) {
  if (!assignment.subject_id) return "Mixed Assignment";

  const subject = getSubjectById(assignment.subject_id);
  const topic = assignment.topic_id ? getTopicById(assignment.subject_id, assignment.topic_id) : null;

  if (!subject) return "Assignment";
  if (!topic) return subject.name;
  return `${subject.name} - ${topic.name}`;
}

export function getProfileDisplayName(profile?: Pick<ProfileRow, "full_name" | "email"> | null) {
  if (!profile) return "Learner";
  return profile.full_name || profile.email?.split("@")[0] || "Learner";
}
