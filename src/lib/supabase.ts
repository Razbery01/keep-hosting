import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wozonryvuvbxxfdykzne.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indvem9ucnl2dXZieHhmZHlrem5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Nzg3MTksImV4cCI6MjA5MDU1NDcxOX0.2wQZpZHBafBtbK2cp1Ub4h4RbAAw_-3nD1QOjAb97rQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
