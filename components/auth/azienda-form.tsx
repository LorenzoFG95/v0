"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
import { getCategorieOpera, getAziendaCategorieOpera, saveAziendaCategorieOpera, saveAziendaCategorieOperaConClassificazione } from "@/lib/data"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"


interface AziendaFormProps {
  azienda?: any
  userId: string
  onClose: () => void
  onSave: (azienda: any) => void
}
// Aggiungi questa interfaccia per le categorie con classificazione
interface CategoriaConClassificazione {
  categoriaId: string
  classificazione: string
}

export function AziendaForm({ azienda, userId, onClose, onSave }: AziendaFormProps) {
  const [codiceFiscale, setCodiceFiscale] = useState("")
  const [partitaIva, setPartitaIva] = useState("")
  const [ragioneSociale, setRagioneSociale] = useState("")
  const [indirizzo, setIndirizzo] = useState("")
  const [citta, setCitta] = useState("")
  const [provincia, setProvincia] = useState("")
  const [regione, setRegione] = useState("")
  const [cap, setCap] = useState("")
  const [telefono, setTelefono] = useState("")
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categorieOpera, setCategorieOpera] = useState<{ id: string; descrizione: string; id_categoria: string }[]>([])
  const [selectedCategorieOpera, setSelectedCategorieOpera] = useState<CategoriaConClassificazione[]>([])
  const [loadingCategorie, setLoadingCategorie] = useState(false)
  const supabase = createClient()

  const classificazioni = [
    { value: 'I', label: 'I - fino a 258.000 €' },
    { value: 'II', label: 'II - fino a 516.000 €' },
    { value: 'III', label: 'III - fino a 1.033.000 €' },
    { value: 'III-bis', label: 'III bis - fino a 1.500.000 €' },
    { value: 'IV', label: 'IV - fino a 2.582.000 €' },
    { value: 'IV-bis', label: 'IV bis - fino a 3.500.000 €' },
    { value: 'V', label: 'V - fino a 5.165.000 €' },
    { value: 'VI', label: 'VI - fino a 10.329.000 €' },
    { value: 'VII', label: 'VII - fino a 15.494.000 €' },
    { value: 'VIII', label: 'VIII - senza limiti' }
  ]

  useEffect(() => {
    if (azienda) {
      setCodiceFiscale(azienda.codice_fiscale || "")
      setPartitaIva(azienda.partita_iva || "")
      setRagioneSociale(azienda.ragione_sociale || "")
      setIndirizzo(azienda.indirizzo || "")
      setCitta(azienda.citta || "")
      setProvincia(azienda.provincia || "")
      setRegione(azienda.regione || "")
      setCap(azienda.cap || "")
      setTelefono(azienda.telefono || "")
      setEmail(azienda.email || "")
      loadAziendaCategorieOpera(azienda.id)
    }
    loadCategorieOpera()
  }, [azienda])

  const loadCategorieOpera = async () => {
    try {
      setLoadingCategorie(true)
      const categorie = await getCategorieOpera()
      setCategorieOpera(categorie)
    } catch (error) {
      console.error("Errore nel caricamento delle categorie opera:", error)
    } finally {
      setLoadingCategorie(false)
    }
  }

  const loadAziendaCategorieOpera = async (aziendaId: number) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("azienda_categoria_opera")
        .select("categoria_opera_id, classificazione")
        .eq("azienda_id", aziendaId)
      
      if (error) throw error
      
      const categorieConClassificazione = data?.map(item => ({
        categoriaId: item.categoria_opera_id.toString(),
        classificazione: item.classificazione || 'I'
      })) || []
      
      setSelectedCategorieOpera(categorieConClassificazione)
    } catch (error) {
      console.error("Errore nel caricamento delle categorie opera dell'azienda:", error)
    }
  }

  const handleCategoriaOperaChange = (categoriaId: string, checked: boolean) => {
    if (checked) {
      setSelectedCategorieOpera(prev => [...prev, { categoriaId, classificazione: 'I' }])
    } else {
      setSelectedCategorieOpera(prev => prev.filter(item => item.categoriaId !== categoriaId))
    }
  }

  const handleClassificazioneChange = (categoriaId: string, classificazione: string) => {
    setSelectedCategorieOpera(prev => 
      prev.map(item => 
        item.categoriaId === categoriaId 
          ? { ...item, classificazione }
          : item
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const aziendaData = {
        codice_fiscale: codiceFiscale,
        partita_iva: partitaIva,
        ragione_sociale: ragioneSociale,
        indirizzo,
        citta,
        provincia,
        regione,
        cap,
        telefono,
        email,
        creata_da: userId,
      }

      let result
      if (azienda) {
        result = await supabase
          .from("azienda")
          .update(aziendaData)
          .eq("id", azienda.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from("azienda")
          .insert([aziendaData])
          .select()
          .single()
      }

      if (result.error) throw result.error

      // Salva le categorie opera con classificazioni
      await saveAziendaCategorieOperaConClassificazione(result.data.id as number, selectedCategorieOpera)

      onSave(result.data)
    } catch (error: any) {
      setError(error.message || "Si è verificato un errore durante il salvataggio")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{azienda ? "Modifica Azienda" : "Aggiungi Azienda"}</CardTitle>
            <CardDescription>
              Inserisci i dati della tua azienda e seleziona le categorie opera di competenza
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sezione Dati Azienda */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Dati Azienda</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ragione_sociale">Ragione Sociale *</Label>
                <Input
                  id="ragione_sociale"
                  value={ragioneSociale}
                  onChange={(e) => setRagioneSociale(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codice_fiscale">Codice Fiscale</Label>
                <Input
                  id="codice_fiscale"
                  value={codiceFiscale}
                  onChange={(e) => setCodiceFiscale(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partita_iva">Partita IVA</Label>
                <Input
                  id="partita_iva"
                  value={partitaIva}
                  onChange={(e) => setPartitaIva(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_azienda">Email Azienda</Label>
                <Input
                  id="email_azienda"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="indirizzo">Indirizzo</Label>
              <Input
                id="indirizzo"
                value={indirizzo}
                onChange={(e) => setIndirizzo(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="citta">Città</Label>
                <Input
                  id="citta"
                  value={citta}
                  onChange={(e) => setCitta(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provincia">Provincia</Label>
                <Input
                  id="provincia"
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cap">CAP</Label>
                <Input
                  id="cap"
                  value={cap}
                  onChange={(e) => setCap(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regione">Regione</Label>
                <Input
                  id="regione"
                  value={regione}
                  onChange={(e) => setRegione(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono_azienda">Telefono</Label>
                <Input
                  id="telefono_azienda"
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
              <h3 className="text-lg font-medium">Categorie Opera di Competenza</h3>
              <p className="text-sm text-muted-foreground">
                Seleziona le categorie opera per le quali la tua azienda è qualificata e specifica la classificazione per ciascuna.
              </p>
              
              {loadingCategorie ? (
                <div className="text-center py-4">Caricamento categorie...</div>
              ) : (
                <ScrollArea className="h-64 w-full border rounded-md p-4">
                  <div className="grid grid-cols-1 gap-4">
                    {categorieOpera.map((categoria) => {
                      const isSelected = selectedCategorieOpera.some(item => item.categoriaId === categoria.id)
                      const selectedItem = selectedCategorieOpera.find(item => item.categoriaId === categoria.id)
                      
                      return (
                        <div key={categoria.id} className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`categoria-${categoria.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => 
                                handleCategoriaOperaChange(categoria.id, checked as boolean)
                              }
                            />
                            <Label 
                              htmlFor={`categoria-${categoria.id}`}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              <span className="font-medium">{categoria.id_categoria}</span> - {categoria.descrizione}
                            </Label>
                          </div>
                          
                          {isSelected && (
                            <div className="ml-6">
                              <Label className="text-xs text-muted-foreground">Classificazione</Label>
                              <Select 
                                value={selectedItem?.classificazione || 'I'}
                                onValueChange={(value) => handleClassificazioneChange(categoria.id, value)}
                              >
                                <SelectTrigger className="w-full mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {classificazioni.map((classif) => (
                                    <SelectItem key={classif.value} value={classif.value}>
                                      {classif.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
              
              {selectedCategorieOpera.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Categorie selezionate: {selectedCategorieOpera.length}
                </div>
              )}
            </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annulla
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Salvataggio..." : (azienda ? "Aggiorna" : "Salva")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}