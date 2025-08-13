import { createClient } from "@/utils/supabase/client"
import type { Tender, AtiRichiesta, AtiRichiestaForm, Aggiudicatario } from "./types"

// Funzione per convertire i dati dal database al formato dell'applicazione
function mapDatabaseToTender(
  dbData: any,
  enteData?: any,
  lottoData?: any,
  cpvData?: any,
  naturaPrincipaleData?: any,
  criterioAggiudicazioneData?: any,
  tipoProceduraData?: any,
  aggiudicatariData?: { hasAggiudicatari: boolean, aggiudicatari: Aggiudicatario[] },
): Tender {
  return {
    id: dbData.id.toString(),
    cig: dbData.cig || undefined,
    titolo:
      dbData.descrizione?.substring(0, 100) + "..." || "Titolo non disponibile",
    descrizione: dbData.descrizione || "Descrizione non disponibile",
    planificazione: "Pianificazione",
    valore: lottoData?.valore || dbData.importo_totale || 0,
    importoSicurezza: dbData.importo_sicurezza || 0,
    pubblicazione: dbData.data_pubblicazione || new Date().toISOString(),
    scadenza: dbData.scadenza_offerta || null,
    inizioGara: dbData.data_pubblicazione || new Date().toISOString(),
    cpv: cpvData ? cpvData.codice : "CPV non specificato",
    categoria: cpvData ? cpvData.descrizione : "Non specificata",
    naturaPrincipale: naturaPrincipaleData ? naturaPrincipaleData.descrizione : undefined,
    criterioAggiudicazione: criterioAggiudicazioneData ? criterioAggiudicazioneData.descrizione : "Offerta economicamente più vantaggiosa",
    procedura: tipoProceduraData ? tipoProceduraData.descrizione : "Procedura aperta",
    stazioneAppaltante: {
      id: enteData?.id?.toString() || "0",
      nome: enteData?.denominazione || "Stazione appaltante non specificata",
      contatto: enteData?.contatto || "",
      email: enteData?.email || "",
      indirizzo: enteData?.indirizzo || "",
      regione: enteData?.regione || "",
      citta: enteData?.citta || "",
    },
    partecipanti: 0,
    documentiDiGaraLink: dbData.documenti_di_gara_link || undefined,
    aggiudicato: aggiudicatariData?.hasAggiudicatari || false,
    aggiudicatari: aggiudicatariData?.aggiudicatari || [],
  }
}

