"use client"

import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function BackButton() {
  const router = useRouter()

  return (
    <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
      <ChevronLeft size={16} className="mr-1" />
      Torna alla dashboard
    </Button>
  )
}
