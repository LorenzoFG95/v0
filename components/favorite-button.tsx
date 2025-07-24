"use client"

import { useState, useEffect } from "react"
import { Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toggleFavorite, isFavorite, syncFavoritesToDatabase } from "@/lib/favorites"
import { useAuth } from "@/components/auth/auth-provider"
import { toast } from "@/hooks/use-toast"

interface FavoriteButtonProps {
  tenderId: string
  className?: string
}

export function FavoriteButton({ tenderId, className }: FavoriteButtonProps) {
  const { user, loading: authLoading } = useAuth()
  const [favorite, setFavorite] = useState(false)
  const [loading, setLoading] = useState(false)

  // Carica lo stato iniziale dei preferiti
  useEffect(() => {
    async function loadFavoriteStatus() {
      if (authLoading) return
      
      try {
        const isCurrentlyFavorite = await isFavorite(tenderId, user)
        setFavorite(isCurrentlyFavorite)
      } catch (error) {
        console.error('Errore nel caricamento dello stato dei preferiti:', error)
      }
    }

    loadFavoriteStatus()
  }, [tenderId, user, authLoading])

  // Sincronizza i preferiti quando l'utente si logga
  useEffect(() => {
    async function handleUserLogin() {
      if (user && !authLoading) {
        try {
          await syncFavoritesToDatabase(user)
          // Ricarica lo stato dei preferiti dopo la sincronizzazione
          const isCurrentlyFavorite = await isFavorite(tenderId, user)
          setFavorite(isCurrentlyFavorite)
        } catch (error) {
          console.error('Errore nella sincronizzazione dei preferiti:', error)
        }
      }
    }

    handleUserLogin()
  }, [user, authLoading, tenderId])

  const handleClick = async () => {
    if (loading) return
    
    setLoading(true)
    
    try {
      const success = await toggleFavorite(tenderId, user)
      
      if (success) {
        setFavorite(!favorite)
        
        // Mostra un toast di conferma
        toast({
          title: favorite ? "Rimosso dai preferiti" : "Aggiunto ai preferiti",
          description: favorite 
            ? "Il bando è stato rimosso dai tuoi preferiti"
            : "Il bando è stato aggiunto ai tuoi preferiti",
          duration: 2000,
        })
      } else {
        // Mostra un toast di errore
        toast({
          title: "Errore",
          description: "Si è verificato un errore durante l'operazione. Riprova.",
          variant: "destructive",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error('Errore nel toggle del preferito:', error)
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'operazione. Riprova.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={favorite ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={loading || authLoading}
      className={`${favorite ? "bg-red-500 hover:bg-red-600" : ""} ${className || ""}`}
    >
      <Bookmark 
        size={16} 
        className={`mr-1 ${favorite ? "fill-white" : ""} ${loading ? "animate-pulse" : ""}`} 
      />
      {loading 
        ? "Caricamento..." 
        : favorite 
          ? "Rimuovi dai preferiti" 
          : "Aggiungi ai preferiti"
      }
    </Button>
  )
}
