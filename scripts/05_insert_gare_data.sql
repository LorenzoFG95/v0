-- Inserimento gare di esempio
INSERT INTO gara (id, ocid, ente_appaltante_id, natura_principale_id, descrizione, data_pubblicazione, importo_totale) VALUES
(6, '2c4dbfea-21cb-4a15-95cd-95eaf8f32eb9', 6, 3, 'Procedura aperta per l''affidamento del servizio di attuazione di un piano di promozione (organizzazione di manifestazioni perla valorizzazione ecoturistica dell''ambiente, per la promozione della cultura marinara locale e dei prodotti ittici ed ittico-conservieri) dal 2025 al 2026 (durata 24 mesi).', '2025-06-05 06:00:01', 200000.00),
(7, '1cac7ec5-cbae-4250-8b1c-e7962f97abda', 7, 3, 'Procedura ristretta non impegnativa per l''A.D. per l''affidamento pluriennale in concessione del servizio di sfalcio erba presso il Comando Aeroporto Sigonella e Deposito Favotto.', '2025-06-05 06:00:01', 9500.00),
(8, 'b25d816a-4868-4d68-9f6f-49812c98fc91', 8, 1, 'PSR 2014-2022. MISURA 7 - SOTTOMISURA 7.2 - OPERAZIONE 7.2.B INVESTIMENTO SU PICCOLA SCALA PER LAMMODERNAMENTO DELLA VIABILITÀ COMUNALE SECONDARIA ESISTENTE Importo € 250.000,00 - CUP: C97H23000500002', '2025-06-05 06:00:01', 186232.51),
(9, '1a531c42-1792-4c90-ac0a-74e490d69688', 9, 1, 'Rifacimento della rete di distribuzione dell''impianto termico del plesso scolastico di via A. Moro n. 14 e ristrutturazione spogliatoi palestra', '2025-06-05 06:00:00', 263471.43),
(10, '469d38ab-5607-463b-95a0-ebac9226e9fd', 10, 3, 'Affidamento in concessione del servizio di gestione della Piscina comunale per tre anni', '2025-06-05 06:00:01', 30000.00),
(11, '41c00486-4eb1-4e8e-9fb7-014167110cc0', 11, 1, 'Manutenzione straordinaria della sede stradale di via Virginia Agnelli e di via Federico Di Donato PT20220756. CUP J87H22001370004', '2025-06-05 06:00:00', 298520.67),
(12, 'ae0c646a-438e-4199-8de6-2c835d598da4', 12, 2, '95/1 FORNITURA DI UN MICROSCOPIO ELETTRONICO A SCANSIONE CON SISTEMA DI MICROANALISI', '2025-06-05 06:00:00', 344262.29),
(13, 'd89e89eb-bb59-4b04-95c4-56b5ab0c95b7', 13, 1, 'Manutenzione straordinaria delle tubazioni idriche gestite dalla Viva Servizi Spa con tecniche di relining', '2025-06-05 06:00:01', 4680000.00),
(14, 'e6102f8f-aa52-4078-8643-67fff025c8f1', 14, 1, 'PROCEDURA DI DI PARTENARIATO PUBBLICO PRIVATO (ART. 193 E SEGG. D.LGS. 36/2023) PER IL RECUPERO, LA RIFUNZIONALIZZAZIONE E LA GESTIONE DELL''EX CENTRALE TERMOELETTRICA DEL MOLINAZZO', '2025-06-05 06:00:00', 3200000.00),
(15, '6af809e5-334e-43f7-a797-912b85c151ca', 15, 2, 'FORNITURA DI N.5 HOLTER PRESSORI DESTINATI A VARI REPARTI DELL''OSPEDALE DI CIRCOLO', '2025-06-05 06:00:00', 10500.00)
ON CONFLICT (ocid) DO NOTHING;

-- Reset sequenza
SELECT setval('gara_id_seq', (SELECT MAX(id) FROM gara));
