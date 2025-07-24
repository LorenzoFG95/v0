import { createClient } from "@/utils/supabase/client"
import type { Tender } from "./types"

// Funzione per convertire i dati dal database al formato dell'applicazione
function mapDatabaseToTender(
  dbData: any,
  enteData?: any,
  lottoData?: any,
  cpvData?: any,
  naturaPrincipaleData?: any,
  criterioAggiudicazioneData?: any,
  tipoProceduraData?: any,
): Tender {
  return {
    id: dbData.id.toString(),
    cig: dbData.cig || undefined,
    titolo:
      dbData.descrizione?.substring(0, 100) + "..." || "Titolo non disponibile",
    descrizione: dbData.descrizione || "Descrizione non disponibile",
    planificazione: "Pianificazione",
    valore: lottoData?.valore || dbData.importo_totale || 0,
    importoSicurezza: dbData.importo_sicurezza || 0, // Mappatura del campo importo_sicurezza
    pubblicazione: dbData.data_pubblicazione || new Date().toISOString(),
    scadenza: dbData.scadenza_offerta || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    inizioGara: dbData.data_pubblicazione || new Date().toISOString(),
    cpv: cpvData ? cpvData.codice : "CPV non specificato",
    categoria: cpvData ? cpvData.descrizione : "Non specificata",
    naturaPrincipale: naturaPrincipaleData ? naturaPrincipaleData.descrizione : undefined,
    criterioAggiudicazione: criterioAggiudicazioneData ? criterioAggiudicazioneData.descrizione : "Offerta economicamente più vantaggiosa",
    procedura: tipoProceduraData ? tipoProceduraData.descrizione : "Procedura aperta", // Usa il valore dal database
    stazioneAppaltante: {
      id: enteData?.id?.toString() || "0",
      nome: enteData?.denominazione || "Stazione appaltante non specificata",
      contatto: enteData?.contatto || "",
      email: enteData?.email || "",
      indirizzo: enteData?.indirizzo || "",
      regione: enteData?.regione || "",  // Mappatura del campo regione
      citta: enteData?.citta || "",      // Mappatura del campo citta
    },
    partecipanti: 0,
    documentiDiGaraLink: dbData.documenti_di_gara_link || undefined, 
  }
}

