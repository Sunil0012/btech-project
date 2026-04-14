import { subjects } from "@/data/subjects";
import { questions } from "@/data/questions";
import {
  getProfileDisplayName,
  getQuestionsByAssignment,
  isQuestionAnswered,
  isQuestionCorrect,
  type AssignmentAnswerValue,
  type ActivityEventRow,
  type AssignmentRow,
  type CourseSummary,
  type EnrollmentWithCourse,
  type ProfileRow,
  type SubmissionRow,
  type TestHistoryRow,
  type UserProgressRow,
} from "@/lib/classroom";

const OVERALL_TOPIC_ID = "__overall__";

export interface TeacherStudentSummary {
  userId: string;
  name: string;
  email: string | null;
  eloRating: number;
  accuracy: number;
  questionsSolved: number;
  lastActive: string | null;
  courseTitles: string[];
  weakTopics: string[];
  assignmentsAssigned: number;
  assignmentsCompleted: number;
  completionRate: number;
  averageSubmissionAccuracy: number;
  riskLevel: "low" | "medium" | "high";
}

export interface TeacherCourseSummary {
  id: string;
  title: string;
  description: string | null;
  joinCode: string;
  studentCount: number;
  assignmentCount: number;
  avgAccuracy: number;
  completionRate: number;
}

export interface TeacherStudentSubjectProgress {
  subjectId: string;
  name: string;
  accuracy: number;
  correct: number;
  total: number;
  lastPracticed: string | null;
}

export interface TeacherStudentTestTypeProgress {
  key: string;
  label: string;
  attempts: number;
  avgAccuracy: number;
  bestAccuracy: number;
  latestCompletedAt: string | null;
}

export interface TeacherStudentRecentTest {
  id: string;
  label: string;
  accuracy: number;
  scoreText: string;
  completedAt: string;
}

export interface TeacherStudentAssignmentQuestionReview {
  questionId: string;
  questionText: string;
  questionType: string;
  studentAnswerText: string;
  correctAnswerText: string;
  correct: boolean;
  answered: boolean;
  explanation: string;
  difficulty: string;
  topicName: string;
  marks: number;
}

export interface TeacherStudentAssignmentRecord {
  id: string;
  assignmentId: string;
  title: string;
  courseTitle: string;
  type: string;
  accuracy: number;
  scoreText: string;
  submittedAt: string;
  violations: number;
  questionsReviewed: TeacherStudentAssignmentQuestionReview[];
}

export interface TeacherStudentProfile {
  summary: TeacherStudentSummary;
  subjectProgress: TeacherStudentSubjectProgress[];
  testTypeProgress: TeacherStudentTestTypeProgress[];
  recentTests: TeacherStudentRecentTest[];
  assignmentHistory: TeacherStudentAssignmentRecord[];
  practiceReviewSessions: TeacherPracticeReviewSession[];
  activeCourses: Array<{ id: string; title: string; joinedAt: string }>;
  graphSessions: TeacherRecommendationPathSession[];
  latestGraphSession: TeacherRecommendationPathSession | null;
}

export interface TeacherPracticeReviewSession {
  id: string;
  completedAt: string;
  testType: string;
  label: string;
  subjectName: string;
  topicName: string;
  accuracy: number | null;
  totalQuestions: number;
  totalWarnings: number;
  warningQuestions: string[];
  questionsReviewed: TeacherRecommendationPathStep[];
}

export interface RecentActivityItem {
  id: string;
  label: string;
  detail: string;
  timestamp: string | null;
}

export interface TeacherRecommendationPathStep {
  order: number;
  questionId: string;
  questionText: string;
  fromQuestionId: string | null;
  correct: boolean | null;
  difficulty: string | null;
  edgeWeight: number | null;
  edgeKind: string | null;
  hopDistance: number | null;
  remediationForQuestionId: string | null;
  subjectId: string | null;
  topicId: string | null;
  timeSpentSeconds: number | null;
  rapidGuessWarning: boolean | null;
  warningText: string | null;
}

