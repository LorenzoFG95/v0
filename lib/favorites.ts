"use client"

import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'

const FAVORITES_KEY = "appalti-preferiti"

// Tipi per la gestione dei preferiti
export interface FavoriteItem {
  id: string
  tender_id: string
  user_id: string
  created_at: string
}

export interface FavoritesState {
  favorites: string[]
  isLoading: boolean
  error: string | null
}

// Funzioni per localStorage (utenti non loggati)
export function getLocalFavorites(): string[] {
  if (typeof window === "undefined") return []
  
  try {
    const favorites = localStorage.getItem(FAVORITES_KEY)
    return favorites ? JSON.parse(favorites) : []
  } catch (error) {
    console.error('Errore nel recupero dei preferiti locali:', error)
    return []
  }
}

export function setLocalFavorites(favorites: string[]): void {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  } catch (error) {
    console.error('Errore nel salvataggio dei preferiti locali:', error)
  }
}

export function clearLocalFavorites(): void {
  if (typeof window === "undefined") return
  
  try {
    localStorage.removeItem(FAVORITES_KEY)
  } catch (error) {
    console.error('Errore nella rimozione dei preferiti locali:', error)
  }
}

// Funzioni per database (utenti loggati)
// Aggiungi questa interfaccia all'inizio del file
interface UserFavoriteRow {
  tender_id: string
}

// Poi modifica la funzione così:
export async function getDatabaseFavorites(userId: string): Promise<string[]> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('user_favorites')
      .select('tender_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Errore nel recupero dei preferiti dal database:', error)
      return []
    }
    
    return (data as UserFavoriteRow[])?.map(item => item.tender_id) || []
  } catch (error) {
    console.error('Errore nella connessione al database:', error)
    return []
  }
}

export async function addDatabaseFavorite(userId: string, tenderId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: userId,
        tender_id: tenderId
      })
    
    if (error) {
      console.error('Errore nell\'aggiunta del preferito al database:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Errore nella connessione al database:', error)
    return false
  }
}

export async function removeDatabaseFavorite(userId: string, tenderId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('tender_id', tenderId)
    
    if (error) {
      console.error('Errore nella rimozione del preferito dal database:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Errore nella connessione al database:', error)
    return false
  }
}

// Funzioni unificate per gestire sia localStorage che database
export async function getFavorites(user?: User | null): Promise<string[]> {
  if (user) {
    // Utente loggato: recupera dal database
    return await getDatabaseFavorites(user.id)
  } else {
    // Utente non loggato: recupera da localStorage
    return getLocalFavorites()
  }
}

export async function toggleFavorite(tenderId: string, user?: User | null): Promise<boolean> {
  if (user) {
    // Utente loggato: gestisci nel database
    const currentFavorites = await getDatabaseFavorites(user.id)
    const isFavorited = currentFavorites.includes(tenderId)
    
    if (isFavorited) {
      return await removeDatabaseFavorite(user.id, tenderId)
    } else {
      return await addDatabaseFavorite(user.id, tenderId)
    }
  } else {
    // Utente non loggato: gestisci in localStorage
    const favorites = getLocalFavorites()
    const index = favorites.indexOf(tenderId)
    
    if (index === -1) {
      favorites.push(tenderId)
    } else {
      favorites.splice(index, 1)
    }
    
    setLocalFavorites(favorites)
    return true
  }
}

export async function isFavorite(tenderId: string, user?: User | null): Promise<boolean> {
  const favorites = await getFavorites(user)
  return favorites.includes(tenderId)
}

// Funzione per sincronizzare i preferiti locali con il database al login
export async function syncFavoritesToDatabase(user: User): Promise<void> {
  try {
    const localFavorites = getLocalFavorites()
    
    if (localFavorites.length === 0) {
      return
    }
    
    // Recupera i preferiti esistenti nel database
    const databaseFavorites = await getDatabaseFavorites(user.id)
    
    // Trova i preferiti che esistono solo in localStorage
    const favoritesToSync = localFavorites.filter(
      tenderId => !databaseFavorites.includes(tenderId)
    )
    
    // Aggiungi i nuovi preferiti al database
    const supabase = createClient()
    
    if (favoritesToSync.length > 0) {
      const { error } = await supabase
        .from('user_favorites')
        .insert(
          favoritesToSync.map(tenderId => ({
            user_id: user.id,
            tender_id: tenderId
          }))
        )
      
      if (error) {
        console.error('Errore nella sincronizzazione dei preferiti:', error)
        return
      }
    }
    
    // Pulisci localStorage dopo la sincronizzazione
    clearLocalFavorites()
    
    console.log(`Sincronizzati ${favoritesToSync.length} preferiti al database`)
  } catch (error) {
    console.error('Errore nella sincronizzazione dei preferiti:', error)
  }
}

// Funzione per migrare i preferiti dal database a localStorage al logout
export async function migrateFavoritesToLocal(user: User): Promise<void> {
  try {
    const databaseFavorites = await getDatabaseFavorites(user.id)
    
    if (databaseFavorites.length > 0) {
      setLocalFavorites(databaseFavorites)
      console.log(`Migrati ${databaseFavorites.length} preferiti a localStorage`)
    }
  } catch (error) {
    console.error('Errore nella migrazione dei preferiti:', error)
  }
}

// Hook personalizzato per gestire lo stato dei preferiti (da usare nei componenti)
export function useFavoritesState(): FavoritesState {
  return {
    favorites: [],
    isLoading: false,
    error: null
  }
}
