#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Set console to UTF-8 mode on Windows
import os
if os.name == 'nt':
    os.system('chcp 65001')

"""superset_cig_fetch.py

Fetch detailed CIG data (including categorie opera) from ANAC's Superset backend.

Prerequisites
-------------
pip install playwright requests
playwright install

Usage
-----
python superset_cig_fetch.py <CIG> [output_file.json]

Se non viene specificato un file di output, verrà creato un file con nome 'CIG_<codice>.json'
"""

import asyncio
import json
import os
import sys
import time
import uuid
from typing import Dict, Tuple, Optional
import ssl
import urllib3

import requests
from playwright.async_api import async_playwright

# Disabilita solo gli avvisi SSL che esistono
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Crea un contesto SSL personalizzato che ignora tutto
class CustomHTTPSAdapter(requests.adapters.HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        kwargs['ssl_context'] = ctx
        return super().init_poolmanager(*args, **kwargs)

SUPRESET_BASE = "https://dati.anticorruzione.it"
MAX_RETRIES = 3
BASE_TIMEOUT = 120


async def _get_session(cig: str) -> Tuple[Dict[str, str], str]:
    """Launches a headless Chromium session, opens the dashboard page for
    the given CIG and extracts:
      • all cookies as a dict
      • the csrf_token stored in localStorage
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--ignore-certificate-errors",
                "--ignore-ssl-errors",
                "--ignore-certificate-errors-spki-list",
                "--disable-web-security",
                "--allow-running-insecure-content",
                "--disable-extensions",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-features=VizDisplayCompositor"
            ]
        )
        context = await browser.new_context(
            ignore_https_errors=True,
            extra_http_headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
            }
        )
        page = await context.new_page()

        try:
            await page.goto(
                f"{SUPRESET_BASE}/superset/dashboard/dettaglio_cig/?cig={cig}&standalone=2",
                timeout=120_000,
                wait_until="networkidle"
            )
            
            # Aspetta un po' per assicurarsi che la pagina sia completamente caricata
            await page.wait_for_timeout(3000)
            
        except Exception as e:
            print(f"Errore durante il caricamento della pagina: {e}")
            await browser.close()
            return {}, ""

        # Collect cookies
        cookies_list = await context.cookies()
        cookies = {c["name"]: c["value"] for c in cookies_list}

        # csrf_token is stored in localStorage
        csrf_token = await page.evaluate("() => window.localStorage.getItem('csrf_token')")

        await browser.close()
        return cookies, csrf_token or ""


def _build_payload(cig: str, uuid_str: str) -> dict:
    """Return the JSON payload for the /api/v1/chart/data request."""
    columns = [
        "template", "stazione_appaltante", "bando", "pubblicazioni", "categorie_opera",
        "categorie_dpcm_aggregazione", "lavorazioni", "incaricati", "partecipanti",
        "aggiudicazione", "quadro_economico", "fonti_finanziamento", "avvio_contratto",
        "stati_avanzamento", "collaudo", "varianti", "fine_contratto", "subappalti",
        "sospensioni", "avvalimenti"
    ]

    base = {
        "datasource": {"id": 66, "type": "table"},
        "force": False,
        "result_format": "json",
        "result_type": "full",
    }

    query = {
        "time_range": "No filter",
        "granularity": "ts",
        "filters": [],
        "extras": {
            "time_grain_sqla": "P1D",
            "time_range_endpoints": ["inclusive", "exclusive"],
            "having": "",
            "having_druid": [],
            "where": ""
        },
        "applied_time_extras": {},
        "columns": columns,
        "orderby": [["template", True]],
        "annotation_layers": [],
        "row_limit": 2,
        "timeseries_limit": 0,
        "order_desc": True,
        "url_params": {"UUID": uuid_str, "cig": cig},
        "custom_params": {},
        "custom_form_data": {},
        "post_processing": []
    }

    import_time = int(time.time())
    
    form_data = {
        "datasource": "66__table",
        "viz_type": "table",
        "slice_id": 372,
        "url_params": {"UUID": uuid_str, "cig": cig},
        "time_range_endpoints": ["inclusive", "exclusive"],
        "granularity_sqla": "ts",
        "time_grain_sqla": "P1D",
        "time_range": "No filter",
        "query_mode": "raw",
        "groupby": [],
        "all_columns": columns,
        "percent_metrics": [],
        "adhoc_filters": [],
        "order_by_cols": [["template", True]],
        "row_limit": "2",
        "server_page_length": 10,
        "include_time": False,
        "order_desc": True,
        "table_timestamp_format": "smart_date",
        "show_cell_bars": True,
        "color_pn": True,
        "database_name": "Dremio",
        "datasource_name": "DETTAGLIO_CIG",
        "extra_form_data": {},
        "import_time": import_time,
        "remote_id": 745,
        "schema": "appalti",
        "label_colors": {},
        "shared_label_colors": {},
        "extra_filters": [],
        "dashboardId": 26,
        "force": None,
        "result_format": "json",
        "result_type": "full"
    }

    base["queries"] = [query]
    base["form_data"] = form_data
    return base


def safe_print(text):
    """Stampa testo gestendo i caratteri Unicode problematici"""
    try:
        print(text)
    except UnicodeEncodeError:
        # Rimuovi o sostituisci caratteri problematici
        safe_text = text.encode('ascii', 'replace').decode('ascii')
        print(safe_text)


def fetch_cig_details(cig: str) -> Optional[dict]:
    """High‑level helper: gets cookies/csrf and performs the data request.
    Implements retry logic with exponential backoff.
    """
    
    for attempt in range(MAX_RETRIES):
        try:
            current_timeout = BASE_TIMEOUT * (attempt + 1)
            print(f"Tentativo {attempt+1}/{MAX_RETRIES} (timeout: {current_timeout}s)...")
            
            cookies, csrf_token = asyncio.run(_get_session(cig))
            
            if not cookies:
                print("ATTENZIONE: Nessun cookie ottenuto dalla sessione")
                if attempt < MAX_RETRIES - 1:
                    wait_time = 2 ** attempt * 5
                    print(f"Attendo {wait_time} secondi prima del prossimo tentativo...")
                    time.sleep(wait_time)
                    continue
            
            uuid_str = str(uuid.uuid4())
            payload = _build_payload(cig, uuid_str)

            headers = {
                'Accept': 'application/json, text/plain, */*',
                # 'Accept-Encoding': 'gzip, deflate, br',  # <-- Commenta questa riga
                'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',  
                "content-type": "application/json",
                "origin": SUPRESET_BASE,
                "priority": "u=1, i",
                "referer": f"{SUPRESET_BASE}/superset/dashboard/dettaglio_cig/?UUID={uuid_str}&cig={cig}",
                "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "same-origin",
                "sec-fetch-site": "same-origin",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
                "x-csrftoken": csrf_token
            }

            url = f"{SUPRESET_BASE}/api/v1/chart/data?form_data=%7B%22slice_id%22%3A372%7D&dashboard_id=26&force"
            
            session = requests.Session()
            session.headers.update(headers)
            session.mount('https://', CustomHTTPSAdapter())
            session.verify = False
            
            response = session.post(
                url, 
                headers=headers, 
                cookies=cookies, 
                json=payload, 
                timeout=current_timeout,
                verify=False
            )
            
            print(f"Status code: {response.status_code}")
            print(f"Response length: {len(response.text)} caratteri")
            
            if response.status_code != 200:
                print(f"Errore HTTP {response.status_code}")
                if attempt < MAX_RETRIES - 1:
                    wait_time = 2 ** attempt * 5
                    print(f"Attendo {wait_time} secondi prima del prossimo tentativo...")
                    time.sleep(wait_time)
                    continue
                else:
                    return None
            
            if not response.text.strip():
                print("ERRORE: Risposta vuota dal server")
                if attempt < MAX_RETRIES - 1:
                    wait_time = 2 ** attempt * 5
                    print(f"Attendo {wait_time} secondi prima del prossimo tentativo...")
                    time.sleep(wait_time)
                    continue
                else:
                    return None
            
            try:
                data = response.json()
                print("Risposta JSON parsata con successo")
                return data
            except json.JSONDecodeError as json_err:
                print(f"Errore nel parsing JSON: {json_err}")
                # Stampa solo i primi 500 caratteri in modo sicuro
                try:
                    preview = response.text[:500]
                    safe_print(f"Anteprima risposta: {preview}")
                except:
                    print("Impossibile mostrare anteprima della risposta (caratteri non supportati)")
                
                if attempt < MAX_RETRIES - 1:
                    wait_time = 2 ** attempt * 5
                    print(f"Attendo {wait_time} secondi prima del prossimo tentativo...")
                    time.sleep(wait_time)
                    continue
                else:
                    return None
            
        except (requests.exceptions.SSLError, ssl.SSLError) as ssl_err:
            print(f"Errore SSL (tentativo {attempt+1}): {ssl_err}")
            if attempt < MAX_RETRIES - 1:
                wait_time = 2 ** attempt * 5
                print(f"Attendo {wait_time} secondi prima del prossimo tentativo...")
                time.sleep(wait_time)
        except requests.exceptions.Timeout:
            print(f"Timeout durante il tentativo {attempt+1}")
            if attempt < MAX_RETRIES - 1:
                wait_time = 2 ** attempt * 5
                print(f"Attendo {wait_time} secondi prima del prossimo tentativo...")
                time.sleep(wait_time)
        except requests.exceptions.RequestException as e:
            print(f"Errore durante la richiesta (tentativo {attempt+1}): {e}")
            if attempt < MAX_RETRIES - 1:
                wait_time = 2 ** attempt * 5
                print(f"Attendo {wait_time} secondi prima del prossimo tentativo...")
                time.sleep(wait_time)
        except UnicodeEncodeError as enc_err:
            print(f"Errore di encoding durante la stampa (tentativo {attempt+1})")
            # Non interrompere per errori di stampa, continua con il processing
            try:
                data = response.json()
                print("Risposta JSON parsata con successo (nonostante errore di stampa)")
                return data
            except:
                if attempt < MAX_RETRIES - 1:
                    wait_time = 2 ** attempt * 5
                    print(f"Attendo {wait_time} secondi prima del prossimo tentativo...")
                    time.sleep(wait_time)
        except Exception as e:
            print(f"Errore imprevisto (tentativo {attempt+1}): {type(e).__name__}")
            if attempt < MAX_RETRIES - 1:
                wait_time = 2 ** attempt * 5
                print(f"Attendo {wait_time} secondi prima del prossimo tentativo...")
                time.sleep(wait_time)
    
    return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python superset_cig_fetch.py <CIG> [output_file.json]")
        sys.exit(1)

    cig = sys.argv[1].strip().upper()
    
    if len(sys.argv) >= 3:
        output_file = sys.argv[2]
        output_file = os.path.abspath(output_file)
        print(f"Percorso file di output (assoluto): {output_file}")
    else:
        output_file = f"CIG_{cig}.json"
    
    data = None
    
    try:
        print(f"Recupero dati per il CIG: {cig}")
        data = fetch_cig_details(cig)
        
        if data is None:
            print(f"Impossibile recuperare i dati dopo {MAX_RETRIES} tentativi.")
            print("Suggerimenti:")
            print("- Il CIG potrebbe non esistere nel database ANAC")
            print("- Il server ANAC potrebbe essere sovraccarico")
            print("- Verifica che il CIG sia corretto e completo")
            sys.exit(2)
        
        output_dir = os.path.dirname(output_file)
        if output_dir:
            print(f"Creazione directory: {output_dir}")
            os.makedirs(output_dir, exist_ok=True)
        
        print(f"Tentativo di salvataggio in: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        if os.path.exists(output_file):
            print(f"Dati salvati con successo nel file: {output_file}")
            file_size = os.path.getsize(output_file)
            print(f"Dimensione file: {file_size} bytes")
        else:
            print(f"ERRORE: Il file non è stato creato: {output_file}")
        
    except Exception as exc:
        print(f"ERRORE: {exc}")
        sys.exit(2)


if __name__ == "__main__":
    main()

