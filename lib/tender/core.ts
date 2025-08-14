import { createClient } from "@/utils/supabase/client";
import type { Tender, Aggiudicatario } from "../types";
import { checkSupabaseEnvVars, tableExists } from "../utils/database";
import { checkIfLottoHasAggiudicatari } from "./aggiudicatari";

/**
 * Interfaccia per i filtri di ricerca delle gare
 */
export interface TenderFilters {
  searchQuery?: string;
  categoriaOpera?: string[];
  soloPrevalente?: boolean;
  categoria?: string;
  stato?: string;
  startDate?: string;
  endDate?: string;
  minValue?: number;
  maxValue?: number;
  criterioAggiudicazione?: string;
  regione?: string;
  citta?: string;
  tipoProcedura?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Converte i dati dal database al formato dell'applicazione
 * @param dbData - Dati della gara dal database
 * @param enteData - Dati dell'ente appaltante
 * @param lottoData - Dati del lotto
 * @param cpvData - Dati della categoria CPV
 * @param naturaPrincipaleData - Dati della natura principale
 * @param criterioAggiudicazioneData - Dati del criterio di aggiudicazione
 * @param tipoProceduraData - Dati del tipo di procedura
 * @param aggiudicatariData - Dati degli aggiudicatari
 * @returns Oggetto Tender formattato
 */
export function mapDatabaseToTender(
  dbData: any,
  enteData?: any,
  lottoData?: any,
  cpvData?: any,
  naturaPrincipaleData?: any,
  criterioAggiudicazioneData?: any,
  tipoProceduraData?: any,
  aggiudicatariData?: { hasAggiudicatari: boolean, aggiudicatari: Aggiudicatario[] },
): Tender {
  // Calcola il valore base del lotto per il calcolo del ribasso
  const valoreBase = lottoData?.valore || dbData.importo_totale || 0;
  
  // Calcola il ribasso per ogni aggiudicatario se presenti
  const aggiudicatariConRibasso = aggiudicatariData?.aggiudicatari?.map(aggiudicatario => {
    let ribasso: number | undefined;
    
    
    // Calcola il ribasso solo se abbiamo sia il valore base che l'importo dell'aggiudicatario
    if (valoreBase > 0 && aggiudicatario.importo > 0) {
      ribasso = Number((((valoreBase - aggiudicatario.importo) / valoreBase) * 100).toFixed(2));
    }
    
    return {
      ...aggiudicatario,
      ribasso
    };
  }) || [];

  return {
    id: dbData.id.toString(),
    cig: dbData.cig || undefined,
    titolo:
      dbData.descrizione?.substring(0, 100) + "..." || "Titolo non disponibile",
    descrizione: dbData.descrizione || "Descrizione non disponibile",
    planificazione: "Pianificazione",
    valore: valoreBase,
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
    aggiudicatari: aggiudicatariConRibasso,
  };
}

/**
 * Recupera le gare con filtri avanzati e paginazione
 * @param filters - Filtri di ricerca
 * @returns Oggetto con array di gare e totale
 */
export async function getTenders(filters: TenderFilters = {}): Promise<{ tenders: Tender[], total: number }> {
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
    regione,
    citta,
    tipoProcedura,
    page = 1,
    pageSize = 10
  } = filters;

  checkSupabaseEnvVars();

