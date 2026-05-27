export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
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
          workshop_id: string;
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
          workshop_id?: string;
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
          workshop_id?: string;
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
          {
            foreignKeyName: "appointments_workshop_fk";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      cases: {
        Row: {
          archived_at: string | null;
          archived_reason: string | null;
          created_at: string;
          customer_id: string;
          description: string | null;
          finitura_done_at: string | null;
          finitura_done_by: string | null;
          id: string;
          insurance_company: string | null;
          owner_id: string | null;
          preparazione_done_at: string | null;
          preparazione_done_by: string | null;
          price: number | null;
          status: Database["public"]["Enums"]["case_status"];
          updated_at: string;
          vehicle_id: string | null;
          verniciatura_done_at: string | null;
          verniciatura_done_by: string | null;
          workshop_id: string;
        };
        Insert: {
          archived_at?: string | null;
          archived_reason?: string | null;
          created_at?: string;
          customer_id: string;
          description?: string | null;
          finitura_done_at?: string | null;
          finitura_done_by?: string | null;
          id?: string;
          insurance_company?: string | null;
          owner_id?: string | null;
          preparazione_done_at?: string | null;
          preparazione_done_by?: string | null;
          price?: number | null;
          status?: Database["public"]["Enums"]["case_status"];
          updated_at?: string;
          vehicle_id?: string | null;
          verniciatura_done_at?: string | null;
          verniciatura_done_by?: string | null;
          workshop_id?: string;
        };
        Update: {
          archived_at?: string | null;
          archived_reason?: string | null;
          created_at?: string;
          customer_id?: string;
          description?: string | null;
          finitura_done_at?: string | null;
          finitura_done_by?: string | null;
          id?: string;
          insurance_company?: string | null;
          owner_id?: string | null;
          preparazione_done_at?: string | null;
          preparazione_done_by?: string | null;
          price?: number | null;
          status?: Database["public"]["Enums"]["case_status"];
          updated_at?: string;
          vehicle_id?: string | null;
          verniciatura_done_at?: string | null;
          verniciatura_done_by?: string | null;
          workshop_id?: string;
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
          {
            foreignKeyName: "cases_workshop_fk";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          ban_cod: string | null;
          cativa_id: string | null;
          cli_ass_o_cp: string | null;
          cli_ban_cc: string | null;
          cli_ban_cin: string | null;
          cli_ban_iban: string | null;
          cli_cap: string | null;
          cli_cartaid: string | null;
          cli_cartaid_data_scad: string | null;
          cli_cartaid_ril_da: string | null;
          cli_cartaid_ril_data: string | null;
          cli_citta: string | null;
          cli_cnt_id: string | null;
          cli_cod: string | null;
          cli_cod_fisc: string | null;
          cli_codice: string | null;
          cli_codice_conto: string | null;
          cli_codice_eori: string | null;
          cli_codice_indice_pubblica_amministrazione: string | null;
          cli_consenso_trattamento_dati: boolean | null;
          cli_data_creazione: string | null;
          cli_destinatario_codice: string | null;
          cli_email: string | null;
          cli_fax: string | null;
          cli_id: string | null;
          cli_id_iso_nazione: string | null;
          cli_id_iso_nazione_sede: string | null;
          cli_indi: string | null;
          cli_indi_lat: number | null;
          cli_indi_lng: number | null;
          cli_indirizzo_numero: string | null;
          cli_iva_esigibilita_differita: boolean | null;
          cli_nat_com: string | null;
          cli_nat_data: string | null;
          cli_nat_prov: string | null;
          cli_nazione: string | null;
          cli_nome: string | null;
          cli_nome_f: string | null;
          cli_nome_l: string | null;
          cli_note: string | null;
          cli_part_iva: string | null;
          cli_pat_by: string | null;
          cli_pat_cat: string | null;
          cli_pat_data_ril: string | null;
          cli_pat_data_scad: string | null;
          cli_pat_estera: boolean | null;
          cli_pat_num: string | null;
          cli_pat_ril_luogo: string | null;
          cli_pec: string | null;
          cli_pers_fisi: boolean | null;
          cli_prov: string | null;
          cli_rec_iva: string | null;
          cli_riferimento_amministrazione: string | null;
          cli_sesso: string | null;
          cli_split_payment: boolean | null;
          cli_tel: string | null;
          cli_tel_cell: string | null;
          cli_tel2: string | null;
          cli_titolo: string | null;
          cli_ultima_modifica: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          lead_id: string | null;
          owner_id: string | null;
          pag_cod: string | null;
          phone: string | null;
          prof_cod: string | null;
          prs_cod_contatto: string | null;
          prs_cod_segnalato_da: string | null;
          rf_id: string | null;
          updated_at: string;
          workshop_id: string;
        };
        Insert: {
          ban_cod?: string | null;
          cativa_id?: string | null;
          cli_ass_o_cp?: string | null;
          cli_ban_cc?: string | null;
          cli_ban_cin?: string | null;
          cli_ban_iban?: string | null;
          cli_cap?: string | null;
          cli_cartaid?: string | null;
          cli_cartaid_data_scad?: string | null;
          cli_cartaid_ril_da?: string | null;
          cli_cartaid_ril_data?: string | null;
          cli_citta?: string | null;
          cli_cnt_id?: string | null;
          cli_cod?: string | null;
          cli_cod_fisc?: string | null;
          cli_codice?: string | null;
          cli_codice_conto?: string | null;
          cli_codice_eori?: string | null;
          cli_codice_indice_pubblica_amministrazione?: string | null;
          cli_consenso_trattamento_dati?: boolean | null;
          cli_data_creazione?: string | null;
          cli_destinatario_codice?: string | null;
          cli_email?: string | null;
          cli_fax?: string | null;
          cli_id?: string | null;
          cli_id_iso_nazione?: string | null;
          cli_id_iso_nazione_sede?: string | null;
          cli_indi?: string | null;
          cli_indi_lat?: number | null;
          cli_indi_lng?: number | null;
          cli_indirizzo_numero?: string | null;
          cli_iva_esigibilita_differita?: boolean | null;
          cli_nat_com?: string | null;
          cli_nat_data?: string | null;
          cli_nat_prov?: string | null;
          cli_nazione?: string | null;
          cli_nome?: string | null;
          cli_nome_f?: string | null;
          cli_nome_l?: string | null;
          cli_note?: string | null;
          cli_part_iva?: string | null;
          cli_pat_by?: string | null;
          cli_pat_cat?: string | null;
          cli_pat_data_ril?: string | null;
          cli_pat_data_scad?: string | null;
          cli_pat_estera?: boolean | null;
          cli_pat_num?: string | null;
          cli_pat_ril_luogo?: string | null;
          cli_pec?: string | null;
          cli_pers_fisi?: boolean | null;
          cli_prov?: string | null;
          cli_rec_iva?: string | null;
          cli_riferimento_amministrazione?: string | null;
          cli_sesso?: string | null;
          cli_split_payment?: boolean | null;
          cli_tel?: string | null;
          cli_tel_cell?: string | null;
          cli_tel2?: string | null;
          cli_titolo?: string | null;
          cli_ultima_modifica?: string | null;
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          lead_id?: string | null;
          owner_id?: string | null;
          pag_cod?: string | null;
          phone?: string | null;
          prof_cod?: string | null;
          prs_cod_contatto?: string | null;
          prs_cod_segnalato_da?: string | null;
          rf_id?: string | null;
          updated_at?: string;
          workshop_id?: string;
        };
        Update: {
          ban_cod?: string | null;
          cativa_id?: string | null;
          cli_ass_o_cp?: string | null;
          cli_ban_cc?: string | null;
          cli_ban_cin?: string | null;
          cli_ban_iban?: string | null;
          cli_cap?: string | null;
          cli_cartaid?: string | null;
          cli_cartaid_data_scad?: string | null;
          cli_cartaid_ril_da?: string | null;
          cli_cartaid_ril_data?: string | null;
          cli_citta?: string | null;
          cli_cnt_id?: string | null;
          cli_cod?: string | null;
          cli_cod_fisc?: string | null;
          cli_codice?: string | null;
          cli_codice_conto?: string | null;
          cli_codice_eori?: string | null;
          cli_codice_indice_pubblica_amministrazione?: string | null;
          cli_consenso_trattamento_dati?: boolean | null;
          cli_data_creazione?: string | null;
          cli_destinatario_codice?: string | null;
          cli_email?: string | null;
          cli_fax?: string | null;
          cli_id?: string | null;
          cli_id_iso_nazione?: string | null;
          cli_id_iso_nazione_sede?: string | null;
          cli_indi?: string | null;
          cli_indi_lat?: number | null;
          cli_indi_lng?: number | null;
          cli_indirizzo_numero?: string | null;
          cli_iva_esigibilita_differita?: boolean | null;
          cli_nat_com?: string | null;
          cli_nat_data?: string | null;
          cli_nat_prov?: string | null;
          cli_nazione?: string | null;
          cli_nome?: string | null;
          cli_nome_f?: string | null;
          cli_nome_l?: string | null;
          cli_note?: string | null;
          cli_part_iva?: string | null;
          cli_pat_by?: string | null;
          cli_pat_cat?: string | null;
          cli_pat_data_ril?: string | null;
          cli_pat_data_scad?: string | null;
          cli_pat_estera?: boolean | null;
          cli_pat_num?: string | null;
          cli_pat_ril_luogo?: string | null;
          cli_pec?: string | null;
          cli_pers_fisi?: boolean | null;
          cli_prov?: string | null;
          cli_rec_iva?: string | null;
          cli_riferimento_amministrazione?: string | null;
          cli_sesso?: string | null;
          cli_split_payment?: boolean | null;
          cli_tel?: string | null;
          cli_tel_cell?: string | null;
          cli_tel2?: string | null;
          cli_titolo?: string | null;
          cli_ultima_modifica?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          lead_id?: string | null;
          owner_id?: string | null;
          pag_cod?: string | null;
          phone?: string | null;
          prof_cod?: string | null;
          prs_cod_contatto?: string | null;
          prs_cod_segnalato_da?: string | null;
          rf_id?: string | null;
          updated_at?: string;
          workshop_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_workshop_fk";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
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
          phase: string | null;
          uploaded_by: string | null;
          workshop_id: string;
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
          phase?: string | null;
          uploaded_by?: string | null;
          workshop_id?: string;
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
          phase?: string | null;
          uploaded_by?: string | null;
          workshop_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_workshop_fk";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
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
          workshop_id: string;
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
          workshop_id?: string;
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
          workshop_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_items_workshop_fk";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
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
          workshop_id: string;
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
          workshop_id?: string;
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
          workshop_id?: string;
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
          {
            foreignKeyName: "invoices_workshop_fk";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          ad_id: string | null;
          ad_name: string | null;
          adset_id: string | null;
          adset_name: string | null;
          campaign_id: string | null;
          campaign_name: string | null;
          created_at: string;
          email: string | null;
          fb_form_id: string | null;
          fb_lead_id: string | null;
          form_name: string | null;
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
          workshop_id: string;
        };
        Insert: {
          ad_id?: string | null;
          ad_name?: string | null;
          adset_id?: string | null;
          adset_name?: string | null;
          campaign_id?: string | null;
          campaign_name?: string | null;
          created_at?: string;
          email?: string | null;
          fb_form_id?: string | null;
          fb_lead_id?: string | null;
          form_name?: string | null;
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
          workshop_id?: string;
        };
        Update: {
          ad_id?: string | null;
          ad_name?: string | null;
          adset_id?: string | null;
          adset_name?: string | null;
          campaign_id?: string | null;
          campaign_name?: string | null;
          created_at?: string;
          email?: string | null;
          fb_form_id?: string | null;
          fb_lead_id?: string | null;
          form_name?: string | null;
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
          workshop_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_workshop_fk";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
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
          workshop_id: string;
        };
        Insert: {
          author_id?: string | null;
          body: string;
          case_id?: string | null;
          created_at?: string;
          id?: string;
          lead_id?: string | null;
          owner_id?: string | null;
          workshop_id?: string;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          case_id?: string | null;
          created_at?: string;
          id?: string;
          lead_id?: string | null;
          owner_id?: string | null;
          workshop_id?: string;
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
          {
            foreignKeyName: "notes_workshop_fk";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
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
          workshop_id: string;
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
          workshop_id?: string;
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
          workshop_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_workshop_fk";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
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
          workshop_id?: string;
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
            foreignKeyName: "profiles_workshop_fk";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
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
          workshop_id: string;
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
          workshop_id?: string;
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
          workshop_id?: string;
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
          {
            foreignKeyName: "vehicles_workshop_fk";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      workshop_audit_log: {
        Row: {
          action: string;
          actor_full_name: string | null;
          actor_id: string | null;
          actor_role: Database["public"]["Enums"]["user_role"] | null;
          changes: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_label: string | null;
          entity_type: string;
          id: string;
          workshop_id: string;
        };
        Insert: {
          action: string;
          actor_full_name?: string | null;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["user_role"] | null;
          changes?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_label?: string | null;
          entity_type: string;
          id?: string;
          workshop_id?: string;
        };
        Update: {
          action?: string;
          actor_full_name?: string | null;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["user_role"] | null;
          changes?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_label?: string | null;
          entity_type?: string;
          id?: string;
          workshop_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workshop_audit_log_workshop_id_fkey";
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_get_workshop_members: {
        Args: { p_workshop_id: string };
        Returns: {
          banned_until: string;
          created_at: string;
          email: string;
          email_confirmed: boolean;
          full_name: string;
          id: string;
          last_sign_in_at: string;
          role: Database["public"]["Enums"]["user_role"];
        }[];
      };
      admin_get_workshops: {
        Args: never;
        Returns: {
          address: string;
          cases_count: number;
          cases_open_count: number;
          city: string;
          documents_count: number;
          facebook_connected: boolean;
          id: string;
          invoices_count: number;
          last_activity_at: string;
          leads_count: number;
          members_count: number;
          name: string;
          owner_email: string;
          owner_full_name: string;
          owner_phone: string;
          postal_code: string;
          province: string;
          registered_at: string;
          revenue_total: number;
          staff_count: number;
          tax_code: string;
          vat_number: string;
        }[];
      };
      advance_case_phase: {
        Args: { p_case_id: string };
        Returns: Database["public"]["Tables"]["cases"]["Row"];
      };
      audit_actor_info: { Args: never; Returns: Record<string, unknown> };
      convert_lead_to_vehicle_customer: {
        Args: {
          p_lead_id: string;
          p_make?: string | null;
          p_model?: string | null;
          p_plate?: string | null;
          p_year?: number | null;
          p_color?: string | null;
          p_vin?: string | null;
          p_notes?: string | null;
        };
        Returns: string;
      };
      create_invoice_draft: {
        Args: {
          p_case_id: string;
          p_kind: Database["public"]["Enums"]["invoice_kind"];
        };
        Returns: string;
      };
      current_user_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      current_workshop_id: { Args: never; Returns: string };
      delete_lead_cascade: { Args: { p_lead_id: string }; Returns: undefined };
      get_dashboard_stats: {
        Args: { p_from: string; p_to: string };
        Returns: Json;
      };
      is_admin: { Args: never; Returns: boolean };
      is_owner: { Args: never; Returns: boolean };
      next_phase: {
        Args: { p_status: Database["public"]["Enums"]["case_status"] };
        Returns: Database["public"]["Enums"]["case_status"];
      };
      role_phase: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] };
        Returns: Database["public"]["Enums"]["case_status"];
      };
      save_invoice_items: {
        Args: { p_invoice_id: string; p_items: Json };
        Returns: undefined;
      };
      undo_case_phase: {
        Args: { p_case_id: string };
        Returns: Database["public"]["Tables"]["cases"]["Row"];
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
        | "preparazione"
        | "verniciatura"
        | "finitura"
        | "controllo_titolare"
        | "completata"
        | "consegnata"
        | "liquidato";
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
      user_role: "owner" | "preparatore" | "verniciatore" | "finitore";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      appointment_kind: [
        "accettazione",
        "consegna",
        "sopralluogo",
        "lavorazione",
        "altro",
      ],
      case_status: [
        "preparazione",
        "verniciatura",
        "finitura",
        "controllo_titolare",
        "completata",
        "consegnata",
        "liquidato",
      ],
      invoice_kind: ["preventivo", "fattura"],
      invoice_status: ["bozza", "inviato", "accettato", "rifiutato", "pagato", "scaduto"],
      lead_status: ["nuovo", "contattato", "preventivo", "cliente", "perso"],
      notification_type: [
        "new_lead",
        "appointment_soon",
        "case_status_change",
        "invoice_paid",
        "system",
      ],
      user_role: ["owner", "preparatore", "verniciatore", "finitore"],
    },
  },
} as const;

// ============================================================
// Convenience aliases (custom — non generati da Supabase)
// ============================================================

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
export type DocumentPhase = "preparazione" | "verniciatura" | "finitura";
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
