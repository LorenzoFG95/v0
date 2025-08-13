export interface StazioneAppaltante {
  id: string
  nome: string
  contatto: string
  email: string
  indirizzo: string
  regione?: string  // Campo aggiunto
  citta?: string    // Campo aggiunto
}

export interface CategoriaOpera {
  id: string
  id_categoria: string
  cod_tipo_categoria: string
  descrizione: string
  descrizione_tipo_categoria: string
}

export interface RUP {
  nome?: string
  cognome?: string
  email?: string
  telefono?: string
}

export interface Aggiudicatario {
  id: number
  denominazione: string
  codice_fiscale?: string
  importo: number
  data_aggiudicazione?: string
}

export interface Tender {
  id: string
  cig?: string
  titolo: string
  descrizione: string
  planificazione: string
  valore: number
  importoSicurezza?: number
  pubblicazione: string
  scadenza: string | null
  inizioGara: string
  cpv: string
  categoria: string
  naturaPrincipale?: string 
  criterioAggiudicazione?: string
  procedura: string
  stazioneAppaltante: StazioneAppaltante
  partecipanti?: number
  categorieOpera?: CategoriaOpera[]
  documentiDiGaraLink?: string
  rup?: RUP
  aggiudicato?: boolean // Nuovo campo per lo stato di aggiudicazione
  aggiudicatari?: Aggiudicatario[] // Nuovo campo per i dati degli aggiudicatari
}

export interface TenderFilters {
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
  regione?: string;
  citta?: string;
  tipoProcedura?: string;
  page?: number;
  pageSize?: number;
}

// Aggiungi questi tipi al file types.ts
// Aggiungi questo tipo per l'azienda
export interface Azienda {
  id: number;
  ragione_sociale: string;
  citta?: string;
  regione?: string;
}

// Aggiorna il tipo AtiRichiesta
export interface AtiRichiesta {
  id: number;
  bando_id: number;
  azienda_richiedente_id: number;
  stato: 'attiva' | 'chiusa' | 'scaduta';
  data_creazione: string;
  data_scadenza?: string;
  note_aggiuntive?: string;
  categorie_offerte: AtiCategoriaOfferta[];
  categorie_cercate: AtiCategoriaCercata[];
  azienda?: Azienda; // Aggiunto per il join con la tabella azienda
}

export interface AtiCategoriaOfferta {
  categoria_opera_id: number;
  classificazione: string;
}

export interface AtiCategoriaCercata {
  categoria_opera_id: number;
  priorita: number;
  classificazione: string;
}

// Aggiornare anche il form
export interface AtiRichiestaForm {
  bando_id: number;
  categorie_offerte: Array<{
    categoria_opera_id: number;
    classificazione: string;
  }>;
  categorie_cercate: Array<{
    categoria_opera_id: number;
    priorita: number;
    classificazione: string;
  }>;
  data_scadenza?: string;
  note_aggiuntive?: string;
}
export interface AtiContatto {
  id: number;
  ati_richiesta_id: number;
  azienda_contattante_id: number;
  azienda_contattata_id: number;
  categoria_opera_id: number;
  messaggio?: string;
  data_contatto: string;
  stato: 'inviato' | 'letto' | 'risposto';
}