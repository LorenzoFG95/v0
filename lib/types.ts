export interface StazioneAppaltante {
  id: string
  nome: string
  contatto: string
  email: string
  indirizzo: string
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
  procedura: string
  stazioneAppaltante: StazioneAppaltante
  partecipanti?: number
}
