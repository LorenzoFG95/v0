-- Creazione tabelle principali per il database appalti pubblici

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

-- Tabella lotti
CREATE TABLE IF NOT EXISTS lotto (
  id BIGSERIAL PRIMARY KEY,
  gara_id BIGINT REFERENCES gara(id) ON DELETE CASCADE,
  codice_lot VARCHAR(50),
  cig VARCHAR(20),
  descrizione TEXT,
  natura_principale_id INTEGER REFERENCES natura_principale(id),
  valore DECIMAL(18,2),
  valuta CHAR(3),
  status VARCHAR(20),
  criterio_aggiudicazione_id INTEGER REFERENCES criterio_aggiudicazione(id),
  cpv_id INTEGER REFERENCES categoria_cpv(id),
  nuts_code VARCHAR(5),
  termine_ricezione TIMESTAMP,
  accordo_quadro VARCHAR(100),
  sistema_dinamico_acq VARCHAR(150),
  asta_elettronica BOOLEAN DEFAULT FALSE,
  luogo_istat VARCHAR(10)
);

-- Tabella avvisi gara
CREATE TABLE IF NOT EXISTS avviso_gara (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gara_id BIGINT REFERENCES gara(id) ON DELETE CASCADE,
  id_appalto UUID,
  tipo_avviso_id INTEGER,
  codice_scheda VARCHAR(20),
  data_pubblicazione TIMESTAMP,
  data_scadenza TIMESTAMP,
  data_pcp TIMESTAMP,
  attivo BOOLEAN DEFAULT TRUE,
  nuovo_avviso UUID
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
CREATE POLICY "Allow public read access on avviso_gara" ON avviso_gara FOR SELECT USING (true);
