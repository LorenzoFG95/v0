import { createClient } from "@/utils/supabase/client";

/**
 * Verifica se una tabella esiste nel database Supabase
 * @param supabase - Client Supabase
 * @param tableName - Nome della tabella da verificare
 * @returns Promise<boolean> - true se la tabella esiste, false altrimenti
 */
export async function tableExists(supabase: any, tableName: string): Promise<boolean> {
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

/**
 * Verifica se le variabili d'ambiente Supabase sono configurate
 * @returns boolean - true se le variabili sono configurate
 */
export function checkSupabaseEnvVars(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    console.error("Variabili d'ambiente Supabase mancanti:", {
      url: !!url,
      anonKey: !!anonKey
    });
    return false;
  }
  
  return true;
}

/**
 * Verifica la connessione al database Supabase
 * @param supabase - Client Supabase
 * @returns Promise<boolean> - true se la connessione è attiva
 */
export async function checkDatabaseConnection(supabase: any): Promise<boolean> {
  try {
    // Tenta una query semplice per verificare la connessione
    const { error } = await supabase
      .from("gare")
      .select("id")
      .limit(1);
    
    if (error) {
      console.error("Errore di connessione al database:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Errore di connessione al database:", error);
    return false;
  }
}

/**
 * Verifica se multiple tabelle esistono nel database
 * @param supabase - Client Supabase
 * @param tableNames - Array di nomi delle tabelle da verificare
 * @returns Promise<Record<string, boolean>> - Oggetto con nome tabella come chiave e esistenza come valore
 */
export async function checkMultipleTablesExist(
  supabase: any, 
  tableNames: string[]
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  const promises = tableNames.map(async (tableName) => {
    const exists = await tableExists(supabase, tableName);
    return [tableName, exists] as [string, boolean];
  });
  
  const tableResults = await Promise.all(promises);
  
  for (const [tableName, exists] of tableResults) {
    results[tableName] = exists;
  }
  
  return results;
}

/**
 * Utility per gestire errori comuni di Supabase
 * @param error - Errore da analizzare
 * @returns string - Messaggio di errore user-friendly
 */
export function handleSupabaseError(error: any): string {
  if (!error) return "Errore sconosciuto";
  
  const message = error.message || error.toString();
  
  // Errori di connessione
  if (message.includes("getaddrinfo failed") || 
      message.includes("connection") || 
      message.includes("network")) {
    return "Errore di connessione al database. Verificare la connessione di rete.";
  }
  
  // Errori di autenticazione
  if (message.includes("Invalid API key") || 
      message.includes("unauthorized")) {
    return "Errore di autenticazione. Verificare le credenziali Supabase.";
  }
  
  // Errori di permessi
  if (message.includes("permission denied") || 
      message.includes("insufficient_privilege")) {
    return "Permessi insufficienti per accedere ai dati.";
  }
  
  // Errori di tabella non trovata
  if (message.includes("relation") && message.includes("does not exist")) {
    return "Tabella del database non trovata. Verificare la configurazione.";
  }
  
  return `Errore del database: ${message}`;
}

/**
 * Crea un client Supabase con gestione errori
 * @returns Client Supabase o null se la configurazione non è valida
 */
export function createSupabaseClient() {
  if (!checkSupabaseEnvVars()) {
    return null;
  }
  
  try {
    return createClient();
  } catch (error) {
    console.error("Errore nella creazione del client Supabase:", error);
    return null;
  }
}