export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          board_members: string[] | null
          client_id: string | null
          company_name: string | null
          created_at: string
          employee_count: number | null
          id: string
          industry_sector: string | null
          legal_representative: string | null
          name: string
          shareholders: Json | null
          subsidiaries: Json | null
          tax_year: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          board_members?: string[] | null
          client_id?: string | null
          company_name?: string | null
          created_at?: string
          employee_count?: number | null
          id: string
          industry_sector?: string | null
          legal_representative?: string | null
          name: string
          shareholders?: Json | null
          subsidiaries?: Json | null
          tax_year?: number | null
          updated_at: string
          user_id: string
        }
        Update: {
          board_members?: string[] | null
          client_id?: string | null
          company_name?: string | null
          created_at?: string
          employee_count?: number | null
          id?: string
          industry_sector?: string | null
          legal_representative?: string | null
          name?: string
          shareholders?: Json | null
          subsidiaries?: Json | null
          tax_year?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          extracted_text: string | null
          extraction_status: Database["public"]["Enums"]["extraction_status"]
          file_name: string
          file_type: Database["public"]["Enums"]["file_type"]
          id: string
          page_id: string
          scope: Database["public"]["Enums"]["file_scope"]
          size_bytes: number | null
          step_id: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          extraction_status?: Database["public"]["Enums"]["extraction_status"]
          file_name: string
          file_type: Database["public"]["Enums"]["file_type"]
          id: string
          page_id: string
          scope: Database["public"]["Enums"]["file_scope"]
          size_bytes?: number | null
          step_id?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          extraction_status?: Database["public"]["Enums"]["extraction_status"]
          file_name?: string
          file_type?: Database["public"]["Enums"]["file_type"]
          id?: string
          page_id?: string
          scope?: Database["public"]["Enums"]["file_scope"]
          size_bytes?: number | null
          step_id?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_steps: {
        Row: {
          created_at: string
          description: string | null
          framework_id: string
          id: string
          order: number
          refine_prompt_template: string
          system_prompt_template: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          framework_id: string
          id: string
          order: number
          refine_prompt_template: string
          system_prompt_template: string
          title: string
          updated_at: string
        }
        Update: {
          created_at?: string
          description?: string | null
          framework_id?: string
          id?: string
          order?: number
          refine_prompt_template?: string
          system_prompt_template?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_steps_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      frameworks: {
        Row: {
          created_at: string
          deprecated_at: string | null
          description: string | null
          id: string
          is_public: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deprecated_at?: string | null
          description?: string | null
          id: string
          is_public?: boolean
          name: string
          slug: string
          updated_at: string
        }
        Update: {
          created_at?: string
          deprecated_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      generation_files: {
        Row: {
          file_id: string
          generation_id: string
          id: string
        }
        Insert: {
          file_id: string
          generation_id: string
          id: string
        }
        Update: {
          file_id?: string
          generation_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_files_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          created_at: string
          id: string
          is_committed: boolean
          output: string
          prompt_used: string
          source: Database["public"]["Enums"]["generation_source"]
          step_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_committed?: boolean
          output: string
          prompt_used: string
          source: Database["public"]["Enums"]["generation_source"]
          step_id: string
          updated_at: string
        }
        Update: {
          created_at?: string
          id?: string
          is_committed?: boolean
          output?: string
          prompt_used?: string
          source?: Database["public"]["Enums"]["generation_source"]
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generations_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          client_id: string | null
          company_profile_id: string | null
          created_at: string
          folder_id: string | null
          framework_id: string | null
          framework_name: string
          id: string
          status: Database["public"]["Enums"]["page_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          company_profile_id?: string | null
          created_at?: string
          folder_id?: string | null
          framework_id?: string | null
          framework_name: string
          id: string
          status?: Database["public"]["Enums"]["page_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          company_profile_id?: string | null
          created_at?: string
          folder_id?: string | null
          framework_id?: string | null
          framework_name?: string
          id?: string
          status?: Database["public"]["Enums"]["page_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      steps: {
        Row: {
          committed_output: string | null
          created_at: string
          framework_step_id: string | null
          id: string
          last_prompt_used: string | null
          order: number
          page_id: string
          refine_prompt_template: string
          status: Database["public"]["Enums"]["step_status"]
          system_prompt_template: string
          title: string
          updated_at: string
          user_context: string | null
        }
        Insert: {
          committed_output?: string | null
          created_at?: string
          framework_step_id?: string | null
          id: string
          last_prompt_used?: string | null
          order: number
          page_id: string
          refine_prompt_template: string
          status?: Database["public"]["Enums"]["step_status"]
          system_prompt_template: string
          title: string
          updated_at: string
          user_context?: string | null
        }
        Update: {
          committed_output?: string | null
          created_at?: string
          framework_step_id?: string | null
          id?: string
          last_prompt_used?: string | null
          order?: number
          page_id?: string
          refine_prompt_template?: string
          status?: Database["public"]["Enums"]["step_status"]
          system_prompt_template?: string
          title?: string
          updated_at?: string
          user_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "steps_framework_step_id_fkey"
            columns: ["framework_step_id"]
            isOneToOne: false
            referencedRelation: "framework_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "steps_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      extraction_status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
      file_scope: "PAGE" | "STEP"
      file_type: "PDF" | "DOCX" | "XLSX" | "CSV" | "PPTX" | "IMAGE" | "TXT"
      generation_source: "AI_GENERATED" | "MANUAL_EDIT" | "AI_REFINED"
      page_status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED"
      step_status: "PENDING" | "IN_PROGRESS" | "COMMITTED" | "SKIPPED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      extraction_status: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      file_scope: ["PAGE", "STEP"],
      file_type: ["PDF", "DOCX", "XLSX", "CSV", "PPTX", "IMAGE", "TXT"],
      generation_source: ["AI_GENERATED", "MANUAL_EDIT", "AI_REFINED"],
      page_status: ["DRAFT", "IN_PROGRESS", "COMPLETED", "ARCHIVED"],
      step_status: ["PENDING", "IN_PROGRESS", "COMMITTED", "SKIPPED"],
    },
  },
} as const
