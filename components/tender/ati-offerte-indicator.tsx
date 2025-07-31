"use client"

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import type { CategoriaOpera } from "@/lib/types";
import { getAtiOfferteCountByCategoria } from "@/lib/data";
import { AtiRequestsListModal } from "./ati-requests-list-modal";

interface AtiOfferteIndicatorProps {
  categoria: CategoriaOpera;
  bandoId: string;
  bandoDescrizione?: string;
}

export function AtiOfferteIndicator({ categoria, bandoId, bandoDescrizione = "" }: AtiOfferteIndicatorProps) {
  const [offerteCount, setOfferteCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function fetchOfferteCount() {
      try {
        setLoading(true);
        // Correzione: conversione del bandoId da string a number
        const counts = await getAtiOfferteCountByCategoria(parseInt(bandoId));
        const count = counts[categoria.id_categoria] || 0;
        setOfferteCount(count);
      } catch (error) {
        console.error("Errore nel recupero conteggio offerte ATI:", error);
        setOfferteCount(0);
      } finally {
        setLoading(false);
      }
    }

    fetchOfferteCount();
  }, [categoria.id_categoria, bandoId]);

  const handleClick = () => {
    if (offerteCount > 0) {
      setShowModal(true);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-5 w-8 rounded-full"></div>
    );
  }

  if (offerteCount === 0) {
    return null;
  }

  return (
    <>
      <div className="relative inline-flex items-center">
        <Badge 
          variant="outline" 
          className="ml-2 bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors"
          onClick={handleClick}
          title={`Ci sono ${offerteCount} aziende che offrono questa categoria per collaborare in ATI`}
        >
          ATI
        </Badge>
        
        {/* Pallino di notifica stile WhatsApp */}
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-sm">
          {offerteCount}
        </div>
      </div>
      
      <AtiRequestsListModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        categoria={categoria}
        bandoId={bandoId}
        bandoDescrizione={bandoDescrizione}
      />
    </>
  );
}