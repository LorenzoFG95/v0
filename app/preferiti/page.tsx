"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { FavoritesList } from "@/components/favorites-list"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, LogIn, Loader2 } from "lucide-react"
import Link from "next/link"

export default function FavoritesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Reindirizza alla pagina di login se l'utente non è autenticato
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?redirect=/preferiti')
    }
  }, [user, loading, router])

  // Mostra loading durante il controllo dell'autenticazione
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Caricamento...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Mostra messaggio di accesso richiesto se l'utente non è autenticato
  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Heart className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Accesso Richiesto</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-gray-600">
                  Per visualizzare e gestire le tue gare preferite, devi effettuare l'accesso al tuo account.
                </p>
                <div className="space-y-2">
                  <Button asChild className="w-full">
                    <Link href="/auth/login?redirect=/preferiti">
                      <LogIn className="mr-2 h-4 w-4" />
                      Accedi
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/auth/register?redirect=/preferiti">
                      Registrati
                    </Link>
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Non hai un account?{" "}
                  <Link href="/auth/register?redirect=/preferiti" className="text-blue-600 hover:underline">
                    Registrati gratuitamente
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    )
  }

  // Mostra la pagina dei preferiti per utenti autenticati
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="h-8 w-8 text-red-500" />
            <h1 className="text-3xl font-bold text-gray-900">Gare Preferite</h1>
          </div>
          <p className="text-gray-600">
            Le tue gare d'appalto salvate - {user.email}
          </p>
        </div>

        <FavoritesList />
      </div>
    </main>
  )
}
