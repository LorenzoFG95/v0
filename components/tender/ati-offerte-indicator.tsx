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
      <Badge 
        variant="outline" 
        className="ml-2 bg-green-50 border-green-300 text-green-700 hover:bg-green-100 cursor-pointer transition-colors"
        onClick={handleClick}
        title="Clicca per vedere le richieste ATI"
      >
        {offerteCount} ATI
      </Badge>
      
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