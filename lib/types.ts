export interface StazioneAppaltante {
  id: string
  nome: string
  contatto: string
  email: string
  indirizzo: string
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
  categoriaOpera?: string;
  soloPrevalente?: boolean;
  categoria?: string;
  stato?: string;
  startDate?: string;
  endDate?: string;
  minValue?: number;
  maxValue?: number;
  criterioAggiudicazione?: string; 
  page?: number;
  pageSize?: number;
}
