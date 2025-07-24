"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Calendar, Euro, Bookmark, Hash, MapPin, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import type { Tender } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toggleFavorite, isFavorite } from "@/lib/favorites"
import { useAuth } from "@/components/auth/auth-provider"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

interface TenderCardProps {
  tender: Tender
  showFavoriteButton?: boolean
  onFavoriteChange?: () => void
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

export function TenderCard({ tender, showFavoriteButton = true, onFavoriteChange }: TenderCardProps) {
  const { user } = useAuth()
  const [favorite, setFavorite] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Carica lo stato iniziale dei preferiti
  useEffect(() => {
    const loadFavoriteStatus = async () => {
      try {
        const isFav = await isFavorite(tender.id, user)
        setFavorite(isFav)
      } catch (error) {
        console.error('Errore nel caricamento dello stato preferiti:', error)
      }
    }
    
    loadFavoriteStatus()
  }, [tender.id, user])
  
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isLoading) return
    
    setIsLoading(true)
    
    try {
      const success = await toggleFavorite(tender.id, user)
      
      if (success) {
        setFavorite(!favorite)
        // Chiama la callback se fornita
        if (onFavoriteChange) {
          onFavoriteChange()
        }
      }
    } catch (error) {
      console.error('Errore nel toggle del preferito:', error)
    } finally {
      setIsLoading(false)
    }
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
    <Card className="h-full hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex gap-2">
            <Badge variant="outline" className="mb-2">
              {tender.procedura}
            </Badge>
            {naturaPrincipale && (
              <Badge variant={getNaturaBadgeVariant(naturaPrincipale)} className="mb-2">
                {naturaPrincipale}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
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
            {showFavoriteButton && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleFavoriteClick} 
                className="h-8 w-8"
                disabled={isLoading}
              >
                <Bookmark 
                  size={18} 
                  className={`${favorite ? "fill-red-500 text-red-500" : ""} ${isLoading ? "opacity-50" : ""}`} 
                />
              </Button>
            )}
          </div>
        </div>
        <h3 className="font-bold text-lg line-clamp-2">{tender.stazioneAppaltante.nome}</h3>
        
        {/* Aggiungiamo l'informazione sul luogo qui */}
        {(tender.stazioneAppaltante.regione || tender.stazioneAppaltante.citta) && (
          <div className="flex items-center text-sm text-gray-600 mt-1">
            <div className="w-6 flex justify-center">
              <MapPin size={16} className="text-gray-500" />
            </div>
            <span className="ml-2">
              {[tender.stazioneAppaltante.citta, tender.stazioneAppaltante.regione]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pb-2 flex-grow">
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
        
        {/* Mostra categorie opera se disponibili, altrimenti mostra CPV */}
        {tender.categorieOpera && tender.categorieOpera.length > 0 ? (
          <div className="mt-3">
            <div className="flex justify-end flex-wrap gap-1">
              {tender.categorieOpera
                .filter(categoria => categoria.id_categoria.toLowerCase() !== 'fs' && categoria.id_categoria.toLowerCase() !== 'fb')
                .slice(0, 4) // Limita a 4 categorie
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
              
              {/* Badge +x per le categorie aggiuntive */}
              {tender.categorieOpera
                .filter(categoria => categoria.id_categoria.toLowerCase() !== 'fs' && categoria.id_categoria.toLowerCase() !== 'fb')
                .length > 4 && (
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Badge variant="outline" className="cursor-help">
                      +{tender.categorieOpera
                        .filter(categoria => categoria.id_categoria.toLowerCase() !== 'fs' && categoria.id_categoria.toLowerCase() !== 'fb')
                        .length - 4}
                    </Badge>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">Altre categorie</h4>
                      <div className="flex flex-wrap gap-1">
                        {tender.categorieOpera
                          .filter(categoria => categoria.id_categoria.toLowerCase() !== 'fs' && categoria.id_categoria.toLowerCase() !== 'fb')
                          .slice(4)
                          .map((categoria, index) => (
                            <Badge 
                              key={index}
                              variant={categoria.cod_tipo_categoria === "P" ? "default" : "secondary"}
                              className="mr-1 mb-1"
                            >
                              {categoria.id_categoria}: {categoria.descrizione_tipo_categoria || 
                                (categoria.cod_tipo_categoria === "P" ? "Prevalente" : "Scorporabile")}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              )}
            </div>
          </div>
        ) : (
          /* Mostra CPV se non ci sono categorie opera disponibili */
          tender.cpv && tender.cpv !== "CPV non specificato" && (
            <div className="mt-3">
              <div className="flex justify-end flex-wrap gap-1">
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
              </div>
            </div>
          )
        )}
      </CardContent>
      <CardFooter className="pt-2 mt-auto">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700">
            <ExternalLink size={16} className="mr-1" />
            Visualizza dettagli
          </Button>
        </div>
        {/* La scadenza è stata spostata in alto */}
      </CardFooter>
    </Card>
  )
}
