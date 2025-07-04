"use client"

import { useState, useEffect } from "react"
import { Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toggleFavorite, isFavorite } from "@/lib/favorites"

interface FavoriteButtonProps {
  tenderId: string
}

export function FavoriteButton({ tenderId }: FavoriteButtonProps) {
  const [favorite, setFavorite] = useState(false)

  useEffect(() => {
    setFavorite(isFavorite(tenderId))
  }, [tenderId])

  const handleClick = () => {
    toggleFavorite(tenderId)
    setFavorite(!favorite)
  }

  return (
    <Button
      variant={favorite ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      className={favorite ? "bg-red-500 hover:bg-red-600" : ""}
    >
      <Bookmark size={16} className={`mr-1 ${favorite ? "fill-white" : ""}`} />
      {favorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
    </Button>
  )
}
