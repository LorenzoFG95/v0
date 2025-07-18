import { Header } from "@/components/header"
import { getTenders, getCategorieNatura, getCategorieOpera, getCriterioAggiudicazione, getRegioni, getTipiProcedura } from "@/lib/data"
import { DatabaseSetupGuide } from "@/components/database-setup-guide"
import { ClientDashboard } from "@/components/client-dashboard"
import { ConnectionStatus } from "@/components/connection-status";
import { createClient } from "@/utils/supabase/server";
import type { TenderFilters } from "@/lib/types";

// Check if database is configured
function isDatabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export default async function Home({ searchParams }: { searchParams: Record<string, string | string[]> }) {
  const databaseConfigured = isDatabaseConfigured()
  
  // Attendi searchParams prima di usarlo
  const params = await searchParams
  
  // Estrai tutti i parametri di filtro
  const filters: TenderFilters = {
    page: params.page ? parseInt(params.page as string) : 1,
    pageSize: 10,
    searchQuery: params.searchQuery as string,
    categoriaOpera: Array.isArray(params.categoriaOpera) ? params.categoriaOpera : params.categoriaOpera ? [params.categoriaOpera as string] : [],
    soloPrevalente: params.soloPrevalente === 'true',
    categoria: params.categoria as string,
    stato: params.stato as string || "attiva", // Aggiunto default "attiva"
    startDate: params.startDate as string,
    endDate: params.endDate as string,
    minValue: params.minValue ? parseFloat(params.minValue as string) : undefined,
    maxValue: params.maxValue ? parseFloat(params.maxValue as string) : undefined,
    criterioAggiudicazione: params.criterioAggiudicazione as string,
    regione: params.regione as string,
    citta: params.citta as string,
    tipoProcedura: params.tipoProcedura as string,
  };
  
  const currentPage = filters.page || 1

  if (!databaseConfigured) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Gare d&apos;Appalto</h1>
            <p className="text-gray-600 mt-1">Esplora e filtra le gare d&apos;appalto pubbliche in formato OCDS</p>
            <p className="text-amber-600 mt-2 text-sm">⚠️ Database non configurato - utilizzando dati di esempio</p>
          </div>
          <DatabaseSetupGuide />
        </div>
      </main>
    )
  }

  // Get all data server-side
  const [{ tenders, total }, categorie, categorieOpera, criteriAggiudicazione, regioni, tipiProcedura] = await Promise.all([
    getTenders(filters), // Passa tutti i filtri
    getCategorieNatura(),
    getCategorieOpera(),
    getCriterioAggiudicazione(), // Aggiunto
    getRegioni(),
    getTipiProcedura()
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Gare d&apos;Appalto</h1>
          <p className="text-gray-600 mt-1">Esplora e filtra le gare d&apos;appalto pubbliche in formato OCDS</p>
        </div>

        <ClientDashboard 
          initialTenders={tenders} 
          categorieOpera={categorieOpera} 
          categorie={categorie} 
          criteriAggiudicazione={criteriAggiudicazione} // Aggiunto
          regioni={regioni}  // Nuovo campo
          tipiProcedura={tipiProcedura} // Aggiunto il prop mancante
          currentPage={currentPage}
          totalItems={total}
          pageSize={10}
        />
      </div>
    </main>
  )
}
