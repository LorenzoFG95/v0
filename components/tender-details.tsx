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
  Link, // Aggiungi l'icona Link
  MapPin, // Aggiungi l'icona MapPin
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

interface TenderDetailsProps {
  tender: Tender;
}
export function TenderDetails({ tender }: TenderDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-2">
            <Badge className="mb-2">{tender.procedura}</Badge>
            {tender.naturaPrincipale && (
              <Badge 
                variant={tender.naturaPrincipale.toLowerCase() === "lavori" ? "default" : "secondary"} 
                className="mb-2"
              >
                {tender.naturaPrincipale}
              </Badge>
            )}
          </div>
          <FavoriteButton tenderId={tender.id} />
        </div>

        <h1 className="text-2xl font-bold mb-4">{tender.descrizione}</h1>

        {tender.cig && (
          <div className="flex items-center mb-4 p-3 bg-blue-50 rounded-lg">
            <Hash className="text-blue-600 mr-2" size={20} />
            <div className="flex-1">
              <div className="text-sm text-blue-600 font-medium">
                Codice Identificativo Gara
              </div>
              <div className="font-mono text-lg text-blue-800">
                {tender.cig}
              </div>
            </div>
            {tender.criterioAggiudicazione && (
              <div className="border-l border-blue-200 pl-4 ml-4">
                <div className="text-sm text-blue-600 font-medium">
                  Criterio di Aggiudicazione
                </div>
                <div className="text-blue-800">
                  {tender.criterioAggiudicazione}
                </div>
              </div>
            )}
          </div>
        )}

        {/* <p className="text-gray-700 mb-6">{tender.descrizione}</p> */}
        

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-full">
              <Euro className="text-blue-600" size={20} />
            </div>
            <div className="ml-3">
              <div className="text-sm text-gray-500">Valore</div>
              <div className="font-medium">{formatCurrency(tender.valore)}</div>
              {/* Aggiungi l'importo sicurezza */}
              <div className="text-xs text-gray-500 mt-1">
                Oneri sicurezza: {formatCurrency(tender.valore * 0.02)} {/* Valore fittizio del 2% dell'importo totale */}
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <div className="bg-green-100 p-2 rounded-full">
              <Calendar className="text-green-600" size={20} />
            </div>
            <div className="ml-3">
              <div className="text-sm text-gray-500">Pubblicazione</div>
              <div className="font-medium">
                {formatDate(tender.pubblicazione)}
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <div className="bg-red-100 p-2 rounded-full">
              <Clock className="text-red-600" size={20} />
            </div>
            <div className="ml-3">
              <div className="text-sm text-gray-500">Scadenza</div>
              <div className="font-medium">{formatDate(tender.scadenza)}</div>
            </div>
          </div>

          {tender.partecipanti ? (
            <div className="flex items-center">
              <div className="bg-purple-100 p-2 rounded-full">
                <Users className="text-purple-600" size={20} />
              </div>
              <div className="ml-3">
                <div className="text-sm text-gray-500">Partecipanti</div>
                <div className="font-medium">{tender.partecipanti}</div>
              </div>
            </div>
          ) : null}
        </div>

                {/* Aggiungi la visualizzazione del link ai documenti di gara */}
        {tender.documentiDiGaraLink && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="text-green-600 mr-2" size={20} />
                <div>
                  <div className="text-sm text-green-600 font-medium">
                    Documenti di Gara
                  </div>
                  <div className="text-sm text-gray-600">
                    Scarica la documentazione completa relativa a questa gara
                  </div>
                </div>
              </div>
              <a 
                href={tender.documentiDiGaraLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center transition-colors duration-200"
              >
                <FileText className="mr-2" size={16} />
                Scarica Documenti
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
                <div>{tender.stazioneAppaltante.contatto}</div>
                <div className="text-sm text-blue-600">
                  {tender.stazioneAppaltante.email}
                </div>
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
            <div className="space-y-4">
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
