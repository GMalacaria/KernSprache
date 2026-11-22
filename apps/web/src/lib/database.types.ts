
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
                },"curriculum_topics": {
                  Row: {
                    "id": number,"level": Database["public"]['Enums']["cefr_level"],"slug": string,"sort_order": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"level": Database["public"]['Enums']["cefr_level"],"slug": string,"sort_order": number,"title": string
                  }
                  Update: {
                    "id"?: never,"level"?: Database["public"]['Enums']["cefr_level"],"slug"?: string,"sort_order"?: number,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"mistakes": {
                  Row: {
                    "category": Database["public"]['Enums']["mistake_category"],"corrected": string,"created_at": string,"explanation_it": string,"id": string,"original": string,"session_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["mistake_category"],"corrected": string,"created_at"?: string,"explanation_it": string,"id"?: string,"original": string,"session_id"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["mistake_category"],"corrected"?: string,"created_at"?: string,"explanation_it"?: string,"id"?: string,"original"?: string,"session_id"?: string | null,"user_id"?: string
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
                },"profiles": {
                  Row: {
                    "created_at": string,"goal": string | null,"id": string,"level": Database["public"]['Enums']["cefr_level"],"reminder_time": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"goal"?: string | null,"id": string,"level"?: Database["public"]['Enums']["cefr_level"],"reminder_time"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"goal"?: string | null,"id"?: string,"level"?: Database["public"]['Enums']["cefr_level"],"reminder_time"?: string,"timezone"?: string,"updated_at"?: string
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
                },"sessions": {
                  Row: {
                    "ended_at": string | null,"id": string,"kind": Database["public"]['Enums']["session_kind"],"started_at": string,"topic_id": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ended_at"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["session_kind"],"started_at"?: string,"topic_id"?: number | null,"user_id"?: string
                  }
                  Update: {
                    "ended_at"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["session_kind"],"started_at"?: string,"topic_id"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessions_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "curriculum_topics"
      referencedColumns: ["id"]
    }
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
            [_ in never]: never
          }
          Enums: {
            "cefr_level": "A1"|"A2"|"B1"|"B2","mistake_category": "verb_tense"|"article"|"preposition"|"word_order"|"vocabulary"|"spelling"|"other","session_kind": "lesson"|"dialogue"|"review"
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
            "cefr_level": ["A1", "A2", "B1", "B2"],"mistake_category": ["verb_tense", "article", "preposition", "word_order", "vocabulary", "spelling", "other"],"session_kind": ["lesson", "dialogue", "review"]
          }
        }
} as const
