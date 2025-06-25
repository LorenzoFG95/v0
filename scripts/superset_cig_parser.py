import json
import sys

def parse_superset_cig_data(json_file_path):
    """
    Analizza i dati JSON ottenuti dall'API Superset ANAC e stampa le informazioni utili.
    """
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Verifica se la chiave 'result' esiste ed è una lista
        if 'result' in data and isinstance(data['result'], list) and len(data['result']) > 0:
            # Estrai i dati dal primo elemento del risultato
            result_item = data['result'][0]
            
            if 'data' in result_item and isinstance(result_item['data'], list) and len(result_item['data']) > 0:
                # I dati effettivi sono nel primo elemento della lista 'data'
                cig_data = result_item['data'][0]
                
                print("\n===== DATI CIG =====\n")
                
                # Estrai e stampa i dati della stazione appaltante
                if 'stazione_appaltante' in cig_data and cig_data['stazione_appaltante']:
                    print("\n----- STAZIONE APPALTANTE -----")
                    sa_data = json.loads(cig_data['stazione_appaltante'])
                    print(f"Denominazione: {sa_data.get('DENOMINAZIONE_AMMINISTRAZIONE_APPALTANTE', 'N/A')}")
                    print(f"Codice Fiscale: {sa_data.get('CF_AMMINISTRAZIONE_APPALTANTE', 'N/A')}")
                    print(f"Città: {sa_data.get('CITTA', 'N/A')}")
                    print(f"Regione: {sa_data.get('REGIONE', 'N/A')}")
                    print(f"Indirizzo: {sa_data.get('INDIRIZZO', 'N/A')}")
                    print(f"Codice AUSA: {sa_data.get('CODICE_AUSA', 'N/A')}")
                
                # Estrai e stampa i dati del bando
                if 'bando' in cig_data and cig_data['bando']:
                    print("\n----- BANDO -----")
                    bando_data = json.loads(cig_data['bando'])
                    print(f"CIG: {bando_data.get('CIG', 'N/A')}")
                    print(f"Oggetto Gara: {bando_data.get('OGGETTO_GARA', 'N/A')}")
                    print(f"Oggetto Lotto: {bando_data.get('OGGETTO_LOTTO', 'N/A')}")
                    print(f"Importo Complessivo: {bando_data.get('IMPORTO_COMPLESSIVO_GARA', 'N/A')} €")
                    print(f"Importo Lotto: {bando_data.get('IMPORTO_LOTTO', 'N/A')} €")
                    print(f"Importo Sicurezza: {bando_data.get('IMPORTO_SICUREZZA', 'N/A')} €")
                    print(f"Tipo Scelta Contraente: {bando_data.get('TIPO_SCELTA_CONTRAENTE', 'N/A')}")
                    print(f"Stato: {bando_data.get('STATO', 'N/A')}")
                    print(f"Settore: {bando_data.get('SETTORE', 'N/A')}")
                    print(f"Oggetto Principale Contratto: {bando_data.get('OGGETTO_PRINCIPALE_CONTRATTO', 'N/A')}")
                    
                    # Estrai e stampa i dati CUP
                    if 'CUP' in bando_data and isinstance(bando_data['CUP'], list):
                        print("\nCUP:")
                        for cup_item in bando_data['CUP']:
                            print(f"  - {cup_item.get('CUP', 'N/A')}")
                    
                    # Estrai e stampa i dati CPV
                    if 'CPV' in bando_data and isinstance(bando_data['CPV'], list):
                        print("\nCPV:")
                        for cpv_item in bando_data['CPV']:
                            print(f"  - {cpv_item.get('COD_CPV', 'N/A')}: {cpv_item.get('DESCRIZIONE_CPV', 'N/A')}")
                
                # Estrai e stampa i dati delle pubblicazioni
                if 'pubblicazioni' in cig_data and cig_data['pubblicazioni']:
                    print("\n----- PUBBLICAZIONI -----")
                    pub_data = json.loads(cig_data['pubblicazioni'])
                    print(f"Data Creazione: {pub_data.get('DATA_CREAZIONE', 'N/A')}")
                    print(f"Data Pubblicazione: {pub_data.get('DATA_PUBBLICAZIONE', 'N/A')}")
                    print(f"Data GURI: {pub_data.get('DATA_GURI', 'N/A')}")
                    print(f"Link Sito Committente: {pub_data.get('LINK_SITO_COMMITTENTE', 'N/A')}")
                
                # Estrai e stampa i dati delle categorie opera
                if 'categorie_opera' in cig_data and cig_data['categorie_opera']:
                    print("\n----- CATEGORIE OPERA -----")
                    try:
                        cat_data = json.loads(cig_data['categorie_opera'])
                        if isinstance(cat_data, list):
                            for cat_item in cat_data:
                                print(f"ID Categoria: {cat_item.get('ID_CATEGORIA', 'N/A')}")
                                print(f"Descrizione: {cat_item.get('DESCRIZIONE', 'N/A')}")
                                print(f"Tipo Categoria: {cat_item.get('DESCRIZIONE_TIPO_CATEGORIA', 'N/A')}")
                    except json.JSONDecodeError:
                        print(f"Errore nel parsing delle categorie opera: {cig_data['categorie_opera']}")
                
                # Estrai e stampa i dati delle categorie DPCM aggregazione
                if 'categorie_dpcm_aggregazione' in cig_data and cig_data['categorie_dpcm_aggregazione']:
                    print("\n----- CATEGORIE DPCM AGGREGAZIONE -----")
                    try:
                        cat_dpcm_data = json.loads(cig_data['categorie_dpcm_aggregazione'])
                        if isinstance(cat_dpcm_data, list):
                            for cat_item in cat_dpcm_data:
                                print(f"Categoria: {cat_item.get('CATEGORIA_MERCEOLOGICA_DPCM_AGGREGAZIONE', 'N/A')}")
                                print(f"Codice: {cat_item.get('COD_CATEGORIA_MERCEOLOGICA_DPCM_AGGREGAZIONE', 'N/A')}")
                    except json.JSONDecodeError:
                        print(f"Errore nel parsing delle categorie DPCM: {cig_data['categorie_dpcm_aggregazione']}")
                
                # Estrai e stampa i dati degli incaricati
                if 'incaricati' in cig_data and cig_data['incaricati']:
                    print("\n----- INCARICATI -----")
                    try:
                        inc_data = json.loads(cig_data['incaricati'])
                        if isinstance(inc_data, list):
                            for inc_item in inc_data:
                                print(f"Ruolo: {inc_item.get('DESCRIZIONE_RUOLO', 'N/A')} ({inc_item.get('COD_RUOLO', 'N/A')})")
                                print(f"Nome: {inc_item.get('NOME', 'N/A')} {inc_item.get('COGNOME', 'N/A')}")
                                print()
                    except json.JSONDecodeError:
                        print(f"Errore nel parsing degli incaricati: {cig_data['incaricati']}")
                
                # Verifica e stampa altri campi se presenti e non nulli
                for field in ['partecipanti', 'aggiudicazione', 'quadro_economico', 'fonti_finanziamento', 
                              'avvio_contratto', 'stati_avanzamento', 'collaudo', 'varianti', 
                              'fine_contratto', 'subappalti', 'sospensioni', 'avvalimenti']:
                    if field in cig_data and cig_data[field]:
                        print(f"\n----- {field.upper()} -----")
                        try:
                            field_data = json.loads(cig_data[field])
                            print(json.dumps(field_data, indent=2, ensure_ascii=False))
                        except json.JSONDecodeError:
                            print(f"Errore nel parsing di {field}: {cig_data[field]}")
            else:
                print("Errore: La struttura dei dati nel file JSON non è quella attesa.")
        else:
            print("Errore: Il file JSON non contiene la chiave 'result' o non è una lista.")

    except FileNotFoundError:
        print(f"Errore: File non trovato a {json_file_path}")
    except json.JSONDecodeError:
        print(f"Errore: Impossibile decodificare il JSON dal file {json_file_path}. Assicurati che il file contenga JSON valido.")
    except Exception as e:
        print(f"Si è verificato un errore: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Utilizzo: python superset_cig_parser.py <percorso_file_json>")
        sys.exit(1)

    json_file_path = sys.argv[1]
    parse_superset_cig_data(json_file_path)