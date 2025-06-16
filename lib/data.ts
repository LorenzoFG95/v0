import { createClient } from "@/utils/supabase/server"
import type { Tender } from "./types"

// Dati di esempio aggiornati con CIG
const MOCK_TENDERS: Tender[] = [
  {
    id: "1",
    cig: "B7248F5C72",
    titolo: "Procedura aperta per l'affidamento del servizio di attuazione di un piano di promozione",
    descrizione:
      "Procedura aperta per l'affidamento del servizio di attuazione di un piano di promozione (organizzazione di manifestazioni perla valorizzazione ecoturistica dell'ambiente, per la promozione della cultura marinara locale e dei prodotti ittici ed ittico-conservieri) dal 2025 al 2026 (durata 24 mesi).",
    planificazione: "Pianificazione",
    valore: 200000.0,
    pubblicazione: "2025-06-05T06:00:01.000Z",
    scadenza: "2025-07-08T12:00:00.000Z",
    inizioGara: "2025-06-05T06:00:01.000Z",
    cpv: "CPV7e1b54",
    categoria: "Servizi",
    procedura: "Procedura Aperta",
    stazioneAppaltante: {
      id: "6",
      nome: "GRUPPO D'AZIONE COSTIERA GOLFO DI PATTI - SOCIETA' CONSORTILE A R L.",
      contatto: "Responsabile GRUPPO D'AZIONE COSTIERA GOLFO DI PATTI",
      email: "info@gacgolfodipatti.it",
      indirizzo: "Sicilia, Patti",
    },
    partecipanti: undefined,
  },
  {
    id: "2",
    cig: "B72476A67D",
    titolo:
      "Procedura ristretta non impegnativa per l'affidamento pluriennale in concessione del servizio di sfalcio erba",
    descrizione:
      "Procedura ristretta non impegnativa per l'A.D. per l'affidamento pluriennale in concessione del servizio di sfalcio erba presso il Comando Aeroporto Sigonella e Deposito Favotto.",
    planificazione: "Pianificazione",
    valore: 9500.0,
    pubblicazione: "2025-06-05T06:00:01.000Z",
    scadenza: "2025-06-10T10:30:00.000Z",
    inizioGara: "2025-06-05T06:00:01.000Z",
    cpv: "CPVe6074a",
    categoria: "Servizi",
    procedura: "Procedura Ristretta",
    stazioneAppaltante: {
      id: "7",
      nome: "COMANDO AEROPORTO DI SIGONELLA",
      contatto: "Responsabile COMANDO AEROPORTO DI SIGONELLA",
      email: "info@comandoaeroportodisigonella.it",
      indirizzo: "Sicilia, Sigonella",
    },
    partecipanti: undefined,
  },
  {
    id: "3",
    cig: "B7245BB2D2",
    titolo: "PSR 2014-2022. MISURA 7 - SOTTOMISURA 7.2 - OPERAZIONE 7.2.B INVESTIMENTO SU PICCOLA SCALA",
    descrizione:
      "PSR 2014-2022. MISURA 7 - SOTTOMISURA 7.2 - OPERAZIONE 7.2.B INVESTIMENTO SU PICCOLA SCALA PER LAMMODERNAMENTO DELLA VIABILITÀ COMUNALE SECONDARIA ESISTENTE Importo € 250.000,00 - CUP: C97H23000500002",
    planificazione: "Pianificazione",
    valore: 186232.51,
    pubblicazione: "2025-06-05T06:00:01.000Z",
    scadenza: "2025-06-18T18:00:00.000Z",
    inizioGara: "2025-06-05T06:00:01.000Z",
    cpv: "CPVba84a9",
    categoria: "Lavori",
    procedura: "Procedura Aperta",
    stazioneAppaltante: {
      id: "8",
      nome: "COMUNE DI NOCIGLIA",
      contatto: "Responsabile COMUNE DI NOCIGLIA",
      email: "info@comunedinociglia.it",
      indirizzo: "Puglia, Nociglia",
    },
    partecipanti: undefined,
  },
  {
    id: "4",
    cig: "B7243C6561",
    titolo: "Rifacimento della rete di distribuzione dell'impianto termico del plesso scolastico",
    descrizione:
      "Rifacimento della rete di distribuzione dell'impianto termico del plesso scolastico di via A. Moro n. 14 e ristrutturazione spogliatoi palestra",
    planificazione: "Pianificazione",
    valore: 263471.43,
    pubblicazione: "2025-06-05T06:00:00.000Z",
    scadenza: "2025-06-27T10:00:00.000Z",
    inizioGara: "2025-06-05T06:00:00.000Z",
    cpv: "CPVa3361e",
    categoria: "Lavori",
    procedura: "Procedura Aperta",
    stazioneAppaltante: {
      id: "9",
      nome: "COMUNE DI BUCCINASCO",
      contatto: "Responsabile COMUNE DI BUCCINASCO",
      email: "info@comunedibuccinasco.it",
      indirizzo: "Lombardia, Buccinasco",
    },
    partecipanti: undefined,
  },
  {
    id: "5",
    cig: "B723BF0DF7",
    titolo: "Affidamento in concessione del servizio di gestione della Piscina comunale per tre anni",
    descrizione: "Affidamento in concessione del servizio di gestione della Piscina comunale per tre anni",
    planificazione: "Pianificazione",
    valore: 30000.0,
    pubblicazione: "2025-06-05T06:00:01.000Z",
    scadenza: "2025-06-12T20:00:00.000Z",
    inizioGara: "2025-06-05T06:00:01.000Z",
    cpv: "CPV46ca7d",
    categoria: "Servizi",
    procedura: "Procedura Aperta",
    stazioneAppaltante: {
      id: "10",
      nome: "COMUNE DI SAVIGNANO IRPINO",
      contatto: "Responsabile COMUNE DI SAVIGNANO IRPINO",
      email: "info@comunedisavignanoirpino.it",
      indirizzo: "Campania, Savignano Irpino",
    },
    partecipanti: undefined,
  },
]

