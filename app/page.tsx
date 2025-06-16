import { Header } from "@/components/header"
import { getTenders, getEntiAppaltanti, getCategorieNatura } from "@/lib/data"
import { DatabaseSetupGuide } from "@/components/database-setup-guide"
import { ClientDashboard } from "@/components/client-dashboard"

// Check if database is configured
function isDatabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export default async function Home() {
  const databaseConfigured = isDatabaseConfigured()

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
  const [tenders, entiAppaltanti, categorie] = await Promise.all([
    getTenders(),
    getEntiAppaltanti(),
    getCategorieNatura(),
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Gare d&apos;Appalto</h1>
          <p className="text-gray-600 mt-1">Esplora e filtra le gare d&apos;appalto pubbliche in formato OCDS</p>
        </div>

        <ClientDashboard initialTenders={tenders} entiAppaltanti={entiAppaltanti} categorie={categorie} />
      </div>
    </main>
  )
}
