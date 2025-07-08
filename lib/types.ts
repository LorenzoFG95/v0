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