// Funzione per recuperare gli aggiudicatari di un lotto
async function getAggiudicatariForLotto(supabase: any, lottoId: number): Promise<Aggiudicatario[]> {
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

// Aggiorna la funzione checkIfLottoHasAggiudicatari per restituire anche i dati
async function checkIfLottoHasAggiudicatari(supabase: any, lottoId: number): Promise<{ hasAggiudicatari: boolean, aggiudicatari: Aggiudicatario[] }> {
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
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      switch (stato) {
        case "attiva":
          dataQuery = dataQuery.gt("scadenza_offerta", todayStr);
          break;
        case "in-scadenza":
          dataQuery = dataQuery
            .gt("scadenza_offerta", todayStr)
            .lte("scadenza_offerta", nextWeekStr);
          break;
        case "scaduta":
          dataQuery = dataQuery.lte("scadenza_offerta", todayStr);
          break;
        case "aggiudicata":
          // Per i bandi aggiudicati, dobbiamo filtrare dopo aver recuperato i dati
          // perché dobbiamo controllare la tabella aggiudicatario
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

    let aggiudicatariMap: Record<number, boolean> = {};
    let aggiudicatariDataMap: Record<number, Aggiudicatario[]> = {};

    if (lottiData && lottiData.length > 0) {
      const lottiIds = lottiData.map(lotto => lotto.id).filter(id => id !== null && id !== undefined);

      if (lottiIds.length > 0) {
        // Verifica per ogni lotto se ha aggiudicatari
        const aggiudicatariPromises = lottiIds.map(async (lottoId) => {
          const result = await checkIfLottoHasAggiudicatari(supabase, lottoId);
          return { lottoId, hasAggiudicatari: result.hasAggiudicatari, aggiudicatari: result.aggiudicatari };
        });

        const aggiudicatariResults = await Promise.all(aggiudicatariPromises);
        aggiudicatariMap = aggiudicatariResults.reduce((acc, result) => {
          acc[result.lottoId] = result.hasAggiudicatari;
          return acc;
        }, {} as Record<number, boolean>);

        aggiudicatariDataMap = aggiudicatariResults.reduce((acc, result) => {
          acc[result.lottoId] = result.aggiudicatari;
          return acc;
        }, {} as Record<number, Aggiudicatario[]>);
      }
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

    // Se il filtro è "aggiudicata", filtriamo i risultati dopo aver controllato gli aggiudicatari
    let finalCount = count || 0;
    if (stato === "aggiudicata" && lottiData && lottiData.length > 0) {
      const gareConAggiudicatari = new Set<number>();
      
      // Utilizziamo la mappa già creata invece di rifare le query
      for (const lotto of lottiData) {
        if (aggiudicatariMap[lotto.id]) {
          gareConAggiudicatari.add(lotto.gara_id);
        }
      }
      
      // Filtriamo le gare che hanno lotti con aggiudicatari
      const gareDataFiltered = gareData.filter(gara => gareConAggiudicatari.has(gara.id));
      
      if (gareDataFiltered.length !== gareData.length) {
        // Aggiorna i dati filtrati e il conteggio
        gareData.splice(0, gareData.length, ...gareDataFiltered);
        finalCount = gareDataFiltered.length;
      }
    }

    // Mappiamo i dati
    const mappedTenders = gareData.map((gara) => {
      const enteData = gara.ente_appaltante_id ? entiMap[gara.ente_appaltante_id] : undefined;
      const lottoData = lottiMap[gara.id];
      const cpvData = cpvMap[gara.id as keyof typeof cpvMap];
      const naturaPrincipaleData = naturaPrincipaleMap[gara.id as keyof typeof naturaPrincipaleMap];
      const criterioAggiudicazioneData = criterioAggiudicazioneMap[gara.id as keyof typeof criterioAggiudicazioneMap];
      const tipoProceduraData = tipoProceduraMap[gara.id as keyof typeof tipoProceduraMap];

      // Correggiamo il parametro passato alla funzione mapDatabaseToTender
      const aggiudicatariData = lottoData ? {
        hasAggiudicatari: aggiudicatariMap[lottoData.id] || false,
        aggiudicatari: aggiudicatariDataMap[lottoData.id] || []
      } : { hasAggiudicatari: false, aggiudicatari: [] };

      const tender = mapDatabaseToTender(
        gara,
        enteData,
        lottoData,
        cpvData,
        naturaPrincipaleData,
        criterioAggiudicazioneData,
        tipoProceduraData,
        aggiudicatariData // Passiamo l'oggetto completo invece del solo booleano
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
      total: finalCount // Utilizziamo il conteggio corretto
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

// Funzioni per gestire le categorie opera dell'azienda
export async function getAziendaCategorieOpera(aziendaId: number): Promise<string[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("azienda_categoria_opera")
      .select("categoria_opera_id")
      .eq("azienda_id", aziendaId)

    if (error) {
      throw new Error(`Errore nel recupero delle categorie opera dell'azienda: ${error.message}`);
    }

    return data?.map(item => item.categoria_opera_id.toString()) || [];
  } catch (error) {
    console.error("Errore nel recupero delle categorie opera dell'azienda:", error);
    throw error;
  }
}

export async function saveAziendaCategorieOpera(aziendaId: number, categorieIds: string[]): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient()

    // Prima elimina tutte le categorie esistenti per questa azienda
    const { error: deleteError } = await supabase
      .from("azienda_categoria_opera")
      .delete()
      .eq("azienda_id", aziendaId)

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
        .insert(insertData)

      if (insertError) {
        throw new Error(`Errore nell'inserimento delle nuove categorie: ${insertError.message}`);
      }
    }
  } catch (error) {
    console.error("Errore nel salvataggio delle categorie opera dell'azienda:", error);
    throw error;
  }
}

export async function saveAziendaCategorieOperaConClassificazione(
  aziendaId: number,
  categorieConClassificazione: Array<{ categoriaId: string; classificazione: string }>
): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient()

    // Prima elimina tutte le categorie esistenti per questa azienda
    const { error: deleteError } = await supabase
      .from("azienda_categoria_opera")
      .delete()
      .eq("azienda_id", aziendaId)

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
        .insert(insertData)

      if (insertError) {
        throw new Error(`Errore nell'inserimento delle nuove categorie: ${insertError.message}`);
      }
    }
  } catch (error) {
    console.error("Errore nel salvataggio delle categorie opera con classificazione:", error);
    throw error;
  }
}

