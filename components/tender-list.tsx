"use client"

import Link from "next/link"
import { TenderCard } from "@/components/tender-card"
import type { Tender } from "@/lib/types"

interface TenderListProps {
  tenders: Tender[]
}

export function TenderList({ tenders }: TenderListProps) {
  if (tenders.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">Nessuna gara trovata</h3>
        <p className="text-gray-500">Prova a modificare i filtri di ricerca</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tenders.map((tender) => (
          <Link href={`/gare/${tender.id}`} key={tender.id}>
            <TenderCard tender={tender} />
          </Link>
        ))}
      </div>
    </div>
  )
}