export interface TeacherRecommendationPathSession {
  id: string;
  studentUserId: string;
  studentName: string;
  createdAt: string;
  testType: string;
  subjectId: string | null;
  subjectName: string;
  topicId: string | null;
  topicName: string;
  questionIds: string[];
  steps: TeacherRecommendationPathStep[];
  totalQuestions: number;
  accuracy: number | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getTopicName(topicId: string | null) {
  if (!topicId) return "Across subject";
  for (const subject of subjects) {
    const matchedTopic = subject.topics.find((topic) => topic.id === topicId);
    if (matchedTopic) return matchedTopic.name;
  }
  return topicId;
}

function getSubjectName(subjectId: string | null) {
  if (!subjectId) return "All subjects";
  return subjects.find((subject) => subject.id === subjectId)?.name || subjectId;
}

function findQuestionById(questionId: string) {
  return questions.find((question) => question.id === questionId) || null;
}

function formatAssignmentAnswer(question: ReturnType<typeof findQuestionById> | NonNullable<ReturnType<typeof findQuestionById>>, answer: AssignmentAnswerValue) {
  if (!question) return "Unavailable";

  if (!isQuestionAnswered(question, answer)) {
    return "Not answered";
  }

  if (question.type === "mcq") {
    const optionIndex = typeof answer === "number" ? answer : -1;
    return question.options[optionIndex] || `Option ${optionIndex + 1}`;
  }

  if (question.type === "msq") {
    const selected = Array.isArray(answer) ? answer : [];
    if (selected.length === 0) return "Not answered";
    return selected
      .sort((left, right) => left - right)
      .map((optionIndex) => question.options[optionIndex] || `Option ${optionIndex + 1}`)
      .join(", ");
  }

  if (typeof answer === "string" && answer.trim()) {
    return answer.trim();
  }

  return "Not answered";
}

function formatCorrectAssignmentAnswer(question: ReturnType<typeof findQuestionById> | NonNullable<ReturnType<typeof findQuestionById>>) {
  if (!question) return "Unavailable";

  if (question.type === "mcq") {
    return question.options[question.correctAnswer] || `Option ${question.correctAnswer + 1}`;
  }

  if (question.type === "msq") {
    return (question.correctAnswers || [])
      .slice()
      .sort((left, right) => left - right)
      .map((optionIndex) => question.options[optionIndex] || `Option ${optionIndex + 1}`)
      .join(", ");
  }

  if (question.correctNat) {
    return question.correctNat.min === question.correctNat.max
      ? `${question.correctNat.min}`
      : `${question.correctNat.min} to ${question.correctNat.max}`;
  }

  return "Unavailable";
}

function readSubmissionAnswers(value: unknown) {
  return asRecord(value) || {};
}

function buildGraphPathSteps(metadata: Record<string, unknown>, fallbackSubjectId: string | null, fallbackTopicId: string | null) {
  const rawSteps = Array.isArray(metadata.steps) ? metadata.steps : [];
  const parsedSteps = rawSteps
    .map((rawStep, index) => {
      const step = asRecord(rawStep);
      if (!step) return null;

      const questionId = asString(step.question_id) || asString(step.questionId);
      if (!questionId) return null;
      const matchedQuestion = findQuestionById(questionId);

      return {
        order: asNumber(step.order) ?? index + 1,
        questionId,
        questionText: matchedQuestion?.question || questionId,
        fromQuestionId: asString(step.from_question_id) || asString(step.fromQuestionId),
        correct: asBoolean(step.correct),
        difficulty: asString(step.difficulty),
        edgeWeight: asNumber(step.edge_weight) ?? asNumber(step.edgeWeight),
        edgeKind: asString(step.edge_kind) || asString(step.edgeKind),
        hopDistance: asNumber(step.hop_distance) ?? asNumber(step.hopDistance),
        remediationForQuestionId:
          asString(step.remediation_for_question_id) || asString(step.remediationForQuestionId),
        subjectId: asString(step.subject_id) || asString(step.subjectId) || fallbackSubjectId,
        topicId: asString(step.topic_id) || asString(step.topicId) || fallbackTopicId,
        timeSpentSeconds:
          asNumber(step.time_spent_seconds) ?? asNumber(step.timeSpentSeconds),
        rapidGuessWarning:
          asBoolean(step.rapid_guess_warning) ?? asBoolean(step.rapidGuessWarning),
        warningText: asString(step.warning_text) || asString(step.warningText),
      } satisfies TeacherRecommendationPathStep;
    })
    .filter((step): step is TeacherRecommendationPathStep => Boolean(step))
    .sort((left, right) => left.order - right.order);

  if (parsedSteps.length > 0) return parsedSteps;

  return asStringArray(metadata.question_path).map((questionId, index) => ({
    order: index + 1,
    questionId,
    questionText: findQuestionById(questionId)?.question || questionId,
    fromQuestionId: index === 0 ? null : asStringArray(metadata.question_path)[index - 1] || null,
    correct: null,
    difficulty: null,
    edgeWeight: null,
    edgeKind: null,
    hopDistance: null,
    remediationForQuestionId: null,
    subjectId: fallbackSubjectId,
    topicId: fallbackTopicId,
    timeSpentSeconds: null,
    rapidGuessWarning: null,
    warningText: null,
  }));
}

export function buildTeacherRecommendationPathSessions(input: {
  activityEvents: ActivityEventRow[];
  students: ProfileRow[];
  studentUserId?: string | null;
}) {
  const studentMap = new Map(input.students.map((student) => [student.user_id, student]));

  return input.activityEvents
    .filter((event) => event.event_type === "graph_path_completed")
    .filter((event) => !input.studentUserId || event.actor_id === input.studentUserId || event.target_user_id === input.studentUserId)
    .map((event) => {
      const metadata = asRecord(event.metadata) || {};
      const questionIds = asStringArray(metadata.question_path).length > 0
        ? asStringArray(metadata.question_path)
        : asStringArray(metadata.question_ids);
      const studentUserId = event.target_user_id || event.actor_id;
      const student = studentMap.get(studentUserId);
      const subjectId = asString(metadata.subject_id) || event.subject_id;
      const topicId = asString(metadata.topic_id) || event.topic_id;
      const steps = buildGraphPathSteps(metadata, subjectId, topicId);

      return {
        id: event.id,
        studentUserId,
        studentName: getProfileDisplayName(student),
        createdAt: event.created_at,
        testType: asString(metadata.test_type) || "topic-wise",
        subjectId,
        subjectName: getSubjectName(subjectId),
        topicId,
        topicName: getTopicName(topicId),
        questionIds: questionIds.length > 0 ? questionIds : steps.map((step) => step.questionId),
        steps,
        totalQuestions: asNumber(metadata.total_questions) ?? steps.length,
        accuracy: asNumber(metadata.accuracy),
      } satisfies TeacherRecommendationPathSession;
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function buildTeacherStudentSummaries(input: {
  students: ProfileRow[];
  enrollments: EnrollmentWithCourse[];
  progressRows: UserProgressRow[];
  assignments: AssignmentRow[];
  submissions: SubmissionRow[];
}) {
  const courseMap = new Map(input.enrollments.map((enrollment) => [enrollment.course_id, enrollment.course]).filter((entry): entry is [string, CourseSummary] => Boolean(entry[1])));
  const progressByStudent = new Map<string, UserProgressRow[]>();
  const submissionsByStudent = new Map<string, SubmissionRow[]>();

  input.submissions.forEach((submission) => {
    const list = submissionsByStudent.get(submission.student_id) || [];
    list.push(submission);
    submissionsByStudent.set(submission.student_id, list);
  });

  input.progressRows
    .filter((row) => row.topic_id === OVERALL_TOPIC_ID)
    .forEach((row) => {
      const list = progressByStudent.get(row.user_id) || [];
      list.push(row);
      progressByStudent.set(row.user_id, list);
    });

  return input.students.map((student) => {
    const studentEnrollments = input.enrollments.filter((enrollment) => enrollment.student_id === student.user_id);
    const studentCourseIds = new Set(studentEnrollments.map((enrollment) => enrollment.course_id));
    const assignedAssignments = input.assignments.filter((assignment) => studentCourseIds.has(assignment.course_id));
    const assignedAssignmentIds = new Set(assignedAssignments.map((assignment) => assignment.id));
    const relevantSubmissions = (submissionsByStudent.get(student.user_id) || []).filter((submission) =>
      assignedAssignmentIds.has(submission.assignment_id)
    );
    const progressRows = progressByStudent.get(student.user_id) || [];
    const totalCorrect = progressRows.reduce((sum, row) => sum + row.correct, 0);
    const totalSolved = progressRows.reduce((sum, row) => sum + row.total, 0);
    const overallAccuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;
    const assignmentsCompleted = new Set(relevantSubmissions.map((submission) => submission.assignment_id)).size;
    const assignmentsAssigned = assignedAssignments.length;
    const completionRate = assignmentsAssigned > 0
      ? Math.round((assignmentsCompleted / assignmentsAssigned) * 100)
      : 100;
    const averageSubmissionAccuracy = relevantSubmissions.length > 0
      ? Math.round(
          relevantSubmissions.reduce((sum, submission) => {
            const total = Math.max(submission.total_questions, 1);
            return sum + (submission.correct_answers / total) * 100;
          }, 0) / relevantSubmissions.length
        )
      : 0;
    const weakTopics = progressRows
      .filter((row) => row.total > 0)
      .map((row) => ({
        row,
        masteryScore: Math.round(((row.correct / Math.max(row.total, 1)) * 100) * 0.82 + Math.min(row.total, 20) * 0.9),
      }))
      .sort((left, right) => left.masteryScore - right.masteryScore)
      .slice(0, 3)
      .map(({ row }) => subjects.find((subject) => subject.id === row.subject_id)?.name || row.subject_id);
    const eloReadiness = Math.round(Math.max(0, Math.min(100, ((student.elo_rating - 1000) / 900) * 100)));
    const riskScore = Math.round(overallAccuracy * 0.5 + completionRate * 0.3 + eloReadiness * 0.2);
    const riskLevel = riskScore < 45
      ? "high"
      : riskScore < 70
        ? "medium"
        : "low";

    return {
      userId: student.user_id,
      name: getProfileDisplayName(student),
      email: student.email,
      eloRating: student.elo_rating,
      accuracy: overallAccuracy,
      questionsSolved: totalSolved,
      lastActive: student.last_active,
      courseTitles: studentEnrollments.map((enrollment) => courseMap.get(enrollment.course_id)?.title || "Course"),
      weakTopics,
      assignmentsAssigned,
      assignmentsCompleted,
      completionRate,
      averageSubmissionAccuracy,
      riskLevel,
    } satisfies TeacherStudentSummary;
  });
}

export function buildTeacherCourseSummaries(input: {
  courses: CourseSummary[];
  enrollments: EnrollmentWithCourse[];
  assignments: AssignmentRow[];
  submissions: SubmissionRow[];
}) {
  return input.courses.map((course) => {
    const courseEnrollments = input.enrollments.filter((enrollment) => enrollment.course_id === course.id);
    const courseAssignments = input.assignments.filter((assignment) => assignment.course_id === course.id);
    const courseAssignmentIds = new Set(courseAssignments.map((assignment) => assignment.id));
    const courseSubmissions = input.submissions.filter((submission) => courseAssignmentIds.has(submission.assignment_id));
    const averageAccuracy = courseSubmissions.length > 0
      ? Math.round(
          courseSubmissions.reduce((sum, submission) => {
            const total = Math.max(submission.total_questions, 1);
            return sum + (submission.correct_answers / total) * 100;
          }, 0) / courseSubmissions.length
        )
      : 0;
    const totalPossibleSubmissions = courseAssignments.length * Math.max(courseEnrollments.length, 1);
    const completionRate = totalPossibleSubmissions > 0
      ? Math.round((courseSubmissions.length / totalPossibleSubmissions) * 100)
      : 0;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      joinCode: course.join_code,
      studentCount: courseEnrollments.length,
      assignmentCount: courseAssignments.length,
      avgAccuracy: averageAccuracy,
      completionRate,
    } satisfies TeacherCourseSummary;
  });
}

export function buildPerformanceDistribution(students: TeacherStudentSummary[]) {
  const buckets = [
    { label: "0-39%", min: 0, max: 39 },
    { label: "40-59%", min: 40, max: 59 },
    { label: "60-79%", min: 60, max: 79 },
    { label: "80-100%", min: 80, max: 100 },
  ];

  return buckets.map((bucket) => ({
    label: bucket.label,
    students: students.filter((student) => student.accuracy >= bucket.min && student.accuracy <= bucket.max).length,
  }));
}

export function buildAssignmentCompletionData(courseSummaries: TeacherCourseSummary[]) {
  return courseSummaries.map((course) => ({
    course: course.title,
    completionRate: course.completionRate,
    avgAccuracy: course.avgAccuracy,
  }));
}

export function buildRecentTeacherActivity(input: {
  enrollments: EnrollmentWithCourse[];
  assignments: AssignmentRow[];
  submissions: SubmissionRow[];
  students: ProfileRow[];
  tests: TestHistoryRow[];
}) {
  const studentMap = new Map(input.students.map((student) => [student.user_id, student]));
  const items: RecentActivityItem[] = [];

  input.submissions.slice(0, 6).forEach((submission) => {
    const student = studentMap.get(submission.student_id);
    items.push({
      id: submission.id,
      label: `${getProfileDisplayName(student)} submitted work`,
      detail: `${submission.correct_answers}/${submission.total_questions} correct`,
      timestamp: submission.submitted_at,
    });
  });

  input.enrollments.slice(0, 4).forEach((enrollment) => {
    const student = studentMap.get(enrollment.student_id);
    items.push({
      id: enrollment.id,
      label: `${getProfileDisplayName(student)} joined ${enrollment.course?.title || "a course"}`,
      detail: `Joined via ${enrollment.course?.join_code || "join code"}`,
      timestamp: enrollment.joined_at,
    });
  });

  input.tests.slice(0, 4).forEach((test) => {
    const student = studentMap.get(test.user_id);
    items.push({
      id: test.id,
      label: `${getProfileDisplayName(student)} completed ${test.test_type}`,
      detail: `${test.correct_answers}/${test.total_questions} correct`,
      timestamp: test.completed_at,
    });
  });

  return items
    .sort((left, right) => {
      const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0;
      const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 8);
}

export function buildTeacherInsights(input: {
  students: TeacherStudentSummary[];
  courseSummaries: TeacherCourseSummary[];
}) {
  const weakestStudents = [...input.students]
    .sort((left, right) => {
      const leftScore = left.accuracy + left.completionRate;
      const rightScore = right.accuracy + right.completionRate;
      return leftScore - rightScore;
    })
    .slice(0, 3);
  const topStudents = [...input.students]
    .sort((left, right) => {
      const leftScore = left.accuracy + left.completionRate;
      const rightScore = right.accuracy + right.completionRate;
      return rightScore - leftScore;
    })
    .slice(0, 3);
  const weakestCourse = [...input.courseSummaries]
    .sort((left, right) => left.avgAccuracy - right.avgAccuracy)
    .at(0);
  const weakTopicFrequency = input.students.reduce<Map<string, number>>((accumulator, student) => {
    student.weakTopics.forEach((topic) => {
      accumulator.set(topic, (accumulator.get(topic) || 0) + 1);
    });
    return accumulator;
  }, new Map());
  const weakTopicsAcrossClass = [...weakTopicFrequency.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([topic]) => topic)
    .slice(0, 4);
  const dominantWeakTopic = weakTopicsAcrossClass[0];

  return {
    weakTopicsAcrossClass,
    suggestedAssignments: weakestCourse
      ? [
          `Create a ${weakestCourse.completionRate < 60 ? "short homework" : "timed test"} for ${weakestCourse.title}${dominantWeakTopic ? ` focused on ${dominantWeakTopic}` : ""} to lift the current ${weakestCourse.avgAccuracy}% average.`,
          `Assign a medium-difficulty revision block to improve the ${weakestCourse.completionRate}% completion rate and keep students accountable.`,
        ]
      : ["Create a first assignment to start generating class performance data."],
    focusStudents: weakestStudents.map((student) => `${student.name} (${student.accuracy}% accuracy, ${student.completionRate}% completion)`),
    topPerformers: topStudents.map((student) => `${student.name} (${student.accuracy}% accuracy, ${student.completionRate}% completion)`),
  };
}

function getTestTypeLabel(testType: string) {
  switch (testType) {
    case "full-mock":
      return "Full test";
    case "topic-wise":
      return "Subject-wise test";
    case "adaptive":
      return "Practice test";
    case "assignment-test":
      return "Assignment test";
    case "assignment-homework":
      return "Assignment homework";
    default:
      return testType.replace(/-/g, " ");
  }
}

export function buildTeacherStudentProfile(input: {
  summary: TeacherStudentSummary;
  enrollments: EnrollmentWithCourse[];
  progressRows: UserProgressRow[];
  testHistoryRows: TestHistoryRow[];
  activityEvents: ActivityEventRow[];
  assignments: AssignmentRow[];
  submissions: SubmissionRow[];
}) {
  const subjectProgress = input.progressRows
    .filter((row) => row.user_id === input.summary.userId && row.topic_id === OVERALL_TOPIC_ID)
    .map((row) => ({
      subjectId: row.subject_id,
      name: subjects.find((subject) => subject.id === row.subject_id)?.name || row.subject_id,
      accuracy: row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0,
      correct: row.correct,
      total: row.total,
      lastPracticed: row.last_practiced,
    }) satisfies TeacherStudentSubjectProgress)
    .sort((left, right) => left.accuracy - right.accuracy);

  const testTypeMap = new Map<string, TestHistoryRow[]>();
  input.testHistoryRows
    .filter((row) => row.user_id === input.summary.userId)
    .forEach((row) => {
      const list = testTypeMap.get(row.test_type) || [];
      list.push(row);
      testTypeMap.set(row.test_type, list);
    });

  const prioritizedTypeOrder = [
    "adaptive",
    "full-mock",
    "topic-wise",
    "assignment-test",
    "assignment-homework",
  ];

  const testTypeProgress = [...testTypeMap.entries()]
    .map(([testType, rows]) => {
      const accuracyValues = rows.map((row) => Math.round((row.correct_answers / Math.max(row.total_questions, 1)) * 100));
      return {
        key: testType,
        label: getTestTypeLabel(testType),
        attempts: rows.length,
        avgAccuracy: Math.round(accuracyValues.reduce((sum, value) => sum + value, 0) / rows.length),
        bestAccuracy: Math.max(...accuracyValues),
        latestCompletedAt: rows
          .map((row) => row.completed_at)
          .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || null,
      } satisfies TeacherStudentTestTypeProgress;
    })
    .sort((left, right) => {
      const leftPriority = prioritizedTypeOrder.indexOf(left.key);
      const rightPriority = prioritizedTypeOrder.indexOf(right.key);
      return (leftPriority === -1 ? Number.MAX_SAFE_INTEGER : leftPriority) - (rightPriority === -1 ? Number.MAX_SAFE_INTEGER : rightPriority);
    });

  const recentTests = input.testHistoryRows
    .filter((row) => row.user_id === input.summary.userId)
    .slice()
    .sort((left, right) => new Date(right.completed_at).getTime() - new Date(left.completed_at).getTime())
    .slice(0, 6)
    .map((row) => ({
      id: row.id,
      label: getTestTypeLabel(row.test_type),
      accuracy: Math.round((row.correct_answers / Math.max(row.total_questions, 1)) * 100),
      scoreText: `${row.correct_answers}/${row.total_questions} correct`,
      completedAt: row.completed_at,
    }) satisfies TeacherStudentRecentTest);

  const assignmentById = new Map(input.assignments.map((assignment) => [assignment.id, assignment]));
  const assignmentHistory = input.submissions
    .filter((submission) => submission.student_id === input.summary.userId)
    .slice()
    .sort((left, right) => new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime())
    .slice(0, 8)
    .map((submission) => {
      const assignment = assignmentById.get(submission.assignment_id);
      const accuracy = Math.round((submission.correct_answers / Math.max(submission.total_questions, 1)) * 100);
      const assignmentQuestions = assignment ? getQuestionsByAssignment(assignment) : [];
      const submissionAnswers = readSubmissionAnswers(submission.answers);
      const questionsReviewed = assignmentQuestions.map((question) => {
        const rawAnswer = submissionAnswers[question.id] as AssignmentAnswerValue | undefined;
        const answer = rawAnswer ?? null;
        const answered = isQuestionAnswered(question, answer);
        const correct = isQuestionCorrect(question, answer);

        return {
          questionId: question.id,
          questionText: question.question,
          questionType: question.type,
          studentAnswerText: formatAssignmentAnswer(question, answer),
          correctAnswerText: formatCorrectAssignmentAnswer(question),
          correct,
          answered,
          explanation: question.explanation,
          difficulty: question.difficulty,
          topicName: getTopicName(question.topicId),
          marks: question.marks,
        } satisfies TeacherStudentAssignmentQuestionReview;
      });

      return {
        id: submission.id,
        assignmentId: submission.assignment_id,
        title: assignment?.title || "Assignment",
        courseTitle:
          input.enrollments.find((enrollment) => enrollment.course_id === assignment?.course_id)?.course?.title ||
          "Course",
        type: assignment?.type === "test" ? "Assessment" : "Homework",
        accuracy,
        scoreText: `${submission.score} points • ${submission.correct_answers}/${submission.total_questions} correct`,
        submittedAt: submission.submitted_at,
        violations: submission.violations,
        questionsReviewed,
      } satisfies TeacherStudentAssignmentRecord;
    });

  const practiceReviewSessions = input.activityEvents
    .filter((event) => event.target_user_id === input.summary.userId || event.actor_id === input.summary.userId)
    .filter((event) => event.event_type === "practice_session_completed")
    .map((event) => {
      const metadata = asRecord(event.metadata) || {};
      const subjectId = asString(metadata.subject_id) || event.subject_id;
      const topicId = asString(metadata.topic_id) || event.topic_id;
      const questionReviews = Array.isArray(metadata.question_reviews) ? metadata.question_reviews : [];
      const warningQuestions = questionReviews
        .map((rawReview) => asRecord(rawReview))
        .filter((review): review is Record<string, unknown> => Boolean(review))
        .filter((review) => asBoolean(review.rapidGuessWarning) || asBoolean(review.rapid_guess_warning))
        .map((review) => asString(review.questionId) || asString(review.question_id))
        .filter((questionId): questionId is string => Boolean(questionId));
      const questionsReviewed = buildGraphPathSteps(metadata, subjectId, topicId);

      return {
        id: event.id,
        completedAt: event.created_at,
        testType: asString(metadata.test_type) || "practice",
        label: getTestTypeLabel(asString(metadata.test_type) || "practice"),
        subjectName: getSubjectName(subjectId),
        topicName: getTopicName(topicId),
        accuracy: asNumber(metadata.accuracy),
        totalQuestions: asNumber(metadata.total_questions) ?? questionReviews.length,
        totalWarnings: asNumber(metadata.total_warnings) ?? warningQuestions.length,
        warningQuestions,
        questionsReviewed,
      } satisfies TeacherPracticeReviewSession;
    })
    .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime())
    .slice(0, 6);

  const activeCourses = input.enrollments
    .filter((enrollment) => enrollment.student_id === input.summary.userId)
    .map((enrollment) => ({
      id: enrollment.course_id,
      title: enrollment.course?.title || "Course",
      joinedAt: enrollment.joined_at,
    }))
    .sort((left, right) => new Date(right.joinedAt).getTime() - new Date(left.joinedAt).getTime());

  const graphSessions = buildTeacherRecommendationPathSessions({
    activityEvents: input.activityEvents,
    students: [],
    studentUserId: input.summary.userId,
  }).map((session) => ({
    ...session,
    studentName: input.summary.name,
  }));

  return {
    summary: input.summary,
    subjectProgress,
    testTypeProgress,
    recentTests,
    assignmentHistory,
    practiceReviewSessions,
    activeCourses,
    graphSessions,
    latestGraphSession: graphSessions[0] || null,
  } satisfies TeacherStudentProfile;
}
