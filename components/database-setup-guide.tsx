"use client"

import { useState } from "react"
import { AlertCircle, Check, Copy, Database } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function DatabaseSetupGuide() {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const envTemplate = `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key`

  return (
    <div className="space-y-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configurazione del database richiesta</AlertTitle>
        <AlertDescription>
          Le tabelle del database non sono state trovate. Segui le istruzioni qui sotto per configurare il database.
        </AlertDescription>
      </Alert>

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <Database className="mr-2" size={20} />
          Guida alla configurazione del database
        </h2>

        <div className="space-y-4">
          <p>
            Per utilizzare l&apos;applicazione con dati reali, è necessario configurare il database Supabase. Segui
            questi passaggi:
          </p>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="step1">
              <AccordionTrigger>1. Configura le variabili d&apos;ambiente</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">
                  Crea un file <code className="bg-gray-100 px-1 py-0.5 rounded">.env.local</code> nella radice del
                  progetto con le seguenti variabili:
                </p>
                <div className="relative">
                  <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                    <code>{envTemplate}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(envTemplate, "env")}
                  >
                    {copied === "env" ? <Check size={16} /> : <Copy size={16} />}
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Sostituisci i valori placeholder con le tue credenziali reali di Supabase.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step2">
              <AccordionTrigger>2. Esegui gli script SQL in Supabase</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">
                  Accedi all&apos;editor SQL di Supabase ed esegui i seguenti script nell&apos;ordine indicato:
                </p>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">Script 1: Creazione tabelle</h4>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(createTablesScript, "script1")}
                      >
                        {copied === "script1" ? <Check size={16} /> : <Copy size={16} />}
                      </Button>
                      <div className="bg-gray-100 p-4 rounded-md max-h-40 overflow-y-auto">
                        <pre>
                          <code>{createTablesScript}</code>
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-1">Script 2: Inserimento dati di lookup</h4>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(insertLookupDataScript, "script2")}
                      >
                        {copied === "script2" ? <Check size={16} /> : <Copy size={16} />}
                      </Button>
                      <div className="bg-gray-100 p-4 rounded-md max-h-40 overflow-y-auto">
                        <pre>
                          <code>{insertLookupDataScript}</code>
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-1">Script 3: Inserimento dati di esempio</h4>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(insertSampleDataScript, "script3")}
                      >
                        {copied === "script3" ? <Check size={16} /> : <Copy size={16} />}
                      </Button>
                      <div className="bg-gray-100 p-4 rounded-md max-h-40 overflow-y-auto">
                        <pre>
                          <code>{insertSampleDataScript}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step3">
              <AccordionTrigger>3. Riavvia l&apos;applicazione</AccordionTrigger>
              <AccordionContent>
                <p>
                  Dopo aver configurato le variabili d&apos;ambiente ed eseguito gli script SQL, riavvia
                  l&apos;applicazione per applicare le modifiche.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  )
}

