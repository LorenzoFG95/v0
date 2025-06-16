"use client"

import Link from "next/link"
import { Home, FileText, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"

export function Header() {
  const pathname = usePathname()

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

          <Button variant={pathname === "/gare" ? "secondary" : "ghost"} size="sm" asChild>
            <Link href="/gare" className="flex items-center gap-1">
              <FileText size={16} />
              <span>Gare d&apos;Appalto</span>
            </Link>
          </Button>

          <Button variant={pathname === "/preferiti" ? "secondary" : "ghost"} size="sm" asChild>
            <Link href="/preferiti" className="flex items-center gap-1">
              <Heart size={16} />
              <span>Preferiti</span>
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