// Funzione per verificare se una tabella esiste
async function tableExists(supabase: any, tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).select("id").limit(1);
    if (error) {
      console.error(`Errore nella verifica della tabella ${tableName}:`, error);
      // Verifica se l'errore è di connessione
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

// Modifica la definizione del parametro
export async function getTenders(filters: {
  searchQuery?: string;
  categoriaOpera?: string[]; // Modificato da string a string[]
  soloPrevalente?: boolean;
  categoria?: string;
  stato?: string;
  startDate?: string;
  endDate?: string;
  minValue?: number;
  maxValue?: number;
  criterioAggiudicazione?: string; 
  regione?: string;  // Nuovo campo
  citta?: string;    // Nuovo campo
  tipoProcedura?: string; // Nuovo campo
  page?: number;
  pageSize?: number;
} = {}): Promise<{ tenders: Tender[], total: number }> {
  const {
    searchQuery,
    categoriaOpera,
    soloPrevalente,
    categoria,
    stato,
    startDate,
    endDate,
    minValue,
    maxValue,
    criterioAggiudicazione,
    regione,     // Nuovo campo
    citta,       // Nuovo campo
    tipoProcedura, // Nuovo campo
    page = 1,
    pageSize = 10
  } = filters;
  // Verifica che le variabili di ambiente siano configurate
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient()

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "gara")
    if (!exists) {
      throw new Error("La tabella 'gara' non esiste.");
    }

    // Se abbiamo un filtro per categoriaOpera, otteniamo prima gli ID delle gare che corrispondono alla categoria
    let gareIdsWithCategoriaOpera: number[] | null = null;
    
    if (categoriaOpera && categoriaOpera.length > 0) {
      // Otteniamo gli ID numerici delle categorie opera dai loro codici
      const { data: categorieOperaData, error: categorieOperaLookupError } = await supabase
        .from("categoria_opera")
        .select("id, id_categoria")
        .in("id_categoria", categoriaOpera);
        
      if (categorieOperaLookupError || !categorieOperaData || categorieOperaData.length === 0) {
        console.error("Errore nel recupero degli ID delle categorie opera:", categorieOperaLookupError);
        return { tenders: [], total: 0 };
      }
      
      // Estraiamo gli ID numerici delle categorie
      const categorieOperaIds = categorieOperaData.map(cat => cat.id);
      
      // Costruiamo una query per ottenere i lotti con le categorie opera specificate
      let categoriaOperaQuery = supabase
        .from("lotto_categoria_opera")
        .select("lotto_id, categoria_opera_id, ruolo")
        .in("categoria_opera_id", categorieOperaIds);
      
      // Se soloPrevalente è true, filtriamo solo per categorie prevalenti
      if (soloPrevalente) {
        categoriaOperaQuery = categoriaOperaQuery.eq("ruolo", "P");
      }
      
      const { data: lottiWithCategoria, error: categoriaError } = await categoriaOperaQuery;
      
      if (categoriaError) {
        console.error("Errore nel recupero dei lotti con categoria opera:", categoriaError);
        return { tenders: [], total: 0 };
      }
      
      if (!lottiWithCategoria || lottiWithCategoria.length === 0) {
        // Nessun lotto corrisponde al filtro
        return { tenders: [], total: 0 };
      }
      
      // Otteniamo gli ID dei lotti
      const lottiIds = lottiWithCategoria.map(item => item.lotto_id);
      
      // Otteniamo le gare associate a questi lotti
      const { data: gareWithCategoria, error: gareError } = await supabase
        .from("lotto")
        .select("gara_id")
        .in("id", lottiIds);
      
      if (gareError) {
        console.error("Errore nel recupero delle gare con categoria opera:", gareError);
        return { tenders: [], total: 0 };
      }
      
      if (!gareWithCategoria || gareWithCategoria.length === 0) {
        // Nessuna gara corrisponde al filtro
        return { tenders: [], total: 0 };
      }
      
      // Salviamo gli ID delle gare che corrispondono al filtro categoriaOpera
      gareIdsWithCategoriaOpera = gareWithCategoria.map(item => item.gara_id);
    }

    // Costruiamo la query per i dati con l'opzione count
    let dataQuery = supabase.from("gara").select("*", { count: "exact" });

    // Applichiamo i filtri alla query
    if (searchQuery) {
      // Applichiamo i filtri alla query
      if (searchQuery) {
        // Prima cerchiamo gli enti appaltanti che corrispondono alla query
        const { data: entiData, error: entiError } = await supabase
          .from("ente_appaltante")
          .select("id")
          .ilike("denominazione", `%${searchQuery}%`);
        
        // Otteniamo gli ID degli enti che corrispondono alla ricerca
        const entiIds = !entiError && entiData ? entiData.map(ente => ente.id) : [];
        
        // Costruiamo la query di ricerca
        dataQuery = dataQuery.or(
          `descrizione.ilike.%${searchQuery}%,` +
          `cig.ilike.%${searchQuery}%` +
          (entiIds.length > 0 ? `,ente_appaltante_id.in.(${entiIds.join(',')})` : '')
        );
      }
    }

    if (startDate) {
      dataQuery = dataQuery.gte("data_pubblicazione", startDate);
    }

    if (endDate) {
      dataQuery = dataQuery.lte("data_pubblicazione", endDate);
    }

    if (categoria) {
      dataQuery = dataQuery.eq("natura_principale_id", categoria);
    }

    if (criterioAggiudicazione) {
      dataQuery = dataQuery.eq("criterio_aggiudicazione_id", criterioAggiudicazione);
    }
    
    if (tipoProcedura) {
      dataQuery = dataQuery.eq("tipo_procedura_id", tipoProcedura);
    }

    if (minValue !== undefined) {
      dataQuery = dataQuery.gte("importo", minValue);
    }

    if (maxValue !== undefined) {
      dataQuery = dataQuery.lte("importo", maxValue);
    }
    
    // Filtri per regione e città
    if (regione) {
      // Prima cerchiamo gli enti appaltanti nella regione specificata
      const { data: entiRegione, error: entiRegioneError } = await supabase
        .from("ente_appaltante")
        .select("id")
        .eq("regione", regione);
      
      if (!entiRegioneError && entiRegione && entiRegione.length > 0) {
        const entiIds = entiRegione.map(ente => ente.id);
        dataQuery = dataQuery.in("ente_appaltante_id", entiIds);
      } else {
        // Se non ci sono enti nella regione, restituiamo un array vuoto
        return { tenders: [], total: 0 };
      }
    }
    
    if (citta) {
      // Prima cerchiamo gli enti appaltanti nella città specificata
      const { data: entiCitta, error: entiCittaError } = await supabase
        .from("ente_appaltante")
        .select("id")
        .eq("citta", citta);
      
      if (!entiCittaError && entiCitta && entiCitta.length > 0) {
        const entiIds = entiCitta.map(ente => ente.id);
        dataQuery = dataQuery.in("ente_appaltante_id", entiIds);
      } else {
        // Se non ci sono enti nella città, restituiamo un array vuoto
        return { tenders: [], total: 0 };
      }
    }
    
    // Applichiamo il filtro categoriaOpera se presente
    if (gareIdsWithCategoriaOpera) {
      dataQuery = dataQuery.in("id", gareIdsWithCategoriaOpera);
    }

    if (stato) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Rimuovi l'orario per confrontare solo le date
      const todayStr = today.toISOString().split('T')[0];
      
      // Calcola la data di una settimana da oggi
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      
      switch (stato) {
        case "attiva":
          // Mostra tender non scaduti (scadenza > oggi)
          dataQuery = dataQuery.gt("scadenza_offerta", todayStr);
          break;
        case "in-scadenza":
          // Mostra tender in scadenza entro una settimana (oggi < scadenza <= oggi+7giorni)
          dataQuery = dataQuery
            .gt("scadenza_offerta", todayStr)
            .lte("scadenza_offerta", nextWeekStr);
          break;
        case "scaduta":
          // Mostra tender scaduti (scadenza <= oggi)
          dataQuery = dataQuery.lte("scadenza_offerta", todayStr);
          break;
      }
    }

    // Eseguiamo la query per ottenere sia i dati che il conteggio
    const { data: gareData, count, error: gareError } = await dataQuery
      .order("data_pubblicazione", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (gareError) {
      throw new Error(`Errore nel recupero delle gare: ${gareError.message}`);
    }

    if (!gareData || gareData.length === 0) {
      return { tenders: [], total: count || 0 };
    }

    // Otteniamo i lotti principali per ogni gara
    const gareIds = gareData.map(gara => gara.id);
    const { data: lottiData, error: lottiError } = await supabase
      .from("lotto")
      .select("*")
      .in("gara_id", gareIds);

    // Creiamo una mappa dei lotti per gara_id
    let lottiMap: Record<number, any> = {};
    if (!lottiError && lottiData) {
      lottiMap = lottiData.reduce((acc, lotto) => {
        if (lotto.gara_id) {
          acc[lotto.gara_id] = lotto;
        }
        return acc;
      }, {} as Record<number, any>);
    }

    // Otteniamo le categorie opera per tutti i lotti
    let categorieOperaMap: Record<number, any[]> = {};
    
    if (lottiData && lottiData.length > 0) {
      const lottiIds = lottiData.map(lotto => lotto.id).filter(id => id !== null && id !== undefined);
      
      if (lottiIds.length > 0) {
        const { data: lottiCategorieData, error: lottiCategorieError } = await supabase
          .from("lotto_categoria_opera")
          .select("lotto_id, categoria_opera_id, ruolo")
          .in("lotto_id", lottiIds);

        if (!lottiCategorieError && lottiCategorieData && lottiCategorieData.length > 0) {
          // Raggruppiamo le categorie per lotto_id
          const categorieIds = lottiCategorieData.map(item => item.categoria_opera_id);
          
          const { data: categorieDetails, error: categorieDetailsError } = await supabase
            .from("categoria_opera")
            .select("*")
            .in("id", categorieIds);

          if (!categorieDetailsError && categorieDetails) {
            // Creiamo una mappa delle categorie per lotto_id
            lottiCategorieData.forEach(link => {
              if (!categorieOperaMap[link.lotto_id]) {
                categorieOperaMap[link.lotto_id] = [];
              }
              
              const categoriaDetail = categorieDetails.find(cat => cat.id === link.categoria_opera_id);
              if (categoriaDetail) {
                categorieOperaMap[link.lotto_id].push({
                  ...categoriaDetail,
                  cod_tipo_categoria: link.ruolo || "S"
                });
              }
            });
          }
        }
      }
    }

    // Otteniamo gli enti appaltanti per le gare recuperate
    const entiIds = gareData.map((gara) => gara.ente_appaltante_id).filter((id) => id !== null && id !== undefined)

    let entiMap: Record<number, any> = {};

    if (entiIds.length > 0) {
      const { data: entiData, error: entiError } = await supabase.from("ente_appaltante").select("*").in("id", entiIds);

      if (entiError) {
        console.error("Errore nel recupero degli enti appaltanti:", entiError);
      } else if (entiData) {
        entiMap = entiData.reduce(
          (acc, ente) => {
            acc[ente.id] = ente;
            return acc;
          },
          {} as Record<number, any>,
        );
      }
    }

    // Recuperiamo i dati CPV per ogni lotto
    const cpvPromises = gareData.map(async (gara) => {
      const lottoData = lottiMap[gara.id];
      if (lottoData?.cpv_id) {
        const { data: cpv, error: cpvError } = await supabase
          .from("categoria_cpv")
          .select("*")
          .eq("id", lottoData.cpv_id)
          .single();
    
        if (cpvError) {
          console.error("Errore nel recupero della categoria CPV:", cpvError);
          return { garaId: gara.id, cpvData: undefined };
        } else {
          return { garaId: gara.id, cpvData: cpv };
        }
      }
      return { garaId: gara.id, cpvData: undefined };
    });

    const cpvResults = await Promise.all(cpvPromises);
    const cpvMap = cpvResults.reduce((acc, result) => {
      if (result) {
        acc[result.garaId] = result.cpvData;
      }
      return acc;
    }, {});

    // Recuperiamo i dati natura principale per ogni lotto
    const naturaPrincipalePromises = gareData.map(async (gara) => {
      if (gara?.natura_principale_id) {
        const { data: naturaPrincipale, error: naturaPrincipaleError } = await supabase
          .from("natura_principale")
          .select("*")
          .eq("id", gara.natura_principale_id)
          .single();
        
        if (naturaPrincipaleError) {
          console.error("Errore nel recupero della natura principale:", naturaPrincipaleError);
          return { garaId: gara.id, naturaPrincipaleData: undefined };
        } else {
          return { garaId: gara.id, naturaPrincipaleData: naturaPrincipale };
        }
      }
      return { garaId: gara.id, naturaPrincipaleData: undefined };
    });
    
    const naturaPrincipaleResults = await Promise.all(naturaPrincipalePromises);
    const naturaPrincipaleMap = naturaPrincipaleResults.reduce((acc, result) => {
      if (result) {
        acc[result.garaId] = result.naturaPrincipaleData;
      }
      return acc;
    }, {});

    // Recuperiamo i dati criterio aggiudicazione per ogni gara
    const criterioAggiudicazionePromises = gareData.map(async (gara) => {
      if (gara?.criterio_aggiudicazione_id) {
        const { data: criterioAggiudicazione, error: criterioAggiudicazioneError } = await supabase
          .from("criterio_aggiudicazione")
          .select("*")
          .eq("id", gara.criterio_aggiudicazione_id)
          .single();
        
        if (criterioAggiudicazioneError) {
          console.error("Errore nel recupero del criterio di aggiudicazione:", criterioAggiudicazioneError);
          return { garaId: gara.id, criterioAggiudicazioneData: undefined };
        } else {
          return { garaId: gara.id, criterioAggiudicazioneData: criterioAggiudicazione };
        }
      }
      return { garaId: gara.id, criterioAggiudicazioneData: undefined };
    });

    const criterioAggiudicazioneResults = await Promise.all(criterioAggiudicazionePromises);
    const criterioAggiudicazioneMap = criterioAggiudicazioneResults.reduce((acc, result) => {
      if (result) {
        acc[result.garaId] = result.criterioAggiudicazioneData;
      }
      return acc;
    }, {});

    // Recuperiamo i dati tipo procedura per ogni gara
    const tipoProceduraPromises = gareData.map(async (gara) => {
      if (gara?.tipo_procedura_id) {
        const { data: tipoProcedura, error: tipoProceduraError } = await supabase
          .from("tipo_procedura")
          .select("*")
          .eq("id", gara.tipo_procedura_id)
          .single();
        
        if (tipoProceduraError) {
          console.error("Errore nel recupero del tipo di procedura:", tipoProceduraError);
          return { garaId: gara.id, tipoProceduraData: undefined };
        } else {
          return { garaId: gara.id, tipoProceduraData: tipoProcedura };
        }
      }
      return { garaId: gara.id, tipoProceduraData: undefined };
    });

    const tipoProceduraResults = await Promise.all(tipoProceduraPromises);
    const tipoProceduraMap = tipoProceduraResults.reduce((acc, result) => {
      if (result) {
        acc[result.garaId] = result.tipoProceduraData;
      }
      return acc;
    }, {});

    // Mappiamo i dati
    const mappedTenders = gareData.map((gara) => {
      const enteData = gara.ente_appaltante_id ? entiMap[gara.ente_appaltante_id] : undefined;
      const lottoData = lottiMap[gara.id];
      const cpvData = cpvMap[gara.id as keyof typeof cpvMap];
      const naturaPrincipaleData = naturaPrincipaleMap[gara.id as keyof typeof naturaPrincipaleMap];
      const criterioAggiudicazioneData = criterioAggiudicazioneMap[gara.id as keyof typeof criterioAggiudicazioneMap];
      const tipoProceduraData = tipoProceduraMap[gara.id as keyof typeof tipoProceduraMap];
      
      const tender = mapDatabaseToTender(
        gara, 
        enteData, 
        lottoData, 
        cpvData, 
        naturaPrincipaleData,
        criterioAggiudicazioneData,
        tipoProceduraData
      );
      
      // Aggiungiamo le categorie opera se disponibili
      if (lottoData && categorieOperaMap[lottoData.id]) {
        tender.categorieOpera = categorieOperaMap[lottoData.id].sort((a, b) => {
          // Ordina prima le categorie prevalenti (P) e poi le scorporabili
          if (a.cod_tipo_categoria === "P" && b.cod_tipo_categoria !== "P") return -1;
          if (a.cod_tipo_categoria !== "P" && b.cod_tipo_categoria === "P") return 1;
          return 0;
        });
      }
      return tender;
    });
    
    return {
      tenders: mappedTenders,
      total: count || 0
    };
  } catch (error) {
    console.error("Errore generale nel recupero delle gare:", error);
    throw error;
  }
}

