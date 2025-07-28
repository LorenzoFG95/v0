"use client"

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import type { CategoriaOpera } from "@/lib/types";
import { getAtiOfferteCountByCategoria } from "@/lib/data";

interface AtiOfferteIndicatorProps {
  categoria: CategoriaOpera;
  bandoId: string;
}

export function AtiOfferteIndicator({ categoria, bandoId }: AtiOfferteIndicatorProps) {
  const [offerteCount, setOfferteCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-5 w-8 rounded-full"></div>
    );
  }

  if (offerteCount === 0) {
    return null;
  }

  return (
    <Badge 
      variant="outline" 
      className="ml-2 bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
    >
      {offerteCount} ATI
    </Badge>
  );
}