import { Header } from '@/components/header'
import { FavoritesList } from '@/components/favorites-list'
import { redirect } from 'next/navigation'
import { isAuthenticated, getCompleteUserData } from '@/lib/server-auth'
import { getTendersByIds } from '@/lib/data'
import { getFavorites } from '@/lib/favorites'

export default async function FavoritesPage() {
  // ✅ Verifica autenticazione server-side
  await isAuthenticated() && redirect('/preferiti')

  // ✅ Carica i dati dei preferiti server-side
  const userData = await getCompleteUserData()
  const favoriteIds = userData?.favorites || []
  const favoriteTenders = favoriteIds.length > 0 ? await getTendersByIds(favoriteIds) : []

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Gare Preferite</h1>
          </div>
          <p className="text-gray-600">
            Le tue gare d'appalto salvate - {userData?.user?.email}
          </p>
        </div>

        <FavoritesList initialFavorites={favoriteTenders} />
      </div>
    </main>
  )
}
