
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ai_usage": {
                  Row: {
                    "cache_creation_input_tokens": number,"cache_read_input_tokens": number,"created_at": string,"function_name": string,"id": number,"input_tokens": number,"model": string,"output_tokens": number,"prompt_version": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cache_creation_input_tokens"?: number,"cache_read_input_tokens"?: number,"created_at"?: string,"function_name": string,"id"?: never,"input_tokens"?: number,"model": string,"output_tokens"?: number,"prompt_version"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "cache_creation_input_tokens"?: number,"cache_read_input_tokens"?: number,"created_at"?: string,"function_name"?: string,"id"?: never,"input_tokens"?: number,"model"?: string,"output_tokens"?: number,"prompt_version"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"chapter_test_attempts": {
                  Row: {
                    "chapter_id": number,"created_at": string,"feedback": NonNullable<Json>,"id": string,"oral_score": number,"passed": boolean,"score": number,"test_id": string,"user_id": string,"written_score": number
                  }
                  ComputedFields: never
                  Insert: {
                    "chapter_id": number,"created_at"?: string,"feedback": NonNullable<Json>,"id"?: string,"oral_score": number,"passed": boolean,"score": number,"test_id": string,"user_id": string,"written_score": number
                  }
                  Update: {
                    "chapter_id"?: number,"created_at"?: string,"feedback"?: NonNullable<Json>,"id"?: string,"oral_score"?: number,"passed"?: boolean,"score"?: number,"test_id"?: string,"user_id"?: string,"written_score"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "chapter_test_attempts_chapter_id_fkey"
      columns: ["chapter_id"]
isOneToOne: false
      referencedRelation: "chapters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chapter_test_attempts_test_id_fkey"
      columns: ["test_id"]
isOneToOne: false
      referencedRelation: "chapter_tests"
      referencedColumns: ["id"]
    }
                  ]
                },"chapter_tests": {
                  Row: {
                    "chapter_id": number,"created_at": string,"id": string,"oral_tasks": NonNullable<Json>,"prompt_version": string,"questions": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chapter_id": number,"created_at"?: string,"id"?: string,"oral_tasks": NonNullable<Json>,"prompt_version": string,"questions": NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "chapter_id"?: number,"created_at"?: string,"id"?: string,"oral_tasks"?: NonNullable<Json>,"prompt_version"?: string,"questions"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chapter_tests_chapter_id_fkey"
      columns: ["chapter_id"]
isOneToOne: false
      referencedRelation: "chapters"
      referencedColumns: ["id"]
    }
                  ]
                },"chapters": {
                  Row: {
                    "description_it": string,"grammar_focus": string,"id": number,"level": Database["public"]['Enums']["cefr_level"],"slug": string,"sort_order": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "description_it"?: string,"grammar_focus"?: string,"id"?: never,"level": Database["public"]['Enums']["cefr_level"],"slug": string,"sort_order": number,"title": string
                  }
                  Update: {
                    "description_it"?: string,"grammar_focus"?: string,"id"?: never,"level"?: Database["public"]['Enums']["cefr_level"],"slug"?: string,"sort_order"?: number,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"lesson_contents": {
                  Row: {
                    "content": NonNullable<Json>,"created_at": string,"lesson_id": number,"prompt_version": string,"purpose": Database["public"]['Enums']["learning_purpose"] | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": NonNullable<Json>,"created_at"?: string,"lesson_id": number,"prompt_version": string,"purpose"?: Database["public"]['Enums']["learning_purpose"] | null,"user_id": string
                  }
                  Update: {
                    "content"?: NonNullable<Json>,"created_at"?: string,"lesson_id"?: number,"prompt_version"?: string,"purpose"?: Database["public"]['Enums']["learning_purpose"] | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_contents_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_progress": {
                  Row: {
                    "completed_at": string,"lesson_id": number,"score": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string,"lesson_id": number,"score": number,"user_id"?: string
                  }
                  Update: {
                    "completed_at"?: string,"lesson_id"?: number,"score"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_progress_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_stats": {
                  Row: {
                    "answers": number,"best_streak": number,"chapter_id": number,"completed_at": string,"correct": number,"lesson_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers": number,"best_streak": number,"chapter_id": number,"completed_at"?: string,"correct": number,"lesson_id": number,"user_id"?: string
                  }
                  Update: {
                    "answers"?: number,"best_streak"?: number,"chapter_id"?: number,"completed_at"?: string,"correct"?: number,"lesson_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_stats_chapter_id_fkey"
      columns: ["chapter_id"]
isOneToOne: false
      referencedRelation: "chapters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_stats_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons": {
                  Row: {
                    "chapter_id": number,"focus": string,"id": number,"slug": string,"sort_order": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chapter_id": number,"focus": string,"id"?: never,"slug": string,"sort_order": number,"title": string
                  }
                  Update: {
                    "chapter_id"?: number,"focus"?: string,"id"?: never,"slug"?: string,"sort_order"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_chapter_id_fkey"
      columns: ["chapter_id"]
isOneToOne: false
      referencedRelation: "chapters"
      referencedColumns: ["id"]
    }
                  ]
                },"mistakes": {
                  Row: {
                    "category": Database["public"]['Enums']["mistake_category"],"corrected": string,"created_at": string,"difficulty": number,"due": string,"elapsed_days": number,"explanation_it": string,"id": string,"lapses": number,"last_review": string | null,"learning_steps": number,"original": string,"reps": number,"scheduled_days": number,"session_id": string | null,"stability": number,"state": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["mistake_category"],"corrected": string,"created_at"?: string,"difficulty"?: number,"due"?: string,"elapsed_days"?: number,"explanation_it": string,"id"?: string,"lapses"?: number,"last_review"?: string | null,"learning_steps"?: number,"original": string,"reps"?: number,"scheduled_days"?: number,"session_id"?: string | null,"stability"?: number,"state"?: number,"user_id"?: string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["mistake_category"],"corrected"?: string,"created_at"?: string,"difficulty"?: number,"due"?: string,"elapsed_days"?: number,"explanation_it"?: string,"id"?: string,"lapses"?: number,"last_review"?: string | null,"learning_steps"?: number,"original"?: string,"reps"?: number,"scheduled_days"?: number,"session_id"?: string | null,"stability"?: number,"state"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mistakes_session_id_user_id_fkey"
      columns: ["session_id","user_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"placement_results": {
                  Row: {
                    "created_at": string,"final_level": Database["public"]['Enums']["cefr_level"],"id": string,"oral_feedback": Json | null,"oral_level": Database["public"]['Enums']["cefr_level"] | null,"oral_transcripts": NonNullable<Json>,"user_id": string,"written_answers": NonNullable<Json>,"written_correct": number,"written_level": Database["public"]['Enums']["cefr_level"],"written_total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"final_level": Database["public"]['Enums']["cefr_level"],"id"?: string,"oral_feedback"?: Json | null,"oral_level"?: Database["public"]['Enums']["cefr_level"] | null,"oral_transcripts"?: NonNullable<Json>,"user_id": string,"written_answers": NonNullable<Json>,"written_correct": number,"written_level": Database["public"]['Enums']["cefr_level"],"written_total": number
                  }
                  Update: {
                    "created_at"?: string,"final_level"?: Database["public"]['Enums']["cefr_level"],"id"?: string,"oral_feedback"?: Json | null,"oral_level"?: Database["public"]['Enums']["cefr_level"] | null,"oral_transcripts"?: NonNullable<Json>,"user_id"?: string,"written_answers"?: NonNullable<Json>,"written_correct"?: number,"written_level"?: Database["public"]['Enums']["cefr_level"],"written_total"?: number
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "approved": boolean,"created_at": string,"daily_goal_minutes": number,"goal": string | null,"id": string,"level": Database["public"]['Enums']["cefr_level"],"onboarded_at": string | null,"purpose": Database["public"]['Enums']["learning_purpose"] | null,"reminder_time": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved"?: boolean,"created_at"?: string,"daily_goal_minutes"?: number,"goal"?: string | null,"id": string,"level"?: Database["public"]['Enums']["cefr_level"],"onboarded_at"?: string | null,"purpose"?: Database["public"]['Enums']["learning_purpose"] | null,"reminder_time"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "approved"?: boolean,"created_at"?: string,"daily_goal_minutes"?: number,"goal"?: string | null,"id"?: string,"level"?: Database["public"]['Enums']["cefr_level"],"onboarded_at"?: string | null,"purpose"?: Database["public"]['Enums']["learning_purpose"] | null,"reminder_time"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"p256dh": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"p256dh": string,"user_id"?: string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"p256dh"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reminder_log": {
                  Row: {
                    "day": string,"kind": string,"sent_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"kind": string,"sent_at"?: string,"user_id": string
                  }
                  Update: {
                    "day"?: string,"kind"?: string,"sent_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sessions": {
                  Row: {
                    "chapter_id": number | null,"ended_at": string | null,"id": string,"kind": Database["public"]['Enums']["session_kind"],"lesson_id": number | null,"started_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chapter_id"?: number | null,"ended_at"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["session_kind"],"lesson_id"?: number | null,"started_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "chapter_id"?: number | null,"ended_at"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["session_kind"],"lesson_id"?: number | null,"started_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessions_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_topic_id_fkey"
      columns: ["chapter_id"]
isOneToOne: false
      referencedRelation: "chapters"
      referencedColumns: ["id"]
    }
                  ]
                },"study_days": {
                  Row: {
                    "completed_at": string | null,"day": string,"goal_minutes": number,"oral_seconds": number,"updated_at": string,"user_id": string,"written_seconds": number
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"day": string,"goal_minutes": number,"oral_seconds"?: number,"updated_at"?: string,"user_id"?: string,"written_seconds"?: number
                  }
                  Update: {
                    "completed_at"?: string | null,"day"?: string,"goal_minutes"?: number,"oral_seconds"?: number,"updated_at"?: string,"user_id"?: string,"written_seconds"?: number
                  }
                  Relationships: [
                    
                  ]
                },"tts_cache": {
                  Row: {
                    "created_at": string,"key": string,"path": string,"text": string,"voice": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"key": string,"path": string,"text": string,"voice": string
                  }
                  Update: {
                    "created_at"?: string,"key"?: string,"path"?: string,"text"?: string,"voice"?: string
                  }
                  Relationships: [
                    
                  ]
                },"vocab_items": {
                  Row: {
                    "created_at": string,"difficulty": number,"due": string,"elapsed_days": number,"en": string,"id": string,"it": string,"lapses": number,"last_review": string | null,"learning_steps": number,"reps": number,"scheduled_days": number,"stability": number,"state": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"difficulty"?: number,"due"?: string,"elapsed_days"?: number,"en": string,"id"?: string,"it": string,"lapses"?: number,"last_review"?: string | null,"learning_steps"?: number,"reps"?: number,"scheduled_days"?: number,"stability"?: number,"state"?: number,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"difficulty"?: number,"due"?: string,"elapsed_days"?: number,"en"?: string,"id"?: string,"it"?: string,"lapses"?: number,"last_review"?: string | null,"learning_steps"?: number,"reps"?: number,"scheduled_days"?: number,"stability"?: number,"state"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "add_study_time":
{ Args: { "p_day": string,"p_mode": Database["public"]['Enums']["study_mode"],"p_seconds": number }; Returns: {
              "completed_at": string | null,
"day": string,
"goal_minutes": number,
"oral_seconds": number,
"updated_at": string,
"user_id": string,
"written_seconds": number
            }
                          SetofOptions: {
        from: "*"
        to: "study_days"
        isOneToOne: true
        isSetofReturn: false
      } },
"call_send_reminders":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"record_lesson_stats":
{ Args: { "p_answers": number,"p_best_streak": number,"p_correct": number,"p_lesson_id": number }; Returns: {
              "answers": number,
"best_streak": number,
"chapter_id": number,
"completed_at": string,
"correct": number,
"lesson_id": number,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "lesson_stats"
        isOneToOne: true
        isSetofReturn: false
      } },
"register_push_subscription":
{ Args: { "p_auth": string,"p_endpoint": string,"p_p256dh": string }; Returns: undefined
                           }
          }
          Enums: {
            "cefr_level": "A1"|"A2"|"B1"|"B2","learning_purpose": "leisure"|"travel"|"work"|"love","mistake_category": "verb_tense"|"article"|"preposition"|"word_order"|"vocabulary"|"spelling"|"other","session_kind": "lesson"|"dialogue"|"review","study_mode": "written"|"oral"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "cefr_level": ["A1", "A2", "B1", "B2"],"learning_purpose": ["leisure", "travel", "work", "love"],"mistake_category": ["verb_tense", "article", "preposition", "word_order", "vocabulary", "spelling", "other"],"session_kind": ["lesson", "dialogue", "review"],"study_mode": ["written", "oral"]
          }
        }
} as const
