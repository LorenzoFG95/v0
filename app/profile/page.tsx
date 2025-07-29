import { Header } from '@/components/header'
import { ProfileForm } from '@/components/auth/profile-form'
import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/server-auth'

export default async function ProfilePage() {
  // ✅ Verifica solo l'autenticazione, i dati sono già nel contesto
  if (!(await isAuthenticated())) {
    redirect('/auth/login')
  }

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
        {/* ✅ I dati sono già disponibili nel contesto */}
        <ProfileForm />
      </div>
    </main>
  )
}