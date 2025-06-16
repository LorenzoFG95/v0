-- Inserimento dati nelle tabelle di lookup

-- Natura principale
INSERT INTO natura_principale (id, codice, descrizione) VALUES
(1, 'works', 'Lavori'),
(2, 'goods', 'Forniture'),
(3, 'services', 'Servizi')
ON CONFLICT (codice) DO NOTHING;

-- Stato procedura
INSERT INTO stato_procedura (id, codice, descrizione) VALUES
(1, 'planning', 'Programmazione'),
(2, 'active', 'In corso'),
(3, 'complete', 'Conclusa'),
(4, 'cancelled', 'Annullata'),
(5, 'unsuccessful', 'Senza esito')
ON CONFLICT (codice) DO NOTHING;

-- Reset delle sequenze
SELECT setval('natura_principale_id_seq', (SELECT MAX(id) FROM natura_principale));
SELECT setval('stato_procedura_id_seq', (SELECT MAX(id) FROM stato_procedura));