// Funzione per convertire i dati dal database al formato dell'applicazione
function mapDatabaseToTender(dbData: any, enteData?: any): Tender {
  return {
    id: dbData.id.toString(),
    cig: dbData.cig || undefined, // Aggiunto il CIG dal database
    titolo: dbData.descrizione?.substring(0, 100) + "..." || "Titolo non disponibile",
    descrizione: dbData.descrizione || "Descrizione non disponibile",
    planificazione: "Pianificazione",
    valore: dbData.importo_totale || 0,
    pubblicazione: dbData.data_pubblicazione || new Date().toISOString(),
    scadenza: dbData.scadenza_offerta || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    inizioGara: dbData.data_pubblicazione || new Date().toISOString(),
    cpv: "CPV" + Math.random().toString(36).substr(2, 6),
    categoria:
      dbData.natura_principale_id === 1
        ? "Lavori"
        : dbData.natura_principale_id === 2
          ? "Forniture"
          : dbData.natura_principale_id === 3
            ? "Servizi"
            : "Non specificata",
    procedura: "Procedura Aperta",
    stazioneAppaltante: {
      id: enteData?.id?.toString() || "",
      nome: enteData?.denominazione || "Ente non specificato",
      contatto: "Responsabile " + (enteData?.denominazione || "Ente"),
      email: "info@" + (enteData?.denominazione?.toLowerCase().replace(/[^a-z0-9]/g, "") || "ente") + ".it",
      indirizzo: (enteData?.regione ? enteData.regione + ", " : "") + (enteData?.citta || "Italia"),
    },
    partecipanti: undefined,
  }
}

// Funzione per verificare se una tabella esiste
async function tableExists(supabase: any, tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).select("id").limit(1)
    return !error
  } catch (error) {
    return false
  }
}

