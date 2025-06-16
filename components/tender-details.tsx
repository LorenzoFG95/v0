import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { Tender } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/utils"
import { FavoriteButton } from "@/components/favorite-button"
import { Building, Calendar, Euro, FileText, Users, Clock, Hash } from "lucide-react"

interface TenderDetailsProps {
  tender: Tender
}

export function TenderDetails({ tender }: TenderDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex justify-between items-start mb-4">
          <Badge className="mb-2">{tender.planificazione}</Badge>
          <FavoriteButton tenderId={tender.id} />
        </div>

        <h1 className="text-2xl font-bold mb-4">{tender.titolo}</h1>

        {tender.cig && (
          <div className="flex items-center mb-4 p-3 bg-blue-50 rounded-lg">
            <Hash className="text-blue-600 mr-2" size={20} />
            <div>
              <div className="text-sm text-blue-600 font-medium">Codice Identificativo Gara</div>
              <div className="font-mono text-lg text-blue-800">{tender.cig}</div>
            </div>
          </div>
        )}

        <p className="text-gray-700 mb-6">{tender.descrizione}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-full">
              <Euro className="text-blue-600" size={20} />
            </div>
            <div className="ml-3">
              <div className="text-sm text-gray-500">Valore</div>
              <div className="font-medium">{formatCurrency(tender.valore)}</div>
            </div>
          </div>

          <div className="flex items-center">
            <div className="bg-green-100 p-2 rounded-full">
              <Calendar className="text-green-600" size={20} />
            </div>
            <div className="ml-3">
              <div className="text-sm text-gray-500">Pubblicazione</div>
              <div className="font-medium">{formatDate(tender.pubblicazione)}</div>
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

          <div className="flex items-center">
            <div className="bg-purple-100 p-2 rounded-full">
              <Users className="text-purple-600" size={20} />
            </div>
            <div className="ml-3">
              <div className="text-sm text-gray-500">Partecipanti</div>
              <div className="font-medium">{tender.partecipanti || "Non disponibile"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div className="font-medium">{tender.stazioneAppaltante.nome}</div>
                <div className="text-sm text-gray-500">ID: {tender.stazioneAppaltante.id}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500">Contatto</div>
                <div>{tender.stazioneAppaltante.contatto}</div>
                <div className="text-sm text-blue-600">{tender.stazioneAppaltante.email}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500">Indirizzo</div>
                <div>{tender.stazioneAppaltante.indirizzo}</div>
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
                <div className="text-sm font-medium text-gray-500">Codice CPV</div>
                <div>{tender.cpv}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500">Categoria</div>
                <div>{tender.categoria}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500">Procedura</div>
                <Badge variant="outline">{tender.procedura}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-medium">Timeline</h2>
          </CardHeader>
          <CardContent>
            <div className="relative pl-8 border-l-2 border-gray-200 space-y-6">
              <div className="relative">
                <div className="absolute -left-[25px] bg-blue-600 rounded-full w-4 h-4"></div>
                <div className="font-medium">Pubblicazione</div>
                <div className="text-sm text-gray-500">{formatDate(tender.pubblicazione)} 06:00</div>
              </div>

              <div className="relative">
                <div className="absolute -left-[25px] bg-green-600 rounded-full w-4 h-4"></div>
                <div className="font-medium">Inizio Gara</div>
                <div className="text-sm text-gray-500">{formatDate(tender.inizioGara)} 06:00</div>
              </div>

              <div className="relative">
                <div className="absolute -left-[25px] bg-red-600 rounded-full w-4 h-4"></div>
                <div className="font-medium">Scadenza Gara</div>
                <div className="text-sm text-gray-500">{formatDate(tender.scadenza)} 12:00</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
