import { Header } from "@/components/header"
import { ProfileForm } from "@/components/auth/profile-form"

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Il Tuo Profilo</h1>
          <p className="text-gray-600 mt-2">
            Gestisci le tue informazioni personali e aziendali
          </p>
        </div>
        <ProfileForm />
      </div>
    </main>
  )
}