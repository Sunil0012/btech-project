export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TeacherDatabase = {
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      activity_events: {
        Row: {
          actor_id: string;
          actor_name: string | null;
          actor_role: string;
          assignment_id: string | null;
          course_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json;
          question_id: string | null;
          subject_id: string | null;
          target_user_id: string | null;
          topic_id: string | null;
        };
        Insert: {
          actor_id: string;
          actor_name?: string | null;
          actor_role: string;
          assignment_id?: string | null;
          course_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          question_id?: string | null;
          subject_id?: string | null;
          target_user_id?: string | null;
          topic_id?: string | null;
        };
        Update: {
          actor_id?: string;
          actor_name?: string | null;
          actor_role?: string;
          assignment_id?: string | null;
          course_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          question_id?: string | null;
          subject_id?: string | null;
          target_user_id?: string | null;
          topic_id?: string | null;
        };
        Relationships: [];
      };
      answered_questions: {
        Row: {
          answered_at: string;
          id: string;
          question_id: string;
          user_id: string;
          was_correct: boolean;
        };
        Insert: {
          answered_at?: string;
          id?: string;
          question_id: string;
          user_id: string;
          was_correct: boolean;
        };
        Update: {
          answered_at?: string;
          id?: string;
          question_id?: string;
          user_id?: string;
          was_correct?: boolean;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
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
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          elo_rating?: number;
          full_name?: string | null;
          id?: string;
          last_active?: string | null;
          role?: string;
          streak_count?: number;
          study_goal?: string | null;
          theme?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          elo_rating?: number;
          full_name?: string | null;
          id?: string;
          last_active?: string | null;
          role?: string;
          streak_count?: number;
          study_goal?: string | null;
          theme?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      test_history: {
        Row: {
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
        };
        Insert: {
          completed_at?: string;
          correct_answers?: number;
          duration_seconds?: number | null;
          id?: string;
          max_score?: number;
          questions_attempted?: number;
          score?: number;
          subject_id?: string | null;
          test_type: string;
          topic_id?: string | null;
          total_questions?: number;
          user_id: string;
          violations?: number;
        };
        Update: {
          completed_at?: string;
          correct_answers?: number;
          duration_seconds?: number | null;
          id?: string;
          max_score?: number;
          questions_attempted?: number;
          score?: number;
          subject_id?: string | null;
          test_type?: string;
          topic_id?: string | null;
          total_questions?: number;
          user_id?: string;
          violations?: number;
        };
        Relationships: [];
      };
      user_progress: {
        Row: {
          correct: number;
          id: string;
          last_practiced: string | null;
          subject_id: string;
          topic_id: string | null;
          total: number;
          user_id: string;
        };
        Insert: {
          correct?: number;
          id?: string;
          last_practiced?: string | null;
          subject_id: string;
          topic_id?: string | null;
          total?: number;
          user_id: string;
        };
        Update: {
          correct?: number;
          id?: string;
          last_practiced?: string | null;
          subject_id?: string;
          topic_id?: string | null;
          total?: number;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  teacher: {
    Tables: {
      assignments: {
        Row: {
          course_id: string;
          created_at: string;
          description: string | null;
          difficulty: string;
          due_date: string | null;
          id: string;
          question_count: number;
          question_ids: string[];
          subject_id: string | null;
          timer_minutes: number;
          title: string;
          topic_id: string | null;
          type: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description?: string | null;
          difficulty?: string;
          due_date?: string | null;
          id?: string;
          question_count?: number;
          question_ids?: string[];
          subject_id?: string | null;
          timer_minutes?: number;
          title: string;
          topic_id?: string | null;
          type: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string | null;
          difficulty?: string;
          due_date?: string | null;
          id?: string;
          question_count?: number;
          question_ids?: string[];
          subject_id?: string | null;
          timer_minutes?: number;
          title?: string;
          topic_id?: string | null;
          type?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          join_code: string;
          teacher_id: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          join_code: string;
          teacher_id: string;
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          join_code?: string;
          teacher_id?: string;
          title?: string;
        };
        Relationships: [];
      };
      enrollments: {
        Row: {
          course_id: string;
          id: string;
          joined_at: string;
          student_id: string;
        };
        Insert: {
          course_id: string;
          id?: string;
          joined_at?: string;
          student_id: string;
        };
        Update: {
          course_id?: string;
          id?: string;
          joined_at?: string;
          student_id?: string;
        };
        Relationships: [];
      };
      submissions: {
        Row: {
          answers: Json;
          assignment_id: string;
          correct_answers: number;
          id: string;
          score: number;
          student_id: string;
          submitted_at: string;
          total_questions: number;
          violations: number;
        };
        Insert: {
          answers?: Json;
          assignment_id: string;
          correct_answers?: number;
          id?: string;
          score?: number;
          student_id: string;
          submitted_at?: string;
          total_questions?: number;
          violations?: number;
        };
        Update: {
          answers?: Json;
          assignment_id?: string;
          correct_answers?: number;
          id?: string;
          score?: number;
          student_id?: string;
          submitted_at?: string;
          total_questions?: number;
          violations?: number;
        };
        Relationships: [];
      };
      teachers: {
        Row: {
          created_at: string;
          id: string;
          teacher_uid: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          teacher_uid: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          teacher_uid?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type TeacherDatabaseWithoutInternals = Omit<TeacherDatabase, "__InternalSupabase">;
type TeacherDefaultSchema = TeacherDatabaseWithoutInternals["teacher"];

export type TeacherTables<
  TeacherDefaultSchemaTableNameOrOptions extends
    | keyof (TeacherDefaultSchema["Tables"] & TeacherDefaultSchema["Views"])
    | { schema: keyof TeacherDatabaseWithoutInternals },
  TableName extends TeacherDefaultSchemaTableNameOrOptions extends {
    schema: keyof TeacherDatabaseWithoutInternals;
  }
    ? keyof (TeacherDatabaseWithoutInternals[TeacherDefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        TeacherDatabaseWithoutInternals[TeacherDefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = TeacherDefaultSchemaTableNameOrOptions extends {
  schema: keyof TeacherDatabaseWithoutInternals;
}
  ? (TeacherDatabaseWithoutInternals[TeacherDefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      TeacherDatabaseWithoutInternals[TeacherDefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : TeacherDefaultSchemaTableNameOrOptions extends keyof (TeacherDefaultSchema["Tables"] &
        TeacherDefaultSchema["Views"])
    ? (TeacherDefaultSchema["Tables"] &
        TeacherDefaultSchema["Views"])[TeacherDefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TeacherTablesInsert<
  TeacherDefaultSchemaTableNameOrOptions extends
    | keyof TeacherDefaultSchema["Tables"]
    | { schema: keyof TeacherDatabaseWithoutInternals },
  TableName extends TeacherDefaultSchemaTableNameOrOptions extends {
    schema: keyof TeacherDatabaseWithoutInternals;
  }
    ? keyof TeacherDatabaseWithoutInternals[TeacherDefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = TeacherDefaultSchemaTableNameOrOptions extends {
  schema: keyof TeacherDatabaseWithoutInternals;
}
  ? TeacherDatabaseWithoutInternals[TeacherDefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : TeacherDefaultSchemaTableNameOrOptions extends keyof TeacherDefaultSchema["Tables"]
    ? TeacherDefaultSchema["Tables"][TeacherDefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TeacherTablesUpdate<
  TeacherDefaultSchemaTableNameOrOptions extends
    | keyof TeacherDefaultSchema["Tables"]
    | { schema: keyof TeacherDatabaseWithoutInternals },
  TableName extends TeacherDefaultSchemaTableNameOrOptions extends {
    schema: keyof TeacherDatabaseWithoutInternals;
  }
    ? keyof TeacherDatabaseWithoutInternals[TeacherDefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = TeacherDefaultSchemaTableNameOrOptions extends {
  schema: keyof TeacherDatabaseWithoutInternals;
}
  ? TeacherDatabaseWithoutInternals[TeacherDefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : TeacherDefaultSchemaTableNameOrOptions extends keyof TeacherDefaultSchema["Tables"]
    ? TeacherDefaultSchema["Tables"][TeacherDefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;
