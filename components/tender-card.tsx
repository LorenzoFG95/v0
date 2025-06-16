"use client"

import type React from "react"
import { useState } from "react"
import { Calendar, Euro, Heart, Hash } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import type { Tender } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toggleFavorite, isFavorite } from "@/lib/favorites"

interface TenderCardProps {
  tender: Tender
}

export function TenderCard({ tender }: TenderCardProps) {
  const [favorite, setFavorite] = useState(isFavorite(tender.id))

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(tender.id)
    setFavorite(!favorite)
  }

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="mb-2">
            {tender.planificazione}
          </Badge>
          <Button variant="ghost" size="icon" onClick={handleFavoriteClick} className="h-8 w-8">
            <Heart size={18} className={favorite ? "fill-red-500 text-red-500" : ""} />
          </Button>
        </div>
        <h3 className="font-bold text-lg line-clamp-2">{tender.titolo}</h3>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-gray-600 line-clamp-3 mb-4">{tender.descrizione}</p>

        {tender.cig && (
          <div className="flex items-center text-sm mb-2">
            <div className="w-6 flex justify-center">
              <Hash size={16} className="text-gray-500" />
            </div>
            <span className="ml-2 font-mono text-blue-600">CIG: {tender.cig}</span>
          </div>
        )}

        <div className="flex items-center text-sm mb-2">
          <div className="w-6 flex justify-center">
            <Calendar size={16} className="text-gray-500" />
          </div>
          <span className="ml-2">Pubblicato: {formatDate(tender.pubblicazione)}</span>
        </div>

        <div className="flex items-center text-sm">
          <div className="w-6 flex justify-center">
            <Euro size={16} className="text-gray-500" />
          </div>
          <span className="ml-2 font-medium">{formatCurrency(tender.valore)}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <div className="flex items-center gap-2">
          <Badge variant={tender.procedura === "Procedura Aperta" ? "default" : "secondary"}>{tender.procedura}</Badge>
        </div>
        <div className="text-sm text-gray-500">Scade: {formatDate(tender.scadenza)}</div>
      </CardFooter>
    </Card>
  )
}