export async function getTenderById(id: string): Promise<Tender | undefined> {
  // Verifica che le variabili di ambiente siano configurate
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient()

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "gara")
    if (!exists) {
      throw new Error("La tabella 'gara' non esiste.");
    }

    // Otteniamo la gara
    const { data: garaData, error: garaError } = await supabase.from("gara").select("*").eq("id", id).single()

    if (garaError) {
      throw new Error(`Errore nel recupero della gara: ${garaError.message}`);
    }

    if (!garaData) {
      return undefined;
    }

    // Otteniamo l'ente appaltante se disponibile
    let enteData = undefined
    if (garaData.ente_appaltante_id) {
      const { data: ente, error: enteError } = await supabase
        .from("ente_appaltante")
        .select("*")
        .eq("id", garaData.ente_appaltante_id)
        .single()

      if (enteError) {
        console.error("Errore nel recupero dell'ente appaltante:", enteError)
      } else {
        enteData = ente
      }
    }

    // Otteniamo il lotto principale della gara
    const { data: lottoData, error: lottoError } = await supabase
      .from("lotto")
      .select("*")
      .eq("gara_id", garaData.id)
      .order("id", { ascending: true })
      .limit(1)
      .single()

    if (lottoError) {
      console.error("Errore nel recupero del lotto:", lottoError)
      return mapDatabaseToTender(garaData, enteData)
    }

    if (!lottoData) {
      return mapDatabaseToTender(garaData, enteData)
    }

    // Otteniamo le categorie opera per il lotto
    // Otteniamo le categorie opera per il lotto
    let categorieOperaData: any[] = []
    const { data: categorieOpera, error: categorieOperaError } = await supabase
      .from("lotto_categoria_opera")
      .select("*, categoria_opera(*)")
      .eq("lotto_id", lottoData.id)
      if (!categorieOperaError && categorieOpera) {
        // Modifica qui: invece di estrarre solo categoria_opera, manteniamo anche il ruolo
        categorieOperaData = categorieOpera.map((item) => ({
          ...item.categoria_opera,
          cod_tipo_categoria: item.ruolo,
          descrizione_tipo_categoria: item.ruolo === 'P' ? 'Prevalente' : 'Scorporabile'
        })).filter(Boolean)
        
        // Ordiniamo le categorie: prima le prevalenti, poi le scorporabili
        categorieOperaData.sort((a, b) => {
          if (a.cod_tipo_categoria === 'P' && b.cod_tipo_categoria !== 'P') return -1;
          if (a.cod_tipo_categoria !== 'P' && b.cod_tipo_categoria === 'P') return 1;
          return 0;
        });
      }

    // Otteniamo la categoria CPV
    let cpvData = undefined
    if (lottoData.cpv_id) {
      const { data: cpv, error: cpvError } = await supabase
        .from("categoria_cpv")
        .select("*")
        .eq("id", lottoData.cpv_id)
        .single()

      if (!cpvError) {
        cpvData = cpv
      }
    }

    // Otteniamo il tipo di procedura
    let tipoProceduraData = undefined
    if (garaData.tipo_procedura_id) {
      const { data: tipoProcedura, error: tipoProceduraError } = await supabase
        .from("tipo_procedura")
        .select("*")
        .eq("id", garaData.tipo_procedura_id)
        .single()

      if (!tipoProceduraError) {
        tipoProceduraData = tipoProcedura
      }
    }

    // Otteniamo la natura principale
    let naturaPrincipaleData = undefined
    if (garaData.natura_principale_id) {
      const { data: naturaPrincipale, error: naturaPrincipaleError } = await supabase
        .from("natura_principale")
        .select("*")
        .eq("id", garaData.natura_principale_id)
        .single()

      if (!naturaPrincipaleError) {
        naturaPrincipaleData = naturaPrincipale
      }
    }

    // Otteniamo il criterio di aggiudicazione
    let criterioAggiudicazioneData = undefined
    if (garaData.criterio_aggiudicazione_id) {
      const { data: criterioAggiudicazione, error: criterioAggiudicazioneError } = await supabase
        .from("criterio_aggiudicazione")
        .select("*")
        .eq("id", garaData.criterio_aggiudicazione_id)
        .single()

      if (!criterioAggiudicazioneError) {
        criterioAggiudicazioneData = criterioAggiudicazione
      }
    }

    // Mappiamo i dati includendo le categorie opera
    const tender = mapDatabaseToTender(garaData, enteData, lottoData, cpvData, naturaPrincipaleData, criterioAggiudicazioneData, tipoProceduraData)
    tender.categorieOpera = categorieOperaData
    
    // Otteniamo i dati del RUP
    let rupData = undefined
    const { data: rup, error: rupError } = await supabase
      .from("rup")
      .select("*")
      .eq("gara_id", garaData.id)
      .single()

    if (!rupError && rup) {
      rupData = rup
    }
    
    // Aggiungiamo i dati del RUP
    if (rupData) {
      tender.rup = {
        nome: rupData.nome,
        cognome: rupData.cognome,
        email: rupData.email,
        telefono: rupData.telefono
      }
    }
    
    return tender

  } catch (error) {
    console.error("Errore generale nel recupero della gara:", error)
    throw error;
  }
}

