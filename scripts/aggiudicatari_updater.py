#!/usr/bin/env python3
"""
aggiudicatari_updater.py
========================

Script per l'elaborazione degli aggiudicatari da Pubblicità Legale:
- Scarica gli esiti giornalieri (codici scheda 7,8a,9)  
- Aggiorna gli aggiudicatari per i CIG esistenti nel database
- Per i CIG mancanti, scarica i dettagli da Superset, crea gara/lotto e inserisce aggiudicatari
- Supporta download parallelo e limitazione risultati
- Mostra percentuali di avanzamento per tutti i processi
"""

import os
import json
import math
import sys
import time
import subprocess
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import requests
from dotenv import load_dotenv
from supabase import create_client, Client

# ---------------------------------------------------------------------------
# CONFIGURAZIONE & COSTANTI
# ---------------------------------------------------------------------------
load_dotenv()

# Configurazione Supabase
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Variabili d'ambiente Supabase mancanti. Configura .env e riprova.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Configurazioni download
PAGE_SIZE = 100             # Dimensione pagina API
MAX_WORKERS = 4             # Thread paralleli
MAX_RESULTS = 100           # Limite massimo risultati
BASE_TIMEOUT = 30           # Timeout richieste

# Percorsi script e cache
SCRIPTS_DIR = Path(__file__).parent
FETCH_SCRIPT = SCRIPTS_DIR / "superset_cig_fetch.py"
LOCAL_DIR = Path("c:\\Users\\MADEINSICILY1\\Desktop\\BancaDati\\v0\\local")
CIG_CACHE_DIR = LOCAL_DIR / "cig_completi"

# Assicurati che le directory esistano
LOCAL_DIR.mkdir(parents=True, exist_ok=True)
CIG_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Configurazione API Pubblicità Legale
BASE_URL = "https://pubblicitalegale.anticorruzione.it/api/v0/avvisi"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://pubblicitalegale.anticorruzione.it/esiti",
    "Sec-Ch-Ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Priority": "u=1, i"
}

# ---------------------------------------------------------------------------
# SEZIONE 1 – DOWNLOAD ESITI DA PUBBLICITÀ LEGALE
# ---------------------------------------------------------------------------

def fetch_esiti_legali(data_pubblicazione: str) -> List[Dict]:
    """
    Scarica gli esiti da Pubblicità Legale per una data specifica.
    Limitato a MAX_RESULTS risultati con percentuale di avanzamento.
    """
    print(f"\n🔍 Scaricamento esiti (codici scheda: 7,8a,9) per data: {data_pubblicazione}")
    
    # Converti formato data da YYYY-MM-DD a DD/MM/YYYY
    try:
        date_obj = datetime.strptime(data_pubblicazione, '%Y-%m-%d')
        formatted_date = date_obj.strftime('%d/%m/%Y')
    except ValueError:
        print(f"❌ Formato data non valido: {data_pubblicazione}. Usa YYYY-MM-DD")
        return []
    
    params_base = {
        "dataPubblicazioneStart": formatted_date,
        "dataPubblicazioneEnd": formatted_date,
        "codiceScheda": "7,8a,9",  # Codici per esiti di aggiudicazione
        "size": PAGE_SIZE,
        "page": 0
    }
    
    all_esiti = []
    total_downloaded = 0
    
    while total_downloaded < MAX_RESULTS:
        try:
            response = requests.get(BASE_URL, headers=HEADERS, params=params_base, timeout=BASE_TIMEOUT)
            response.raise_for_status()
            
            payload = response.json()
            content = payload.get("content", [])
            
            if not content:
                print(f"\n✅ Download completato: nessun risultato alla pagina {params_base['page'] + 1}")
                break
            
            # Limita i risultati per rispettare MAX_RESULTS
            remaining_slots = MAX_RESULTS - total_downloaded
            if len(content) > remaining_slots:
                content = content[:remaining_slots]
            
            all_esiti.extend(content)
            total_downloaded += len(content)
            
            # Calcola e mostra percentuale
            percentage = (total_downloaded / MAX_RESULTS) * 100
            print(f"\r📥 Scaricamento: {total_downloaded}/{MAX_RESULTS} ({percentage:.1f}%)", end="", flush=True)
            
            if total_downloaded >= MAX_RESULTS:
                print(f"\n✅ Raggiunto limite di {MAX_RESULTS} risultati")
                break
                
            params_base["page"] += 1
            time.sleep(0.5)  # Anti rate-limit
            
        except requests.exceptions.RequestException as e:
            print(f"\n❌ Errore nel download pagina {params_base['page'] + 1}: {e}")
            break
        except Exception as e:
            print(f"\n❌ Errore imprevisto pagina {params_base['page'] + 1}: {e}")
            break
    
    print(f"\n📊 Totale esiti scaricati: {len(all_esiti)}")
    return all_esiti

