import { createClient } from "@/utils/supabase/client";
import { checkSupabaseEnvVars } from "../utils/database";

/**
 * Recupera le categorie opera associate a un'azienda
 * @param aziendaId - ID dell'azienda
 * @returns Array di ID delle categorie opera
 */
export async function getAziendaCategorieOpera(aziendaId: number): Promise<string[]> {
  if (!checkSupabaseEnvVars()) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("azienda_categoria_opera")
      .select("categoria_opera_id")
      .eq("azienda_id", aziendaId);

    if (error) {
      throw new Error(`Errore nel recupero delle categorie opera dell'azienda: ${error.message}`);
    }

    return data?.map(item => item.categoria_opera_id.toString()) || [];
  } catch (error) {
    console.error("Errore nel recupero delle categorie opera dell'azienda:", error);
    throw error;
  }
}

/**
 * Salva le categorie opera per un'azienda (senza classificazione)
 * @param aziendaId - ID dell'azienda
 * @param categorieIds - Array di ID delle categorie opera
 */
export async function saveAziendaCategorieOpera(
  aziendaId: number, 
  categorieIds: string[]
): Promise<void> {
  if (!checkSupabaseEnvVars()) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient();

    // Prima elimina tutte le categorie esistenti per questa azienda
    const { error: deleteError } = await supabase
      .from("azienda_categoria_opera")
      .delete()
      .eq("azienda_id", aziendaId);

    if (deleteError) {
      throw new Error(`Errore nell'eliminazione delle categorie esistenti: ${deleteError.message}`);
    }

    // Poi inserisce le nuove categorie se ce ne sono
    if (categorieIds.length > 0) {
      const insertData = categorieIds.map(categoriaId => ({
        azienda_id: aziendaId,
        categoria_opera_id: parseInt(categoriaId)
      }));

      const { error: insertError } = await supabase
        .from("azienda_categoria_opera")
        .insert(insertData);

      if (insertError) {
        throw new Error(`Errore nell'inserimento delle nuove categorie: ${insertError.message}`);
      }
    }
  } catch (error) {
    console.error("Errore nel salvataggio delle categorie opera dell'azienda:", error);
    throw error;
  }
}

/**
 * Salva le categorie opera per un'azienda con classificazione
 * @param aziendaId - ID dell'azienda
 * @param categorieConClassificazione - Array di categorie con classificazione
 */
export async function saveAziendaCategorieOperaConClassificazione(
  aziendaId: number,
  categorieConClassificazione: Array<{ categoriaId: string; classificazione: string }>
): Promise<void> {
  if (!checkSupabaseEnvVars()) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient();

    // Prima elimina tutte le categorie esistenti per questa azienda
    const { error: deleteError } = await supabase
      .from("azienda_categoria_opera")
      .delete()
      .eq("azienda_id", aziendaId);

    if (deleteError) {
      throw new Error(`Errore nell'eliminazione delle categorie esistenti: ${deleteError.message}`);
    }

    // Poi inserisce le nuove categorie con classificazioni se ce ne sono
    if (categorieConClassificazione.length > 0) {
      const insertData = categorieConClassificazione.map(item => ({
        azienda_id: aziendaId,
        categoria_opera_id: parseInt(item.categoriaId),
        classificazione: item.classificazione
      }));

      const { error: insertError } = await supabase
        .from("azienda_categoria_opera")
        .insert(insertData);

      if (insertError) {
        throw new Error(`Errore nell'inserimento delle nuove categorie: ${insertError.message}`);
      }
    }
  } catch (error) {
    console.error("Errore nel salvataggio delle categorie opera con classificazione:", error);
    throw error;
  }
}

/**
 * Recupera le categorie opera di un'azienda con classificazione
 * @param aziendaId - ID dell'azienda
 * @returns Array di categorie con classificazione
 */
export async function getAziendaCategorieOperaConClassificazione(
  aziendaId: number
): Promise<Array<{ categoriaId: string; classificazione: string }>> {
  if (!checkSupabaseEnvVars()) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("azienda_categoria_opera")
      .select("categoria_opera_id, classificazione")
      .eq("azienda_id", aziendaId);

    if (error) {
      throw new Error(`Errore nel recupero delle categorie opera dell'azienda: ${error.message}`);
    }

    return data?.map(item => ({
      categoriaId: item.categoria_opera_id.toString(),
      classificazione: item.classificazione || 'I'
    })) || [];
  } catch (error) {
    console.error("Errore nel recupero delle categorie opera con classificazione:", error);
    throw error;
  }
}

