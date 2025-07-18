import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Crea una singola istanza del client Supabase
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

export function createClient(options?: { forceNew?: boolean }) {
  
  if (supabaseInstance) return supabaseInstance
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Variabili d'ambiente Supabase mancanti")
    throw new Error("Missing Supabase environment variables")
  }

  // Configura il client con opzioni esplicite per la persistenza della sessione
  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  })
  
  return supabaseInstance
}
