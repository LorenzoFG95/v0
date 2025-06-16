"use client"

import { useState, useEffect } from "react"
import { TenderCard } from "@/components/tender-card"
import { getFavorites } from "@/lib/favorites"
import { getTendersByIds } from "@/lib/data"
import type { Tender } from "@/lib/types"
import Link from "next/link"

export function FavoritesList() {
  const [favorites, setFavorites] = useState<Tender[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFavorites = async () => {
      const favoriteIds = getFavorites()
      if (favoriteIds.length === 0) {
        setLoading(false)
        return
      }

      const tenders = await getTendersByIds(favoriteIds)
      setFavorites(tenders)
      setLoading(false)
    }

    loadFavorites()
  }, [])

  if (loading) {
    return <div className="text-center py-8">Caricamento...</div>
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">Nessuna gara preferita</h3>
        <p className="text-gray-500 mb-4">Aggiungi gare ai preferiti per visualizzarle qui</p>
        <Link href="/" className="text-blue-600 hover:underline">
          Torna alla dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {favorites.map((tender) => (
        <Link href={`/gare/${tender.id}`} key={tender.id}>
          <TenderCard tender={tender} />
        </Link>
      ))}
    </div>
  )
}
