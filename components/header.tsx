"use client"

import Link from "next/link"
import { Home, FileText, Bookmark, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"

export function Header() {
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  
  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-1 rounded">
            <FileText size={20} />
          </div>
          <span className="font-bold text-xl">BancaDati</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Button variant={pathname === "/" ? "secondary" : "ghost"} size="sm" asChild>
            <Link href="/" className="flex items-center gap-1">
              <Home size={16} />
              <span>Dashboard</span>
            </Link>
          </Button>

          <Button variant={pathname === "/preferiti" ? "secondary" : "ghost"} size="sm" asChild>
            <Link href="/preferiti" className="flex items-center gap-1">
              <Bookmark size={16} />
              <span>Preferiti</span>
            </Link>
          </Button>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              <span>Caricamento...</span>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="flex items-center gap-1" asChild>
                <Link href="/profile">
                  <User size={16} />
                  <span>{user.email}</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Esci
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant={pathname === "/auth/login" ? "secondary" : "ghost"} size="sm" asChild>
                <Link href="/auth/login">
                  Accedi
                </Link>
              </Button>
              <Button variant={pathname === "/auth/register" ? "secondary" : "ghost"} size="sm" asChild>
                <Link href="/auth/register">
                  Registrati
                </Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}