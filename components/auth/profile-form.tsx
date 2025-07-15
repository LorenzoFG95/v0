"use client"

import { useState, useEffect } from "react"
import { useAuth } from "./auth-provider"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function ProfileForm() {
  const { user, profile, loading } = useAuth()
  const [nome, setNome] = useState("")
  const [cognome, setCognome] = useState("")
  const [telefono, setTelefono] = useState("") // Nuovo campo
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || "")
      setCognome(profile.cognome || "")
      setTelefono(profile.telefono || "")
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setSuccess(false)
    setError(null)

    try {
      const { error } = await supabase
        .from("utente")
        .update({
          nome,
          cognome,
        })
        .eq("id", user.id)

      if (error) throw error

      setSuccess(true)
    } catch (error: any) {
      setError(error.message || "Si è verificato un errore durante il salvataggio")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-4">Caricamento...</div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <Alert>
            <AlertDescription>
              Devi effettuare l&apos;accesso per visualizzare questa pagina.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Informazioni Profilo</CardTitle>
        <CardDescription>
          Aggiorna le tue informazioni personali
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cognome">Cognome</Label>
              <Input
                id="cognome"
                value={cognome}
                onChange={(e) => setCognome(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user.email}
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono">Telefono (opzionale)</Label>
            <Input
              id="telefono"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <AlertDescription>Profilo aggiornato con successo!</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvataggio in corso..." : "Salva modifiche"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}