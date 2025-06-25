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

import requests
from playwright.async_api import async_playwright

SUPRESET_BASE = "https://dati.anticorruzione.it"
MAX_RETRIES = 3  # Numero massimo di tentativi
BASE_TIMEOUT = 120  # Timeout di base in secondi


async def _get_session(cig: str) -> Tuple[Dict[str, str], str]:
    """Launches a headless Chromium session, opens the dashboard page for
    the given CIG and extracts:
      • all cookies as a dict
      • the csrf_token stored in localStorage
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True,
                                          args=["--disable-blink-features=AutomationControlled"])
        context = await browser.new_context()
        page = await context.new_page()

        # Aumentato il timeout a 120 secondi
        await page.goto(
            f"{SUPRESET_BASE}/superset/dashboard/dettaglio_cig/?cig={cig}&standalone=2",
            timeout=120_000
        )

        # Collect cookies
        cookies_list = await context.cookies()
        cookies = {c["name"]: c["value"] for c in cookies_list}

        # csrf_token is stored in localStorage
        csrf_token = await page.evaluate("() => window.localStorage.getItem('csrf_token')")

        await browser.close()
        return cookies, csrf_token


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
        "import_time": 0,
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


def fetch_cig_details(cig: str) -> Optional[dict]:
    """High‑level helper: gets cookies/csrf and performs the data request.
    Implements retry logic with exponential backoff.
    """

    
    for attempt in range(MAX_RETRIES):
        try:
            # Aumenta il timeout ad ogni tentativo
            current_timeout = BASE_TIMEOUT * (attempt + 1)
            print(f"Tentativo {attempt+1}/{MAX_RETRIES} (timeout: {current_timeout}s)...")
            
            cookies, csrf_token = asyncio.run(_get_session(cig))
            uuid_str = str(uuid.uuid4())
            payload = _build_payload(cig, uuid_str)

            headers = {
                "accept": "application/json",
                "content-type": "application/json",
                "origin": SUPRESET_BASE,
                "referer": f"{SUPRESET_BASE}/superset/dashboard/dettaglio_cig/?cig={cig}",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
                "x-csrftoken": csrf_token or ""
            }

            url = f"{SUPRESET_BASE}/api/v1/chart/data?form_data=%7B%22slice_id%22%3A372%7D&dashboard_id=26&force"
            response = requests.post(url, headers=headers, cookies=cookies, json=payload, timeout=current_timeout)
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.Timeout:
            print(f"Timeout durante il tentativo {attempt+1}. Riprovo...")
            # Attesa esponenziale tra i tentativi
            if attempt < MAX_RETRIES - 1:
                wait_time = 2 ** attempt * 5  # 5, 10, 20 secondi...
                print(f"Attendo {wait_time} secondi prima del prossimo tentativo...")
                time.sleep(wait_time)
        except requests.exceptions.RequestException as e:
            print(f"Errore durante la richiesta (tentativo {attempt+1}): {e}")
            if attempt < MAX_RETRIES - 1:
                wait_time = 2 ** attempt * 5
                print(f"Attendo {wait_time} secondi prima del prossimo tentativo...")
                time.sleep(wait_time)
        except Exception as e:
            print(f"Errore imprevisto (tentativo {attempt+1}): {e}")
            if attempt < MAX_RETRIES - 1:
                wait_time = 2 ** attempt * 5
                print(f"Attendo {wait_time} secondi prima del prossimo tentativo...")
                time.sleep(wait_time)
    
    # Se arriviamo qui, tutti i tentativi sono falliti
    return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python superset_cig_fetch.py <CIG> [output_file.json]")
        sys.exit(1)

    cig = sys.argv[1].strip().upper()
    
    # Determina il nome del file di output
    if len(sys.argv) >= 3:
        output_file = sys.argv[2]
        # Assicurati che il percorso sia assoluto
        output_file = os.path.abspath(output_file)
        print(f"Percorso file di output (assoluto): {output_file}")
    else:
        # Solo in questo caso, usa il percorso predefinito nella directory corrente
        output_file = f"CIG_{cig}.json"
    
    # Initialize data variable to avoid reference before assignment
    data = None
    
    try:
        print(f"Recupero dati per il CIG: {cig}")
        data = fetch_cig_details(cig)
        
        if data is None:
            print(f"Impossibile recuperare i dati dopo {MAX_RETRIES} tentativi.")
            print("Suggerimenti:")
            print("- Il server ANAC potrebbe essere sovraccarico, riprova più tardi")
            print("- Verifica che il CIG sia corretto")
            print("- Prova ad aumentare MAX_RETRIES o BASE_TIMEOUT nel codice")
            sys.exit(2)
        
        # Create parent directory if it doesn't exist
        output_dir = os.path.dirname(output_file)
        print(f"Creazione directory: {output_dir}")
        os.makedirs(output_dir, exist_ok=True)
        
        # Verifica che la directory esista
        if not os.path.exists(output_dir):
            print(f"ERRORE: Impossibile creare la directory {output_dir}")
            sys.exit(2)
        
        # Salva i dati nel file JSON
        print(f"Tentativo di salvataggio in: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=True)
        
        # Verifica che il file sia stato creato
        if os.path.exists(output_file):
            print(f"Dati salvati con successo nel file: {output_file}")
        else:
            print(f"ERRORE: Il file non è stato creato: {output_file}")
        print(f"Percorso completo: {os.path.realpath(output_file)}")
        
    except UnicodeEncodeError as enc_err:
        print(f"ERRORE di codifica caratteri: {type(enc_err).__name__}")
        # Fallback: salva con ensure_ascii=True e encoding diverso
        try:
            if data is not None:
                # Create parent directory if it doesn't exist
                output_dir = os.path.dirname(output_file)
                print(f"Creazione directory (fallback): {output_dir}")
                os.makedirs(output_dir, exist_ok=True)
                
                # Prova con encoding diverso
                print(f"Tentativo di salvataggio con encoding alternativo in: {output_file}")
                with open(output_file, 'w', encoding='utf-8-sig') as f:
                    json.dump(data, f, indent=2, ensure_ascii=True)
                
                # Verifica che il file sia stato creato
                if os.path.exists(output_file):
                    print(f"Dati salvati con successo (fallback) nel file: {output_file}")
                else:
                    print(f"ERRORE (fallback): Il file non è stato creato: {output_file}")
            else:
                print("Nessun dato da salvare.")
                # Crea comunque un file vuoto per evitare errori di lettura
                output_dir = os.path.dirname(output_file)
                os.makedirs(output_dir, exist_ok=True)
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump({}, f)
                print(f"Creato file vuoto: {output_file}")
        except Exception as fallback_err:
            print(f"ERRORE nel fallback: {fallback_err}")
            sys.exit(2)
    except Exception as exc:
        print(f"ERRORE: {exc}")
        sys.exit(2)


if __name__ == "__main__":
    main()

