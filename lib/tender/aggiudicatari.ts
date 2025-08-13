import { createClient } from "@/utils/supabase/client";
import type { Aggiudicatario } from "../types";

/**
 * Recupera tutti gli aggiudicatari per un lotto specifico
 * @param supabase - Client Supabase
 * @param lottoId - ID del lotto
 * @returns Array di aggiudicatari
 */
export async function getAggiudicatariForLotto(
  supabase: any, 
  lottoId: number
): Promise<Aggiudicatario[]> {
  try {
    const { data, error } = await supabase
      .from("aggiudicatario")
      .select("id, denominazione, codice_fiscale, importo, data_aggiudicazione")
      .eq("lotto_id", lottoId);

    if (error) {
      console.error("Errore nel recupero aggiudicatari:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Errore nel recupero aggiudicatari:", error);
    return [];
  }
}

/**
 * Verifica se un lotto ha aggiudicatari e restituisce i dati
 * @param supabase - Client Supabase
 * @param lottoId - ID del lotto
 * @returns Oggetto con flag hasAggiudicatari e array aggiudicatari
 */
export async function checkIfLottoHasAggiudicatari(
  supabase: any, 
  lottoId: number
): Promise<{ hasAggiudicatari: boolean; aggiudicatari: Aggiudicatario[] }> {
  try {
    const aggiudicatari = await getAggiudicatariForLotto(supabase, lottoId);
    return {
      hasAggiudicatari: aggiudicatari.length > 0,
      aggiudicatari
    };
  } catch (error) {
    console.error("Errore nel controllo aggiudicatari:", error);
    return { hasAggiudicatari: false, aggiudicatari: [] };
  }
}

/**
 * Recupera aggiudicatari per multipli lotti in parallelo
 * @param supabase - Client Supabase
 * @param lottoIds - Array di ID dei lotti
 * @returns Map con lottoId come chiave e aggiudicatari come valore
 */
export async function getAggiudicatariForMultipleLotti(
  supabase: any,
  lottoIds: number[]
): Promise<Map<number, Aggiudicatario[]>> {
  try {
    const promises = lottoIds.map(async (lottoId) => {
      const aggiudicatari = await getAggiudicatariForLotto(supabase, lottoId);
      return [lottoId, aggiudicatari] as [number, Aggiudicatario[]];
    });

    const results = await Promise.all(promises);
    return new Map(results);
  } catch (error) {
    console.error("Errore nel recupero aggiudicatari multipli:", error);
    return new Map();
  }
}

/**
 * Verifica se esistono aggiudicatari per una lista di lotti
 * @param supabase - Client Supabase
 * @param lottoIds - Array di ID dei lotti
 * @returns Map con lottoId come chiave e boolean come valore
 */
export async function checkMultipleLottiHaveAggiudicatari(
  supabase: any,
  lottoIds: number[]
): Promise<Map<number, boolean>> {
  try {
    const aggiudicatariMap = await getAggiudicatariForMultipleLotti(supabase, lottoIds);
    const resultMap = new Map<number, boolean>();
    
    for (const [lottoId, aggiudicatari] of aggiudicatariMap) {
      resultMap.set(lottoId, aggiudicatari.length > 0);
    }
    
    return resultMap;
  } catch (error) {
    console.error("Errore nel controllo aggiudicatari multipli:", error);
    return new Map();
  }
}