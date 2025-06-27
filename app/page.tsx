import { Header } from "@/components/header"
import { getTenders, getCategorieNatura, getCategorieOpera } from "@/lib/data"
import { DatabaseSetupGuide } from "@/components/database-setup-guide"
import { ClientDashboard } from "@/components/client-dashboard"
import { ConnectionStatus } from "@/components/connection-status";
import { createClient } from "@/utils/supabase/server";

// Check if database is configured
function isDatabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export default async function Home({ searchParams }: { searchParams: { page?: string } }) {
  const databaseConfigured = isDatabaseConfigured()
  
  // Attendi searchParams prima di usarlo
  const params = await searchParams
  const currentPage = params.page ? parseInt(params.page) : 1

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
  const [{ tenders, total }, categorie, categorieOpera] = await Promise.all([
    getTenders(currentPage, 10),
    getCategorieNatura(),
    getCategorieOpera(),
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
          currentPage={currentPage}
          totalItems={total}
          pageSize={10}
        />
      </div>
    </main>
  )
}