export async function getTenders(): Promise<Tender[]> {
  // Se non abbiamo le variabili di ambiente, usa i dati mock
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("Variabili di ambiente Supabase non configurate. Utilizzando dati di esempio.")
    return MOCK_TENDERS
  }

  try {
    const supabase = createClient()

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "gara")
    if (!exists) {
      console.warn("La tabella 'gara' non esiste. Utilizzando dati di esempio.")
      return MOCK_TENDERS
    }

    // Otteniamo prima le gare
    const { data: gareData, error: gareError } = await supabase
      .from("gara")
      .select("*")
      .order("data_pubblicazione", { ascending: false })
      .limit(50)

    if (gareError) {
      console.error("Errore nel recupero delle gare:", gareError)
      return MOCK_TENDERS
    }

    if (!gareData || gareData.length === 0) {
      return MOCK_TENDERS
    }

    // Otteniamo gli enti appaltanti per le gare recuperate
    const entiIds = gareData.map((gara) => gara.ente_appaltante_id).filter((id) => id !== null && id !== undefined)

    let entiMap: Record<number, any> = {}

    if (entiIds.length > 0) {
      const { data: entiData, error: entiError } = await supabase.from("ente_appaltante").select("*").in("id", entiIds)

      if (entiError) {
        console.error("Errore nel recupero degli enti appaltanti:", entiError)
      } else if (entiData) {
        entiMap = entiData.reduce(
          (acc, ente) => {
            acc[ente.id] = ente
            return acc
          },
          {} as Record<number, any>,
        )
      }
    }

    // Mappiamo i dati
    return gareData.map((gara) => {
      const enteData = gara.ente_appaltante_id ? entiMap[gara.ente_appaltante_id] : undefined
      return mapDatabaseToTender(gara, enteData)
    })
  } catch (error) {
    console.error("Errore generale nel recupero delle gare:", error)
    return MOCK_TENDERS
  }
}

export async function getTenderById(id: string): Promise<Tender | undefined> {
  // Se non abbiamo le variabili di ambiente, usa i dati mock
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return MOCK_TENDERS.find((tender) => tender.id === id)
  }

  try {
    const supabase = createClient()

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "gara")
    if (!exists) {
      console.warn("La tabella 'gara' non esiste. Utilizzando dati di esempio.")
      return MOCK_TENDERS.find((tender) => tender.id === id)
    }

    // Otteniamo la gara
    const { data: garaData, error: garaError } = await supabase.from("gara").select("*").eq("id", id).single()

    if (garaError) {
      console.error("Errore nel recupero della gara:", garaError)
      return MOCK_TENDERS.find((tender) => tender.id === id)
    }

    if (!garaData) {
      return MOCK_TENDERS.find((tender) => tender.id === id)
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

    return mapDatabaseToTender(garaData, enteData)
  } catch (error) {
    console.error("Errore generale nel recupero della gara:", error)
    return MOCK_TENDERS.find((tender) => tender.id === id)
  }
}

export async function getTendersByIds(ids: string[]): Promise<Tender[]> {
  // Se non abbiamo le variabili di ambiente, usa i dati mock
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return MOCK_TENDERS.filter((tender) => ids.includes(tender.id))
  }

  try {
    const supabase = createClient()

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "gara")
    if (!exists) {
      console.warn("La tabella 'gara' non esiste. Utilizzando dati di esempio.")
      return MOCK_TENDERS.filter((tender) => ids.includes(tender.id))
    }

    // Otteniamo le gare
    const { data: gareData, error: gareError } = await supabase.from("gara").select("*").in("id", ids)

    if (gareError) {
      console.error("Errore nel recupero delle gare:", gareError)
      return MOCK_TENDERS.filter((tender) => ids.includes(tender.id))
    }

    if (!gareData || gareData.length === 0) {
      return MOCK_TENDERS.filter((tender) => ids.includes(tender.id))
    }

    // Otteniamo gli enti appaltanti per le gare recuperate
    const entiIds = gareData.map((gara) => gara.ente_appaltante_id).filter((id) => id !== null && id !== undefined)

    let entiMap: Record<number, any> = {}

    if (entiIds.length > 0) {
      const { data: entiData, error: entiError } = await supabase.from("ente_appaltante").select("*").in("id", entiIds)

      if (entiError) {
        console.error("Errore nel recupero degli enti appaltanti:", entiError)
      } else if (entiData) {
        entiMap = entiData.reduce(
          (acc, ente) => {
            acc[ente.id] = ente
            return acc
          },
          {} as Record<number, any>,
        )
      }
    }

    // Mappiamo i dati
    return gareData.map((gara) => {
      const enteData = gara.ente_appaltante_id ? entiMap[gara.ente_appaltante_id] : undefined
      return mapDatabaseToTender(gara, enteData)
    })
  } catch (error) {
    console.error("Errore generale nel recupero delle gare:", error)
    return MOCK_TENDERS.filter((tender) => ids.includes(tender.id))
  }
}

