export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          role: 'client' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          role?: 'client' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          role?: 'client' | 'admin'
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          package: 'starter' | 'professional' | 'enterprise'
          status: string
          amount_cents: number
          domain_name: string | null
          payment_method: string | null
          payment_reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          package: 'starter' | 'professional' | 'enterprise'
          status?: string
          amount_cents: number
          domain_name?: string | null
          payment_method?: string | null
          payment_reference?: string | null
        }
        Update: {
          status?: string
          domain_name?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          updated_at?: string
        }
      }
      client_sites: {
        Row: {
          id: string
          order_id: string
          user_id: string
          business_name: string
          industry: string
          tagline: string | null
          description: string | null
          goals: string | null
          contact_email: string
          contact_phone: string | null
          contact_address: string | null
          primary_color: string
          secondary_color: string
          font_preference: string
          about_text: string | null
          services_text: string | null
          custom_content: Json | null
          social_links: Json | null
          build_status: string
          build_log: string | null
          github_repo: string | null
          github_url: string | null
          netlify_site_id: string | null
          netlify_url: string | null
          live_url: string | null
          domain_status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          user_id: string
          business_name: string
          industry: string
          tagline?: string | null
          description?: string | null
          goals?: string | null
          contact_email: string
          contact_phone?: string | null
          contact_address?: string | null
          primary_color?: string
          secondary_color?: string
          font_preference?: string
          about_text?: string | null
          services_text?: string | null
          custom_content?: Json | null
          social_links?: Json | null
          build_status?: string
        }
        Update: {
          business_name?: string
          build_status?: string
          build_log?: string | null
          github_repo?: string | null
          github_url?: string | null
          netlify_site_id?: string | null
          netlify_url?: string | null
          live_url?: string | null
          domain_status?: string | null
          updated_at?: string
        }
      }
      file_uploads: {
        Row: {
          id: string
          site_id: string
          user_id: string
          file_type: string
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
          created_at: string
        }
        Insert: {
          id?: string
          site_id: string
          user_id: string
          file_type: string
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
        }
        Update: Record<string, never>
      }
      build_events: {
        Row: {
          id: string
          site_id: string
          event_type: string
          status: string
          message: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          site_id: string
          event_type: string
          status: string
          message: string
          metadata?: Json | null
        }
        Update: Record<string, never>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
