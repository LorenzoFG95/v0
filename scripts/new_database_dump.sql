-- Dump del nuovo database con dati completi
-- Questo script sostituisce tutti i dati precedenti

-- Creazione tabelle principali
CREATE TABLE IF NOT EXISTS natura_principale (
  id SERIAL PRIMARY KEY,
  codice VARCHAR(20) UNIQUE NOT NULL,
  descrizione VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS stato_procedura (
  id SERIAL PRIMARY KEY,
  codice VARCHAR(20) UNIQUE NOT NULL,
  descrizione VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS criterio_aggiudicazione (
  id SERIAL PRIMARY KEY,
  codice VARCHAR(10) UNIQUE NOT NULL,
  descrizione VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS categoria_cpv (
  id SERIAL PRIMARY KEY,
  codice VARCHAR(10) UNIQUE NOT NULL,
  descrizione VARCHAR(255) NOT NULL
);

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

CREATE TABLE IF NOT EXISTS gara (
  id BIGSERIAL PRIMARY KEY,
  ocid VARCHAR(50) UNIQUE,
  cig VARCHAR(20),
  cup VARCHAR(20),
  ente_appaltante_id INTEGER REFERENCES ente_appaltante(id),
  natura_principale_id INTEGER REFERENCES natura_principale(id),
  criterio_aggiudicazione_id INTEGER REFERENCES criterio_aggiudicazione(id),
  stato_procedura_id INTEGER REFERENCES stato_procedura(id),
  descrizione TEXT,
  data_pubblicazione TIMESTAMP,
  scadenza_offerta TIMESTAMP,
  importo_totale DECIMAL(18,2),
  importo_sicurezza DECIMAL(18,2),
  valuta CHAR(3)
);

-- Inserimento dati di lookup
INSERT INTO natura_principale (id, codice, descrizione) VALUES 
(1, 'works', 'Lavori'),
(2, 'goods', 'Forniture'),
(3, 'services', 'Servizi')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stato_procedura (id, codice, descrizione) VALUES 
(1, 'planning', 'Programmazione'),
(2, 'active', 'In corso'),
(3, 'complete', 'Conclusa'),
(4, 'cancelled', 'Annullata'),
(5, 'unsuccessful', 'Senza esito')
ON CONFLICT (id) DO NOTHING;

-- Inserimento enti appaltanti con i nuovi dati
INSERT INTO ente_appaltante (id, codice_fiscale, denominazione, regione, citta) VALUES
(6, '03242150831', 'GRUPPO D''AZIONE COSTIERA GOLFO DI PATTI - SOCIETA'' CONSORTILE A R L.', 'Sicilia', 'Patti'),
(7, '80011100874', 'COMANDO AEROPORTO DI SIGONELLA', 'Sicilia', 'Sigonella'),
(8, '83000830758', 'COMUNE DI NOCIGLIA', 'Puglia', 'Nociglia'),
(9, '03482920158', 'COMUNE DI BUCCINASCO', 'Lombardia', 'Buccinasco'),
(10, '81000430645', 'COMUNE DI SAVIGNANO IRPINO', 'Campania', 'Savignano Irpino'),
(11, '02438750586', 'ROMA CAPITALE', 'Lazio', 'Roma'),
(12, '97103490583', 'COMANDO UNITA'' MOBILI E SPECIALIZZATE CARABINIERI PALIDORO', 'Lazio', 'Roma'),
(13, '02191980420', 'VIVA SERVIZI S.P.A.', 'Marche', 'Ancona'),
(14, '00296180185', 'COMUNE DI PAVIA', 'Lombardia', 'Pavia'),
(15, '03510050127', 'AZIENDA SOCIO SANITARIA TERRITORIALE DEI SETTE LAGHI', 'Lombardia', 'Varese')
ON CONFLICT (id) DO NOTHING;

-- Inserimento gare con CIG
INSERT INTO gara (id, ocid, cig, ente_appaltante_id, natura_principale_id, descrizione, data_pubblicazione, scadenza_offerta, importo_totale) VALUES
(6, '2c4dbfea-21cb-4a15-95cd-95eaf8f32eb9', 'B7248F5C72', 6, 3, 'Procedura aperta per l''affidamento del servizio di attuazione di un piano di promozione (organizzazione di manifestazioni perla valorizzazione ecoturistica dell''ambiente, per la promozione della cultura marinara locale e dei prodotti ittici ed ittico-conservieri) dal 2025 al 2026 (durata 24 mesi).', '2025-06-05 06:00:01', '2025-07-08 12:00:00', 200000.00),
(7, '1cac7ec5-cbae-4250-8b1c-e7962f97abda', 'B72476A67D', 7, 3, 'Procedura ristretta non impegnativa per l''A.D. per l''affidamento pluriennale in concessione del servizio di sfalcio erba presso il Comando Aeroporto Sigonella e Deposito Favotto.', '2025-06-05 06:00:01', '2025-06-10 10:30:00', 9500.00),
(8, 'b25d816a-4868-4d68-9f6f-49812c98fc91', 'B7245BB2D2', 8, 1, 'PSR 2014-2022. MISURA 7 - SOTTOMISURA 7.2 - OPERAZIONE 7.2.B INVESTIMENTO SU PICCOLA SCALA PER LAMMODERNAMENTO DELLA VIABILITÀ COMUNALE SECONDARIA ESISTENTE Importo € 250.000,00 - CUP: C97H23000500002', '2025-06-05 06:00:01', '2025-06-18 18:00:00', 186232.51),
(9, '1a531c42-1792-4c90-ac0a-74e490d69688', 'B7243C6561', 9, 1, 'Rifacimento della rete di distribuzione dell''impianto termico del plesso scolastico di via A. Moro n. 14 e ristrutturazione spogliatoi palestra', '2025-06-05 06:00:00', '2025-06-27 10:00:00', 263471.43),
(10, '469d38ab-5607-463b-95a0-ebac9226e9fd', 'B723BF0DF7', 10, 3, 'Affidamento in concessione del servizio di gestione della Piscina comunale per tre anni', '2025-06-05 06:00:01', '2025-06-12 20:00:00', 30000.00),
(11, '41c00486-4eb1-4e8e-9fb7-014167110cc0', 'B7248A9E15', 11, 1, 'Manutenzione straordinaria della sede stradale di via Virginia Agnelli e di via Federico Di Donato PT20220756. CUP J87H22001370004', '2025-06-05 06:00:00', '2025-07-15 12:00:00', 298520.67),
(12, 'ae0c646a-438e-4199-8de6-2c835d598da4', 'B7249C7F23', 12, 2, '95/1 FORNITURA DI UN MICROSCOPIO ELETTRONICO A SCANSIONE CON SISTEMA DI MICROANALISI', '2025-06-05 06:00:00', '2025-06-25 16:00:00', 344262.29),
(13, 'd89e89eb-bb59-4b04-95c4-56b5ab0c95b7', 'B724A1B8D4', 13, 1, 'Manutenzione straordinaria delle tubazioni idriche gestite dalla Viva Servizi Spa con tecniche di relining', '2025-06-05 06:00:01', '2025-08-05 14:00:00', 4680000.00),
(14, 'e6102f8f-aa52-4078-8643-67fff025c8f1', 'B724B2C9E5', 14, 1, 'PROCEDURA DI DI PARTENARIATO PUBBLICO PRIVATO (ART. 193 E SEGG. D.LGS. 36/2023) PER IL RECUPERO, LA RIFUNZIONALIZZAZIONE E LA GESTIONE DELL''EX CENTRALE TERMOELETTRICA DEL MOLINAZZO', '2025-06-05 06:00:00', '2025-09-15 18:00:00', 3200000.00),
(15, '6af809e5-334e-43f7-a797-912b85c151ca', 'B724C3DAF6', 15, 2, 'FORNITURA DI N.5 HOLTER PRESSORI DESTINATI A VARI REPARTI DELL''OSPEDALE DI CIRCOLO', '2025-06-05 06:00:00', '2025-06-20 11:00:00', 10500.00)
ON CONFLICT (id) DO NOTHING;

-- Indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_gara_ente ON gara(ente_appaltante_id);
CREATE INDEX IF NOT EXISTS idx_gara_cig ON gara(cig);
CREATE INDEX IF NOT EXISTS idx_gara_data_pubblicazione ON gara(data_pubblicazione);

-- Abilita RLS (Row Level Security)
ALTER TABLE gara ENABLE ROW LEVEL SECURITY;

-- Policy per permettere lettura pubblica
CREATE POLICY "Allow public read access on gara" ON gara FOR SELECT USING (true);