  try {
    const supabase = createClient();

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "gara");
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
        return { tenders: [], total: 0 };
      }

      // Salviamo gli ID delle gare che corrispondono al filtro categoriaOpera
      gareIdsWithCategoriaOpera = gareWithCategoria.map(item => item.gara_id);
    }

    // Costruiamo la query per i dati con l'opzione count
    let dataQuery = supabase.from("gara").select("*", { count: "exact" });

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
      const { data: entiRegione, error: entiRegioneError } = await supabase
        .from("ente_appaltante")
        .select("id")
        .eq("regione", regione);

      if (!entiRegioneError && entiRegione && entiRegione.length > 0) {
        const entiIds = entiRegione.map(ente => ente.id);
        dataQuery = dataQuery.in("ente_appaltante_id", entiIds);
      } else {
        return { tenders: [], total: 0 };
      }
    }

    if (citta) {
      const { data: entiCitta, error: entiCittaError } = await supabase
        .from("ente_appaltante")
        .select("id")
        .eq("citta", citta);

      if (!entiCittaError && entiCitta && entiCitta.length > 0) {
        const entiIds = entiCitta.map(ente => ente.id);
        dataQuery = dataQuery.in("ente_appaltante_id", entiIds);
      } else {
        return { tenders: [], total: 0 };
      }
    }

    // Applichiamo il filtro categoriaOpera se presente
    if (gareIdsWithCategoriaOpera) {
      dataQuery = dataQuery.in("id", gareIdsWithCategoriaOpera);
    }

    // Applichiamo tutti i filtri PRIMA della paginazione
    if (stato && stato !== "tutti") {
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
          // Per il filtro aggiudicata, dobbiamo prima ottenere gli ID delle gare con aggiudicatari
          const { data: lottiConAggiudicatari, error: aggiudicatariError } = await supabase
            .from("aggiudicatario")
            .select("lotto_id")
            .not("lotto_id", "is", null);
  
          if (aggiudicatariError) {
            console.error("Errore nel recupero dei lotti con aggiudicatari:", aggiudicatariError);
            return { tenders: [], total: 0 };
          }
  
          if (!lottiConAggiudicatari || lottiConAggiudicatari.length === 0) {
            return { tenders: [], total: 0 };
          }
  
          // Otteniamo gli ID delle gare associate a questi lotti
          const lottiIds = [...new Set(lottiConAggiudicatari.map(item => item.lotto_id))];
          const { data: gareConAggiudicatari, error: gareAggiudicateError } = await supabase
            .from("lotto")
            .select("gara_id")
            .in("id", lottiIds);
  
          if (gareAggiudicateError) {
            console.error("Errore nel recupero delle gare aggiudicate:", gareAggiudicateError);
            return { tenders: [], total: 0 };
          }
  
          if (!gareConAggiudicatari || gareConAggiudicatari.length === 0) {
            return { tenders: [], total: 0 };
          }
  
          const gareAggiudicateIds = [...new Set(gareConAggiudicatari.map(item => item.gara_id))];
          dataQuery = dataQuery.in("id", gareAggiudicateIds);
          break;
      }
    }

    // Eseguiamo la query per ottenere sia i dati che il conteggio
    const startIndex = (page - 1) * pageSize;
    const endIndex = page * pageSize - 1;

    const { data: gareData, count, error: gareError } = await dataQuery
      .order("data_pubblicazione", { ascending: false })
      .range(startIndex, endIndex);

    if (gareError) {
      console.error("[getTenders][DEBUG] Supabase range query error:", {
        page,
        pageSize,
        startIndex,
        endIndex,
        stato,
        message: gareError.message,
        details: (gareError as any)?.details,
        hint: (gareError as any)?.hint,
        code: (gareError as any)?.code,
      });
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
    const entiIds = gareData.map((gara) => gara.ente_appaltante_id).filter((id) => id !== null && id !== undefined);

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
        aggiudicatariData
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
      total: count || 0  // Ora il count è corretto perché include il filtro aggiudicata
    };
      } catch (error) {
    console.error("Errore generale nel recupero delle gare:", error);
    throw error;
  }
}

/**
 * Recupera una singola gara per ID
 * @param id - ID della gara
 * @returns Gara trovata o undefined
 */