export async function getEntiAppaltanti(): Promise<{ id: string; nome: string }[]> {
  // Se non abbiamo le variabili di ambiente, usa i dati mock
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [
      { id: "6", nome: "GRUPPO D'AZIONE COSTIERA GOLFO DI PATTI - SOCIETA' CONSORTILE A R L." },
      { id: "7", nome: "COMANDO AEROPORTO DI SIGONELLA" },
      { id: "8", nome: "COMUNE DI NOCIGLIA" },
      { id: "9", nome: "COMUNE DI BUCCINASCO" },
      { id: "10", nome: "COMUNE DI SAVIGNANO IRPINO" },
    ].filter((ente, index, self) => index === self.findIndex((e) => e.id === ente.id))
  }

  try {
    const supabase = createClient()

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "ente_appaltante")
    if (!exists) {
      console.warn("La tabella 'ente_appaltante' non esiste. Utilizzando dati di esempio.")
      return [
        { id: "6", nome: "GRUPPO D'AZIONE COSTIERA GOLFO DI PATTI - SOCIETA' CONSORTILE A R L." },
        { id: "7", nome: "COMANDO AEROPORTO DI SIGONELLA" },
        { id: "8", nome: "COMUNE DI NOCIGLIA" },
        { id: "9", nome: "COMUNE DI BUCCINASCO" },
        { id: "10", nome: "COMUNE DI SAVIGNANO IRPINO" },
      ].filter((ente, index, self) => index === self.findIndex((e) => e.id === ente.id))
    }

    const { data, error } = await supabase.from("ente_appaltante").select("id, denominazione").order("denominazione")

    if (error) {
      console.error("Errore nel recupero degli enti:", error)
      return [
        { id: "6", nome: "GRUPPO D'AZIONE COSTIERA GOLFO DI PATTI - SOCIETA' CONSORTILE A R L." },
        { id: "7", nome: "COMANDO AEROPORTO DI SIGONELLA" },
        { id: "8", nome: "COMUNE DI NOCIGLIA" },
        { id: "9", nome: "COMUNE DI BUCCINASCO" },
        { id: "10", nome: "COMUNE DI SAVIGNANO IRPINO" },
      ].filter((ente, index, self) => index === self.findIndex((e) => e.id === ente.id))
    }

    return (
      data?.map((ente) => ({
        id: ente.id.toString(),
        nome: ente.denominazione,
      })) || []
    )
  } catch (error) {
    console.error("Errore generale nel recupero degli enti:", error)
    return [
      { id: "6", nome: "GRUPPO D'AZIONE COSTIERA GOLFO DI PATTI - SOCIETA' CONSORTILE A R L." },
      { id: "7", nome: "COMANDO AEROPORTO DI SIGONELLA" },
      { id: "8", nome: "COMUNE DI NOCIGLIA" },
      { id: "9", nome: "COMUNE DI BUCCINASCO" },
      { id: "10", nome: "COMUNE DI SAVIGNANO IRPINO" },
    ].filter((ente, index, self) => index === self.findIndex((e) => e.id === ente.id))
  }
}

export async function getCategorieNatura(): Promise<{ id: string; descrizione: string }[]> {
  // Se non abbiamo le variabili di ambiente, usa i dati mock
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [
      { id: "1", descrizione: "Lavori" },
      { id: "2", descrizione: "Forniture" },
      { id: "3", descrizione: "Servizi" },
    ]
  }

  try {
    const supabase = createClient()

    // Verifica se la tabella esiste
    const exists = await tableExists(supabase, "natura_principale")
    if (!exists) {
      console.warn("La tabella 'natura_principale' non esiste. Utilizzando dati di esempio.")
      return [
        { id: "1", descrizione: "Lavori" },
        { id: "2", descrizione: "Forniture" },
        { id: "3", descrizione: "Servizi" },
      ]
    }

    const { data, error } = await supabase.from("natura_principale").select("id, descrizione").order("descrizione")

    if (error) {
      console.error("Errore nel recupero delle nature:", error)
      return [
        { id: "1", descrizione: "Lavori" },
        { id: "2", descrizione: "Forniture" },
        { id: "3", descrizione: "Servizi" },
      ]
    }

    return (
      data?.map((natura) => ({
        id: natura.id.toString(),
        descrizione: natura.descrizione,
      })) || []
    )
  } catch (error) {
    console.error("Errore generale nel recupero delle nature:", error)
    return [
      { id: "1", descrizione: "Lavori" },
      { id: "2", descrizione: "Forniture" },
      { id: "3", descrizione: "Servizi" },
    ]
  }
}
