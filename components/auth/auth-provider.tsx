"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import type { CompleteUserData } from '@/lib/server-auth'

interface AuthContextType {
  user: any | null
  profile: any | null
  azienda: any | null
  favorites: string[]
  isAuthenticated: boolean
  loading: boolean
  signOut: () => Promise<void>
  updateProfile: (profile: any) => void
  updateAzienda: (azienda: any) => void
  addFavorite: (tenderId: string) => void
  removeFavorite: (tenderId: string) => void
  setUserData: (userData: CompleteUserData) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
  initialUserData?: CompleteUserData | null
}

export function AuthProvider({ children, initialUserData }: AuthProviderProps) {
  const [user, setUser] = useState<any | null>(initialUserData?.user || null)
  const [profile, setProfile] = useState<any | null>(initialUserData?.profile || null)
  const [azienda, setAzienda] = useState<any | null>(initialUserData?.azienda || null)
  const [favorites, setFavorites] = useState<string[]>(initialUserData?.favorites || [])
  const [loading, setLoading] = useState(!initialUserData)
  
  const supabase = createClient()
  const router = useRouter()

  // ✅ Usa i dati iniziali se disponibili, altrimenti carica solo se necessario
  useEffect(() => {
    if (initialUserData) {
      // Dati già disponibili dal server, nessun loading
      setUser(initialUserData.user)
      setProfile(initialUserData.profile)
      setAzienda(initialUserData.azienda)
      setFavorites(initialUserData.favorites)
      setLoading(false)
      return
    }

    // Solo se non abbiamo dati iniziali, controlla l'autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setAzienda(null)
        setFavorites([])
        setLoading(false)
      } else if (event === 'SIGNED_IN' && session?.user && !user) {
        // Solo se non abbiamo già i dati
        setLoading(true)
        // Qui potresti fare una chiamata per recuperare i dati completi
        // Ma idealmente dovrebbero arrivare dal server
        setUser(session.user)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [initialUserData, user])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setAzienda(null)
      setFavorites([])
      
      // Reindirizza alla home page dopo il logout
      router.push('/')
    } catch (error) {
      console.error('Errore durante il logout:', error)
      // Anche in caso di errore, reindirizza alla home
      router.push('/')
    }
  }

  const updateProfile = (newProfile: any) => {
    setProfile(newProfile)
  }

  const updateAzienda = (newAzienda: any) => {
    setAzienda(newAzienda)
  }

  const addFavorite = (tenderId: string) => {
    setFavorites(prev => [...prev, tenderId])
  }

  const removeFavorite = (tenderId: string) => {
    setFavorites(prev => prev.filter(id => id !== tenderId))
  }

  const setUserData = (userData: CompleteUserData) => {
    setUser(userData.user)
    setProfile(userData.profile)
    setAzienda(userData.azienda)
    setFavorites(userData.favorites)
    setLoading(false)
  }

  const value = {
    user,
    profile,
    azienda,
    favorites,
    isAuthenticated: !!user,
    loading,
    signOut,
    updateProfile,
    updateAzienda,
    addFavorite,
    removeFavorite,
    setUserData
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}