const createTablesScript = `-- Creazione tabelle principali per il database appalti pubblici

-- Tabella natura principale
CREATE TABLE IF NOT EXISTS natura_principale (
  id SERIAL PRIMARY KEY,
  codice VARCHAR(20) UNIQUE NOT NULL,
  descrizione VARCHAR(100) NOT NULL
);

-- Tabella stato procedura
CREATE TABLE IF NOT EXISTS stato_procedura (
  id SERIAL PRIMARY KEY,
  codice VARCHAR(20) UNIQUE NOT NULL,
  descrizione VARCHAR(100) NOT NULL
);

-- Tabella criterio aggiudicazione
CREATE TABLE IF NOT EXISTS criterio_aggiudicazione (
  id SERIAL PRIMARY KEY,
  codice VARCHAR(10) UNIQUE NOT NULL,
  descrizione VARCHAR(100) NOT NULL
);

-- Tabella categoria CPV
CREATE TABLE IF NOT EXISTS categoria_cpv (
  id SERIAL PRIMARY KEY,
  codice VARCHAR(10) UNIQUE NOT NULL,
  descrizione VARCHAR(255) NOT NULL
);

-- Tabella enti appaltanti
CREATE TABLE IF NOT EXISTS ente_appaltante (
  id SERIAL PRIMARY KEY,
  codice_ausa VARCHAR(20) UNIQUE,
  codice_fiscale VARCHAR(16) UNIQUE,
  partita_iva VARCHAR(20),
  denominazione VARCHAR(255) NOT NULL,
  regione VARCHAR(100),
  citta VARCHAR(100),
  indirizzo TEXT,
  istat_comune VARCHAR(9),
  sezione_regionale VARCHAR(150)
);

-- Tabella gare
CREATE TABLE IF NOT EXISTS gara (
  id BIGSERIAL PRIMARY KEY,
  ocid VARCHAR(50) UNIQUE,
  cig VARCHAR(20),
  cup VARCHAR(20),
  ente_appaltante_id INTEGER,
  natura_principale_id INTEGER,
  criterio_aggiudicazione_id INTEGER,
  stato_procedura_id INTEGER,
  descrizione TEXT,
  data_pubblicazione TIMESTAMP,
  scadenza_offerta TIMESTAMP,
  importo_totale DECIMAL(18,2),
  importo_sicurezza DECIMAL(18,2),
  valuta CHAR(3),
  CONSTRAINT fk_gara_ente FOREIGN KEY (ente_appaltante_id) REFERENCES ente_appaltante(id),
  CONSTRAINT fk_gara_natura FOREIGN KEY (natura_principale_id) REFERENCES natura_principale(id),
  CONSTRAINT fk_gara_criterio FOREIGN KEY (criterio_aggiudicazione_id) REFERENCES criterio_aggiudicazione(id),
  CONSTRAINT fk_gara_stato FOREIGN KEY (stato_procedura_id) REFERENCES stato_procedura(id)
);

-- Tabella lotti
CREATE TABLE IF NOT EXISTS lotto (
  id BIGSERIAL PRIMARY KEY,
  gara_id BIGINT,
  codice_lot VARCHAR(50),
  cig VARCHAR(20),
  descrizione TEXT,
  natura_principale_id INTEGER,
  valore DECIMAL(18,2),
  valuta CHAR(3),
  status VARCHAR(20),
  criterio_aggiudicazione_id INTEGER,
  cpv_id INTEGER,
  nuts_code VARCHAR(5),
  termine_ricezione TIMESTAMP,
  accordo_quadro VARCHAR(100),
  sistema_dinamico_acq VARCHAR(150),
  asta_elettronica BOOLEAN DEFAULT FALSE,
  luogo_istat VARCHAR(10),
  CONSTRAINT fk_lotto_gara FOREIGN KEY (gara_id) REFERENCES gara(id) ON DELETE CASCADE,
  CONSTRAINT fk_lotto_natura FOREIGN KEY (natura_principale_id) REFERENCES natura_principale(id),
  CONSTRAINT fk_lotto_criterio FOREIGN KEY (criterio_aggiudicazione_id) REFERENCES criterio_aggiudicazione(id),
  CONSTRAINT fk_lotto_cpv FOREIGN KEY (cpv_id) REFERENCES categoria_cpv(id)
);

-- Tabella avvisi gara
CREATE TABLE IF NOT EXISTS avviso_gara (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gara_id BIGINT,
  id_appalto UUID,
  tipo_avviso_id INTEGER,
  codice_scheda VARCHAR(20),
  data_pubblicazione TIMESTAMP,
  data_scadenza TIMESTAMP,
  data_pcp TIMESTAMP,
  attivo BOOLEAN DEFAULT TRUE,
  nuovo_avviso UUID,
  CONSTRAINT fk_avviso_gara FOREIGN KEY (gara_id) REFERENCES gara(id) ON DELETE CASCADE
);

-- Indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_gara_ente ON gara(ente_appaltante_id);
CREATE INDEX IF NOT EXISTS idx_gara_cig ON gara(cig);
CREATE INDEX IF NOT EXISTS idx_lotto_gara ON lotto(gara_id);
CREATE INDEX IF NOT EXISTS idx_lotto_cpv ON lotto(cpv_id);
CREATE INDEX IF NOT EXISTS idx_avviso_gara ON avviso_gara(gara_id);

-- Abilita RLS (Row Level Security)
ALTER TABLE gara ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotto ENABLE ROW LEVEL SECURITY;
ALTER TABLE avviso_gara ENABLE ROW LEVEL SECURITY;

-- Policy per permettere lettura pubblica
CREATE POLICY "Allow public read access on gara" ON gara FOR SELECT USING (true);
CREATE POLICY "Allow public read access on lotto" ON lotto FOR SELECT USING (true);
CREATE POLICY "Allow public read access on avviso_gara" ON avviso_gara FOR SELECT USING (true);`

const insertLookupDataScript = `-- Inserimento dati nelle tabelle di lookup

-- Natura principale
INSERT INTO natura_principale (id, codice, descrizione) VALUES 
(1, 'works', 'Lavori'),
(2, 'goods', 'Forniture'),
(3, 'services', 'Servizi')
ON CONFLICT (id) DO NOTHING;

-- Stato procedura
INSERT INTO stato_procedura (id, codice, descrizione) VALUES 
(1, 'planning', 'Programmazione'),
(2, 'active', 'In corso'),
(3, 'complete', 'Conclusa'),
(4, 'cancelled', 'Annullata'),
(5, 'unsuccessful', 'Senza esito')
ON CONFLICT (id) DO NOTHING;`

