import type { Json, StudentTablesInsert } from "@/integrations/supabase/student-types";
import type { TeacherTablesInsert } from "@/integrations/supabase/teacher-types";
import { studentSupabase } from "@/integrations/supabase/student-client";
import { teacherSupabase } from "@/integrations/supabase/teacher-client";

export type ActivityActorRole = "student" | "teacher";

export interface ActivityEventInput {
  actorId: string;
  actorRole: ActivityActorRole;
  actorName?: string | null;
  eventType: string;
  targetUserId?: string | null;
  courseId?: string | null;
  assignmentId?: string | null;
  questionId?: string | null;
  subjectId?: string | null;
  topicId?: string | null;
  metadata?: Json;
}

function buildStudentPayload(input: ActivityEventInput): StudentTablesInsert<"activity_events"> {
  return {
    actor_id: input.actorId,
    actor_role: input.actorRole,
    actor_name: input.actorName ?? null,
    event_type: input.eventType,
    target_user_id: input.targetUserId ?? null,
    course_id: input.courseId ?? null,
    assignment_id: input.assignmentId ?? null,
    question_id: input.questionId ?? null,
    subject_id: input.subjectId ?? null,
    topic_id: input.topicId ?? null,
    metadata: input.metadata ?? {},
  };
}

function buildTeacherPayload(input: ActivityEventInput): TeacherTablesInsert<"activity_events"> {
  return {
    actor_id: input.actorId,
    actor_role: input.actorRole,
    actor_name: input.actorName ?? null,
    event_type: input.eventType,
    target_user_id: input.targetUserId ?? null,
    course_id: input.courseId ?? null,
    assignment_id: input.assignmentId ?? null,
    question_id: input.questionId ?? null,
    subject_id: input.subjectId ?? null,
    topic_id: input.topicId ?? null,
    metadata: input.metadata ?? {},
  };
}

export async function logStudentActivityEvent(input: ActivityEventInput) {
  try {
    const { error } = await studentSupabase
      .from("activity_events")
      .insert(buildStudentPayload(input));

    if (error) throw error;
  } catch (error) {
    console.warn("Could not log student activity event", error);
  }
}

export async function logTeacherActivityEvent(input: ActivityEventInput) {
  try {
    const { error } = await teacherSupabase
      .from("activity_events")
      .insert(buildTeacherPayload(input));

    if (error) throw error;
  } catch (error) {
    console.warn("Could not log teacher activity event", error);
  }
}
