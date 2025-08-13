// File principale ridotto - Re-export di tutte le funzioni dai moduli refactorizzati

// === REFERENCE/LOOKUP FUNCTIONS ===
export {
  getEntiAppaltanti,
  getCategorieNatura,
  getCategorieOpera,
  getCriterioAggiudicazione,
  getRegioni,
  getCittaByRegione,
  getTipiProcedura
} from './reference/lookup'

// === TENDER CORE FUNCTIONS ===
export {
  mapDatabaseToTender,
  getTenders,
  getTenderById,
  getTendersByIds,
  getTendersCount,
  getRecentTenders,
  searchTenders
} from './tender/core'

// === TENDER AGGIUDICATARI FUNCTIONS ===
export {
  getAggiudicatariForLotto,
  checkIfLottoHasAggiudicatari,
  getAggiudicatariForMultipleLotti,
  checkMultipleLottiHaveAggiudicatari
} from './tender/aggiudicatari'

// === AZIENDA PROFILE FUNCTIONS ===
export {
  getAziendaCategorieOpera,
  saveAziendaCategorieOpera,
  saveAziendaCategorieOperaConClassificazione,
  getAziendaCategorieOperaConClassificazione,
  getUserAzienda,
  checkCategorieOperaMatch,
  hasAziendaCategorieOpera,
  getAziendaCategorieOperaStats
} from './azienda/profile'

// === ATI REQUESTS FUNCTIONS ===
export {
  createAtiRichiesta,
  getAtiRichiesteByBando,
  getAtiRichiesteByAzienda,
  getAtiOfferteCountByCategoria,
  hasAtiRichiestaForBando,
  updateAtiRichiestaStato,
  deleteAtiRichiesta
} from './ati/requests'

// === DATABASE UTILITIES ===
export {
  tableExists,
  checkSupabaseEnvVars,
  checkDatabaseConnection,
  checkMultipleTablesExist,
  handleSupabaseError,
  createSupabaseClient
} from './utils/database'

// === TYPES ===
export type {
  Tender,
  AtiRichiesta,
  AtiRichiestaForm,
  Aggiudicatario,
  TenderFilters
} from './types'