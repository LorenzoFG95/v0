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
function getNaturaBadgeVariant(natura?: string): "lavori" | "forniture" | "servizi" | "outline" {
  if (!natura) return "outline"
  
  switch (natura.toLowerCase()) {
    case "lavori":
      return "lavori" // bordo blu
    case "forniture":
      return "forniture" // bordo grigio
    case "servizi":
      return "servizi" // bordo ambra
    default:
      return "outline"
  }
}

// Funzione per determinare lo stile della scadenza in base alla data
function getDeadlineStyle(deadlineDate: string): { color: string; text: string } {
  const today = new Date();
  const deadline = new Date(deadlineDate);
  const oneWeek = 7 * 24 * 60 * 60 * 1000; // Una settimana in millisecondi
  
  // Rimuovi l'orario per confrontare solo le date
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  
  const timeDiff = deadline.getTime() - today.getTime();
  
  if (timeDiff < 0) {
    // Scadenza passata
    return { 
      color: "text-red-600 bg-red-50", 
      text: "Scaduta il" 
    };
  } else if (timeDiff <= oneWeek) {
    // Scadenza entro una settimana
    return { 
      color: "text-yellow-600 bg-yellow-50", 
      text: "Scade" 
    };
  } else {
    // Scadenza oltre una settimana (default)
    return { 
      color: "text-green-600 bg-green-50", 
      text: "Scade" 
    };
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
  
  // Determina lo stile della scadenza
  const deadlineStyle = getDeadlineStyle(tender.scadenza);

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
          <span className="ml-2">Criterio: {tender.criterioAggiudicazione || "Non specificato"}</span>
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
                      CPV: {tender.cpv}
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
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className={`text-sm font-medium ${deadlineStyle.color} px-2 py-1 rounded-md cursor-help`}>
              {deadlineStyle.text}: {formatDate(tender.scadenza)}
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto">
            <div className="space-y-1">
              <p>Pubblicato il: {formatDate(tender.pubblicazione)}</p>
            </div>
          </HoverCardContent>
        </HoverCard>
      </CardFooter>
    </Card>
  )
}
