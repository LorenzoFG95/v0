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

export interface Tender {
  id: string
  cig?: string // Aggiunto il CIG
  titolo: string
  descrizione: string
  planificazione: string
  valore: number
  importoSicurezza?: number // Campo aggiunto per gli oneri di sicurezza
  pubblicazione: string
  scadenza: string
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
  rup?: RUP // Nuovo campo per i dati del RUP
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
}

export interface AtiCategoriaOfferta {
  id: number;
  ati_richiesta_id: number;
  categoria_opera_id: number;
  categoria_opera?: CategoriaOpera; // Per il join
}

export interface AtiCategoriaCercata {
  id: number;
  ati_richiesta_id: number;
  categoria_opera_id: number;
  priorita: number;
  categoria_opera?: CategoriaOpera; // Per il join
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

// Tipo per il form di creazione ATI
export interface AtiRichiestaForm {
  bando_id: number;
  categorie_offerte: number[]; // IDs delle categorie opera
  categorie_cercate: Array<{
    categoria_opera_id: number;
    priorita: number;
  }>;
  data_scadenza?: string;
  note_aggiuntive?: string;
}