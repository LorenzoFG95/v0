"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Building2, Mail, Phone } from "lucide-react";
import type { AtiRichiesta, CategoriaOpera } from "@/lib/types";
import { getAtiRichiesteByBando } from "@/lib/data";

interface AtiRequestsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoria: CategoriaOpera;
  bandoId: string;
  bandoDescrizione: string;
}

export function AtiRequestsListModal({ 
  isOpen, 
  onClose, 
  categoria, 
  bandoId, 
  bandoDescrizione 
}: AtiRequestsListModalProps) {
  const [richieste, setRichieste] = useState<AtiRichiesta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRichieste() {
      if (!isOpen) return;
      
      try {
        setLoading(true);
        const allRichieste = await getAtiRichiesteByBando(parseInt(bandoId));
        
        // Filtra le richieste che hanno la categoria specifica
        const richiesteFiltered = allRichieste.filter(richiesta => 
          richiesta.categorie_offerte.some(cat => cat.categoria_opera_id === parseInt(categoria.id)) ||
          richiesta.categorie_cercate.some(cat => cat.categoria_opera_id === parseInt(categoria.id))
        );
        
        setRichieste(richiesteFiltered);
      } catch (error) {
        console.error("Errore nel recupero delle richieste ATI:", error);
        setRichieste([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRichieste();
  }, [isOpen, bandoId, categoria.id]);

  const handleContatta = (richiesta: AtiRichiesta) => {
    console.log("Contatta azienda:", {
      id: richiesta.azienda_richiedente_id,
      nome: richiesta.azienda?.ragione_sociale,
      citta: richiesta.azienda?.citta,
      regione: richiesta.azienda?.regione
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="text-blue-600" size={20} />
            Richieste ATI - {categoria.id_categoria}
          </DialogTitle>
          <DialogDescription>
            Aziende che hanno richiesto ATI per la categoria <strong>{categoria.id_categoria}</strong> nel bando: {bandoDescrizione}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Caricamento richieste...</span>
            </div>
          ) : richieste.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <Building2 className="mx-auto mb-4 text-gray-300" size={48} />
              <p>Nessuna richiesta ATI trovata per questa categoria.</p>
            </div>
          ) : (
            richieste.map((richiesta) => (
              <Card key={richiesta.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="text-blue-600" size={18} />
                        <h3 className="font-semibold text-lg">
                          {richiesta.azienda?.ragione_sociale || "Azienda non disponibile"}
                        </h3>
                        {richiesta.azienda?.citta && (
                          <span className="text-sm text-gray-500">({richiesta.azienda.citta})</span>
                        )}
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Categorie Offerte */}
                        {richiesta.categorie_offerte.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Categorie Offerte</h4>
                            <div className="flex flex-wrap gap-1">
                              {richiesta.categorie_offerte.map((cat, index) => (
                                <Badge key={index} variant="outline" className="bg-green-50 border-green-300 text-green-700">
                                  {cat.classificazione}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Categorie Cercate */}
                        {richiesta.categorie_cercate.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">Categorie Cercate</h4>
                            <div className="flex flex-wrap gap-1">
                              {richiesta.categorie_cercate.map((cat, index) => (
                                <Badge key={index} variant="outline" className="bg-blue-50 border-blue-300 text-blue-700">
                                  {cat.classificazione} (Priorità: {cat.priorita})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {richiesta.note_aggiuntive && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-gray-600 mb-1">Note</h4>
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{richiesta.note_aggiuntive}</p>
                        </div>
                      )}
                      
                      <div className="mt-3 text-xs text-gray-500">
                        Richiesta creata il: {new Date(richiesta.data_creazione).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <Button
                        onClick={() => handleContatta(richiesta)}
                        className="flex items-center gap-2"
                        size="sm"
                      >
                        <Mail size={16} />
                        Contatta
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}