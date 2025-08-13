import { createClient } from "@/utils/supabase/client";
import type { AtiRichiesta, AtiRichiestaForm } from "../types";
import { getUserAzienda } from "../azienda/profile";
import { checkSupabaseEnvVars } from "../utils/database";

/**
 * Crea una nuova richiesta ATI per un bando
 * @param atiData - Dati della richiesta ATI
 * @param userId - ID dell'utente che crea la richiesta
 * @returns ID della richiesta ATI creata
 * @throws Error se la creazione fallisce
 */
export async function createAtiRichiesta(atiData: AtiRichiestaForm, userId: string): Promise<number> {
  checkSupabaseEnvVars();

  try {
    const supabase = createClient();

    // Ottieni l'azienda dell'utente
    const azienda = await getUserAzienda(userId);
    if (!azienda) {
      throw new Error("Azienda non trovata per l'utente");
    }

    // Verifica se esiste già una richiesta ATI per questo bando
    const hasExistingRequest = await hasAtiRichiestaForBando(atiData.bando_id, userId);
    if (hasExistingRequest) {
      throw new Error("Esiste già una richiesta ATI per questo bando");
    }

    // Ottieni la data di scadenza del bando
    const { data: bandoData, error: bandoError } = await supabase
      .from("gare")
      .select("scadenza_offerta")
      .eq("id", atiData.bando_id)
      .single();

    if (bandoError) {
      throw new Error(`Errore nel recupero del bando: ${bandoError.message}`);
    }

    // Inserisci la richiesta ATI
    const { data: richiestaData, error: richiestaError } = await supabase
      .from("ati_richieste")
      .insert({
        bando_id: atiData.bando_id,
        azienda_richiedente_id: azienda.id,
        descrizione: atiData.descrizione,
        scadenza_richiesta: bandoData.scadenza_offerta,
        stato: "attiva",
        data_creazione: new Date().toISOString()
      })
      .select("id")
      .single();

    if (richiestaError) {
      throw new Error(`Errore nella creazione della richiesta ATI: ${richiestaError.message}`);
    }

    const richiestaId = richiestaData.id;

    // Inserisci le categorie offerte
    if (atiData.categorie_offerte && atiData.categorie_offerte.length > 0) {
      const categorieOfferte = atiData.categorie_offerte.map(categoria => ({
        ati_richiesta_id: richiestaId,
        categoria_opera_id: categoria.categoria_opera_id,
        descrizione: categoria.descrizione
      }));

      const { error: offerteError } = await supabase
        .from("ati_categorie_offerte")
        .insert(categorieOfferte);

      if (offerteError) {
        throw new Error(`Errore nell'inserimento delle categorie offerte: ${offerteError.message}`);
      }
    }

    // Inserisci le categorie cercate
    if (atiData.categorie_cercate && atiData.categorie_cercate.length > 0) {
      const categorieCercate = atiData.categorie_cercate.map((categoria, index) => ({
        ati_richiesta_id: richiestaId,
        categoria_opera_id: categoria.categoria_opera_id,
        descrizione: categoria.descrizione,
        priorita: categoria.priorita || index + 1
      }));

      const { error: cercateError } = await supabase
        .from("ati_categorie_cercate")
        .insert(categorieCercate);

      if (cercateError) {
        throw new Error(`Errore nell'inserimento delle categorie cercate: ${cercateError.message}`);
      }
    }

    return richiestaId;
  } catch (error) {
    console.error("Errore nella creazione della richiesta ATI:", error);
    throw error;
  }
}

/**
 * Recupera tutte le richieste ATI per un bando specifico
 * @param bandoId - ID del bando
 * @returns Array delle richieste ATI complete con categorie
 */
export async function getAtiRichiesteByBando(bandoId: number): Promise<AtiRichiesta[]> {
  checkSupabaseEnvVars();

  try {
    const supabase = createClient();

    const { data: richieste, error } = await supabase
      .from("ati_richieste")
      .select(`
        *,
        azienda_richiedente:azienda_richiedente_id(
          id,
          ragione_sociale,
          partita_iva,
          codice_fiscale,
          telefono,
          email,
          indirizzo,
          citta,
          provincia,
          cap,
          regione
        )
      `)
      .eq("bando_id", bandoId)
      .eq("stato", "attiva")
      .order("data_creazione", { ascending: false });

    if (error) {
      throw new Error(`Errore nel recupero delle richieste ATI: ${error.message}`);
    }

    // Per ogni richiesta, ottieni le categorie offerte e cercate
    const richiesteComplete = await Promise.all(
      (richieste || []).map(async (richiesta) => {
        // Categorie offerte
        const { data: categorieOfferte, error: offerteError } = await supabase
          .from("ati_categorie_offerte")
          .select(`
            *,
            categoria_opera:categoria_opera_id(
              id,
              id_categoria,
              descrizione
            )
          `)
          .eq("ati_richiesta_id", richiesta.id);

        // Categorie cercate
        const { data: categorieCercate, error: cercateError } = await supabase
          .from("ati_categorie_cercate")
          .select(`
            *,
            categoria_opera:categoria_opera_id(
              id,
              id_categoria,
              descrizione
            )
          `)
          .eq("ati_richiesta_id", richiesta.id)
          .order("priorita", { ascending: false });

        return {
          ...richiesta,
          categorie_offerte: categorieOfferte || [],
          categorie_cercate: categorieCercate || []
        };
      })
    );

    return richiesteComplete;
  } catch (error) {
    console.error("Errore nel recupero delle richieste ATI per bando:", error);
    return [];
  }
}

