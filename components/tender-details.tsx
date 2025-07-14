import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Tender } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FavoriteButton } from "@/components/favorite-button";
import {
  Building,
  Calendar,
  Euro,
  FileText,
  Users,
  Clock,
  Hash,
  Link,
  MapPin,
} from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface TenderDetailsProps {
  tender: Tender;
}
export function TenderDetails({ tender }: TenderDetailsProps) {
  // Determina lo stile della scadenza
  const deadlineStyle = getDeadlineStyle(tender.scadenza);
  
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

        {/* <p className="text-gray-700 mb-6">{tender.descrizione}</p> */}
        

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-full">
              <Hash className="text-blue-600" size={20} />
            </div>
            <div className="ml-3">
              <div className="text-sm text-blue-600 font-medium">Codice Identificativo Gara</div>
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
              {/* Aggiungi l'importo sicurezza */}
                {(tender.importoSicurezza !== undefined && tender.importoSicurezza > 0) ? (
                  <div className="text-xs text-gray-500 mt-1">
                    Oneri sicurezza: {formatCurrency(tender.importoSicurezza)}
                  </div>
                ) : null}
            </div>
          </div>

          {/* <div className="flex items-center">
            <div className="bg-green-100 p-2 rounded-full">
              <Calendar className="text-green-600" size={20} />
            </div>
            <div className="ml-3">
              <div className="text-sm text-gray-500">Pubblicazione</div>
              <div className="font-medium">
                {formatDate(tender.pubblicazione)}
              </div>
            </div>
          </div> */}


          {/* Sostituiamo partecipanti con criterio di aggiudicazione */}
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

                {/* Versione semplificata del link ai documenti di gara */}
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

      {/* Modifica qui: cambia il layout per avere 3 colonne in desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  Contatto
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

        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-lg font-medium flex items-center">
              <FileText className="mr-2" size={18} />
              Classificazione
            </h2>
          </CardHeader>
          <CardContent>
            {tender.categorieOpera && tender.categorieOpera.length > 0 && 
                tender.naturaPrincipale?.toLowerCase() === "lavori" && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">
                    Categorie Opera
                  </div>
                  <div className="space-y-2">
                    {tender.categorieOpera.map((categoria, index) => (
                      <div key={index} className="border rounded-md p-2">
                        <div className="flex items-center">
                          <Badge
                            variant={
                              categoria.cod_tipo_categoria === "P"
                                ? "default"
                                : "secondary"
                            }
                            className="mr-2"
                          >
                            {categoria.descrizione_tipo_categoria || 
                              (categoria.cod_tipo_categoria === "P"
                                ? "Prevalente"
                                : "Scorporabile")}
                          </Badge>
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <div className="font-medium cursor-help">
                                {categoria.id_categoria}
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                              <div className="space-y-1">
                                <h4 className="text-sm font-semibold">Dettagli Categoria</h4>
                                <p className="text-sm">{categoria.descrizione}</p>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                      </div>
                    ))}
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

              {/* Rimosso il blocco "Procedura" */}

              {/* Rimosso il blocco "Tipo di gara" */}

              
            </div>
          </CardContent>
        </Card>

        {/* Modifica qui: la timeline ora occupa solo 1/3 dello spazio in desktop */}
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-lg font-medium">Timeline</h2>
          </CardHeader>
          <CardContent>
            <div className="relative pl-8 border-l-2 border-gray-200 space-y-6">
              <div className="relative">
                <div className="absolute -left-[25px] bg-blue-600 rounded-full w-4 h-4"></div>
                <div className="font-medium">Pubblicazione</div>
                <div className="text-sm text-gray-500">
                  {formatDate(tender.pubblicazione)} 06:00
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-[25px] bg-green-600 rounded-full w-4 h-4"></div>
                <div className="font-medium">Inizio Gara</div>
                <div className="text-sm text-gray-500">
                  {formatDate(tender.inizioGara)} 06:00
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-[25px] bg-red-600 rounded-full w-4 h-4"></div>
                <div className="font-medium">Scadenza Gara</div>
                <div className="text-sm text-gray-500">
                  {formatDate(tender.scadenza)} 12:00
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
