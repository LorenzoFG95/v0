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
  naturaPrincipale?: string // Aggiunto il campo per la natura principale
  procedura: string
  stazioneAppaltante: StazioneAppaltante
  partecipanti?: number
  categorieOpera?: CategoriaOpera[] // Aggiunto le categorie opera
}
