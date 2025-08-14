"use client"

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Tender } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FavoriteButton } from "@/components/favorite-button";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { checkCategorieOperaMatch } from "@/lib/data"
import {
  Building,
  Euro,
  FileText,
  Hash,
  MapPin,
  Handshake,
} from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

// Import dei componenti estratti
import { AtiOfferteIndicator } from "@/components/tender/ati-offerte-indicator";
import { CategorieOperaMatchIndicator } from "@/components/tender/categorie-opera-match-indicator";
import { AtiRequestModal } from "@/components/tender/ati-request-modal";
import { getNaturaBadgeVariant, getDeadlineStyle } from "@/components/tender/utils";

interface TenderDetailsProps {
  tender: Tender;
}

export function TenderDetails({ tender }: TenderDetailsProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAtiModalOpen, setIsAtiModalOpen] = useState(false);

  // Stato per le categorie corrispondenti
  const [matchingCategories, setMatchingCategories] = useState<string[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  
  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    }
    getUser();
  }, []);

  // Effetto per ottenere le categorie corrispondenti
  useEffect(() => {
    async function getMatchingCategories() {
      if (!userId || !tender.categorieOpera || tender.categorieOpera.length === 0) {
        setMatchingCategories([])
        setCategoriesLoading(false)
        return
      }

      try {
        const result = await checkCategorieOperaMatch(tender.categorieOpera, userId)
        setMatchingCategories(result.matchingCategories)
      } catch (error) {
        console.error("Errore nel recupero delle categorie corrispondenti:", error)
        setMatchingCategories([])
      } finally {
        setCategoriesLoading(false)
      }
    }

    getMatchingCategories()
  }, [tender.categorieOpera, userId])

  // Determina lo stile della scadenza
  const deadlineStyle = getDeadlineStyle(tender.scadenza);
  
  // Funzione per gestire il click del bottone ATI
  const handleAtiRequest = () => {
    setIsAtiModalOpen(true);
  };

    // Funzione per verificare se una categoria è in comune
  const isCategoriaInComune = (idCategoria: string) => {
    return matchingCategories.includes(idCategoria)
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-2">
            <Badge variant="outline" className="mb-2">{tender.procedura}</Badge>
            {tender.naturaPrincipale && (
              <Badge 
                variant={getNaturaBadgeVariant(tender.naturaPrincipale)} 
                className="mb-2"
              >
                {tender.naturaPrincipale}
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
            
            
            <FavoriteButton tenderId={tender.id} />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-4">{tender.descrizione}</h1>

        {/* Informazioni principali */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-full">
              <Hash className="text-blue-600" size={20} />
            </div>
            <div className="ml-3">
              <div className="text-sm text-blue-600 font-medium">Codice Identificativo Gara (CIG)</div>
              <div className="font-medium">{tender.cig}</div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="bg-yellow-100 p-2 rounded-full">
              <Euro className="text-yellow-600" size={20} />
            </div>
            <div className="ml-3">
              <div className="text-sm text-gray-500">Valore</div>
              <div className="font-medium text-yellow-600">{formatCurrency(tender.valore)}</div>
              {(tender.importoSicurezza !== undefined && tender.importoSicurezza > 0) ? (
                <div className="text-xs text-gray-500 mt-1">
                  Oneri sicurezza: {formatCurrency(tender.importoSicurezza)}
                </div>
              ) : null}
            </div>
          </div>

          {tender.criterioAggiudicazione && (
            <div className="flex items-center">
              <div className="bg-purple-100 p-2 rounded-full">
                <FileText className="text-purple-600" size={20} />
              </div>
              <div className="ml-3">
                <div className="text-sm text-gray-500">Criterio</div>
                <div className="font-medium">{tender.criterioAggiudicazione}</div>
              </div>
            </div>
          )}
        </div>

        {/* Link ai documenti di gara */}
        {tender.documentiDiGaraLink && (
          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="text-blue-600 mr-2" size={18} />
                <div className="text-sm font-medium text-blue-600">
                  Documenti di Gara
                </div>
              </div>
              <a 
                href={tender.documentiDiGaraLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm rounded flex items-center transition-colors duration-200"
              >
                <FileText className="mr-1" size={14} />
                Scarica
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Layout a 2 colonne - Stazione Appaltante e Classificazione allargata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stazione Appaltante */}
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-lg font-medium flex items-center">
              <Building className="mr-2" size={18} />
              Stazione Appaltante
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="font-medium">
                  {tender.stazioneAppaltante.nome}
                </div>
                <div className="text-sm text-gray-500">
                  ID: {tender.stazioneAppaltante.id}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500">
                  RUP
                </div>
                {tender.rup ? (
                  <>
                    <div className="font-medium">
                      {tender.rup.nome} {tender.rup.cognome}
                    </div>
                    {tender.rup.email && (
                      <div className="text-sm text-blue-600">
                        {tender.rup.email}
                      </div>
                    )}
                    {tender.rup.telefono && (
                      <div className="text-sm text-gray-500">
                        Tel: {tender.rup.telefono}
                      </div>
                    )}
                  </>
                ) : (
                  <div>{tender.stazioneAppaltante.contatto}</div>
                )}
                {!tender.rup && tender.stazioneAppaltante.email && (
                  <div className="text-sm text-blue-600">
                    {tender.stazioneAppaltante.email}
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500">
                  Indirizzo
                </div>
                <div>{tender.stazioneAppaltante.indirizzo}</div>
                {(tender.stazioneAppaltante.citta || tender.stazioneAppaltante.regione) && (
                  <div className="mt-1 flex items-center">
                    <MapPin className="text-red-500 mr-1" size={14} />
                    {tender.stazioneAppaltante.citta && (
                      <span className="text-gray-700">{tender.stazioneAppaltante.citta}</span>
                    )}
                    {tender.stazioneAppaltante.citta && tender.stazioneAppaltante.regione && (
                      <span className="text-gray-700"> - </span>
                    )}
                    {tender.stazioneAppaltante.regione && (
                      <span className="text-gray-700">{tender.stazioneAppaltante.regione}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Classificazione - allargata a 2/3 */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-medium flex items-center">
              <FileText className="mr-2" size={18} />
              Classificazione
            </h2>
          </CardHeader>
          <CardContent>
            {/* Indicatore di corrispondenza categorie opera - spostato qui */}
            {tender.categorieOpera && tender.categorieOpera.length > 0 && 
             tender.naturaPrincipale?.toLowerCase() === "lavori" && (
              <div className="mb-4">
                <CategorieOperaMatchIndicator tender={tender} userId={userId} />
              </div>
            )}
            
            {tender.categorieOpera && tender.categorieOpera.length > 0 && 
                tender.naturaPrincipale?.toLowerCase() === "lavori" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-500">
                      Categorie Opera
                    </div>
                    {/* Bottone ATI - visibile solo per bandi di lavori e utenti autenticati */}
                    {userId && tender.naturaPrincipale?.toLowerCase() === "lavori" && (
                      <Button
                        onClick={handleAtiRequest}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
                      >
                        <Handshake size={16} />
                        Richiedi ATI
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {tender.categorieOpera.map((categoria, index) => {
                      const isMatching = !categoriesLoading && isCategoriaInComune(categoria.id_categoria)
                      
                      return (
                        <div 
                          key={index} 
                          className={`border rounded-md p-2 transition-colors duration-200 ${
                            isMatching 
                              ? "bg-green-50 border-green-200" 
                              : "border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Badge
                                variant={categoria.cod_tipo_categoria === "P" ? "outline" : "secondary"}
                                className={`mr-2 ${
                                  categoria.cod_tipo_categoria === "P"
                                    ? "bg-gray-100 border-2 border-blue-500 text-blue-600"
                                    : ""
                                }`}
                              >
                                {categoria.descrizione_tipo_categoria || 
                                  (categoria.cod_tipo_categoria === "P"
                                    ? "Prevalente"
                                    : "Scorporabile")}
                              </Badge>
                              
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <div className={`font-medium cursor-help ${
                                    isMatching ? "text-green-700" : ""
                                  }`}>
                                    {categoria.id_categoria}
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80">
                                  <div className="space-y-1">
                                    <h4 className="text-sm font-semibold">Dettagli Categoria</h4>
                                    <p className="text-sm">{categoria.descrizione}</p>
                                    {isMatching && (
                                      <p className="text-xs text-green-600 font-medium mt-2">
                                        ✓ Questa categoria corrisponde al tuo profilo aziendale
                                      </p>
                                    )}
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            </div>
                            
                            {/* Badge ATI - mostra solo se ci sono offerte */}
                            <AtiOfferteIndicator 
                              categoria={categoria} 
                              bandoId={tender.id}
                              bandoDescrizione={tender.descrizione}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
            )}

            <div className="space-y-4 mt-4">
              <div>
                <div className="text-sm font-medium text-gray-500">
                  Codice CPV
                </div>
                <div>{tender.cpv}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500">
                  Descrizione
                </div>
                <div>{tender.categoria}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline - scheda orizzontale separata */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <h2 className="text-lg font-medium">Timeline</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center">
              <div className="bg-blue-600 rounded-full w-4 h-4 mr-4"></div>
              <div>
                <div className="font-medium">Pubblicazione</div>
                <div className="text-sm text-gray-500">
                  {formatDate(tender.pubblicazione)} 06:00
                </div>
              </div>
            </div>

            <div className="hidden md:block flex-1 h-px bg-gray-200 mx-4"></div>

            <div className="flex items-center">
              <div className="bg-blue-600 rounded-full w-4 h-4 mr-4"></div>
              <div>
                <div className="font-medium">Inizio Gara</div>
                <div className="text-sm text-gray-500">
                  {formatDate(tender.inizioGara)} 06:00
                </div>
              </div>
            </div>

            <div className="hidden md:block flex-1 h-px bg-gray-200 mx-4"></div>

            <div className="flex items-center">
              <div className="bg-blue-600 rounded-full w-4 h-4 mr-4"></div>
              <div>
                <div className="font-medium">Scadenza Gara</div>
                <div className="text-sm text-gray-500">
                  {formatDate(tender.scadenza)} 12:00
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Modal ATI */}
      {userId && (
        <AtiRequestModal
          tender={tender}
          userId={userId}
          isOpen={isAtiModalOpen}
          onClose={() => setIsAtiModalOpen(false)}
        />
      )}
    </div>
  );
}

// {tender.aggiudicatari && tender.aggiudicatari.length > 0 && (
//   <div className="space-y-4">
//     <h3 className="text-lg font-semibold">Aggiudicatari</h3>
//     {tender.aggiudicatari.map((aggiudicatario, index) => (
//       <div key={index} className="border rounded-lg p-4">
//         <div className="font-medium text-lg">{aggiudicatario.denominazione}</div>
//         <div className="text-sm text-gray-600 mt-1">
//           CF: {aggiudicatario.codice_fiscale}
//         </div>
//         <div className="flex items-center gap-4 mt-2">
//           <span className="font-semibold text-green-600">
//             Importo: {formatCurrency(aggiudicatario.importo)}
//           </span>
//           {aggiudicatario.ribasso !== null && aggiudicatario.ribasso !== undefined && (
//             <span className={`px-3 py-1 rounded-full text-sm font-medium ${
//               aggiudicatario.ribasso > 0 
//                 ? 'bg-green-100 text-green-800' 
//                 : aggiudicatario.ribasso < 0
//                 ? 'bg-red-100 text-red-800'
//                 : 'bg-gray-100 text-gray-800'
//             }`}>
//               Ribasso: {aggiudicatario.ribasso > 0 ? '+' : ''}{aggiudicatario.ribasso.toFixed(2)}%
//             </span>
//           )}
//         </div>
//         {aggiudicatario.data_aggiudicazione && (
//           <div className="text-sm text-gray-500 mt-1">
//             Data aggiudicazione: {new Date(aggiudicatario.data_aggiudicazione).toLocaleDateString('it-IT')}
//           </div>
//         )}
//       </div>
//     ))}
//   </div>
// )}