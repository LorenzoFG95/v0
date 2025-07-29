"use client"

import { useState, useEffect } from "react"
import { TenderCard } from "@/components/tender-card"
import { getFavorites } from "@/lib/favorites"
import { getTendersByIds } from "@/lib/data"
import { useAuth } from "@/components/auth/auth-provider"
import type { Tender } from "@/lib/types"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FavoritesListProps {
  initialFavorites?: Tender[]
  onFavoriteRemoved?: () => void
}

export function FavoritesList({ initialFavorites = [], onFavoriteRemoved }: FavoritesListProps) {
  const { user, loading: authLoading, favorites: contextFavorites } = useAuth()
  const [favorites, setFavorites] = useState<Tender[]>(initialFavorites)
  const [loading, setLoading] = useState(false) // ✅ Non loading se abbiamo dati iniziali
  const [error, setError] = useState<string | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  // Funzione per caricare i preferiti
  const loadFavorites = async () => {
    if (authLoading) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Recupera gli ID dei preferiti
      const ids = await getFavorites(user)
      setFavoriteIds(ids)
      
      if (ids.length === 0) {
        setFavorites([])
        setLoading(false)
        return
      }

      // Recupera i dettagli delle gare
      const tenders = await getTendersByIds(ids)
      setFavorites(tenders)
    } catch (error) {
      console.error('Errore nel caricamento dei preferiti:', error)
      setError('Si è verificato un errore nel caricamento dei preferiti. Riprova più tardi.')
      setFavorites([])
    } finally {
      setLoading(false)
    }
  }

  // Carica i preferiti quando il componente si monta o cambia l'utente
  // ✅ Usa i dati iniziali se disponibili
  useEffect(() => {
    if (initialFavorites.length > 0) {
      setFavorites(initialFavorites)
      return
    }
    // Solo se non abbiamo dati iniziali, carica dal server
    loadFavorites()
  }, [user, authLoading])

  // Funzione per rimuovere un preferito dalla lista
  const handleFavoriteRemoved = (tenderId: string) => {
    setFavorites(prev => prev.filter(tender => tender.id !== tenderId))
    setFavoriteIds(prev => prev.filter(id => id !== tenderId))
    onFavoriteRemoved?.()
  }

  // Funzione per ricaricare i preferiti
  const handleRefresh = () => {
    loadFavorites()
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Caricamento preferiti...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="ml-4"
          >
            Riprova
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium mb-2 text-gray-900">
          {user ? "Nessuna gara preferita" : "Nessuna gara preferita"}
        </h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          {user 
            ? "Aggiungi gare ai preferiti per visualizzarle qui. I tuoi preferiti saranno salvati nel tuo account."
            : "Aggiungi gare ai preferiti per visualizzarle qui. I preferiti saranno salvati localmente."
          }
        </p>
        <div className="space-y-2">
          <Link href="/" className="inline-block">
            <Button variant="default">
              Esplora le gare
            </Button>
          </Link>
          {!user && (
            <div className="text-sm text-gray-500">
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Accedi
              </Link>
              {" per salvare i preferiti nel tuo account"}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con informazioni sui preferiti */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            I tuoi preferiti ({favorites.length})
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {user 
              ? "Preferiti salvati nel tuo account"
              : "Preferiti salvati localmente"
            }
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? "Aggiornamento..." : "Aggiorna"}
        </Button>
      </div>

      {/* Griglia delle gare preferite */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {favorites.map((tender) => (
          <div key={tender.id} className="relative">
            <Link href={`/gare/${tender.id}`}>
              <TenderCard 
                tender={tender} 
                showFavoriteButton={true}
                onFavoriteChange={() => handleFavoriteRemoved(tender.id)}
              />
            </Link>
          </div>
        ))}
      </div>

      {/* Messaggio informativo per utenti non loggati */}
      {!user && favorites.length > 0 && (
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                I tuoi preferiti sono salvati localmente. 
                <Link href="/auth/login" className="text-blue-600 hover:underline ml-1">
                  Accedi
                </Link>
                {" per salvarli nel tuo account."}
              </span>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