/**
 * Recupera l'azienda associata a un utente
 * @param userId - ID dell'utente
 * @returns Dati dell'azienda o null se non trovata
 */
export async function getUserAzienda(
  userId: string
): Promise<{ id: number; ragione_sociale: string } | null> {
  if (!checkSupabaseEnvVars()) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("azienda")
      .select("id, ragione_sociale")
      .eq("creata_da", userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Nessuna azienda trovata
        return null;
      }
      throw new Error(`Errore nel recupero dell'azienda: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Errore nel recupero dell'azienda dell'utente:", error);
    return null;
  }
}

/**
 * Verifica la corrispondenza tra le categorie opera di una gara e quelle dell'azienda utente
 * @param tenderCategorieOpera - Categorie opera della gara
 * @param userId - ID dell'utente
 * @returns Risultato del match con dettagli
 */
export async function checkCategorieOperaMatch(
  tenderCategorieOpera: Array<{ id_categoria: string }>,
  userId: string
): Promise<{
  hasMatch: boolean;
  matchingCategories: string[];
  totalUserCategories: number;
}> {
  try {
    // Ottieni l'azienda dell'utente
    const azienda = await getUserAzienda(userId);
    if (!azienda) {
      return {
        hasMatch: false,
        matchingCategories: [],
        totalUserCategories: 0
      };
    }

    // Ottieni le categorie opera dell'azienda
    const aziendaCategorieIds = await getAziendaCategorieOpera(azienda.id);
    if (aziendaCategorieIds.length === 0) {
      return {
        hasMatch: false,
        matchingCategories: [],
        totalUserCategories: 0
      };
    }

    // Ottieni i dettagli delle categorie dell'azienda per confrontare gli id_categoria
    const supabase = createClient();
    const { data: aziendaCategorie, error } = await supabase
      .from("categoria_opera")
      .select("id_categoria")
      .in("id", aziendaCategorieIds.map(id => parseInt(id)));

    if (error) {
      throw new Error(`Errore nel recupero delle categorie dell'azienda: ${error.message}`);
    }

    const aziendaIdCategorie = aziendaCategorie?.map(cat => cat.id_categoria) || [];
    const tenderIdCategorie = tenderCategorieOpera.map(cat => cat.id_categoria);

    // Trova le categorie in comune
    const matchingCategories = tenderIdCategorie.filter(tenderCat =>
      aziendaIdCategorie.includes(tenderCat)
    );

    return {
      hasMatch: matchingCategories.length > 0,
      matchingCategories,
      totalUserCategories: aziendaIdCategorie.length
    };
  } catch (error) {
    console.error("Errore nella verifica delle categorie opera:", error);
    return {
      hasMatch: false,
      matchingCategories: [],
      totalUserCategories: 0
    };
  }
}

/**
 * Verifica se un'azienda ha categorie opera configurate
 * @param aziendaId - ID dell'azienda
 * @returns true se l'azienda ha categorie configurate
 */
export async function hasAziendaCategorieOpera(aziendaId: number): Promise<boolean> {
  try {
    const categorie = await getAziendaCategorieOpera(aziendaId);
    return categorie.length > 0;
  } catch (error) {
    console.error("Errore nella verifica delle categorie azienda:", error);
    return false;
  }
}

/**
 * Recupera statistiche sulle categorie opera di un'azienda
 * @param aziendaId - ID dell'azienda
 * @returns Statistiche delle categorie
 */
export async function getAziendaCategorieOperaStats(
  aziendaId: number
): Promise<{
  totalCategorie: number;
  categorieConClassificazione: number;
  classificazioni: Record<string, number>;
}> {
  try {
    const categorieConClassificazione = await getAziendaCategorieOperaConClassificazione(aziendaId);
    
    const classificazioni: Record<string, number> = {};
    categorieConClassificazione.forEach(cat => {
      const classif = cat.classificazione || 'I';
      classificazioni[classif] = (classificazioni[classif] || 0) + 1;
    });

    return {
      totalCategorie: categorieConClassificazione.length,
      categorieConClassificazione: categorieConClassificazione.filter(cat => cat.classificazione).length,
      classificazioni
    };
  } catch (error) {
    console.error("Errore nel recupero delle statistiche categorie:", error);
    return {
      totalCategorie: 0,
      categorieConClassificazione: 0,
      classificazioni: {}
    };
  }
}