export async function getTendersByIds(ids: string[]): Promise<Tender[]> {
  // Verifica che le variabili di ambiente siano configurate
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient()

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "gara")
    if (!exists) {
      throw new Error("La tabella 'gara' non esiste.");
    }

    // Otteniamo le gare
    const { data: gareData, error: gareError } = await supabase.from("gara").select("*").in("id", ids)

    if (gareError) {
      throw new Error(`Errore nel recupero delle gare: ${gareError.message}`);
    }

    if (!gareData || gareData.length === 0) {
      return [];
    }

    // Carica gli enti appaltanti necessari
    const entiIds = [...new Set(gareData.map(gara => gara.ente_appaltante_id).filter(Boolean))];
    let entiMap: Record<number, any> = {};
    
    if (entiIds.length > 0) {
      const { data: entiData, error: entiError } = await supabase
        .from("ente_appaltante")
        .select("*")
        .in("id", entiIds);
      
      if (!entiError && entiData) {
        entiMap = entiData.reduce(
          (acc, ente) => ({ ...acc, [ente.id]: ente }),
          {} as Record<number, any>
        );
      }
    }

    // Carica i tipi di procedura necessari
    const tipoProceduraIds = [...new Set(gareData.map(gara => gara.tipo_procedura_id).filter(Boolean))];
    let tipoProceduraMap: Record<number, any> = {};
    
    if (tipoProceduraIds.length > 0) {
      const { data: tipoProceduraData, error: tipoProceduraError } = await supabase
        .from("tipo_procedura")
        .select("*")
        .in("id", tipoProceduraIds);
      
      if (!tipoProceduraError && tipoProceduraData) {
        tipoProceduraMap = tipoProceduraData.reduce(
          (acc, tipo) => ({ ...acc, [tipo.id]: tipo }),
          {} as Record<number, any>
        );
      }
    }

    // Mappiamo i dati
    return gareData.map((gara) => {
      const enteData = gara.ente_appaltante_id ? entiMap[gara.ente_appaltante_id] : undefined
      const tipoProceduraData = gara.tipo_procedura_id ? tipoProceduraMap[gara.tipo_procedura_id] : undefined
      return mapDatabaseToTender(gara, enteData, undefined, undefined, undefined, undefined, tipoProceduraData)
    })
  } catch (error) {
    console.error("Errore generale nel recupero delle gare:", error)
    throw error;
  }
}