const insertSampleDataScript = `-- Inserimento dati di esempio

-- Enti appaltanti
INSERT INTO ente_appaltante (id, codice_fiscale, denominazione, regione, citta) VALUES
(1, '80011100874', 'COMANDO AEROPORTO DI SIGONELLA', 'Sicilia', 'Sigonella'),
(2, '83000830758', 'COMUNE DI NOCIGLIA', 'Puglia', 'Nociglia'),
(3, '03482920158', 'COMUNE DI BUCCINASCO', 'Lombardia', 'Buccinasco'),
(4, '81000430645', 'COMUNE DI SAVIGNANO IRPINO', 'Campania', 'Savignano Irpino'),
(5, '02438750586', 'ROMA CAPITALE', 'Lazio', 'Roma')
ON CONFLICT (id) DO NOTHING;

-- Gare
INSERT INTO gara (id, ocid, cig, ente_appaltante_id, natura_principale_id, descrizione, data_pubblicazione, scadenza_offerta, importo_totale) VALUES
(1, '2c4dbfea-21cb-4a15-95cd-95eaf8f32eb9', 'B7248F5C72', 1, 3, 'Procedura aperta per l affidamento del servizio di attuazione di un piano di promozione', '2025-06-05 06:00:01', '2025-07-08 12:00:00', 200000.00),
(2, '1cac7ec5-cbae-4250-8b1c-e7962f97abda', 'B72476A67D', 1, 3, 'Procedura ristretta non impegnativa per l affidamento pluriennale in concessione del servizio di sfalcio erba', '2025-06-05 06:00:01', '2025-06-10 10:30:00', 9500.00),
(3, 'b25d816a-4868-4d68-9f6f-49812c98fc91', 'B7245BB2D2', 2, 1, 'PSR 2014-2022. MISURA 7 - SOTTOMISURA 7.2 - OPERAZIONE 7.2.B INVESTIMENTO SU PICCOLA SCALA', '2025-06-05 06:00:01', '2025-06-18 18:00:00', 186232.51),
(4, '1a531c42-1792-4c90-ac0a-74e490d69688', 'B7243C6561', 3, 1, 'Rifacimento della rete di distribuzione dell impianto termico del plesso scolastico', '2025-06-05 06:00:00', '2025-06-27 10:00:00', 263471.43),
(5, '469d38ab-5607-463b-95a0-ebac9226e9fd', 'B723BF0DF7', 4, 3, 'Affidamento in concessione del servizio di gestione della Piscina comunale per tre anni', '2025-06-05 06:00:01', '2025-06-12 20:00:00', 30000.00)
ON CONFLICT (id) DO NOTHING;

-- Lotti
INSERT INTO lotto (id, gara_id, codice_lot, cig, descrizione, natura_principale_id, valore, termine_ricezione) VALUES
(1, 1, NULL, 'B7248F5C72', 'Procedura aperta per l affidamento del servizio di attuazione di un piano di promozione', 3, 200000.00, '2025-07-08 12:00:00'),
(2, 2, NULL, 'B72476A67D', 'sfalcio erba', 3, 9500.00, '2025-06-10 10:30:00'),
(3, 3, NULL, 'B7245BB2D2', 'PSR 2014-2022. MISURA 7 - SOTTOMISURA 7.2 - OPERAZIONE 7.2.B INVESTIMENTO SU PICCOLA SCALA', 1, 186232.51, '2025-06-18 18:00:00'),
(4, 4, NULL, 'B7243C6561', 'Rifacimento della rete di distribuzione dell impianto termico del plesso scolastico', 1, 263471.43, '2025-06-27 10:00:00'),
(5, 5, NULL, 'B723BF0DF7', 'Affidamento in concessione del servizio di gestione della Piscina comunale per tre anni', 3, 30000.00, '2025-06-12 20:00:00')
ON CONFLICT (id) DO NOTHING;

-- Avvisi gara
INSERT INTO avviso_gara (id, gara_id, id_appalto, codice_scheda, data_pubblicazione, data_scadenza, data_pcp, attivo) VALUES
('0193b662-55f5-42f8-9820-7047d0ca36d2', 1, '6de04e19-4b67-4bfd-ac98-08d53d960eec', 'P1_16', '2025-06-05 06:00:01', '2025-07-04 00:00:00', '2025-06-03 22:00:00', true),
('047ec919-c5f2-496a-919e-51beccabd550', 2, '1a531c42-1792-4c90-ac0a-74e490d69688', 'P2_16', '2025-06-05 06:00:00', '2025-06-27 10:00:00', '2025-06-04 16:17:52', true),
('0590e92c-bc6d-4e28-b2e1-529bfe4f42ca', 3, '02581a9e-b420-4d67-8eeb-8dd7234e516c', 'P2_16', '2025-06-05 06:00:01', '2025-06-19 10:00:00', '2025-06-04 14:07:35', true),
('05e825de-3728-41ea-95a8-7faf68376ef7', 4, '68c72f26-6659-4c91-87c8-b26f8c49eb21', 'P1_16', '2025-06-05 06:00:00', '2025-07-11 00:00:00', '2025-06-03 22:00:00', true),
('06e38599-2c61-4cb6-a844-af22ae62466b', 5, '87dc95de-e5cd-4d1b-ad32-20b0410e6ea3', 'P2_16', '2025-06-05 06:00:00', '2025-07-07 11:00:00', '2025-06-04 10:53:15', true)
ON CONFLICT (id) DO NOTHING;`
