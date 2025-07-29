import { AuthProvider } from '@/components/auth/auth-provider'
import { getCompleteUserData } from '@/lib/server-auth'
import './globals.css'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ Carica i dati utente una volta sola al livello root
  const userData = await getCompleteUserData()

  return (
    <html lang="it">
      <body>
        <AuthProvider initialUserData={userData}>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
