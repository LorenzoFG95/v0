import { createClient } from "@/utils/supabase/client"

// Funzione helper per verificare se una tabella esiste
async function tableExists(supabase: any, tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).select("id").limit(1);
    if (error) {
      console.error(`Errore nella verifica della tabella ${tableName}:`, error);
      if (error.message?.includes("getaddrinfo failed") ||
        error.message?.includes("connection") ||
        error.message?.includes("network")) {
        console.error("Errore di connessione a Supabase. Verificare le credenziali e la connessione di rete.");
      }
    }
    return !error;
  } catch (error) {
    console.error(`Errore nella verifica della tabella ${tableName}:`, error);
    return false;
  }
}

// Funzione helper per verificare le variabili di ambiente
function checkEnvironmentVariables(): void {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }
}

/**
 * Recupera la lista degli enti appaltanti
 * @returns Promise<{ id: string; nome: string }[]>
 */
export async function getEntiAppaltanti(): Promise<{ id: string; nome: string }[]> {
  checkEnvironmentVariables();

  try {
    const supabase = createClient();

    const exists = await tableExists(supabase, "ente_appaltante");
    if (!exists) {
      throw new Error("La tabella 'ente_appaltante' non esiste.");
    }

    const { data, error } = await supabase
      .from("ente_appaltante")
      .select("id, denominazione")
      .order("denominazione");

    if (error) {
      throw new Error(`Errore nel recupero degli enti: ${error.message}`);
    }

    return (
      data?.map((ente) => ({
        id: ente.id.toString(),
        nome: ente.denominazione,
      })) || []
    );
  } catch (error) {
    console.error("Errore generale nel recupero degli enti:", error);
    throw error;
  }
}

/**
 * Recupera la lista delle categorie natura
 * @returns Promise<{ id: string; descrizione: string }[]>
 */
export async function getCategorieNatura(): Promise<{ id: string; descrizione: string }[]> {
  checkEnvironmentVariables();

  try {
    const supabase = createClient();

    const exists = await tableExists(supabase, "natura_principale");
    if (!exists) {
      throw new Error("La tabella 'natura_principale' non esiste.");
    }

    const { data, error } = await supabase
      .from("natura_principale")
      .select("id, descrizione")
      .order("descrizione");

    if (error) {
      throw new Error(`Errore nel recupero delle nature: ${error.message}`);
    }

    return (
      data?.map((natura) => ({
        id: natura.id.toString(),
        descrizione: natura.descrizione,
      })) || []
    );
  } catch (error) {
    console.error("Errore generale nel recupero delle nature:", error);
    throw error;
  }
}

/**
 * Recupera la lista delle categorie opera
 * @returns Promise<{ id: string; descrizione: string; id_categoria: string }[]>
 */
export async function getCategorieOpera(): Promise<{ id: string; descrizione: string; id_categoria: string }[]> {
  checkEnvironmentVariables();

  try {
    const supabase = createClient();

    const exists = await tableExists(supabase, "categoria_opera");
    if (!exists) {
      throw new Error("La tabella 'categoria_opera' non esiste.");
    }

    const { data, error } = await supabase
      .from("categoria_opera")
      .select("id, descrizione, id_categoria")
      .order("id");

    if (error) {
      throw new Error(`Errore nel recupero delle categorie opera: ${error.message}`);
    }

    return (
      data?.map((categoria) => ({
        id: categoria.id.toString(),
        descrizione: categoria.descrizione,
        id_categoria: categoria.id_categoria,
      })) || []
    );
  } catch (error) {
    console.error("Errore generale nel recupero delle categorie opera:", error);
    throw error;
  }
}

/**
 * Recupera la lista dei criteri di aggiudicazione
 * @returns Promise<{ id: string; descrizione: string }[]>
 */
export async function getCriterioAggiudicazione(): Promise<{ id: string; descrizione: string }[]> {
  checkEnvironmentVariables();

  try {
    const supabase = createClient();

    const exists = await tableExists(supabase, "criterio_aggiudicazione");
    if (!exists) {
      throw new Error("La tabella 'criterio_aggiudicazione' non esiste.");
    }

    const { data, error } = await supabase
      .from("criterio_aggiudicazione")
      .select("id, descrizione")
      .order("descrizione");

    if (error) {
      throw new Error(`Errore nel recupero dei criteri di aggiudicazione: ${error.message}`);
    }

    return (
      data?.map((criterio) => ({
        id: criterio.id.toString(),
        descrizione: criterio.descrizione,
      })) || []
    );
  } catch (error) {
    console.error("Errore generale nel recupero dei criteri di aggiudicazione:", error);
    throw error;
  }
}

/**
 * Recupera la lista delle regioni italiane
 * @returns Promise<{ regione: string }[]>
 */
export async function getRegioni(): Promise<{ regione: string }[]> {
  // Lista completa delle regioni italiane (in maiuscolo per coerenza con il DB)
  const tutte_regioni = [
    "ABRUZZO", "BASILICATA", "CALABRIA", "CAMPANIA", "EMILIA-ROMAGNA",
    "FRIULI-VENEZIA GIULIA", "LAZIO", "LIGURIA", "LOMBARDIA", "MARCHE",
    "MOLISE", "PIEMONTE", "PUGLIA", "SARDEGNA", "SICILIA",
    "TOSCANA", "TRENTINO-ALTO ADIGE", "UMBRIA", "VALLE D'AOSTA", "VENETO"
  ];

  return tutte_regioni.map(regione => ({ regione }));
}

/**
 * Recupera la lista delle città per una regione specifica
 * @param regione - Nome della regione
 * @returns Promise<{ citta: string }[]>
 */
export async function getCittaByRegione(regione: string): Promise<{ citta: string }[]> {
  checkEnvironmentVariables();

  try {
    const supabase = createClient();

    const exists = await tableExists(supabase, "ente_appaltante");
    if (!exists) {
      throw new Error("La tabella 'ente_appaltante' non esiste.");
    }

    const { data, error } = await supabase
      .from("ente_appaltante")
      .select("citta")
      .eq("regione", regione)
      .not("citta", "is", null)
      .order("citta");

    if (error) {
      throw new Error(`Errore nel recupero delle città: ${error.message}`);
    }

    // Deduplicare le città e filtrare le stringhe vuote
    const citta = [...new Set(data?.map(item => item.citta))].filter(citta => citta.trim() !== "");

    return citta.map(citta => ({ citta })) || [];
  } catch (error) {
    console.error("Errore generale nel recupero delle città:", error);
    throw error;
  }
}

/**
 * Recupera la lista dei tipi di procedura
 * @returns Promise<{ id: string; descrizione: string }[]>
 */
export async function getTipiProcedura(): Promise<{ id: string; descrizione: string }[]> {
  checkEnvironmentVariables();

  try {
    const supabase = createClient();

    const exists = await tableExists(supabase, "tipo_procedura");
    if (!exists) {
      throw new Error("La tabella 'tipo_procedura' non esiste.");
    }

    const { data, error } = await supabase
      .from("tipo_procedura")
      .select("id, descrizione")
      .order("descrizione");

    if (error) {
      throw new Error(`Errore nel recupero dei tipi di procedura: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Errore nel recupero dei tipi di procedura:", error);
    return [];
  }
}