export async function getEntiAppaltanti(): Promise<{ id: string; nome: string }[]> {
  // Verifica che le variabili di ambiente siano configurate
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient()

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "ente_appaltante")
    if (!exists) {
      throw new Error("La tabella 'ente_appaltante' non esiste.");
    }

    const { data, error } = await supabase.from("ente_appaltante").select("id, denominazione").order("denominazione")

    if (error) {
      throw new Error(`Errore nel recupero degli enti: ${error.message}`);
    }

    return (
      data?.map((ente) => ({
        id: ente.id.toString(),
        nome: ente.denominazione,
      })) || []
    )
  } catch (error) {
    console.error("Errore generale nel recupero degli enti:", error)
    throw error;
  }
}

export async function getCategorieNatura(): Promise<{ id: string; descrizione: string }[]> {
  // Verifica che le variabili di ambiente siano configurate
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient()

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "natura_principale")
    if (!exists) {
      throw new Error("La tabella 'natura_principale' non esiste.");
    }

    const { data, error } = await supabase.from("natura_principale").select("id, descrizione").order("descrizione")

    if (error) {
      throw new Error(`Errore nel recupero delle nature: ${error.message}`);
    }

    return (
      data?.map((natura) => ({
        id: natura.id.toString(),
        descrizione: natura.descrizione,
      })) || []
    )
  } catch (error) {
    console.error("Errore generale nel recupero delle nature:", error)
    throw error;
  }
}