export async function getAziendaCategorieOperaConClassificazione(
  aziendaId: number
): Promise<Array<{ categoriaId: string; classificazione: string }>> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("azienda_categoria_opera")
      .select("categoria_opera_id, classificazione")
      .eq("azienda_id", aziendaId)

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

// Funzione per ottenere l'azienda dell'utente corrente
export async function getUserAzienda(userId: string): Promise<{ id: number; ragione_sociale: string } | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("azienda")
      .select("id, ragione_sociale")
      .eq("creata_da", userId)
      .single()

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

// Funzione per verificare la corrispondenza delle categorie opera
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
      .in("id", aziendaCategorieIds.map(id => parseInt(id)))

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

// ==================== FUNZIONI ATI ====================

// Crea una nuova richiesta ATI
export async function createAtiRichiesta(atiData: AtiRichiestaForm, userId: string): Promise<number> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient();

    // Ottieni l'azienda dell'utente
    const azienda = await getUserAzienda(userId);
    if (!azienda) {
      throw new Error("Nessuna azienda trovata per l'utente");
    }

    // Verifica se esiste già una richiesta ATI per questo bando
    const { data: existingRequest, error: checkError } = await supabase
      .from("ati_richieste")
      .select("id")
      .eq("bando_id", atiData.bando_id)
      .eq("azienda_richiedente_id", azienda.id)
      .eq("stato", "attiva")
      .single();

    if (existingRequest) {
      throw new Error("Esiste già una richiesta ATI attiva per questo bando");
    }

    // Ottieni la data di scadenza del bando
    const { data: bandoData, error: bandoError } = await supabase
      .from("gara")
      .select("scadenza_offerta")
      .eq("id", atiData.bando_id)
      .single();

    if (bandoError) {
      throw new Error(`Errore nel recupero del bando: ${bandoError.message}`);
    }

    // Crea la richiesta ATI
    const { data: atiRichiesta, error: atiError } = await supabase
      .from("ati_richieste")
      .insert({
        bando_id: atiData.bando_id,
        azienda_richiedente_id: azienda.id,
        data_scadenza: bandoData.scadenza, // Scade con il bando
        note_aggiuntive: atiData.note_aggiuntive
      })
      .select("id")
      .single();

    if (atiError) {
      throw new Error(`Errore nella creazione della richiesta ATI: ${atiError.message}`);
    }

    const atiRichiestaId = atiRichiesta.id;

    // Inserisci le categorie offerte
    if (atiData.categorie_offerte.length > 0) {
      const categorieOfferte = atiData.categorie_offerte.map(categoria => ({
        ati_richiesta_id: atiRichiestaId,
        categoria_opera_id: categoria.categoria_opera_id,
        classificazione: categoria.classificazione
      }));

      const { error: offerteError } = await supabase
        .from("ati_categorie_offerte")
        .insert(categorieOfferte);

      if (offerteError) {
        throw new Error(`Errore nell'inserimento delle categorie offerte: ${offerteError.message}`);
      }
    }

    // Inserisci le categorie cercate
    if (atiData.categorie_cercate.length > 0) {
      const categorieCercate = atiData.categorie_cercate.map(categoria => ({
        ati_richiesta_id: atiRichiestaId,
        categoria_opera_id: categoria.categoria_opera_id,
        priorita: categoria.priorita,
        classificazione: categoria.classificazione
      }));

      const { error: cercateError } = await supabase
        .from("ati_categorie_cercate")
        .insert(categorieCercate);

      if (cercateError) {
        throw new Error(`Errore nell'inserimento delle categorie cercate: ${cercateError.message}`);
      }
    }

    return atiRichiestaId;
  } catch (error) {
    console.error("Errore nella creazione della richiesta ATI:", error);
    throw error;
  }
}

// Ottieni tutte le richieste ATI per un bando
export async function getAtiRichiesteByBando(bandoId: number): Promise<AtiRichiesta[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

  try {
    const supabase = createClient();

    const { data: richieste, error } = await supabase
      .from("ati_richieste")
      .select(`
        *,
        azienda:azienda_richiedente_id(
          id,
          ragione_sociale,
          citta,
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

// Ottieni le richieste ATI di un'azienda
export async function getAtiRichiesteByAzienda(userId: string): Promise<AtiRichiesta[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

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

// Conta le offerte ATI per categoria in un bando
export async function getAtiOfferteCountByCategoria(bandoId: number): Promise<Record<string, number>> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Variabili di ambiente Supabase non configurate.");
  }

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

// Verifica se l'utente ha già una richiesta ATI per un bando
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
    // Rimuovi .single() qui

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
