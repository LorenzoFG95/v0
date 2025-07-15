import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Crea una singola istanza del client Supabase
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  if (supabaseInstance) return supabaseInstance
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}