export async function getCategorieOpera(): Promise<{ id: string; descrizione: string; id_categoria: string }[]> {
  // Verifica che le variabili di ambiente siano configurate
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient()

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "categoria_opera")
    if (!exists) {
      throw new Error("La tabella 'categoria_opera' non esiste.");
    }

    const { data, error } = await supabase
      .from("categoria_opera")
      .select("id, descrizione, id_categoria")
      .order("id")

    if (error) {
      throw new Error(`Errore nel recupero delle categorie opera: ${error.message}`);
    }

    return (
      data?.map((categoria) => ({
        id: categoria.id.toString(),
        descrizione: categoria.descrizione,
        id_categoria: categoria.id_categoria,
      })) || []
    )
  } catch (error) {
    console.error("Errore generale nel recupero delle categorie opera:", error)
    throw error;
  }
}


export async function getCriterioAggiudicazione(): Promise<{ id: string; descrizione: string }[]> {
  // Verifica che le variabili di ambiente siano configurate
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient()

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "criterio_aggiudicazione")
    if (!exists) {
      throw new Error("La tabella 'criterio_aggiudicazione' non esiste.");
    }

    const { data, error } = await supabase
      .from("criterio_aggiudicazione")
      .select("id, descrizione")
      .order("descrizione")

    if (error) {
      throw new Error(`Errore nel recupero dei criteri di aggiudicazione: ${error.message}`);
    }

    return (
      data?.map((criterio) => ({
        id: criterio.id.toString(),
        descrizione: criterio.descrizione,
      })) || []
    )
  } catch (error) {
    console.error("Errore generale nel recupero dei criteri di aggiudicazione:", error)
    throw error;
  }
}


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

