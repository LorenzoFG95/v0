"use client"

import { useState, useEffect } from "react"
import { useAuth } from "./auth-provider"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Building2, Plus } from "lucide-react"
import { AziendaForm } from "./azienda-form"

export function ProfileForm() {
  const { user, profile, loading } = useAuth()
  const [nome, setNome] = useState("")
  const [cognome, setCognome] = useState("")
  const [telefono, setTelefono] = useState("")
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [azienda, setAzienda] = useState<any>(null)
  const [showAziendaForm, setShowAziendaForm] = useState(false)
  // Imposta lo stato di caricamento
  const [loadingAzienda, setLoadingAzienda] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const supabase = createClient()

  useEffect(() => {
    if (profile) {
      // Salva i dati del profilo nel localStorage quando sono disponibili
      const profileData = {
        nome: profile.nome || "",
        cognome: profile.cognome || "",
        telefono: profile.telefono || ""
      };
      
      setNome(profileData.nome);
      setCognome(profileData.cognome);
      setTelefono(profileData.telefono);
      
      // Salva nel localStorage
      if (user) {
        localStorage.setItem(`profile_${user.id}`, JSON.stringify(profileData));
      }
    } else if (user) {
      // Se il profilo non è disponibile ma l'utente sì, prova a caricare dal localStorage
      const cachedProfile = localStorage.getItem(`profile_${user.id}`);
      if (cachedProfile) {
        try {
          const parsedProfile = JSON.parse(cachedProfile);
          setNome(parsedProfile.nome || "");
          setCognome(parsedProfile.cognome || "");
          setTelefono(parsedProfile.telefono || "");
        } catch (e) {
          console.error("Errore nel parsing dei dati del profilo dal localStorage:", e);
        }
      }
      
      // Carica comunque i dati freschi dal server
      loadUserProfile();
    }
  }, [profile, user, loading])

  // Funzione per caricare il profilo utente direttamente
  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('utente')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error("Errore nel caricamento del profilo:", error);
      } else if (data) {
        // Aggiorna gli stati locali
        setNome(data.nome || "");
        setCognome(data.cognome || "");
        setTelefono(data.telefono || "");
        
        // Salva i dati nel localStorage
        const profileData = {
          nome: data.nome || "",
          cognome: data.cognome || "",
          telefono: data.telefono || ""
        };
        localStorage.setItem(`profile_${user.id}`, JSON.stringify(profileData));
      }
    } catch (error) {
      console.error("Eccezione in loadUserProfile:", error);
    }
  }

  // Effetto separato che si attiva quando user è disponibile
  useEffect(() => {
    // Carica i dati dell'azienda solo quando l'utente è disponibile
    if (user) {
      // Prima controlla se ci sono dati nel localStorage
      const cachedAzienda = localStorage.getItem(`azienda_${user.id}`);
      if (cachedAzienda) {
        try {
          const parsedAzienda = JSON.parse(cachedAzienda);
          setAzienda(parsedAzienda);
        } catch (e) {
          console.error("Errore nel parsing dei dati dal localStorage:", e);
        }
      }
      
      // Poi prova comunque a caricare i dati freschi dal server
      loadAzienda();
    }
  }, [user])

  const loadAzienda = async () => {
    if (!user) return;
    
    try {
      setLoadingAzienda(true);
      
      const { data, error } = await supabase
        .from('azienda')
        .select('*')
        .eq('creata_da', user.id)
        .single();
      
      if (error) {
        // Se l'errore è 'No rows found' è normale quando l'utente non ha un'azienda
        if (error.code !== 'PGRST116') {
          // Gestisci altri tipi di errori
        }
      } else if (data) {
        setAzienda(data);
        
        // Salva i dati nel localStorage per il prossimo refresh
        localStorage.setItem(`azienda_${user.id}`, JSON.stringify(data));
      }
    } catch (error) {
      console.error("Eccezione in loadAzienda:", error);
    } finally {
      setLoadingAzienda(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setSuccess(false)
    setError(null)

    try {
      const { data, error } = await supabase
        .from("utente")
        .update({
          nome,
          cognome,
          telefono,
        })
        .eq("id", user.id)
        .select() // Aggiungi questa riga per ottenere i dati aggiornati

      if (error) throw error

      // Salva i dati aggiornati nel localStorage
      const profileData = { nome, cognome, telefono };
      localStorage.setItem(`profile_${user.id}`, JSON.stringify(profileData));

      // Verifica che i dati siano stati aggiornati
      console.log("Dati aggiornati:", data);

      setSuccess(true)
      setEditMode(false) // Disattiva la modalità di modifica dopo il salvataggio
      
      // Aggiorna manualmente il profilo con i dati appena salvati
      if (data && data.length > 0) {
        // Aggiorna gli stati locali con i dati restituiti dal server
        setNome(data[0].nome || "");
        setCognome(data[0].cognome || "");
        setTelefono(data[0].telefono || "");
      }
      
      // Imposta immediatamente saving a false invece di usare un timeout
      setSaving(false);
      
    } catch (error: any) {
      setError(error.message || "Si è verificato un errore durante il salvataggio")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-4">Caricamento...</div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <Alert>
            <AlertDescription>
              Devi effettuare l'accesso per visualizzare questa pagina.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sezione Informazioni Personali */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Informazioni Personali</CardTitle>
          <CardDescription>
            {editMode ? "Modifica le tue informazioni personali" : "Visualizza le tue informazioni personali"}
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
                  disabled={!editMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cognome">Cognome</Label>
                <Input
                  id="cognome"
                  value={cognome}
                  onChange={(e) => setCognome(e.target.value)}
                  required
                  disabled={!editMode}
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
                disabled={!editMode}
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
            {editMode ? (
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Salvataggio in corso..." : "Salva modifiche"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditMode(false)} className="flex-1">
                  Annulla
                </Button>
              </div>
            ) : (
              <Button type="button" onClick={() => setEditMode(true)} className="w-full">
                Modifica Dati Personali
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Sezione Azienda */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Azienda
          </CardTitle>
          <CardDescription>
            Gestisci i dati della tua azienda
          </CardDescription>
        </CardHeader>
        <CardContent>
          {azienda ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Ragione Sociale</Label>
                  <p className="text-sm">{azienda.ragione_sociale}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Partita IVA</Label>
                  <p className="text-sm">{azienda.partita_iva || 'Non specificata'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Città</Label>
                  <p className="text-sm">{azienda.citta || 'Non specificata'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Email</Label>
                  <p className="text-sm">{azienda.email || 'Non specificata'}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowAziendaForm(true)}
                className="w-full"
              >
                Modifica Dati Azienda
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna azienda registrata</h3>
              <p className="text-gray-500 mb-4">Aggiungi i dati della tua azienda per completare il profilo</p>
              <Button onClick={() => setShowAziendaForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Azienda
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Azienda (modale o espandibile) */}
      {showAziendaForm && (
        <AziendaForm 
          azienda={azienda}
          userId={user.id}
          onClose={() => setShowAziendaForm(false)}
          onSave={(newAzienda) => {
            setAzienda(newAzienda);
            // Aggiorna anche il localStorage
            localStorage.setItem(`azienda_${user.id}`, JSON.stringify(newAzienda));
            setShowAziendaForm(false);
          }}
        />
      )}
    </div>
  )
}