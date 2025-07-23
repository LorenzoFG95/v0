"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

type AuthContextType = {
  user: User | null
  profile: any | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  // Timeout di sicurezza per evitare il caricamento infinito
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      setLoading(false)
    }, 10000) // 10 secondi di timeout

    return () => clearTimeout(safetyTimeout)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function getUser() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (sessionError) {
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }
        
        const user = sessionData?.session?.user || null
        setUser(user)
        
        if (user) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('utente')
              .select('*')
              .eq('id', user.id)
              .single()

            if (!isMounted) return

            if (profileError) {
              setProfile(null)
            } else {
              setProfile(profile)
            }
          } catch (profileError) {
            if (isMounted) setProfile(null)
          } finally {
            if (isMounted) setLoading(false)
          }
        } else {
          setProfile(null)
          setLoading(false)
        }
      } catch (error) {
        if (isMounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    getUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          try {
            const { data: profile, error } = await supabase
              .from('utente')
              .select('*')
              .eq('id', currentUser.id)
              .single()

            if (!isMounted) return

            if (error) {
              setProfile(null)
            } else {
              setProfile(profile)
            }
          } catch (error) {
            if (isMounted) setProfile(null)
          }
        } else {
          setProfile(null)
        }

        if (isMounted) {
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      
      // Aggiungiamo un timeout per evitare che si blocchi indefinitamente
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout durante logout')), 5000)
      )
      
      const logoutPromise = supabase.auth.signOut()
      
      const { error } = await Promise.race([logoutPromise, timeoutPromise]) as any
      
      
      // Pulizia completa indipendentemente dal risultato
      setUser(null)
      setProfile(null)
      
      // Pulizia manuale del localStorage per rimuovere completamente la sessione
      if (typeof window !== 'undefined') {
        // Rimuovi tutte le chiavi relative a Supabase
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('sb-')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        
        // Alternativa più drastica: pulisci tutto il localStorage
        // localStorage.clear()
      }
      
      router.push('/auth/login')
      
      // Forza un refresh completo della pagina per assicurarsi che tutto sia pulito
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
      }, 100)
      
      
    } catch (error) {
      console.error('❌ Eccezione durante logout:', error)
      // Anche in caso di errore, proviamo a pulire tutto
      setUser(null)
      setProfile(null)
      
      if (typeof window !== 'undefined') {
        // Pulizia localStorage anche in caso di errore
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('sb-')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        
        window.location.href = '/auth/login'
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}