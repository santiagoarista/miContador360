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
    PostgrestVersion: "14.1"
  }
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
      asset_registrations: {
        Row: {
          acquisition_date: string
          asset_type: string
          created_at: string | null
          id: string
          purchase_value: number
          quantity: number
          total: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          acquisition_date: string
          asset_type: string
          created_at?: string | null
          id?: string
          purchase_value: number
          quantity?: number
          total: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          acquisition_date?: string
          asset_type?: string
          created_at?: string | null
          id?: string
          purchase_value?: number
          quantity?: number
          total?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          bancos: number | null
          casa: number | null
          clientes: number | null
          created_at: string | null
          efectivo: number | null
          equipo_comunicacion: number | null
          herramientas: number | null
          id: string
          inventarios: number | null
          inversiones: number | null
          maquinaria_mobiliario: number | null
          muebles_enseres: number | null
          terreno: number | null
          updated_at: string | null
          user_id: string
          vehiculo: number | null
        }
        Insert: {
          bancos?: number | null
          casa?: number | null
          clientes?: number | null
          created_at?: string | null
          efectivo?: number | null
          equipo_comunicacion?: number | null
          herramientas?: number | null
          id?: string
          inventarios?: number | null
          inversiones?: number | null
          maquinaria_mobiliario?: number | null
          muebles_enseres?: number | null
          terreno?: number | null
          updated_at?: string | null
          user_id: string
          vehiculo?: number | null
        }
        Update: {
          bancos?: number | null
          casa?: number | null
          clientes?: number | null
          created_at?: string | null
          efectivo?: number | null
          equipo_comunicacion?: number | null
          herramientas?: number | null
          id?: string
          inventarios?: number | null
          inversiones?: number | null
          maquinaria_mobiliario?: number | null
          muebles_enseres?: number | null
          terreno?: number | null
          updated_at?: string | null
          user_id?: string
          vehiculo?: number | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          concept: string
          created_at: string | null
          detail: string | null
          expense_date: string
          id: string
          payee_id: string | null
          payee_name: string
          payment_method: string | null
          total: number
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          concept: string
          created_at?: string | null
          detail?: string | null
          expense_date: string
          id?: string
          payee_id?: string | null
          payee_name: string
          payment_method?: string | null
          total: number
          updated_at?: string | null
          user_id: string
          value: number
        }
        Update: {
          concept?: string
          created_at?: string | null
          detail?: string | null
          expense_date?: string
          id?: string
          payee_id?: string | null
          payee_name?: string
          payment_method?: string | null
          total?: number
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "third_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      income: {
        Row: {
          client_id: string | null
          client_name: string | null
          concept: string
          created_at: string | null
          detail: string | null
          discount: number | null
          id: string
          income_date: string
          inventory_id: string | null
          iva: number | null
          payment_method: string
          quantity: number | null
          subtotal: number
          total: number
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          concept: string
          created_at?: string | null
          detail?: string | null
          discount?: number | null
          id?: string
          income_date: string
          inventory_id?: string | null
          iva?: number | null
          payment_method: string
          quantity?: number | null
          subtotal: number
          total: number
          updated_at?: string | null
          user_id: string
          value: number
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          concept?: string
          created_at?: string | null
          detail?: string | null
          discount?: number | null
          id?: string
          income_date?: string
          inventory_id?: string | null
          iva?: number | null
          payment_method?: string
          quantity?: number | null
          subtotal?: number
          total?: number
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "income_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "third_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          concept: string
          created_at: string | null
          id: string
          payment_method: string | null
          profit_margin: number | null
          purchase_value: number
          quantity: number
          sale_price: number | null
          stock: number | null
          supplier: string | null
          supplier_id: string | null
          total: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          concept: string
          created_at?: string | null
          id?: string
          payment_method?: string | null
          profit_margin?: number | null
          purchase_value: number
          quantity: number
          sale_price?: number | null
          stock?: number | null
          supplier?: string | null
          supplier_id?: string | null
          total: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          concept?: string
          created_at?: string | null
          id?: string
          payment_method?: string | null
          profit_margin?: number | null
          purchase_value?: number
          quantity?: number
          sale_price?: number | null
          stock?: number | null
          supplier?: string | null
          supplier_id?: string | null
          total?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "third_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      liabilities: {
        Row: {
          created_at: string | null
          cuentas_por_pagar: number | null
          id: string
          obligaciones_financieras: number | null
          proveedores: number | null
          salarios_por_pagar: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cuentas_por_pagar?: number | null
          id?: string
          obligaciones_financieras?: number | null
          proveedores?: number | null
          salarios_por_pagar?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cuentas_por_pagar?: number | null
          id?: string
          obligaciones_financieras?: number | null
          proveedores?: number | null
          salarios_por_pagar?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      liability_payments_history: {
        Row: {
          amount: number
          concept: string
          created_at: string | null
          detail: string | null
          expense_id: string | null
          id: string
          liability_type: string
          payee_name: string
          payment_date: string
          payment_method: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          concept: string
          created_at?: string | null
          detail?: string | null
          expense_id?: string | null
          id?: string
          liability_type: string
          payee_name: string
          payment_date: string
          payment_method: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          concept?: string
          created_at?: string | null
          detail?: string | null
          expense_id?: string | null
          id?: string
          liability_type?: string
          payee_name?: string
          payment_date?: string
          payment_method?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          taxpayer_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          taxpayer_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          taxpayer_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      third_parties: {
        Row: {
          address: string | null
          classification: string
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          identification_number: string
          identification_type: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          classification: string
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          identification_number: string
          identification_type: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          classification?: string
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          identification_number?: string
          identification_type?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_data: {
        Row: {
          correo_electronico: string | null
          created_at: string | null
          direccion_domicilio: string | null
          fuente_ingresos: string | null
          id: string
          numero_celular: string | null
          responsable_iva: boolean | null
          tiene_mas_de_un_establecimiento: boolean | null
          tiene_rut: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          correo_electronico?: string | null
          created_at?: string | null
          direccion_domicilio?: string | null
          fuente_ingresos?: string | null
          id?: string
          numero_celular?: string | null
          responsable_iva?: boolean | null
          tiene_mas_de_un_establecimiento?: boolean | null
          tiene_rut?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          correo_electronico?: string | null
          created_at?: string | null
          direccion_domicilio?: string | null
          fuente_ingresos?: string | null
          id?: string
          numero_celular?: string | null
          responsable_iva?: boolean | null
          tiene_mas_de_un_establecimiento?: boolean | null
          tiene_rut?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_users: {
        Args: {
          page_limit?: number
          page_offset?: number
          search_email?: string
        }
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          id: string
          last_sign_in_at: string
          total_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
