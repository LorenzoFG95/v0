import { Header } from "@/components/header"
import { FavoritesList } from "@/components/favorites-list"

export default function FavoritesPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gare Preferite</h1>
          <p className="text-gray-600 mt-1">Le tue gare d&apos;appalto salvate</p>
        </div>

        <FavoritesList />
      </div>
    </main>
  )
}
