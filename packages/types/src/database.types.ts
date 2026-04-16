export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      orders: {
        Row: {
          charged: number | null
          completed_at: string | null
          created_at: string | null
          deposit: number | null
          donation: number | null
          environment: Database["public"]["Enums"]["environment_type"] | null
          fees: number | null
          id: string
          is_waitlist: boolean
          payment_email: string | null
          payment_id: string | null
          payment_method:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          people: Json | null
          status: Database["public"]["Enums"]["order_status_type"] | null
          tenant_id: string | null
          total: number | null
        }
        Insert: {
          charged?: number | null
          completed_at?: string | null
          created_at?: string | null
          deposit?: number | null
          donation?: number | null
          environment?: Database["public"]["Enums"]["environment_type"] | null
          fees?: number | null
          id?: string
          is_waitlist?: boolean
          payment_email?: string | null
          payment_id?: string | null
          payment_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          people?: Json | null
          status?: Database["public"]["Enums"]["order_status_type"] | null
          tenant_id?: string | null
          total?: number | null
        }
        Update: {
          charged?: number | null
          completed_at?: string | null
          created_at?: string | null
          deposit?: number | null
          donation?: number | null
          environment?: Database["public"]["Enums"]["environment_type"] | null
          fees?: number | null
          id?: string
          is_waitlist?: boolean
          payment_email?: string | null
          payment_id?: string | null
          payment_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          people?: Json | null
          status?: Database["public"]["Enums"]["order_status_type"] | null
          tenant_id?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_secrets: {
        Row: {
          docuseal_key: string | null
          email_from: string | null
          email_reply_to: string | null
          paypal_secret: string | null
          paypal_webhook_id: string | null
          stripe_secret_key: string | null
          stripe_webhook_secret: string | null
          tenant_id: string
        }
        Insert: {
          docuseal_key?: string | null
          email_from?: string | null
          email_reply_to?: string | null
          paypal_secret?: string | null
          paypal_webhook_id?: string | null
          stripe_secret_key?: string | null
          stripe_webhook_secret?: string | null
          tenant_id: string
        }
        Update: {
          docuseal_key?: string | null
          email_from?: string | null
          email_reply_to?: string | null
          paypal_secret?: string | null
          paypal_webhook_id?: string | null
          stripe_secret_key?: string | null
          stripe_webhook_secret?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_secrets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          admissions_config: Json | null
          created_at: string | null
          domain: string
          event_config: Json | null
          id: string
          is_live: boolean
          owner_id: string | null
          payment_processor:
            | Database["public"]["Enums"]["payment_processor_type"]
            | null
          payments_config: Json | null
          registration_config: Json | null
          slug: string
          spreadsheet_config: Json | null
          theme_config: Json | null
          updated_at: string | null
        }
        Insert: {
          admissions_config?: Json | null
          created_at?: string | null
          domain: string
          event_config?: Json | null
          id?: string
          is_live?: boolean
          owner_id?: string | null
          payment_processor?:
            | Database["public"]["Enums"]["payment_processor_type"]
            | null
          payments_config?: Json | null
          registration_config?: Json | null
          slug: string
          spreadsheet_config?: Json | null
          theme_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          admissions_config?: Json | null
          created_at?: string | null
          domain?: string
          event_config?: Json | null
          id?: string
          is_live?: boolean
          owner_id?: string | null
          payment_processor?:
            | Database["public"]["Enums"]["payment_processor_type"]
            | null
          payments_config?: Json | null
          registration_config?: Json | null
          slug?: string
          spreadsheet_config?: Json | null
          theme_config?: Json | null
          updated_at?: string | null
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
      environment_type: "dev" | "stg" | "prd"
      order_status_type: "pending" | "final"
      payment_method_type: "stripe" | "paypal" | "check"
      payment_processor_type: "stripe" | "paypal"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      environment_type: ["dev", "stg", "prd"],
      order_status_type: ["pending", "final"],
      payment_method_type: ["stripe", "paypal", "check"],
      payment_processor_type: ["stripe", "paypal"],
    },
  },
} as const