export async function getCittaByRegione(regione: string): Promise<{ citta: string }[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient()

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "ente_appaltante")
    if (!exists) {
      throw new Error("La tabella 'ente_appaltante' non esiste.");
    }

    const { data, error } = await supabase
      .from("ente_appaltante")
      .select("citta")
      .eq("regione", regione)
      .not("citta", "is", null)
      .order("citta")

    if (error) {
      throw new Error(`Errore nel recupero delle città: ${error.message}`);
    }

    // Deduplicare le città e filtrare le stringhe vuote
    const citta = [...new Set(data?.map(item => item.citta))].filter(citta => citta.trim() !== "");
    
    return citta.map(citta => ({ citta })) || [];
  } catch (error) {
    console.error("Errore generale nel recupero delle città:", error)
    throw error;
  }
}

export async function getTipiProcedura(): Promise<{ id: string; descrizione: string }[]> {
  // Verifica che le variabili di ambiente siano configurate
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient()

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "tipo_procedura")
    if (!exists) {
      throw new Error("La tabella 'tipo_procedura' non esiste.");
    }

    const { data, error } = await supabase
      .from("tipo_procedura")
      .select("id, descrizione")
      .order("descrizione")

    if (error) {
      throw new Error(`Errore nel recupero dei tipi di procedura: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Errore nel recupero dei tipi di procedura:", error);
    return [];
  }
}
