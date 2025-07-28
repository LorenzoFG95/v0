"use client"

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Target } from "lucide-react";
import type { Tender } from "@/lib/types";
import { checkCategorieOperaMatch } from "@/lib/data";

interface CategorieOperaMatchIndicatorProps {
  tender: Tender;
  userId: string | null;
}

export function CategorieOperaMatchIndicator({ tender, userId }: CategorieOperaMatchIndicatorProps) {
  const [matchData, setMatchData] = useState<{
    hasMatch: boolean;
    matchingCategories: string[];
    totalUserCategories: number;
    loading: boolean;
  }>({ hasMatch: false, matchingCategories: [], totalUserCategories: 0, loading: true });

  useEffect(() => {
    async function checkMatch() {
      if (!userId || !tender.categorieOpera || tender.categorieOpera.length === 0) {
        setMatchData({ hasMatch: false, matchingCategories: [], totalUserCategories: 0, loading: false });
        return;
      }

      try {
        const result = await checkCategorieOperaMatch(tender.categorieOpera, userId);
        setMatchData({ ...result, loading: false });
      } catch (error) {
        console.error("Errore nella verifica delle categorie:", error);
        setMatchData({ hasMatch: false, matchingCategories: [], totalUserCategories: 0, loading: false });
      }
    }

    checkMatch();
  }, [tender.categorieOpera, userId]);

  if (matchData.loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-8 rounded-md"></div>
    );
  }

  if (!userId || matchData.totalUserCategories === 0) {
    return null;
  }

  if (!matchData.hasMatch) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center">
          <Target className="text-gray-400 mr-2" size={18} />
          <div className="text-sm text-gray-600">
            Nessuna corrispondenza con le tue categorie opera
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <CheckCircle className="text-green-600 mr-2" size={18} />
          <div>
            <div className="text-sm font-medium text-green-800">
              Corrispondenza trovata!
            </div>
            <div className="text-xs text-green-600">
              {matchData.matchingCategories.length} su {tender.categorieOpera!.length} categorie corrispondono
            </div>
          </div>
        </div>
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          Match
        </Badge>
      </div>
      
      {matchData.matchingCategories.length > 0 && (
        <div className="mt-2 pt-2 border-t border-green-200">
          <div className="text-xs text-green-700 font-medium mb-1">
            Categorie in comune:
          </div>
          <div className="flex flex-wrap gap-1">
            {matchData.matchingCategories.map((categoria, index) => (
              <Badge key={index} variant="outline" className="text-xs border-green-300 text-green-700">
                {categoria}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}