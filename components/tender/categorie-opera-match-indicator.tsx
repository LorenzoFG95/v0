"use client"

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Target, LogIn, Building } from "lucide-react";
import type { Tender } from "@/lib/types";
import { checkCategorieOperaMatch } from "@/lib/data";
import Link from "next/link";

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
    hasAzienda: boolean;
  }>({ hasMatch: false, matchingCategories: [], totalUserCategories: 0, loading: true, hasAzienda: false });

  useEffect(() => {
    async function checkMatch() {
      if (!userId || !tender.categorieOpera || tender.categorieOpera.length === 0) {
        setMatchData({ hasMatch: false, matchingCategories: [], totalUserCategories: 0, loading: false, hasAzienda: false });
        return;
      }

      try {
        const result = await checkCategorieOperaMatch(tender.categorieOpera, userId);
        setMatchData({ ...result, loading: false, hasAzienda: result.totalUserCategories > 0 });
      } catch (error) {
        console.error("Errore nella verifica delle categorie:", error);
        setMatchData({ hasMatch: false, matchingCategories: [], totalUserCategories: 0, loading: false, hasAzienda: false });
      }
    }

    checkMatch();
  }, [tender.categorieOpera, userId]);

  if (matchData.loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-8 rounded-md"></div>
    );
  }

  // Call to action per utenti non loggati
  if (!userId) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <LogIn className="text-blue-600 mr-2" size={18} />
            <div>
              <div className="text-sm font-medium text-blue-800">
                Accedi per trovare un azienda partner in possesso dei requisiti mancanti
              </div>
              {/* <div className="text-xs text-blue-600">
                Accedi per vedere se le tue categorie opera corrispondono a questa gara
              </div> */}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/auth/login">
              <Button size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                Accedi
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Registrati
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Call to action per utenti loggati senza azienda
  if (userId && matchData.totalUserCategories === 0) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Building className="text-orange-600 mr-2" size={18} />
            <div>
              <div className="text-sm font-medium text-orange-800">
                Completa il tuo profilo aziendale
              </div>
              <div className="text-xs text-orange-600">
                Registra la tua azienda e le categorie opera per verificare la compatibilità
              </div>
            </div>
          </div>
          <Link href="/profile">
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
              Completa Profilo
            </Button>
          </Link>
        </div>
      </div>
    );
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