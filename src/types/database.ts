export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ── Standalone type exports ──────────────────────────────────────
export interface Subscription {
  id: string
  user_id: string
  order_id: string
  plan: string
  status: 'active' | 'grace_period' | 'suspended' | 'cancelled'
  yoco_token_id: string | null
  next_charge_at: string | null
  grace_until: string | null
  suspended_at: string | null
  amount_cents: number
  created_at: string
  updated_at: string
}

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
          popia_consent_at: string | null
          popia_consent_ip: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          role?: 'client' | 'admin'
          popia_consent_at?: string | null
          popia_consent_ip?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          role?: 'client' | 'admin'
          popia_consent_at?: string | null
          popia_consent_ip?: string | null
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          package: 'starter' | 'professional' | 'enterprise'
          status: 'pending' | 'payment_pending' | 'paid' | 'building' | 'preview_ready' | 'deployed' | 'live' | 'suspended' | 'cancelled'
          amount_cents: number
          domain_name: string | null
          payment_method: string | null
          payment_reference: string | null
          yoco_payment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          package: 'starter' | 'professional' | 'enterprise'
          status?: 'pending' | 'payment_pending' | 'paid' | 'building' | 'preview_ready' | 'deployed' | 'live' | 'suspended' | 'cancelled'
          amount_cents: number
          domain_name?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          yoco_payment_id?: string | null
        }
        Update: {
          status?: 'pending' | 'payment_pending' | 'paid' | 'building' | 'preview_ready' | 'deployed' | 'live' | 'suspended' | 'cancelled'
          domain_name?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          yoco_payment_id?: string | null
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
          generated_files: Record<string, string> | null
          generation_cost: { input_tokens: number; output_tokens: number; cost_usd: number } | null
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
          generated_files?: Record<string, string> | null
          generation_cost?: { input_tokens: number; output_tokens: number; cost_usd: number } | null
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
          generated_files?: Record<string, string> | null
          generation_cost?: { input_tokens: number; output_tokens: number; cost_usd: number } | null
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
      subscriptions: {
        Row: {
          id: string
          user_id: string
          order_id: string
          plan: string
          status: 'active' | 'grace_period' | 'suspended' | 'cancelled'
          yoco_token_id: string | null
          next_charge_at: string | null
          grace_until: string | null
          suspended_at: string | null
          amount_cents: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_id: string
          plan?: string
          status?: 'active' | 'grace_period' | 'suspended' | 'cancelled'
          yoco_token_id?: string | null
          next_charge_at?: string | null
          grace_until?: string | null
          suspended_at?: string | null
          amount_cents?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          plan?: string
          status?: 'active' | 'grace_period' | 'suspended' | 'cancelled'
          yoco_token_id?: string | null
          next_charge_at?: string | null
          grace_until?: string | null
          suspended_at?: string | null
          amount_cents?: number
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
