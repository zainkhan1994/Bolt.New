
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
            "announcements": {
                  Row: {
                    "audience": string,"author_id": string | null,"created_at": string,"expires_at": string | null,"id": string,"message": string,"organization_id": string,"priority": Database["public"]['Enums']["announcement_priority"],"publish_at": string,"status": Database["public"]['Enums']["content_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audience"?: string,"author_id"?: string | null,"created_at"?: string,"expires_at"?: string | null,"id"?: string,"message": string,"organization_id": string,"priority"?: Database["public"]['Enums']["announcement_priority"],"publish_at"?: string,"status"?: Database["public"]['Enums']["content_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "audience"?: string,"author_id"?: string | null,"created_at"?: string,"expires_at"?: string | null,"id"?: string,"message"?: string,"organization_id"?: string,"priority"?: Database["public"]['Enums']["announcement_priority"],"publish_at"?: string,"status"?: Database["public"]['Enums']["content_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcements_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_email": string | null,"actor_id": string | null,"created_at": string,"id": string,"metadata": NonNullable<Json>,"organization_id": string | null,"resource_id": string | null,"resource_label": string | null,"resource_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_email"?: string | null,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"organization_id"?: string | null,"resource_id"?: string | null,"resource_label"?: string | null,"resource_type": string
                  }
                  Update: {
                    "action"?: string,"actor_email"?: string | null,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"organization_id"?: string | null,"resource_id"?: string | null,"resource_label"?: string | null,"resource_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_logs_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "category": string,"created_at": string,"description": string | null,"file_path": string,"file_size": number | null,"id": string,"is_public": boolean,"mime_type": string,"organization_id": string,"title": string,"updated_at": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string,"created_at"?: string,"description"?: string | null,"file_path": string,"file_size"?: number | null,"id"?: string,"is_public"?: boolean,"mime_type"?: string,"organization_id": string,"title": string,"updated_at"?: string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"description"?: string | null,"file_path"?: string,"file_size"?: number | null,"id"?: string,"is_public"?: boolean,"mime_type"?: string,"organization_id"?: string,"title"?: string,"updated_at"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_preferences": {
                  Row: {
                    "created_at": string,"document_updates": boolean,"email_announcements": boolean,"emergency_alerts": boolean,"id": string,"updated_at": string,"user_id": string,"weekly_digest": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"document_updates"?: boolean,"email_announcements"?: boolean,"emergency_alerts"?: boolean,"id"?: string,"updated_at"?: string,"user_id": string,"weekly_digest"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"document_updates"?: boolean,"email_announcements"?: boolean,"emergency_alerts"?: boolean,"id"?: string,"updated_at"?: string,"user_id"?: string,"weekly_digest"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_preferences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organization_members": {
                  Row: {
                    "created_at": string,"id": string,"organization_id": string,"role": Database["public"]['Enums']["org_role"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"organization_id": string,"role"?: Database["public"]['Enums']["org_role"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"organization_id"?: string,"role"?: Database["public"]['Enums']["org_role"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organization_members_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "organization_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "address": string | null,"contact_email": string | null,"contact_phone": string | null,"created_at": string,"description": string | null,"id": string,"is_public": boolean,"name": string,"primary_color": string,"slug": string,"tagline": string | null,"type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_public"?: boolean,"name": string,"primary_color"?: string,"slug": string,"tagline"?: string | null,"type"?: string,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_public"?: boolean,"name"?: string,"primary_color"?: string,"slug"?: string,"tagline"?: string | null,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"pages": {
                  Row: {
                    "author_id": string | null,"body": string,"created_at": string,"id": string,"nav_order": number,"organization_id": string,"published_at": string | null,"show_in_nav": boolean,"slug": string,"status": Database["public"]['Enums']["content_status"],"summary": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"nav_order"?: number,"organization_id": string,"published_at"?: string | null,"show_in_nav"?: boolean,"slug": string,"status"?: Database["public"]['Enums']["content_status"],"summary"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"nav_order"?: number,"organization_id"?: string,"published_at"?: string | null,"show_in_nav"?: boolean,"slug"?: string,"status"?: Database["public"]['Enums']["content_status"],"summary"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pages_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pages_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"email": string,"full_name": string | null,"id": string,"is_super_admin": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"email": string,"full_name"?: string | null,"id": string,"is_super_admin"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"email"?: string,"full_name"?: string | null,"id"?: string,"is_super_admin"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "add_member_by_email":
{ Args: { "p_email": string,"p_organization_id": string,"p_role": Database["public"]['Enums']["org_role"] }; Returns: {
              "created_at": string,
"id": string,
"organization_id": string,
"role": Database["public"]['Enums']["org_role"],
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "organization_members"
        isOneToOne: true
        isSetofReturn: false
      } },
"can_edit_content":
{ Args: { "org_id": string }; Returns: boolean
                           },
"create_organization":
{ Args: { "p_admin_email": string,"p_name": string,"p_slug": string,"p_type": string }; Returns: {
              "address": string | null,
"contact_email": string | null,
"contact_phone": string | null,
"created_at": string,
"description": string | null,
"id": string,
"is_public": boolean,
"name": string,
"primary_color": string,
"slug": string,
"tagline": string | null,
"type": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "organizations"
        isOneToOne: true
        isSetofReturn: false
      } },
"has_org_role":
{ Args: { "org_id": string,"roles": (Database["public"]['Enums']["org_role"])[] }; Returns: boolean
                           },
"is_org_admin":
{ Args: { "org_id": string }; Returns: boolean
                           },
"is_org_member":
{ Args: { "org_id": string }; Returns: boolean
                           },
"is_super_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"record_login":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"shares_org_with":
{ Args: { "other": string }; Returns: boolean
                           },
"storage_object_org":
{ Args: { "object_name": string }; Returns: string
                           },
"write_audit_log":
{ Args: { "p_action": string,"p_metadata"?: Json,"p_organization_id": string,"p_resource_id": string,"p_resource_label": string,"p_resource_type": string }; Returns: undefined
                           }
          }
          Enums: {
            "announcement_priority": "normal"|"important"|"emergency","content_status": "draft"|"published","org_role": "org_admin"|"editor"|"viewer"
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
            "announcement_priority": ["normal", "important", "emergency"],"content_status": ["draft", "published"],"org_role": ["org_admin", "editor", "viewer"]
          }
        }
} as const
