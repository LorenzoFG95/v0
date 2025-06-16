-- Inserimento dati di esempio

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
(1, '2c4dbfea-21cb-4a15-95cd-95eaf8f32eb9', 'B7248F5C72', 1, 3, 'Procedura aperta per l'affidamento del servizio di attuazione di un piano di promozione', '2025-06-05 06:00:01', '2025-07-08 12:00:00', 200000.00),
(2, '1cac7ec5-cbae-4250-8b1c-e7962f97abda', 'B72476A67D', 1, 3, 'Procedura ristretta non impegnativa per l\'affidamento pluriennale in concessione del servizio di sfalcio erba', '2025-06-05 06:00:01', '2025-06-10 10:30:00', 9500.00),
(3, 'b25d816a-4868-4d68-9f6f-49812c98fc91', 'B7245BB2D2', 2, 1, 'PSR 2014-2022. MISURA 7 - SOTTOMISURA 7.2 - OPERAZIONE 7.2.B INVESTIMENTO SU PICCOLA SCALA', '2025-06-05 06:00:01', '2025-06-18 18:00:00', 186232.51),
(4, '1a531c42-1792-4c90-ac0a-74e490d69688', 'B7243C6561', 3, 1, 'Rifacimento della rete di distribuzione dell'impianto termico del plesso scolastico', '2025-06-05 06:00:00', '2025-06-27 10:00:00', 263471.43),
(5, '469d38ab-5607-463b-95a0-ebac9226e9fd', 'B723BF0DF7', 4, 3, 'Affidamento in concessione del servizio di gestione della Piscina comunale per tre anni', '2025-06-05 06:00:01', '2025-06-12 20:00:00', 30000.00)
ON CONFLICT (id) DO NOTHING;

-- Lotti
INSERT INTO lotto (id, gara_id, codice_lot, cig, descrizione, natura_principale_id, valore, termine_ricezione) VALUES
(1, 1, NULL, 'B7248F5C72', 'Procedura aperta per l'affidamento del servizio di attuazione di un piano di promozione', 3, 200000.00, '2025-07-08 12:00:00'),
(2, 2, NULL, 'B72476A67D', 'sfalcio erba', 3, 9500.00, '2025-06-10 10:30:00'),
(3, 3, NULL, 'B7245BB2D2', 'PSR 2014-2022. MISURA 7 - SOTTOMISURA 7.2 - OPERAZIONE 7.2.B INVESTIMENTO SU PICCOLA SCALA', 1, 186232.51, '2025-06-18 18:00:00'),
(4, 4, NULL, 'B7243C6561', 'Rifacimento della rete di distribuzione dell'impianto termico del plesso scolastico', 1, 263471.43, '2025-06-27 10:00:00'),
(5, 5, NULL, 'B723BF0DF7', 'Affidamento in concessione del servizio di gestione della Piscina comunale per tre anni', 3, 30000.00, '2025-06-12 20:00:00')
ON CONFLICT (id) DO NOTHING;

-- Avvisi gara
INSERT INTO avviso_gara (id, gara_id, id_appalto, codice_scheda, data_pubblicazione, data_scadenza, data_pcp, attivo) VALUES
('0193b662-55f5-42f8-9820-7047d0ca36d2', 1, '6de04e19-4b67-4bfd-ac98-08d53d960eec', 'P1_16', '2025-06-05 06:00:01', '2025-07-04 00:00:00', '2025-06-03 22:00:00', true),
('047ec919-c5f2-496a-919e-51beccabd550', 2, '1a531c42-1792-4c90-ac0a-74e490d69688', 'P2_16', '2025-06-05 06:00:00', '2025-06-27 10:00:00', '2025-06-04 16:17:52', true),
('0590e92c-bc6d-4e28-b2e1-529bfe4f42ca', 3, '02581a9e-b420-4d67-8eeb-8dd7234e516c', 'P2_16', '2025-06-05 06:00:01', '2025-06-19 10:00:00', '2025-06-04 14:07:35', true),
('05e825de-3728-41ea-95a8-7faf68376ef7', 4, '68c72f26-6659-4c91-87c8-b26f8c49eb21', 'P1_16', '2025-06-05 06:00:00', '2025-07-11 00:00:00', '2025-06-03 22:00:00', true),
('06e38599-2c61-4cb6-a844-af22ae62466b', 5, '87dc95de-e5cd-4d1b-ad32-20b0410e6ea3', 'P2_16', '2025-06-05 06:00:00', '2025-07-07 11:00:00', '2025-06-04 10:53:15', true)
ON CONFLICT (id) DO NOTHING;
