"use client"

import type React from "react"
import { useState } from "react"
import { Calendar, Euro, Bookmark, Hash } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import type { Tender } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toggleFavorite, isFavorite } from "@/lib/favorites"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

interface TenderCardProps {
  tender: Tender
}

// Funzione per determinare la variante del badge in base alla natura principale
function getNaturaBadgeVariant(natura?: string): "default" | "secondary" | "destructive" | "outline" | "service" {
  if (!natura) return "outline"
  
  switch (natura.toLowerCase()) {
    case "lavori":
      return "default" // blu
    case "forniture":
      return "secondary" // grigio
    case "servizi":
      return "service" // ambra (meno acceso del rosso)
    default:
      return "outline"
  }
}

export function TenderCard({ tender }: TenderCardProps) {
  const [favorite, setFavorite] = useState(isFavorite(tender.id))
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(tender.id)
    setFavorite(!favorite)
  }
  
  // Determina la natura principale dal campo categoria se non è disponibile direttamente
  const naturaPrincipale = tender.naturaPrincipale || (
    tender.categoria?.toLowerCase().includes("lavori") ? "Lavori" :
    tender.categoria?.toLowerCase().includes("fornitur") ? "Forniture" :
    tender.categoria?.toLowerCase().includes("servizi") ? "Servizi" : undefined
  )

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex gap-2">
            <Badge variant="outline" className="mb-2">
              {tender.planificazione}
            </Badge>
            {naturaPrincipale && (
              <Badge variant={getNaturaBadgeVariant(naturaPrincipale)} className="mb-2">
                {naturaPrincipale}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleFavoriteClick} className="h-8 w-8">
            <Bookmark size={18} className={favorite ? "fill-red-500 text-red-500" : ""} />
          </Button>
        </div>
        <h3 className="font-bold text-lg line-clamp-2">{tender.stazioneAppaltante.nome}</h3>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{tender.descrizione}</p>

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
        
        {tender.categorieOpera && tender.categorieOpera.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-end flex-wrap gap-1">
              {tender.categorieOpera
                .filter(categoria => categoria.id_categoria.toLowerCase() !== 'fs' && categoria.id_categoria.toLowerCase() !== 'fb')
                .map((categoria, index) => (
                <HoverCard key={index}>
                  <HoverCardTrigger asChild>
                    <Badge 
                      variant={categoria.cod_tipo_categoria === "P" ? "default" : "secondary"}
                      className="cursor-help"
                    >
                    {categoria.id_categoria}
                    </Badge>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">
                        {categoria.descrizione_tipo_categoria || 
                          (categoria.cod_tipo_categoria === "P" ? "Prevalente" : "Scorporabile")}
                      </h4>
                      <p className="text-sm">{categoria.descrizione}</p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
              
              {/* Mostra CPV per categorie fs o fb */}
              {tender.cpv && tender.cpv !== "CPV non specificato" && tender.categorieOpera.some(cat => 
                cat.id_categoria.toLowerCase() === 'fs' || cat.id_categoria.toLowerCase() === 'fb') && (
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Badge variant="outline" className="cursor-help">
                      {tender.cpv}
                    </Badge>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">Codice CPV</h4>
                      <p className="text-sm">{tender.categoria}</p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <div className="flex items-center gap-2">
          <Badge variant={tender.procedura === "Procedura Aperta" ? "default" : "secondary"}>{tender.procedura}</Badge>
        </div>
        <div className="text-sm font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md">
          Scade: {formatDate(tender.scadenza)}
        </div>
      </CardFooter>
    </Card>
  )
}
