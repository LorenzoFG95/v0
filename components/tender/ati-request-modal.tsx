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

// Tipo corretto per il form
interface AtiRichiestaFormData {
  bandoId: string;
  categorieOfferte: string[];
  categorieCercate: string[];
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
        ? [...prev.categorieOfferte, categoria.id_categoria]
        : prev.categorieOfferte.filter(id => id !== categoria.id_categoria)
    }));
  };

  const handleCategoriaCercataToggle = (categoria: CategoriaOpera, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      categorieCercate: checked 
        ? [...prev.categorieCercate, categoria.id_categoria]
        : prev.categorieCercate.filter(id => id !== categoria.id_categoria)
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
      
      // Correzione: creare l'oggetto nel formato corretto per l'API
      const atiData = {
        bando_id: parseInt(tender.id),
        categorie_offerte: formData.categorieOfferte.map(cat => parseInt(cat)),
        categorie_cercate: formData.categorieCercate.map((cat, index) => ({
          categoria_opera_id: parseInt(cat),
          priorita: index + 1
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

          {/* Categorie Cercate */}
          <div>
            <Label className="text-base font-medium">Categorie che stai cercando</Label>
            <p className="text-sm text-gray-600 mb-3">
              Seleziona le categorie opera per cui cerchi partner qualificati
            </p>
            
            {tender.categorieOpera && tender.categorieOpera.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-md p-3">
                {tender.categorieOpera.map((categoria) => (
                  <div key={`cercata-${categoria.id_categoria}`} className="flex items-start space-x-2">
                    <Checkbox
                      id={`cercata-${categoria.id_categoria}`}
                      checked={formData.categorieCercate.includes(categoria.id_categoria)}
                      onCheckedChange={(checked) => 
                        handleCategoriaCercataToggle(categoria, checked as boolean)
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={`cercata-${categoria.id_categoria}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {categoria.id_categoria}
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
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Nessuna categoria opera disponibile per questo bando.</p>
            )}
          </div>

          {/* Categorie Offerte */}
          <div>
            <Label className="text-base font-medium">Categorie che la tua azienda può offrire</Label>
            <p className="text-sm text-gray-600 mb-3">
              Seleziona le categorie opera per cui la tua azienda ha le qualificazioni necessarie
            </p>
            
            {tender.categorieOpera && tender.categorieOpera.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-md p-3">
                {tender.categorieOpera.map((categoria) => (
                  <div key={`offerta-${categoria.id_categoria}`} className="flex items-start space-x-2">
                    <Checkbox
                      id={`offerta-${categoria.id_categoria}`}
                      checked={formData.categorieOfferte.includes(categoria.id_categoria)}
                      onCheckedChange={(checked) => 
                        handleCategoriaOffertaToggle(categoria, checked as boolean)
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={`offerta-${categoria.id_categoria}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {categoria.id_categoria}
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
                ))}
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
            disabled={isSubmitting || (formData.categorieOfferte.length === 0 && formData.categorieCercate.length === 0) || !privacyConsent}
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