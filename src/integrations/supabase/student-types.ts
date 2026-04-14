export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StudentDatabase = {
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
          review_payload: Json | null;
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
          review_payload?: Json | null;
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
          review_payload?: Json | null;
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
};

type StudentDatabaseWithoutInternals = Omit<StudentDatabase, "__InternalSupabase">;
type StudentDefaultSchema = StudentDatabaseWithoutInternals[Extract<keyof StudentDatabase, "public">];

export type StudentTables<
  StudentDefaultSchemaTableNameOrOptions extends
    | keyof (StudentDefaultSchema["Tables"] & StudentDefaultSchema["Views"])
    | { schema: keyof StudentDatabaseWithoutInternals },
  TableName extends StudentDefaultSchemaTableNameOrOptions extends {
    schema: keyof StudentDatabaseWithoutInternals;
  }
    ? keyof (StudentDatabaseWithoutInternals[StudentDefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        StudentDatabaseWithoutInternals[StudentDefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = StudentDefaultSchemaTableNameOrOptions extends {
  schema: keyof StudentDatabaseWithoutInternals;
}
  ? (StudentDatabaseWithoutInternals[StudentDefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      StudentDatabaseWithoutInternals[StudentDefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : StudentDefaultSchemaTableNameOrOptions extends keyof (StudentDefaultSchema["Tables"] &
        StudentDefaultSchema["Views"])
    ? (StudentDefaultSchema["Tables"] &
        StudentDefaultSchema["Views"])[StudentDefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type StudentTablesInsert<
  StudentDefaultSchemaTableNameOrOptions extends
    | keyof StudentDefaultSchema["Tables"]
    | { schema: keyof StudentDatabaseWithoutInternals },
  TableName extends StudentDefaultSchemaTableNameOrOptions extends {
    schema: keyof StudentDatabaseWithoutInternals;
  }
    ? keyof StudentDatabaseWithoutInternals[StudentDefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = StudentDefaultSchemaTableNameOrOptions extends {
  schema: keyof StudentDatabaseWithoutInternals;
}
  ? StudentDatabaseWithoutInternals[StudentDefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : StudentDefaultSchemaTableNameOrOptions extends keyof StudentDefaultSchema["Tables"]
    ? StudentDefaultSchema["Tables"][StudentDefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type StudentTablesUpdate<
  StudentDefaultSchemaTableNameOrOptions extends
    | keyof StudentDefaultSchema["Tables"]
    | { schema: keyof StudentDatabaseWithoutInternals },
  TableName extends StudentDefaultSchemaTableNameOrOptions extends {
    schema: keyof StudentDatabaseWithoutInternals;
  }
    ? keyof StudentDatabaseWithoutInternals[StudentDefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = StudentDefaultSchemaTableNameOrOptions extends {
  schema: keyof StudentDatabaseWithoutInternals;
}
  ? StudentDatabaseWithoutInternals[StudentDefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : StudentDefaultSchemaTableNameOrOptions extends keyof StudentDefaultSchema["Tables"]
    ? StudentDefaultSchema["Tables"][StudentDefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;
