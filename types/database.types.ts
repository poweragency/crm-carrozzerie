export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string;
          admin_id: string | null;
          created_at: string;
          details: Json | null;
          id: string;
          target_user_id: string | null;
        };
        Insert: {
          action: string;
          admin_id?: string | null;
          created_at?: string;
          details?: Json | null;
          id?: string;
          target_user_id?: string | null;
        };
        Update: {
          action?: string;
          admin_id?: string | null;
          created_at?: string;
          details?: Json | null;
          id?: string;
          target_user_id?: string | null;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          case_id: string | null;
          created_at: string;
          customer_id: string | null;
          ends_at: string | null;
          id: string;
          kind: Database["public"]["Enums"]["appointment_kind"];
          notes: string | null;
          owner_id: string | null;
          reminded_at: string | null;
          starts_at: string;
          title: string;
          updated_at: string;
          vehicle_id: string | null;
        };
        Insert: {
          case_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          ends_at?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["appointment_kind"];
          notes?: string | null;
          owner_id?: string | null;
          reminded_at?: string | null;
          starts_at: string;
          title: string;
          updated_at?: string;
          vehicle_id?: string | null;
        };
        Update: {
          case_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          ends_at?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["appointment_kind"];
          notes?: string | null;
          owner_id?: string | null;
          reminded_at?: string | null;
          starts_at?: string;
          title?: string;
          updated_at?: string;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      cases: {
        Row: {
          created_at: string;
          customer_id: string;
          description: string | null;
          id: string;
          insurance_company: string | null;
          owner_id: string | null;
          price: number | null;
          status: Database["public"]["Enums"]["case_status"];
          updated_at: string;
          vehicle_id: string | null;
        };
        Insert: {
          created_at?: string;
          customer_id: string;
          description?: string | null;
          id?: string;
          insurance_company?: string | null;
          owner_id?: string | null;
          price?: number | null;
          status?: Database["public"]["Enums"]["case_status"];
          updated_at?: string;
          vehicle_id?: string | null;
        };
        Update: {
          created_at?: string;
          customer_id?: string;
          description?: string | null;
          id?: string;
          insurance_company?: string | null;
          owner_id?: string | null;
          price?: number | null;
          status?: Database["public"]["Enums"]["case_status"];
          updated_at?: string;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cases_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          lead_id: string | null;
          owner_id: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          lead_id?: string | null;
          owner_id?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          lead_id?: string | null;
          owner_id?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          case_id: string;
          created_at: string;
          file_name: string;
          file_path: string;
          file_size: number | null;
          id: string;
          mime_type: string | null;
          owner_id: string | null;
          uploaded_by: string | null;
        };
        Insert: {
          case_id: string;
          created_at?: string;
          file_name: string;
          file_path: string;
          file_size?: number | null;
          id?: string;
          mime_type?: string | null;
          owner_id?: string | null;
          uploaded_by?: string | null;
        };
        Update: {
          case_id?: string;
          created_at?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number | null;
          id?: string;
          mime_type?: string | null;
          owner_id?: string | null;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_items: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          invoice_id: string;
          line_total: number;
          owner_id: string | null;
          position: number;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          invoice_id: string;
          line_total?: number;
          owner_id?: string | null;
          position?: number;
          quantity?: number;
          unit_price?: number;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          invoice_id?: string;
          line_total?: number;
          owner_id?: string | null;
          position?: number;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          case_id: string;
          created_at: string;
          customer_id: string;
          due_at: string | null;
          id: string;
          issued_at: string;
          kind: Database["public"]["Enums"]["invoice_kind"];
          notes: string | null;
          number: string;
          owner_id: string | null;
          pdf_path: string | null;
          status: Database["public"]["Enums"]["invoice_status"];
          subtotal: number;
          total: number;
          updated_at: string;
          vat_amount: number;
          vat_rate: number;
        };
        Insert: {
          case_id: string;
          created_at?: string;
          customer_id: string;
          due_at?: string | null;
          id?: string;
          issued_at?: string;
          kind?: Database["public"]["Enums"]["invoice_kind"];
          notes?: string | null;
          number: string;
          owner_id?: string | null;
          pdf_path?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
          vat_amount?: number;
          vat_rate?: number;
        };
        Update: {
          case_id?: string;
          created_at?: string;
          customer_id?: string;
          due_at?: string | null;
          id?: string;
          issued_at?: string;
          kind?: Database["public"]["Enums"]["invoice_kind"];
          notes?: string | null;
          number?: string;
          owner_id?: string | null;
          pdf_path?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
          vat_amount?: number;
          vat_rate?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          created_at: string;
          email: string | null;
          fb_form_id: string | null;
          fb_lead_id: string | null;
          full_name: string;
          id: string;
          message: string | null;
          owner_id: string | null;
          phone: string | null;
          position: number;
          raw_payload: Json | null;
          source: string | null;
          status: Database["public"]["Enums"]["lead_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          fb_form_id?: string | null;
          fb_lead_id?: string | null;
          full_name: string;
          id?: string;
          message?: string | null;
          owner_id?: string | null;
          phone?: string | null;
          position?: number;
          raw_payload?: Json | null;
          source?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          fb_form_id?: string | null;
          fb_lead_id?: string | null;
          full_name?: string;
          id?: string;
          message?: string | null;
          owner_id?: string | null;
          phone?: string | null;
          position?: number;
          raw_payload?: Json | null;
          source?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          author_id: string | null;
          body: string;
          case_id: string | null;
          created_at: string;
          id: string;
          lead_id: string | null;
          owner_id: string | null;
        };
        Insert: {
          author_id?: string | null;
          body: string;
          case_id?: string | null;
          created_at?: string;
          id?: string;
          lead_id?: string | null;
          owner_id?: string | null;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          case_id?: string | null;
          created_at?: string;
          id?: string;
          lead_id?: string | null;
          owner_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notes_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notes_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          link: string | null;
          owner_id: string;
          read: boolean;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          owner_id: string;
          read?: boolean;
          title: string;
          type?: Database["public"]["Enums"]["notification_type"];
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          owner_id?: string;
          read?: boolean;
          title?: string;
          type?: Database["public"]["Enums"]["notification_type"];
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          address: string | null;
          avatar_url: string | null;
          city: string | null;
          country: string | null;
          created_at: string;
          fb_page_access_token: string | null;
          fb_page_id: string | null;
          fb_verify_token: string | null;
          full_name: string | null;
          iban: string | null;
          id: string;
          invoice_prefix: string | null;
          logo_url: string | null;
          phone: string | null;
          postal_code: string | null;
          province: string | null;
          role: Database["public"]["Enums"]["user_role"];
          tax_code: string | null;
          vat_number: string | null;
          workshop_id: string;
          workshop_name: string | null;
        };
        Insert: {
          address?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          fb_page_access_token?: string | null;
          fb_page_id?: string | null;
          fb_verify_token?: string | null;
          full_name?: string | null;
          iban?: string | null;
          id: string;
          invoice_prefix?: string | null;
          logo_url?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          province?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          tax_code?: string | null;
          vat_number?: string | null;
          workshop_id: string;
          workshop_name?: string | null;
        };
        Update: {
          address?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          fb_page_access_token?: string | null;
          fb_page_id?: string | null;
          fb_verify_token?: string | null;
          full_name?: string | null;
          iban?: string | null;
          id?: string;
          invoice_prefix?: string | null;
          logo_url?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          province?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          tax_code?: string | null;
          vat_number?: string | null;
          workshop_id?: string;
          workshop_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_workshop_fk";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      workshops: {
        Row: {
          address: string | null;
          city: string | null;
          country: string | null;
          created_at: string;
          fb_page_access_token: string | null;
          fb_page_id: string | null;
          fb_verify_token: string | null;
          iban: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          phone: string | null;
          postal_code: string | null;
          province: string | null;
          tax_code: string | null;
          updated_at: string;
          vat_number: string | null;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          fb_page_access_token?: string | null;
          fb_page_id?: string | null;
          fb_verify_token?: string | null;
          iban?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          phone?: string | null;
          postal_code?: string | null;
          province?: string | null;
          tax_code?: string | null;
          updated_at?: string;
          vat_number?: string | null;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          fb_page_access_token?: string | null;
          fb_page_id?: string | null;
          fb_verify_token?: string | null;
          iban?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          phone?: string | null;
          postal_code?: string | null;
          province?: string | null;
          tax_code?: string | null;
          updated_at?: string;
          vat_number?: string | null;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          color: string | null;
          created_at: string;
          customer_id: string;
          id: string;
          make: string | null;
          model: string | null;
          notes: string | null;
          owner_id: string | null;
          plate: string | null;
          updated_at: string;
          vin: string | null;
          year: number | null;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          customer_id: string;
          id?: string;
          make?: string | null;
          model?: string | null;
          notes?: string | null;
          owner_id?: string | null;
          plate?: string | null;
          updated_at?: string;
          vin?: string | null;
          year?: number | null;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          customer_id?: string;
          id?: string;
          make?: string | null;
          model?: string | null;
          notes?: string | null;
          owner_id?: string | null;
          plate?: string | null;
          updated_at?: string;
          vin?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_dashboard_stats: {
        Args: { p_days?: number };
        Returns: Json;
      };
      delete_lead_cascade: {
        Args: { p_lead_id: string };
        Returns: undefined;
      };
      create_invoice_draft: {
        Args: {
          p_case_id: string;
          p_kind: Database["public"]["Enums"]["invoice_kind"];
        };
        Returns: string;
      };
      save_invoice_items: {
        Args: {
          p_invoice_id: string;
          p_items: Json;
        };
        Returns: undefined;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_owner: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      current_workshop_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      admin_get_workshop_members: {
        Args: { p_workshop_id: string };
        Returns: Array<{
          id: string;
          full_name: string | null;
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          created_at: string;
          last_sign_in_at: string | null;
          banned_until: string | null;
          email_confirmed: boolean;
        }>;
      };
      admin_get_workshops: {
        Args: Record<string, never>;
        Returns: Array<{
          id: string;
          name: string;
          vat_number: string | null;
          tax_code: string | null;
          address: string | null;
          city: string | null;
          postal_code: string | null;
          province: string | null;
          owner_email: string | null;
          owner_full_name: string | null;
          owner_phone: string | null;
          facebook_connected: boolean;
          members_count: number;
          staff_count: number;
          leads_count: number;
          cases_count: number;
          cases_open_count: number;
          revenue_total: number;
          invoices_count: number;
          documents_count: number;
          registered_at: string;
          last_activity_at: string | null;
        }>;
      };
    };
    Enums: {
      appointment_kind:
        | "accettazione"
        | "consegna"
        | "sopralluogo"
        | "lavorazione"
        | "altro";
      case_status:
        | "preventivo"
        | "attesa_pezzi"
        | "lavorazione"
        | "completata"
        | "consegnata";
      invoice_kind: "preventivo" | "fattura";
      invoice_status:
        | "bozza"
        | "inviato"
        | "accettato"
        | "rifiutato"
        | "pagato"
        | "scaduto";
      lead_status: "nuovo" | "contattato" | "preventivo" | "cliente" | "perso";
      notification_type:
        | "new_lead"
        | "appointment_soon"
        | "case_status_change"
        | "invoice_paid"
        | "system";
      user_role: "owner" | "staff";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];
export type LeadStatus = Database["public"]["Enums"]["lead_status"];

export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];

export type Case = Database["public"]["Tables"]["cases"]["Row"];
export type CaseInsert = Database["public"]["Tables"]["cases"]["Insert"];
export type CaseUpdate = Database["public"]["Tables"]["cases"]["Update"];
export type CaseStatus = Database["public"]["Enums"]["case_status"];

export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type Note = Database["public"]["Tables"]["notes"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Workshop = Database["public"]["Tables"]["workshops"]["Row"];
export type WorkshopInsert = Database["public"]["Tables"]["workshops"]["Insert"];
export type WorkshopUpdate = Database["public"]["Tables"]["workshops"]["Update"];

export type UserRole = Database["public"]["Enums"]["user_role"];

export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type VehicleInsert = Database["public"]["Tables"]["vehicles"]["Insert"];
export type VehicleUpdate = Database["public"]["Tables"]["vehicles"]["Update"];

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];
export type AppointmentUpdate = Database["public"]["Tables"]["appointments"]["Update"];
export type AppointmentKind = Database["public"]["Enums"]["appointment_kind"];

export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
export type InvoiceUpdate = Database["public"]["Tables"]["invoices"]["Update"];
export type InvoiceKind = Database["public"]["Enums"]["invoice_kind"];
export type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];

export type InvoiceItem = Database["public"]["Tables"]["invoice_items"]["Row"];
export type InvoiceItemInsert = Database["public"]["Tables"]["invoice_items"]["Insert"];

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationType = Database["public"]["Enums"]["notification_type"];
export type InvoiceItemUpdate = Database["public"]["Tables"]["invoice_items"]["Update"];
