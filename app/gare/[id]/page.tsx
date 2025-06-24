import { Header } from "@/components/header"
import { getTenderById } from "@/lib/data"
import { TenderDetails } from "@/components/tender-details"
import { BackButton } from "@/components/back-button"
import { notFound } from "next/navigation"

export default async function TenderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tender = await getTenderById(id)

  if (!tender) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <BackButton />
        <TenderDetails tender={tender} />
      </div>
    </main>
  )
}
