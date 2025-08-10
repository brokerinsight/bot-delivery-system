export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          item: string;
          file_id: string;
          price: number;
          name: string;
          description: string | null;
          image: string | null;
          category: string;
          embed: string | null;
          is_new: boolean;
          is_archived: boolean;
          original_file_name: string | null;
          created_at: string;
        };
        Insert: {
          item: string;
          file_id: string;
          price: number;
          name: string;
          description?: string | null;
          image?: string | null;
          category: string;
          embed?: string | null;
          is_new?: boolean;
          is_archived?: boolean;
          original_file_name?: string | null;
          created_at?: string;
        };
        Update: {
          item?: string;
          file_id?: string;
          price?: number;
          name?: string;
          description?: string | null;
          image?: string | null;
          category?: string;
          embed?: string | null;
          is_new?: boolean;
          is_archived?: boolean;
          original_file_name?: string | null;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          name: string;
        };
        Insert: {
          name: string;
        };
        Update: {
          name?: string;
        };
      };
      orders: {
        Row: {
          id: number;
          item: string;
          ref_code: string;
          amount: number;
          timestamp: string;
          status: string;
          downloaded: boolean;
          payer_phone_number: string | null;
          payment_method: string;
          email: string | null;
          currency_paid: string | null;
          nowpayments_payment_id: string | null;
          amount_paid_crypto: number | null;
          mpesa_receipt_number: string | null;
          notes: string | null;
        };
        Insert: {
          item: string;
          ref_code: string;
          amount: number;
          timestamp: string;
          status: string;
          downloaded?: boolean;
          payer_phone_number?: string | null;
          payment_method: string;
          email?: string | null;
          currency_paid?: string | null;
          nowpayments_payment_id?: string | null;
          amount_paid_crypto?: number | null;
          mpesa_receipt_number?: string | null;
          notes?: string | null;
        };
        Update: {
          item?: string;
          ref_code?: string;
          amount?: number;
          timestamp?: string;
          status?: string;
          downloaded?: boolean;
          payer_phone_number?: string | null;
          payment_method?: string;
          email?: string | null;
          currency_paid?: string | null;
          nowpayments_payment_id?: string | null;
          amount_paid_crypto?: number | null;
          mpesa_receipt_number?: string | null;
          notes?: string | null;
        };
      };
      admins: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          email: string;
          password_hash: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          password_hash?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      settings: {
        Row: {
          key: string;
          value: string;
        };
        Insert: {
          key: string;
          value: string;
        };
        Update: {
          key?: string;
          value?: string;
        };
      };
      static_pages: {
        Row: {
          title: string;
          slug: string;
          content: string;
        };
        Insert: {
          title: string;
          slug: string;
          content: string;
        };
        Update: {
          title?: string;
          slug?: string;
          content?: string;
        };
      };
      emails: {
        Row: {
          id: number;
          email: string;
          subject: string;
          body: string;
        };
        Insert: {
          email: string;
          subject: string;
          body: string;
        };
        Update: {
          email?: string;
          subject?: string;
          body?: string;
        };
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
  };
}