"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Handshake, Plus } from "lucide-react";
import type { Tender, CategoriaOpera } from "@/lib/types";
import { createAtiRichiesta, hasAtiRichiestaForBando } from "@/lib/data";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Tipo corretto per il form
interface AtiRichiestaFormData {
  bandoId: string;
  categorieOfferte: Array<{ categoriaId: string; classificazione: string }>; // Modificato
  categorieCercate: Array<{ categoriaId: string; classificazione: string }>;
  note: string;
}

interface AtiRequestModalProps {
  tender: Tender;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AtiRequestModal({ tender, userId, isOpen, onClose }: AtiRequestModalProps) {
  const [formData, setFormData] = useState<AtiRichiestaFormData>({
    bandoId: tender.id,
    categorieOfferte: [],
    categorieCercate: [],
    note: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExistingRequest, setHasExistingRequest] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [privacyConsent, setPrivacyConsent] = useState(false);

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
  ];

  // Verifica se l'utente ha già una richiesta ATI per questo bando
  useEffect(() => {
    async function checkExistingRequest() {
      if (!isOpen || !userId) return;

      try {
        setCheckingExisting(true);
        // Correzione: parametri nell'ordine corretto
        const hasRequest = await hasAtiRichiestaForBando(parseInt(tender.id), userId);
        setHasExistingRequest(hasRequest);
      } catch (error) {
        console.error("Errore nel controllo richiesta esistente:", error);
      } finally {
        setCheckingExisting(false);
      }
    }

    checkExistingRequest();
  }, [isOpen, userId, tender.id]);

  // Reset form quando il modal si chiude
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        bandoId: tender.id,
        categorieOfferte: [],
        categorieCercate: [],
        note: ""
      });
      setPrivacyConsent(false);
    }
  }, [isOpen, tender.id]);

  const handleCategoriaOffertaToggle = (categoria: CategoriaOpera, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      categorieOfferte: checked
        ? [...prev.categorieOfferte, { categoriaId: categoria.id, classificazione: 'I' }] // Usa categoria.id invece di categoria.id_categoria
        : prev.categorieOfferte.filter(item => item.categoriaId !== categoria.id)
    }));
  };

  const handleClassificazioneChange = (categoriaId: string, classificazione: string) => {
    setFormData(prev => ({
      ...prev,
      categorieOfferte: prev.categorieOfferte.map(item =>
        item.categoriaId === categoriaId
          ? { ...item, classificazione }
          : item
      )
    }));
  };

  const handleCategoriaCercataToggle = (categoria: CategoriaOpera, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      categorieCercate: checked
        ? [...prev.categorieCercate, { categoriaId: categoria.id, classificazione: 'I' }] // Usa categoria.id invece di categoria.id_categoria
        : prev.categorieCercate.filter(item => item.categoriaId !== categoria.id)
    }));
  };

  const handleClassificazioneCercataChange = (categoriaId: string, classificazione: string) => {
    setFormData(prev => ({
      ...prev,
      categorieCercate: prev.categorieCercate.map(item =>
        item.categoriaId === categoriaId
          ? { ...item, classificazione }
          : item
      )
    }));
  };

  const handleSubmit = async () => {
    if (formData.categorieOfferte.length === 0 && formData.categorieCercate.length === 0) {
      toast({
        title: "Errore",
        description: "Devi selezionare almeno una categoria offerta o cercata.",
        variant: "destructive"
      });
      return;
    }

    if (!privacyConsent) {
      toast({
        title: "Consenso richiesto",
        description: "Devi autorizzare la condivisione delle informazioni di contatto per procedere.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Creare l'oggetto nel formato corretto per l'API
      const atiData = {
        bando_id: parseInt(tender.id),
        categorie_offerte: formData.categorieOfferte.map(item => ({
          categoria_opera_id: parseInt(item.categoriaId), // Ora categoriaId è l'ID numerico
          classificazione: item.classificazione
        })),
        categorie_cercate: formData.categorieCercate.map((item, index) => ({
          categoria_opera_id: parseInt(item.categoriaId), // Ora categoriaId è l'ID numerico
          priorita: index + 1,
          classificazione: item.classificazione
        })),
        note_aggiuntive: formData.note
      };

      await createAtiRichiesta(atiData, userId);

      toast({
        title: "Richiesta ATI creata",
        description: "La tua richiesta di ATI è stata registrata con successo."
      });

      onClose();
    } catch (error) {
      console.error("Errore nella creazione richiesta ATI:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione della richiesta.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingExisting) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Controllo richieste esistenti</DialogTitle>
            <DialogDescription>
              Stiamo verificando se hai già una richiesta ATI per questo bando.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Controllo richieste esistenti...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (hasExistingRequest) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Richiesta già presente</DialogTitle>
            <DialogDescription>
              Hai già una richiesta ATI attiva per questo bando. Puoi avere solo una richiesta per bando.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="text-blue-600" size={20} />
            Richiesta ATI - Associazione Temporanea d'Impresa
          </DialogTitle>
          <DialogDescription>
            Crea una richiesta per formare un'ATI per il bando: <strong>{tender.descrizione}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sezione Categorie Cercate */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Categorie Cercate
            </Label>
            <p className="text-sm text-gray-600 mb-3">
              Seleziona le categorie per cui cerchi partner qualificati
            </p>
            {tender.categorieOpera && tender.categorieOpera.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 max-h-64 overflow-y-auto border rounded-md p-3">
                {tender.categorieOpera.map((categoria) => {
                  const isSelected = formData.categorieCercate.some(item => item.categoriaId === categoria.id); // Usa categoria.id
                  const selectedItem = formData.categorieCercate.find(item => item.categoriaId === categoria.id); // Usa categoria.id

                  return (
                    <div key={`cercata-${categoria.id}`} className="space-y-2"> {/* Usa categoria.id */}
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id={`cercata-${categoria.id}`} 
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleCategoriaCercataToggle(categoria, checked as boolean)
                          }
                        />
                        <div className="grid gap-1.5 leading-none flex-1">
                          <label
                            htmlFor={`cercata-${categoria.id}`} 
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {categoria.id_categoria} {/* Mostra ancora id_categoria per l'utente */}
                          </label>
                          <p className="text-xs text-gray-600">
                            {categoria.descrizione}
                          </p>
                          <Badge
                            variant={categoria.cod_tipo_categoria === "P" ? "default" : "secondary"}
                            className="w-fit text-xs"
                          >
                            {categoria.cod_tipo_categoria === "P" ? "Prevalente" : "Scorporabile"}
                          </Badge>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="ml-6 mt-2">
                          <Label className="text-xs text-gray-600">Classificazione minima richiesta</Label>
                          <Select
                            value={selectedItem?.classificazione || 'I'}
                            onValueChange={(value) => handleClassificazioneCercataChange(categoria.id, value)} 
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
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Nessuna categoria opera disponibile per questo bando.</p>
            )}
          </div>

          {/* Sezione Categorie Offerte */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Categorie Offerte
            </Label>
            <p className="text-sm text-gray-600 mb-3">
              Seleziona le categorie per cui la tua azienda è qualificata
            </p>
            {tender.categorieOpera && tender.categorieOpera.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 max-h-64 overflow-y-auto border rounded-md p-3">
                {tender.categorieOpera.map((categoria) => {
                  const isSelected = formData.categorieOfferte.some(item => item.categoriaId === categoria.id); // Usa categoria.id invece di categoria.id_categoria
                  const selectedItem = formData.categorieOfferte.find(item => item.categoriaId === categoria.id); // Usa categoria.id invece di categoria.id_categoria

                  return (
                    <div key={`offerta-${categoria.id}`} className="space-y-2"> 
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id={`offerta-${categoria.id}`} 
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleCategoriaOffertaToggle(categoria, checked as boolean)
                          }
                        />
                        <div className="grid gap-1.5 leading-none flex-1">
                          <label
                            htmlFor={`offerta-${categoria.id}`} 
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {categoria.id_categoria} {/* Mantieni id_categoria per la visualizzazione */}
                          </label>
                          <p className="text-xs text-gray-600">
                            {categoria.descrizione}
                          </p>
                          <Badge
                            variant={categoria.cod_tipo_categoria === "P" ? "default" : "secondary"}
                            className="w-fit text-xs"
                          >
                            {categoria.cod_tipo_categoria === "P" ? "Prevalente" : "Scorporabile"}
                          </Badge>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="ml-6 mt-2">
                          <Label className="text-xs text-gray-600">Classificazione</Label>
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
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Nessuna categoria opera disponibile per questo bando.</p>
            )}
          </div>

          {/* Note aggiuntive */}
          <div>
            <Label htmlFor="note" className="text-base font-medium">Note aggiuntive (opzionale)</Label>
            <p className="text-sm text-gray-600 mb-2">
              Aggiungi informazioni aggiuntive sulla tua richiesta, esperienza specifica, o requisiti particolari
            </p>
            <Textarea
              id="note"
              placeholder="Es: Esperienza pluriennale in opere pubbliche, disponibilità immediata, requisiti specifici..."
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              className="min-h-[100px]"
            />
          </div>

          {/* Consenso Privacy */}
          <div className="border-t pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="privacy-consent"
                  checked={privacyConsent}
                  onCheckedChange={(checked) => setPrivacyConsent(checked as boolean)}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="privacy-consent"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Consenso alla condivisione delle informazioni
                  </label>
                  <p className="text-xs text-gray-700">
                    Autorizzo la piattaforma a mostrare le mie informazioni di contatto (nome azienda, email, telefono)
                    alle aziende interessate a collaborare per questo bando. Questo consenso è necessario per permettere
                    ad altre aziende di contattarmi per proposte di ATI.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annulla
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || formData.categorieOfferte.length === 0 || formData.categorieCercate.length === 0 || !privacyConsent}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creazione...
              </>
            ) : (
              <>
                <Plus size={16} />
                Crea Richiesta ATI
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}