/**
 * Recupera le richieste ATI di un'azienda
 * @param userId - ID dell'utente
 * @returns Array delle richieste ATI dell'azienda
 */
export async function getAtiRichiesteByAzienda(userId: string): Promise<AtiRichiesta[]> {
  checkSupabaseEnvVars();

  try {
    const supabase = createClient();

    // Ottieni l'azienda dell'utente
    const azienda = await getUserAzienda(userId);
    if (!azienda) {
      return [];
    }

    const { data: richieste, error } = await supabase
      .from("ati_richieste")
      .select(`
        *,
        gara:bando_id(
          id,
          descrizione,
          scadenza_offerta,
          cig
        )
      `)
      .eq("azienda_richiedente_id", azienda.id)
      .order("data_creazione", { ascending: false });

    if (error) {
      throw new Error(`Errore nel recupero delle richieste ATI dell'azienda: ${error.message}`);
    }

    return richieste || [];
  } catch (error) {
    console.error("Errore nel recupero delle richieste ATI dell'azienda:", error);
    return [];
  }
}

/**
 * Conta le offerte ATI per categoria in un bando
 * @param bandoId - ID del bando
 * @returns Record con conteggio per categoria
 */
export async function getAtiOfferteCountByCategoria(bandoId: number): Promise<Record<string, number>> {
  checkSupabaseEnvVars();

  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ati_categorie_offerte")
      .select(`
        categoria_opera_id,
        categoria_opera:categoria_opera_id(
          id_categoria
        ),
        ati_richiesta:ati_richiesta_id(
          bando_id,
          stato
        )
      `)
      .eq("ati_richiesta.bando_id", bandoId)
      .eq("ati_richiesta.stato", "attiva");

    if (error) {
      throw new Error(`Errore nel conteggio delle offerte ATI: ${error.message}`);
    }

    // Conta per id_categoria
    const counts: Record<string, number> = {};
    (data || []).forEach(item => {
      const idCategoria = item.categoria_opera?.id_categoria;
      if (idCategoria) {
        counts[idCategoria] = (counts[idCategoria] || 0) + 1;
      }
    });

    return counts;
  } catch (error) {
    console.error("Errore nel conteggio delle offerte ATI per categoria:", error);
    return {};
  }
}

/**
 * Verifica se l'utente ha già una richiesta ATI per un bando
 * @param bandoId - ID del bando
 * @param userId - ID dell'utente
 * @returns true se esiste già una richiesta
 */
export async function hasAtiRichiestaForBando(bandoId: number, userId: string): Promise<boolean> {
  try {
    const azienda = await getUserAzienda(userId);
    if (!azienda) return false;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("ati_richieste")
      .select("id")
      .eq("bando_id", bandoId)
      .eq("azienda_richiedente_id", azienda.id)
      .eq("stato", "attiva");

    // Controlla se ci sono errori diversi da PGRST116
    if (error && error.code !== 'PGRST116') {
      console.error("Errore nel controllo delle richieste ATI:", error);
      return false;
    }

    // Verifica se ci sono dati e se l'array ha elementi
    return !!data && data.length > 0;
  } catch (error) {
    console.error("Errore nel controllo delle richieste ATI:", error);
    return false;
  }
}

/**
 * Aggiorna lo stato di una richiesta ATI
 * @param richiestaId - ID della richiesta
 * @param nuovoStato - Nuovo stato della richiesta
 * @param userId - ID dell'utente che effettua l'aggiornamento
 * @returns true se l'aggiornamento è riuscito
 */
export async function updateAtiRichiestaStato(
  richiestaId: number, 
  nuovoStato: string, 
  userId: string
): Promise<boolean> {
  checkSupabaseEnvVars();

  try {
    const supabase = createClient();
    const azienda = await getUserAzienda(userId);
    
    if (!azienda) {
      throw new Error("Azienda non trovata per l'utente");
    }

    const { error } = await supabase
      .from("ati_richieste")
      .update({ stato: nuovoStato })
      .eq("id", richiestaId)
      .eq("azienda_richiedente_id", azienda.id);

    if (error) {
      throw new Error(`Errore nell'aggiornamento dello stato: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error("Errore nell'aggiornamento dello stato della richiesta ATI:", error);
    return false;
  }
}

/**
 * Elimina una richiesta ATI e tutte le sue categorie associate
 * @param richiestaId - ID della richiesta da eliminare
 * @param userId - ID dell'utente che effettua l'eliminazione
 * @returns true se l'eliminazione è riuscita
 */
export async function deleteAtiRichiesta(richiestaId: number, userId: string): Promise<boolean> {
  checkSupabaseEnvVars();

  try {
    const supabase = createClient();
    const azienda = await getUserAzienda(userId);
    
    if (!azienda) {
      throw new Error("Azienda non trovata per l'utente");
    }

    // Elimina prima le categorie associate
    await supabase
      .from("ati_categorie_offerte")
      .delete()
      .eq("ati_richiesta_id", richiestaId);

    await supabase
      .from("ati_categorie_cercate")
      .delete()
      .eq("ati_richiesta_id", richiestaId);

    // Poi elimina la richiesta
    const { error } = await supabase
      .from("ati_richieste")
      .delete()
      .eq("id", richiestaId)
      .eq("azienda_richiedente_id", azienda.id);

    if (error) {
      throw new Error(`Errore nell'eliminazione della richiesta: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error("Errore nell'eliminazione della richiesta ATI:", error);
    return false;
  }
}