# ---------------------------------------------------------------------------
# SEZIONE 2 – ESTRAZIONE AGGIUDICATARI
# ---------------------------------------------------------------------------

def extract_aggiudicatari_from_esiti(esiti: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Estrae i dati degli aggiudicatari dagli esiti, organizzati per CIG.
    Basato sulla struttura di esiti_aggiudicatari_extractor.py
    """
    print("\n🔍 Estrazione aggiudicatari dagli esiti...")
    
    aggiudicatari_by_cig = {}
    
    for esito in esiti:
        try:
            # Naviga la struttura: template[0].template.sections
            if 'template' in esito and esito['template']:
                for template_item in esito['template']:
                    if 'template' in template_item and 'sections' in template_item['template']:
                        sections = template_item['template']['sections']
                        
                        # Cerca la sezione "SEZ. C - Oggetto"
                        for section in sections:
                            if section.get('name') == 'SEZ. C - Oggetto' and 'items' in section:
                                for item in section['items']:
                                    cig = item.get('cig')
                                    if not cig:
                                        continue
                                    
                                    # Inizializza la lista per questo CIG se non esiste
                                    if cig not in aggiudicatari_by_cig:
                                        aggiudicatari_by_cig[cig] = []
                                    
                                    # Estrai i dati degli aggiudicatari
                                    if 'aggiudicatari_ad' in item:
                                        for agg in item['aggiudicatari_ad']:
                                            if 'soggetti' in agg:
                                                for soggetto in agg['soggetti']:
                                                    aggiudicatario_data = {
                                                        'denominazione': soggetto.get('denominazione', ''),
                                                        'codice_fiscale': soggetto.get('codice_fiscale', ''),
                                                        'importo': agg.get('importo'),
                                                        'data_aggiudicazione': esito.get('dataPubblicazione'),
                                                        'data_pubblicazione': esito.get('dataPubblicazione'),
                                                        'id_avviso': esito.get('idAvviso'),
                                                        'id_appalto': esito.get('idAppalto'),
                                                        'codice_scheda': esito.get('codiceScheda')
                                                    }
                                                    aggiudicatari_by_cig[cig].append(aggiudicatario_data)
        except Exception as e:
            print(f"⚠️ Errore nell'estrazione aggiudicatario: {e}")
            continue
    
    print(f"📊 Aggiudicatari estratti per {len(aggiudicatari_by_cig)} CIG")
    return aggiudicatari_by_cig

# ---------------------------------------------------------------------------
# SEZIONE 3 – GESTIONE DATABASE SUPABASE
# ---------------------------------------------------------------------------

def get_lotto_id_by_cig(cig: str) -> Optional[str]:
    """
    Recupera l'ID del lotto dal database Supabase usando il CIG.
    """
    try:
        response = supabase.table('lotto').select('id').eq('cig', cig).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]['id']
        return None
        
    except Exception as e:
        print(f"❌ Errore nel recupero lotto per CIG {cig}: {e}")
        return None

def insert_aggiudicatari_for_lotto(lotto_id: str, aggiudicatari: List[Dict]) -> bool:
    """
    Inserisce o aggiorna gli aggiudicatari per un lotto specifico.
    """
    try:
        for aggiudicatario in aggiudicatari:
            aggiudicatario_data = {
                'lotto_id': lotto_id,
                'denominazione': aggiudicatario.get('denominazione', ''),
                'codice_fiscale': aggiudicatario.get('codice_fiscale', ''),
                'importo': aggiudicatario.get('importo'),
                'data_aggiudicazione': aggiudicatario.get('data_aggiudicazione'),
                'data_pubblicazione': aggiudicatario.get('data_pubblicazione'),
                'id_avviso': aggiudicatario.get('id_avviso'),
                'id_appalto': aggiudicatario.get('id_appalto'),
                'codice_scheda': aggiudicatario.get('codice_scheda')
            }
            
            # Controlla se esiste già un aggiudicatario con stesso lotto_id e codice_fiscale
            codice_fiscale = aggiudicatario.get('codice_fiscale', '')
            if codice_fiscale:
                existing = supabase.table('aggiudicatario').select('id').eq('lotto_id', lotto_id).eq('codice_fiscale', codice_fiscale).execute()
                
                if existing.data and len(existing.data) > 0:
                    # Aggiorna esistente
                    existing_id = existing.data[0]['id']
                    result = supabase.table('aggiudicatario').update(aggiudicatario_data).eq('id', existing_id).execute()
                    if not result.data:
                        print(f"❌ Errore nell'aggiornamento aggiudicatario {aggiudicatario_data['denominazione']}")
                        return False
                else:
                    # Inserisci nuovo
                    result = supabase.table('aggiudicatario').insert(aggiudicatario_data).execute()
                    if not result.data:
                        print(f"❌ Errore nell'inserimento aggiudicatario {aggiudicatario_data['denominazione']}")
                        return False
            else:
                # Se non c'è codice fiscale, inserisci sempre nuovo record
                result = supabase.table('aggiudicatario').insert(aggiudicatario_data).execute()
                if not result.data:
                    print(f"❌ Errore nell'inserimento aggiudicatario {aggiudicatario_data['denominazione']}")
                    return False
        
        return True
        
    except Exception as e:
        print(f"❌ Errore nell'inserimento aggiudicatari per lotto {lotto_id}: {e}")
        return False

# ---------------------------------------------------------------------------
# SEZIONE 4 – DOWNLOAD DETTAGLI CIG DA SUPERSET
# ---------------------------------------------------------------------------

def fetch_cig_details(cig: str) -> Optional[Dict]:
    """
    Scarica i dettagli di un CIG utilizzando lo script superset_cig_fetch.py
    Basato sulla logica di unified_data_pipelineGPT.py
    """
    output_file = CIG_CACHE_DIR / f"{cig}.json"
    
    # Verifica se il file esiste già
    if output_file.exists():
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"  ↳ errore lettura cache per CIG {cig}: {e}")
            # Se c'è un errore nella lettura, procediamo con il download
    
    try:
        # Assicurati che la directory esista
        os.makedirs(CIG_CACHE_DIR, exist_ok=True)
        
        # Converti il percorso in stringa assoluta
        output_file_str = str(output_file.absolute())
        
        # Esegui lo script superset_cig_fetch.py per ottenere i dettagli del CIG
        result = subprocess.run(
            [sys.executable, str(FETCH_SCRIPT), cig, output_file_str],
            check=True,
            capture_output=True,
            text=True
        )
        
        # Verifica che il file esista prima di tentare di leggerlo
        if not output_file.exists():
            # Cerca il file nella directory principale
            alt_file = LOCAL_DIR / f"CIG_{cig}.json"
            if alt_file.exists():
                try:
                    with open(alt_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    # Copia il file nella posizione corretta
                    import shutil
                    shutil.copy2(alt_file, output_file)
                    return data
                except Exception as e:
                    print(f"  ↳ Errore durante la lettura/copia del file alternativo: {e}")
            
            # Se non troviamo il file alternativo, creiamo un file vuoto
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump({}, f)
            return {}
        
        # Leggi il file appena creato
        with open(output_file, 'r', encoding='utf-8') as f:
            return json.load(f)
            
    except subprocess.CalledProcessError as e:
        print(f"  ↳ errore durante il download del CIG {cig}: {e}")
        return None
    except Exception as e:
        print(f"  ↳ errore generico per CIG {cig}: {e}")
        return None

def fetch_multiple_cig_details(cigs: List[str]) -> Dict[str, Dict]:
    """
    Scarica i dettagli di più CIG in parallelo da Superset con percentuale di avanzamento.
    """
    print(f"\n🔄 Download parallelo dettagli per {len(cigs)} CIG...")
    
    cig_details = {}
    completed_count = 0
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Invia tutte le richieste
        future_to_cig = {executor.submit(fetch_cig_details, cig): cig for cig in cigs}
        
        # Processa i risultati man mano che arrivano
        for future in as_completed(future_to_cig):
            cig = future_to_cig[future]
            completed_count += 1
            
            try:
                details = future.result()
                if details:
                    cig_details[cig] = details
                
                # Mostra percentuale di avanzamento
                percentage = (completed_count / len(cigs)) * 100
                print(f"\r📥 Download CIG: {completed_count}/{len(cigs)} ({percentage:.1f}%)", end="", flush=True)
                
            except Exception as e:
                print(f"\n❌ Errore nel download CIG {cig}: {e}")
    
    print(f"\n📊 Dettagli scaricati per {len(cig_details)} CIG")
    return cig_details

# ---------------------------------------------------------------------------
# SEZIONE 5 – CREAZIONE GARE E LOTTI
# ---------------------------------------------------------------------------

def get_lookup_maps() -> Tuple[Dict[str, int], Dict[str, int], Dict[str, int], Dict[str, int]]:
    """
    Recupera le mappe per natura_principale, criterio_aggiudicazione, stato_procedura e categoria_cpv.
    Basato su unified_data_pipelineGPT.py
    """
    print("📖 Recupero mappe di lookup...")
    
    # Mappa per natura_principale (codice -> id)
    natura_map: Dict[str, int] = {}
    try:
        res = supabase.table("natura_principale").select("id,codice").execute()
        for item in res.data:
            natura_map[item["codice"].lower()] = item["id"]
    except Exception as exc:
        print(f"  ↳ errore recupero natura_principale: {exc}")
    
    # Mappa per criterio_aggiudicazione (codice -> id)
    criterio_map: Dict[str, int] = {}
    try:
        res = supabase.table("criterio_aggiudicazione").select("id,codice").execute()
        for item in res.data:
            criterio_map[item["codice"].lower()] = item["id"]
    except Exception as exc:
        print(f"  ↳ errore recupero criterio_aggiudicazione: {exc}")
    
    # Mappa per stato_procedura (codice -> id)
    stato_map: Dict[str, int] = {}
    try:
        res = supabase.table("stato_procedura").select("id,codice").execute()
        for item in res.data:
            stato_map[item["codice"].lower()] = item["id"]
    except Exception as exc:
        print(f"  ↳ errore recupero stato_procedura: {exc}")
    
    # Mappa per categoria_cpv (codice -> id)
    cpv_map: Dict[str, int] = {}
    try:
        res = supabase.table("categoria_cpv").select("id,codice").execute()
        for item in res.data:
            cpv_map[item["codice"]] = item["id"]
    except Exception as exc:
        print(f"  ↳ errore recupero categoria_cpv: {exc}")
    
    print(f"✔ Recuperate {len(natura_map)} nature, {len(criterio_map)} criteri, {len(stato_map)} stati, {len(cpv_map)} cpv")
    return natura_map, criterio_map, stato_map, cpv_map

def create_ente_if_needed(denominazione: str, codice_fiscale: str) -> Optional[str]:
    """
    Crea un ente se non esiste e restituisce l'ID.
    """
    try:
        # Verifica se l'ente esiste già
        response = supabase.table('ente_appaltante').select('id').eq('codice_fiscale', codice_fiscale).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]['id']
        
        # Crea nuovo ente
        ente_data = {
            'denominazione': denominazione,
            'codice_fiscale': codice_fiscale,
            'partita_iva': '',
            'regione': '',
            'citta': '',
            'indirizzo': '',
            'istat_comune': '',
            'sezione_regionale': ''
        }
        
        response = supabase.table('ente_appaltante').insert(ente_data).execute()
        
        if response.data and len(response.data) > 0:
            print(f"✅ Creato ente: {denominazione}")
            return response.data[0]['id']
        else:
            print(f"❌ Errore nella creazione ente {denominazione}: nessun dato restituito")
            return None
        
    except Exception as e:
        print(f"❌ Errore nella creazione ente {denominazione}: {e}")
        return None

def merge_data(cig_data: Dict) -> Dict:
    """
    Converte i dati CIG dal formato Superset in un formato utilizzabile.
    Basato su unified_data_pipelineGPT.py
    """
    merged = {
        "cig_details": {},
    }
    
    if not cig_data:
        return merged
        
    try:
        data_items = cig_data.get("result", [{}])[0].get("data", [])
        if data_items:
            item = data_items[0]
            # Alcune colonne sono stringhe con JSON incorporato
            for k in [
                "stazione_appaltante",
                "bando",
                "categorie_opera",
                "quadro_economico",
                "template",
                "incaricati",
                "pubblicazioni",
            ]:
                val = item.get(k)
                if isinstance(val, str):
                    try:
                        merged["cig_details"][k] = json.loads(val)
                    except json.JSONDecodeError:
                        merged["cig_details"][k] = val
                else:
                    merged["cig_details"][k] = val
    except Exception as exc:
        print(f"⚠️ merge_data: {exc}")
        
    return merged

def create_gara_and_lotto(cig_details: Dict, natura_map: Dict, criterio_map: Dict, stato_map: Dict, cpv_map: Dict) -> Optional[str]:
    """
    Crea gara e lotto nel database e restituisce l'ID del lotto.
    Basato su unified_data_pipelineGPT.py
    """
    try:
        # Merge dei dati
        merged = merge_data(cig_details)
        cig_data = merged.get("cig_details", {})
        
        # Estrai dati stazione appaltante
        sa = cig_data.get("stazione_appaltante", {})
        if not sa:
            print("❌ Dati stazione appaltante mancanti")
            return None
            
        denominazione_sa = sa.get('DENOMINAZIONE_AMMINISTRAZIONE_APPALTANTE', '')
        codice_fiscale_sa = sa.get('CF_AMMINISTRAZIONE_APPALTANTE', '')
        
        if not denominazione_sa or not codice_fiscale_sa:
            print("❌ Denominazione o CF stazione appaltante mancanti")
            return None
        
        # Crea o recupera ente
        ente_id = create_ente_if_needed(denominazione_sa, codice_fiscale_sa)
        if not ente_id:
            print(f"❌ Impossibile creare/trovare ente per SA {denominazione_sa}")
            return None
        
        # Estrai dati bando
        bando_data = cig_data.get("bando", {})
        if not bando_data:
            print("❌ Dati bando mancanti")
            return None
            
        cig = bando_data.get('CIG')
        if not cig:
            print("❌ CIG mancante nei dati bando")
            return None
        
        # Mappa natura principale
        natura_principale_id = None
        oggetto_principale = bando_data.get('OGGETTO_PRINCIPALE_CONTRATTO', '').lower()
        if 'lavori' in oggetto_principale:
            natura_principale_id = natura_map.get('lavori')
        elif 'forniture' in oggetto_principale or 'fornitura' in oggetto_principale:
            natura_principale_id = natura_map.get('forniture')
        elif 'servizi' in oggetto_principale or 'servizio' in oggetto_principale:
            natura_principale_id = natura_map.get('servizi')
        
        # Mappa criterio aggiudicazione
        criterio_id = None
        tipo_scelta = bando_data.get('TIPO_SCELTA_CONTRAENTE', '').lower()
        if 'economicamente' in tipo_scelta or 'vantaggiosa' in tipo_scelta:
            criterio_id = criterio_map.get('offerta_economicamente_vantaggiosa')
        elif 'prezzo' in tipo_scelta or 'ribasso' in tipo_scelta:
            criterio_id = criterio_map.get('prezzo_piu_basso')
        
        # Mappa stato procedura  
        stato_id = None
        stato = bando_data.get('STATO', '').lower()
        if 'aggiudicata' in stato or 'aggiudicato' in stato:
            stato_id = stato_map.get('aggiudicata')
        elif 'pubblicata' in stato or 'pubblicato' in stato:
            stato_id = stato_map.get('pubblicata')
        
        # Estrai CPV principale
        cpv_id = None
        cpv_list = bando_data.get("CPV", [])
        if cpv_list and isinstance(cpv_list, list) and len(cpv_list) > 0:
            cpv_code = cpv_list[0].get("COD_CPV")
            if cpv_code and cpv_code in cpv_map:
                cpv_id = cpv_map.get(cpv_code)
        
        # Crea gara
        gara_data = {
            'ente_appaltante_id': ente_id,
            'natura_principale_id': natura_principale_id,
            'criterio_aggiudicazione_id': criterio_id,
            'stato_procedura_id': stato_id,
            'descrizione': bando_data.get('OGGETTO_GARA', ''),
            'importo_totale': bando_data.get('IMPORTO_COMPLESSIVO_GARA'),
            'importo_sicurezza': bando_data.get('IMPORTO_SICUREZZA'),
            'valuta': 'EUR',
            'cig': cig,
            'cup': bando_data.get('CUP', [{}])[0].get('CUP') if bando_data.get('CUP') else None
        }
        
        # Estrai date di pubblicazione
        pubblicazioni = cig_data.get("pubblicazioni", {})
        if pubblicazioni:
            data_pubblicazione = pubblicazioni.get('DATA_PUBBLICAZIONE')
            if data_pubblicazione:
                gara_data['data_pubblicazione'] = data_pubblicazione
        
        gara_response = supabase.table('gara').insert(gara_data).execute()
        
        if not gara_response.data or len(gara_response.data) == 0:
            print(f"❌ Errore nella creazione gara per CIG {cig}")
            return None
        
        gara_id = gara_response.data[0]['id']
        
        # Crea lotto
        lotto_data = {
            'gara_id': gara_id,
            'cig': cig,
            'descrizione': bando_data.get('OGGETTO_LOTTO', bando_data.get('OGGETTO_GARA', '')),
            'natura_principale_id': natura_principale_id,
            'valore': bando_data.get('IMPORTO_LOTTO', bando_data.get('IMPORTO_COMPLESSIVO_GARA')),
            'valuta': 'EUR',
            'status': bando_data.get('STATO', ''),
            'criterio_aggiudicazione_id': criterio_id,
            'cpv_id': cpv_id
        }
        
        lotto_response = supabase.table('lotto').insert(lotto_data).execute()
        
        if lotto_response.data and len(lotto_response.data) > 0:
            return lotto_response.data[0]['id']
        
        return None
        
    except Exception as e:
        print(f"❌ Errore nella creazione gara/lotto: {e}")
        return None

# ---------------------------------------------------------------------------
# SEZIONE 6 – ELABORAZIONE PRINCIPALE
# ---------------------------------------------------------------------------

def process_aggiudicatari(aggiudicatari_by_cig: Dict[str, List[Dict]]) -> Dict[str, int]:
    """
    Elabora gli aggiudicatari: aggiorna quelli esistenti e crea nuovi CIG se necessario.
    Mostra percentuale di avanzamento durante l'elaborazione.
    """
    print(f"\n🔄 Elaborazione {len(aggiudicatari_by_cig)} CIG...")
    
    stats = {
        'aggiornati': 0,
        'nuovi_creati': 0,
        'errori': 0,
        'salvati_pending': 0
    }
    
    # Verifica CIG esistenti
    existing_cigs = set()
    missing_cigs = []
    
    processed_count = 0
    total_cigs = len(aggiudicatari_by_cig)
    
    for cig in aggiudicatari_by_cig.keys():
        lotto_id = get_lotto_id_by_cig(cig)
        if lotto_id:
            existing_cigs.add(cig)
        else:
            missing_cigs.append(cig)
    
    print(f"📊 CIG esistenti: {len(existing_cigs)}, CIG mancanti: {len(missing_cigs)}")
    
    # Aggiorna CIG esistenti
    for cig in existing_cigs:
        try:
            lotto_id = get_lotto_id_by_cig(cig)
            if lotto_id and insert_aggiudicatari_for_lotto(lotto_id, aggiudicatari_by_cig[cig]):
                stats['aggiornati'] += 1
            else:
                stats['errori'] += 1
                
            processed_count += 1
            percentage = (processed_count / total_cigs) * 100
            print(f"\r🔄 Elaborazione: {processed_count}/{total_cigs} ({percentage:.1f}%)", end="", flush=True)
            
        except Exception as e:
            print(f"\n❌ Errore nell'aggiornamento CIG {cig}: {e}")
            stats['errori'] += 1
    
    # Scarica dettagli per CIG mancanti
    if missing_cigs:
        print(f"\n\n📥 Download dettagli per {len(missing_cigs)} CIG mancanti...")
        cig_details_map = fetch_multiple_cig_details(missing_cigs)
        
        # Recupera mappe lookup
        natura_map, criterio_map, stato_map, cpv_map = get_lookup_maps()
        
        # Crea nuovi CIG
        for cig in missing_cigs:
            try:
                if cig in cig_details_map:
                    # Crea gara e lotto
                    lotto_id = create_gara_and_lotto(
                        cig_details_map[cig], 
                        natura_map, 
                        criterio_map, 
                        stato_map,
                        cpv_map
                    )
                    
                    if lotto_id:
                        # Inserisci aggiudicatari
                        if insert_aggiudicatari_for_lotto(lotto_id, aggiudicatari_by_cig[cig]):
                            stats['nuovi_creati'] += 1
                        else:
                            stats['errori'] += 1
                    else:
                        stats['errori'] += 1
                else:
                    # Salva in pending se non trovato su Superset
                    save_pending_aggiudicatari(cig, aggiudicatari_by_cig[cig])
                    stats['salvati_pending'] += 1
                
                processed_count += 1
                percentage = (processed_count / total_cigs) * 100
                print(f"\r🔄 Elaborazione: {processed_count}/{total_cigs} ({percentage:.1f}%)", end="", flush=True)
                
            except Exception as e:
                print(f"\n❌ Errore nella creazione CIG {cig}: {e}")
                stats['errori'] += 1
    
    print(f"\n✅ Elaborazione completata")
    return stats

def save_pending_aggiudicatari(cig: str, aggiudicatari: List[Dict]):
    """
    Salva gli aggiudicatari in file JSON per elaborazione futura.
    """
    try:
        # Crea directory se non esiste
        pending_dir = "aggiudicatari_pending"
        os.makedirs(pending_dir, exist_ok=True)
        
        # Salva file JSON
        filename = os.path.join(pending_dir, f"{cig}_aggiudicatari.json")
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump({
                'cig': cig,
                'aggiudicatari': aggiudicatari,
                'timestamp': datetime.now().isoformat()
            }, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Salvato pending: {filename}")
        
    except Exception as e:
        print(f"❌ Errore nel salvataggio pending per CIG {cig}: {e}")

# ---------------------------------------------------------------------------
# SEZIONE 7 – FUNZIONE PRINCIPALE
# ---------------------------------------------------------------------------

def main():
    """
    Funzione principale che coordina l'intero processo.
    """
    try:
        print("🚀 Avvio Aggiudicatari Updater")
        print(f"📊 Configurazione: MAX_RESULTS={MAX_RESULTS}, MAX_WORKERS={MAX_WORKERS}")
        
        # Data di default: ieri
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        data_pubblicazione = input(f"Inserisci data pubblicazione (YYYY-MM-DD) [default: {yesterday}]: ").strip()
        
        if not data_pubblicazione:
            data_pubblicazione = yesterday
        
        print(f"\n📅 Elaborazione per data: {data_pubblicazione}")
        
        # Step 1: Scarica esiti
        esiti = fetch_esiti_legali(data_pubblicazione)
        
        if not esiti:
            print("❌ Nessun esito trovato per la data specificata")
            return
        
        # Step 2: Estrai aggiudicatari
        aggiudicatari_by_cig = extract_aggiudicatari_from_esiti(esiti)
        
        if not aggiudicatari_by_cig:
            print("❌ Nessun aggiudicatario estratto")
            return
        
        # Step 3: Elabora aggiudicatari
        stats = process_aggiudicatari(aggiudicatari_by_cig)
        
        # Step 4: Mostra statistiche finali
        print("\n" + "="*50)
        print("📊 STATISTICHE FINALI")
        print("="*50)
        print(f"✅ CIG aggiornati: {stats['aggiornati']}")
        print(f"🆕 CIG nuovi creati: {stats['nuovi_creati']}")
        print(f"💾 CIG salvati in pending: {stats['salvati_pending']}")
        print(f"❌ Errori: {stats['errori']}")
        print(f"📈 Totale elaborati: {sum(stats.values())}")
        print("="*50)
        
        if stats['salvati_pending'] > 0:
            print(f"\n💡 {stats['salvati_pending']} CIG salvati in 'aggiudicatari_pending' per elaborazione futura")
        
        print("\n🎉 Processo completato con successo!")
        
    except KeyboardInterrupt:
        print("\n\n⏹️ Processo interrotto dall'utente")
    except Exception as e:
        print(f"\n❌ Errore critico: {e}")
        raise

if __name__ == "__main__":
    main()