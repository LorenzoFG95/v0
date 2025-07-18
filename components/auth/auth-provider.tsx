"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { User } from "@supabase/supabase-js"

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
      const { error } = await supabase.auth.signOut()
      if (!error) {
        setUser(null)
        setProfile(null)
      }
    } catch (error) {
      // Gestione silenziosa degli errori
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}