export async function getTenderById(id: string): Promise<Tender | undefined> {
  checkSupabaseEnvVars();

  try {
    const supabase = createClient();

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "gara");
    if (!exists) {
      throw new Error("La tabella 'gara' non esiste.");
    }

    // Otteniamo la gara
    const { data: garaData, error: garaError } = await supabase.from("gara").select("*").eq("id", id).single();

    if (garaError) {
      throw new Error(`Errore nel recupero della gara: ${garaError.message}`);
    }

    if (!garaData) {
      return undefined;
    }

    // Otteniamo l'ente appaltante se disponibile
    let enteData = undefined;
    if (garaData.ente_appaltante_id) {
      const { data: ente, error: enteError } = await supabase
        .from("ente_appaltante")
        .select("*")
        .eq("id", garaData.ente_appaltante_id)
        .single();

      if (enteError) {
        console.error("Errore nel recupero dell'ente appaltante:", enteError);
      } else {
        enteData = ente;
      }
    }

    // Otteniamo il lotto principale della gara
    const { data: lottoData, error: lottoError } = await supabase
      .from("lotto")
      .select("*")
      .eq("gara_id", garaData.id)
      .order("id", { ascending: true })
      .limit(1)
      .single();

    if (lottoError) {
      console.error("Errore nel recupero del lotto:", lottoError);
      return mapDatabaseToTender(garaData, enteData);
    }

    if (!lottoData) {
      return mapDatabaseToTender(garaData, enteData);
    }

    // Otteniamo le categorie opera per il lotto
    let categorieOperaData: any[] = [];
    const { data: categorieOpera, error: categorieOperaError } = await supabase
      .from("lotto_categoria_opera")
      .select("*, categoria_opera(*)")
      .eq("lotto_id", lottoData.id);
      
    if (!categorieOperaError && categorieOpera) {
      // Modifica qui: invece di estrarre solo categoria_opera, manteniamo anche il ruolo
      categorieOperaData = categorieOpera.map((item) => ({
        ...item.categoria_opera,
        cod_tipo_categoria: item.ruolo,
        descrizione_tipo_categoria: item.ruolo === 'P' ? 'Prevalente' : 'Scorporabile'
      })).filter(Boolean);

      // Ordiniamo le categorie: prima le prevalenti, poi le scorporabili
      categorieOperaData.sort((a, b) => {
        if (a.cod_tipo_categoria === 'P' && b.cod_tipo_categoria !== 'P') return -1;
        if (a.cod_tipo_categoria !== 'P' && b.cod_tipo_categoria === 'P') return 1;
        return 0;
      });
    }

    // Otteniamo la categoria CPV
    let cpvData = undefined;
    if (lottoData.cpv_id) {
      const { data: cpv, error: cpvError } = await supabase
        .from("categoria_cpv")
        .select("*")
        .eq("id", lottoData.cpv_id)
        .single();

      if (!cpvError) {
        cpvData = cpv;
      }
    }

    // Otteniamo il tipo di procedura
    let tipoProceduraData = undefined;
    if (garaData.tipo_procedura_id) {
      const { data: tipoProcedura, error: tipoProceduraError } = await supabase
        .from("tipo_procedura")
        .select("*")
        .eq("id", garaData.tipo_procedura_id)
        .single();

      if (!tipoProceduraError) {
        tipoProceduraData = tipoProcedura;
      }
    }

    // Otteniamo la natura principale
    let naturaPrincipaleData = undefined;
    if (garaData.natura_principale_id) {
      const { data: naturaPrincipale, error: naturaPrincipaleError } = await supabase
        .from("natura_principale")
        .select("*")
        .eq("id", garaData.natura_principale_id)
        .single();

      if (!naturaPrincipaleError) {
        naturaPrincipaleData = naturaPrincipale;
      }
    }

    // Otteniamo il criterio di aggiudicazione
    let criterioAggiudicazioneData = undefined;
    if (garaData.criterio_aggiudicazione_id) {
      const { data: criterioAggiudicazione, error: criterioAggiudicazioneError } = await supabase
        .from("criterio_aggiudicazione")
        .select("*")
        .eq("id", garaData.criterio_aggiudicazione_id)
        .single();

      if (!criterioAggiudicazioneError) {
        criterioAggiudicazioneData = criterioAggiudicazione;
      }
    }

    // Mappiamo i dati includendo le categorie opera
    const tender = mapDatabaseToTender(garaData, enteData, lottoData, cpvData, naturaPrincipaleData, criterioAggiudicazioneData, tipoProceduraData);
    tender.categorieOpera = categorieOperaData;

    // Otteniamo i dati del RUP
    let rupData = undefined;
    const { data: rup, error: rupError } = await supabase
      .from("rup")
      .select("*")
      .eq("gara_id", garaData.id)
      .single();

    if (!rupError && rup) {
      rupData = rup;
    }

    // Aggiungiamo i dati del RUP
    if (rupData) {
      tender.rup = {
        nome: rupData.nome,
        cognome: rupData.cognome,
        email: rupData.email,
        telefono: rupData.telefono
      };
    }

    return tender;

  } catch (error) {
    console.error("Errore generale nel recupero della gara:", error);
    throw error;
  }
}

/**
 * Recupera multiple gare per array di ID
 * @param ids - Array di ID delle gare
 * @returns Array di gare
 */
export async function getTendersByIds(ids: string[]): Promise<Tender[]> {
  checkSupabaseEnvVars();

  try {
    const supabase = createClient();

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "gara");
    if (!exists) {
      throw new Error("La tabella 'gara' non esiste.");
    }

    // Otteniamo le gare
    const { data: gareData, error: gareError } = await supabase.from("gara").select("*").in("id", ids);

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
      const enteData = gara.ente_appaltante_id ? entiMap[gara.ente_appaltante_id] : undefined;
      const tipoProceduraData = gara.tipo_procedura_id ? tipoProceduraMap[gara.tipo_procedura_id] : undefined;
      return mapDatabaseToTender(gara, enteData, undefined, undefined, undefined, undefined, tipoProceduraData);
    });
  } catch (error) {
    console.error("Errore generale nel recupero delle gare:", error);
    throw error;
  }
}

/**
 * Conta il numero totale di gare nel database
 * @returns Numero totale di gare
 */
export async function getTendersCount(): Promise<number> {
  checkSupabaseEnvVars();

  try {
    const supabase = createClient();
    
    const { count, error } = await supabase
      .from("gara")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw new Error(`Errore nel conteggio delle gare: ${error.message}`);
    }

    return count || 0;
  } catch (error) {
    console.error("Errore nel conteggio delle gare:", error);
    return 0;
  }
}

/**
 * Recupera le gare più recenti
 * @param limit - Numero massimo di gare da recuperare
 * @returns Array di gare recenti
 */
export async function getRecentTenders(limit: number = 10): Promise<Tender[]> {
  return getTenders({
    page: 1,
    pageSize: limit
  }).then(result => result.tenders);
}

/**
 * Cerca gare per termine di ricerca
 * @param searchTerm - Termine di ricerca
 * @param limit - Numero massimo di risultati
 * @returns Array di gare che corrispondono alla ricerca
 */
export async function searchTenders(searchTerm: string, limit: number = 20): Promise<Tender[]> {
  return getTenders({
    searchQuery: searchTerm,
    page: 1,
    pageSize: limit
  }).then(result => result.tenders);
}