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

  useEffect(() => {
    let isMounted = true

    async function getUser() {
      try {
        // Ottieni l'utente corrente
        const { data, error } = await supabase.auth.getUser()
        
        if (!isMounted) return
        
        // Gestisci specificamente l'errore AuthSessionMissingError
        if (error) {
          // Se l'errore è AuthSessionMissingError, è normale quando non c'è un utente loggato
          setUser(null)
          setProfile(null)
          return // Continua con setLoading(false) nel blocco finally
        }
        
        const user = data?.user
        setUser(user)

        // Se c'è un utente, ottieni il suo profilo
        if (user) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', user.id)
              .single()

            if (!isMounted) return

            if (profileError) {
              // Non bloccare l'autenticazione se il profilo non esiste
              setProfile(null)
            } else {
              setProfile(profile)
            }
          } catch (profileError) {
            setProfile(null)
          }
        } else {
          setProfile(null)
        }
      } catch (error) {
        if (isMounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (isMounted) {
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
              .from('user_profiles')
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