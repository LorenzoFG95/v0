#!/usr/bin/env python3
"""
unified_data_pipeline.py – full refactor 20 Jun 2025
===================================================

*   Scarica i bandi pubblicati ogni giorno dal portale **Pubblicità Legale – ANAC**
*   Per ogni bando recupera i dati di dettaglio CIG dal Superset ANAC
*   Normalizza le informazioni e le carica in Supabase secondo il **nuovo schema**:

```
┌──────────────────────┐        ┌─────────────────────────────┐
│  categoria_opera     │        │   lotto_categoria_opera     │
│──────────────────────│ 1    * │─────────────────────────────│
│ id PK                │◀────────│ lotto_id          ( FK )   │
│ id_categoria (code)  │        │ categoria_opera_id ( FK )  │
│ descrizione          │        │ ruolo  CHAR(1)  ('P'/'S')  │
└──────────────────────┘        └─────────────────────────────┘
```

La dimensione *ruolo* (prevalente `P` / scorporabile `S`) **non** risiede più nella tabella
`categoria_opera` ma soltanto nella tabella ponte `lotto_categoria_opera`.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import subprocess
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from supabase import Client, create_client

# ---------------------------------------------------------------------------
# CONFIGURAZIONE & COSTANTI
# ---------------------------------------------------------------------------
load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌  Variabili d'ambiente Supabase mancanti. Configura .env e riprova.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Percorsi file e script
LOCAL_DIR = Path("c:\\Users\\MADEINSICILY1\\Desktop\\BancaDati\\v0\\local")
CIG_CACHE_DIR = LOCAL_DIR / "cig_completi"
SCRIPTS_DIR = Path("c:\\Users\\MADEINSICILY1\\Desktop\\BancaDati\\v0\\scripts")
FETCH_SCRIPT = SCRIPTS_DIR / "superset_cig_fetch.py"
PARSER_SCRIPT = SCRIPTS_DIR / "superset_cig_parser.py"

# Assicurati che le directory esistano
LOCAL_DIR.mkdir(parents=True, exist_ok=True)
CIG_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Configurazione download
MAX_WORKERS = 4  # Numero di thread paralleli per il download

# ---------------------------------------------------------------------------
# SEZIONE 1 – DOWNLOAD BANDI GIORNALIERI
# ---------------------------------------------------------------------------


import datetime as dt
import requests, time, math
from typing import List, Dict

BASE_URL = "https://pubblicitalegale.anticorruzione.it/api/v0/avvisi"
HEADERS  = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) "
                   "Chrome/137.0.0.0 Safari/537.36"),
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://pubblicitalegale.anticorruzione.it/bandi"
}
PAGE_SIZE = 100                # valore max accettato dall’API

def fetch_avvisi_legali(date: dt.date,
                        codice_scheda: str = "2,4") -> List[Dict]:
    """Scarica tutti gli avvisi pubblicati in una certa data."""
    ds = date.strftime("%d/%m/%Y")   # formato richiesto 24/06/2025
    params_base = {
        "dataPubblicazioneStart": ds,
        "dataPubblicazioneEnd":   ds,
        "codiceScheda":           codice_scheda,
        "size":                   PAGE_SIZE,
        "page":                   0
    }
    all_items: List[Dict] = []
    while True:
        try:
            r = requests.get(BASE_URL, headers=HEADERS,
                             params=params_base, timeout=30)
            r.raise_for_status()
            payload = r.json()
        except Exception as exc:
            print(f"⚠️  errore HTTP/API pagina {params_base['page']}: {exc}")
            break

        content = payload.get("content", [])          # struttura Spring-Page
        total   = payload.get("totalElements", 0)
        all_items.extend(content)

        # log friendly
        tot_pages = math.ceil(total / PAGE_SIZE) if total else "?"
        print(f"  ↳ scaricata pagina {params_base['page']+1}/{tot_pages} "
              f"({len(content)} avvisi)")

        if payload.get("last", True):
            break
        params_base["page"] += 1
        time.sleep(0.5)     # antidoto rate-limit

    print(f"✓ scaricati {len(all_items)} avvisi da Pubblicità Legale")
    return all_items


# ---------------------------------------------------------------------------
# SEZIONE 2 – DOWNLOAD DETTAGLI CIG (SUPERSET)
# ---------------------------------------------------------------------------

def extract_cig_from_bando(bando: Dict[str, Any]) -> Optional[str]:
    """Prova a individuare un CIG all'interno del JSON del bando."""
    template = (bando.get("template") or [{}])[0]
    sections = template.get("template", {}).get("sections", [])
    for section in sections:
        if section.get("name") == "SEZ. C - Oggetto":
            for item in section.get("items", []):
                cig_val = item.get("cig") or item.get("CIG")
                if cig_val:
                    return cig_val.replace(" ", "")
    return None


def fetch_cig_details(cig: str) -> Optional[dict]:
    """Scarica i dettagli del CIG utilizzando lo script superset_cig_fetch.py"""
    output_file = CIG_CACHE_DIR / f"{cig}.json"
    
    # Verifica se il file esiste già
    if output_file.exists():
        print(f"  • CIG {cig} – già in cache")
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"  ↳ errore lettura cache per CIG {cig}: {e}")
            # Se c'è un errore nella lettura, procediamo con il download
    
    print(f"  • Scaricamento dettagli per CIG {cig}...")
    try:
        # Assicurati che la directory esista
        os.makedirs(CIG_CACHE_DIR, exist_ok=True)
        
        # Converti il percorso in stringa assoluta
        output_file_str = str(output_file.absolute())
        print(f"  • Percorso file output: {output_file_str}")
        
        # Esegui lo script superset_cig_fetch.py per ottenere i dettagli del CIG
        result = subprocess.run(
            [sys.executable, str(FETCH_SCRIPT), cig, output_file_str],
            check=True,
            capture_output=True,
            text=True
        )
        print(f"  ✓ Dettagli per CIG {cig} salvati")
        print(f"  ✓ Percorso file atteso: {output_file_str}")
        print(f"  ✓ Output dello script: {result.stdout}")
        
        # Verifica che il file esista prima di tentare di leggerlo
        if not output_file.exists():
            print(f"  ↳ ERRORE: Il file non esiste dopo il salvataggio: {output_file_str}")
            # Cerca il file nella directory principale
            alt_file = LOCAL_DIR / f"CIG_{cig}.json"
            if alt_file.exists():
                print(f"  ✓ Trovato file alternativo: {alt_file}")
                try:
                    with open(alt_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    # Copia il file nella posizione corretta
                    import shutil
                    shutil.copy2(alt_file, output_file)
                    print(f"  ✓ File copiato nella posizione corretta: {output_file}")
                    return data
                except Exception as e:
                    print(f"  ↳ Errore durante la lettura/copia del file alternativo: {e}")
            
            # Se non troviamo il file alternativo, creiamo un file vuoto
            print(f"  ↳ Creazione file vuoto: {output_file}")
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump({}, f)
            return {}
        
        # Leggi il file appena creato
        with open(output_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except subprocess.CalledProcessError as e:
        print(f"  ↳ errore durante il download del CIG {cig}: {e}")
        print(f"  ↳ output: {e.stdout if e.stdout else ''}")
        print(f"  ↳ errore: {e.stderr if e.stderr else ''}")
        return None
    except Exception as e:
        print(f"  ↳ errore generico per CIG {cig}: {e}")
        return None

# ---------------------------------------------------------------------------
# SEZIONE 3 – MERGING DATI BANDI + CIG
# ---------------------------------------------------------------------------

def merge_data(bando: Dict, cig_data: Dict) -> Dict:
    """Unisce minimalmente le due fonti in un unico dict."""
    merged = {
        "bando_info": bando,
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
        print(f"⚠️  merge_data: {exc}")
    return merged

# ---------------------------------------------------------------------------
# SEZIONE 4 – UPLOAD IN SUPABASE (funzioni complete)
# ---------------------------------------------------------------------------
# Aggiungi questa funzione prima della funzione process_categorie_opera

def get_lookup_maps() -> Tuple[Dict[str, int], Dict[str, int], Dict[str, int]]:
    """
    Recupera le mappe per natura_principale, criterio_aggiudicazione e stato_procedura.
    Restituisce tre dizionari che mappano i codici ai rispettivi ID.
    """
    print("Recupero mappe di lookup...")
    
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

        # Mappa per tipo_procedura (codice -> id)
    tipo_procedura_map: Dict[str, int] = {}
    try:
        res = supabase.table("tipo_procedura").select("id,codice").execute()
        for item in res.data:
            tipo_procedura_map[item["codice"].lower()] = item["id"]
    except Exception as exc:
        print(f"  ↳ errore recupero tipo_procedura: {exc}")
    
    print(f"✔  Recuperate {len(natura_map)} nature, {len(criterio_map)} criteri, {len(stato_map)} stati e {len(stato_map)} stati")
    return natura_map, criterio_map, stato_map, tipo_procedura_map

def process_categorie_opera(bandi: List[Dict]) -> Dict[str, int]:
    """
    Deduplica le categorie (ID_CATEGORIA), esegue upsert su `categoria_opera`
    e restituisce una mappa code → id (PK autoincrement di Supabase).
    """
    print("Elaborazione categorie opera…")
    seen: Dict[str, str] = {}           # code → descrizione
    for item in bandi:
        cats = item.get("cig_details", {}).get("categorie_opera", [])
        if not cats:
            continue
        if isinstance(cats, str):       # alcune API restituiscono stringa JSON
            try:
                if cats.strip().upper() == "N/A":
                    continue
                cats = json.loads(cats)
            except json.JSONDecodeError:
                continue
        for c in cats:
            code = (c.get("ID_CATEGORIA")
                    or c.get("id_categoria")
                    or c.get("idCategoria"))
            descr = (c.get("DESCRIZIONE")
                     or c.get("descrizione")
                     or "")
            if code:
                seen[code] = descr

    cat_map: Dict[str, int] = {}
    for code, descr in seen.items():
        payload = {"id_categoria": code, "descrizione": descr}
        try:
            res = (
                supabase
                .table("categoria_opera")
                .upsert(payload, on_conflict="id_categoria",
                        returning="representation")
                .execute()
            )
            cat_map[code] = res.data[0]["id"]
        except Exception as exc:
            print(f"  ↳ errore categoria {code}: {exc}")

    print(f"✔  {len(cat_map)} categorie opera inserite/aggiornate")
    return cat_map


def process_categorie_cpv(bandi: List[Dict]) -> Dict[str, int]:
    """
    Deduplica le categorie CPV (COD_CPV), esegue upsert su `categoria_cpv`
    e restituisce una mappa code → id (PK autoincrement di Supabase).
    """
    print("Elaborazione categorie CPV…")
    seen: Dict[str, str] = {}           # code → descrizione
    for item in bandi:
        bando_data = item.get("cig_details", {}).get("bando", {})
        if isinstance(bando_data, str):
            try:
                if bando_data.strip().upper() == "N/A":
                    continue
                bando_data = json.loads(bando_data)
            except json.JSONDecodeError:
                continue
        
        cpv_list = bando_data.get("CPV", [])
        if not cpv_list:
            continue
        if isinstance(cpv_list, str):
            try:
                if cpv_list.strip().upper() == "N/A":
                    continue
                cpv_list = json.loads(cpv_list)
            except json.JSONDecodeError:
                continue
        
        for c in cpv_list:
            code = c.get("COD_CPV")
            desc = c.get("DESCRIZIONE_CPV")
            if code and desc:
                seen[code] = desc

    cpv_map: Dict[str, int] = {}
    for code, desc in seen.items():
        try:
            res = (
                supabase
                .table("categoria_cpv")
                .upsert(
                    {"codice": code, "descrizione": desc},
                    on_conflict="codice",
                    returning="representation"
                )
                .execute()
            )
            cpv_map[code] = res.data[0]["id"]
        except Exception as exc:
            print(f"  ↳ errore categoria CPV {code}: {exc}")

    print(f"✔  {len(cpv_map)} categorie CPV inserite/aggiornate")
    return cpv_map


def process_gare_e_lotti(bandi: List[Dict], enti_map: Dict[str, int], cat_map: Dict[str, int], cpv_map: Dict[str, int],
                      natura_map: Dict[str, int], criterio_map: Dict[str, int], stato_map: Dict[str, int], tipo_procedura_map: Dict[str, int]):
    """Elabora i dati di gare, lotti e avvisi."""
    print("Elaborazione gare, lotti e avvisi…")
    
    # Debug: stampa i contenuti delle mappe
    print(f"  ↳ natura_map contiene: {natura_map}")
    print(f"  ↳ tipo_procedura_map contiene: {tipo_procedura_map}")
    
    gare = lotti = avvisi = links = 0

    for merged in bandi:
        info_bando   = merged.get("bando_info") or {}
        cig_details  = merged.get("cig_details") or {}
        bando_json   = cig_details.get("bando") or {}
        sa           = cig_details.get("stazione_appaltante") or {}
        template     = info_bando.get("template", [{}])[0]
        sections     = template.get("template", {}).get("sections", [])

        # ------------------------- GARA -------------------------
        cig = bando_json.get("CIG") or bando_json.get("cig")
        if not cig:
            continue                        # niente CIG → saltiamo

        ente_id = enti_map.get(sa.get("codice_fiscale")
                               or sa.get("CF_AMMINISTRAZIONE_APPALTANTE"))
        if not ente_id:
            continue                        # ente non caricato → saltiamo

        # Estrai natura_principale, criterio_aggiudicazione, stato_procedura e tipo_procedura
        natura_principale = None
        criterio_aggiudicazione = None
        stato_procedura = None
        tipo_procedura = None
        documenti_di_gara_link = None  # Nuovo campo per i link ai documenti di gara
        
        # Cerca nei dati del bando
        for section in sections:
            if section.get("name") == "SEZ. C - Oggetto":
                items = section.get("items", [])
                if items:
                    natura_principale = items[0].get("natura_principale")
                    criterio_aggiudicazione = items[0].get("criteri_aggiudicazione")
                    documenti_di_gara_link = items[0].get("documenti_di_gara_link")  # Estrai il link ai documenti
        
        # Se non trovati, cerca nei dettagli CIG
        if not natura_principale and bando_json.get("OGGETTO_PRINCIPALE_CONTRATTO"):
            natura_principale = bando_json.get("OGGETTO_PRINCIPALE_CONTRATTO")
        
        # Estrai il tipo di procedura
        if bando_json.get("TIPO_SCELTA_CONTRAENTE"):
            tipo_procedura = bando_json.get("TIPO_SCELTA_CONTRAENTE")
        elif bando_json.get("tipo_procedura_aggiudicazione"):
            tipo_procedura = bando_json.get("tipo_procedura_aggiudicazione")
        
        
        # Estrai il codice CPV dal bando
        cpv_id = None
        cpv_list = bando_json.get("CPV", [])
        if cpv_list:
            if isinstance(cpv_list, str):
                try:
                    if cpv_list.strip().upper() != "N/A":
                        cpv_list = json.loads(cpv_list)
                    else:
                        cpv_list = []
                except json.JSONDecodeError:
                    cpv_list = []
            
            # Prendi il primo CPV dalla lista (principale)
            if cpv_list and isinstance(cpv_list, list) and len(cpv_list) > 0:
                cpv_code = cpv_list[0].get("COD_CPV")
                if cpv_code and cpv_code in cpv_map:
                    cpv_id = cpv_map.get(cpv_code)
                    print(f"  ↳ CPV trovato: {cpv_code} -> ID: {cpv_id}")

        if not natura_principale and bando_json.get("OGGETTO_PRINCIPALE_CONTRATTO"):
            natura_principale = bando_json.get("OGGETTO_PRINCIPALE_CONTRATTO")
           # Aggiungi logging per diagnosticare il problema
        if not natura_principale:
            print(f"  ⚠️ Natura principale non trovata per CIG {cig}")
            # Stampa le sezioni per vedere se c'è la sezione "SEZ. C - Oggetto"
            print(f"  ↳ Sezioni disponibili: {[s.get('name') for s in sections]}")
            # Stampa i campi disponibili in bando_json
            print(f"  ↳ Campi in bando_json: {list(bando_json.keys())}")
        else:
            # Stampa il valore trovato e se è stato mappato correttamente
            natura_norm = natura_principale.lower()
            mapped = False
            if "lavori" in natura_norm:
                mapped = True
            elif "forniture" in natura_norm or "fornitura" in natura_norm:
                mapped = True
            elif "servizi" in natura_norm or "servizio" in natura_norm:
                mapped = True
            if not mapped:
                print(f"  ⚠️ Natura principale trovata ma non mappata: '{natura_principale}'")
            
        if not criterio_aggiudicazione and bando_json.get("CRITERIO_AGGIUDICAZIONE"):
            criterio_aggiudicazione = bando_json.get("CRITERIO_AGGIUDICAZIONE")
            
        # Per stato_procedura, usa lo stato dal bando
        if bando_json.get("STATO"):
            stato_procedura = bando_json.get("STATO")
        
        # Mappa i valori testuali agli ID delle tabelle di lookup
        natura_principale_id = None
        if natura_principale:
            # Dizionario di mappatura per natura_principale
            natura_mapping = {
                "lavori": "works",
                "work": "works",
                "works": "works",
                "forniture": "goods",
                "fornitura": "goods",
                "good": "goods",
                "goods": "goods",
                "servizi": "services",
                "servizio": "services",
                "service": "services",
                "services": "services"
            }
            
            # Normalizza e cerca nella mappa
            natura_norm = natura_principale.lower()
            
            # Aggiungi debug per vedere cosa contiene natura_principale
            print(f"  ↳ Natura principale trovata: '{natura_principale}', normalizzata: '{natura_norm}'")
            print(f"  ↳ Natura map contiene: {natura_map}")
            
            # Prima verifica se il valore normalizzato è esattamente uguale a una delle chiavi
            if natura_norm in natura_mapping:
                natura_principale_id = natura_map.get(natura_mapping[natura_norm])
                print(f"  ↳ Mappato esattamente a {natura_mapping[natura_norm]} -> {natura_principale_id}")
            else:
                # Altrimenti cerca se una delle chiavi è contenuta nel valore normalizzato
                for key, value in natura_mapping.items():
                    if key in natura_norm:
                        natura_principale_id = natura_map.get(value)
                        print(f"  ↳ Mappato parzialmente a {value} -> {natura_principale_id}")
                        break
                    
                    if not natura_principale_id:
                        print(f"  ⚠️ Natura principale non mappata: '{natura_principale}'")
            
        criterio_aggiudicazione_id = None
        if criterio_aggiudicazione:
            # Dizionario di mappatura per criterio_aggiudicazione
            criterio_mapping = {
                "prezzo": "price",
                "price": "price",
                "qualità": "quality",
                "qualita": "quality",
                "quality": "quality",
                "costo": "quality",
                "cost": "quality",
                "economicamente vantaggiosa": "quality",  # Spesso si riferisce a qualità-prezzo
                "offerta economicamente vantaggiosa": "quality"
            }
            
            # Normalizza e cerca nella mappa
            criterio_norm = criterio_aggiudicazione.lower()
            
            # Aggiungi debug per vedere cosa contiene criterio_aggiudicazione
            print(f"  ↳ Criterio aggiudicazione trovato: '{criterio_aggiudicazione}', normalizzato: '{criterio_norm}'")
            print(f"  ↳ Criterio map contiene: {criterio_map}")
            
            # Prima verifica se il valore normalizzato è esattamente uguale a una delle chiavi
            if criterio_norm in criterio_mapping:
                criterio_aggiudicazione_id = criterio_map.get(criterio_mapping[criterio_norm])
                print(f"  ↳ Mappato esattamente a {criterio_mapping[criterio_norm]} -> {criterio_aggiudicazione_id}")
            else:
                # Altrimenti cerca se una delle chiavi è contenuta nel valore normalizzato
                for key, value in criterio_mapping.items():
                    if key in criterio_norm:
                        criterio_aggiudicazione_id = criterio_map.get(value)
                        print(f"  ↳ Mappato parzialmente a {value} -> {criterio_aggiudicazione_id}")
                        break
                
                if not criterio_aggiudicazione_id:
                    print(f"  ⚠️ Criterio aggiudicazione non mappato: '{criterio_aggiudicazione}'")
        
        stato_procedura_id = None
        if stato_procedura:
            # Dizionario di mappatura per stato_procedura
            stato_mapping = {
                "programmazione": "planning",
                "planning": "planning",
                "attivo": "active",
                "in corso": "active",
                "active": "active",
                "concluso": "complete",
                "conclusa": "complete",
                "complete": "complete",
                "annullato": "cancelled",
                "annullata": "cancelled",
                "cancelled": "cancelled",
                "senza esito": "unsuccessful",
                "unsuccessful": "unsuccessful"
            }
            
            # Normalizza e cerca nella mappa
            stato_norm = stato_procedura.lower()
            
            # Aggiungi debug per vedere cosa contiene stato_procedura
            print(f"  ↳ Stato procedura trovato: '{stato_procedura}', normalizzato: '{stato_norm}'")
            print(f"  ↳ Stato map contiene: {stato_map}")
            
            # Prima verifica se il valore normalizzato è esattamente uguale a una delle chiavi
            if stato_norm in stato_mapping:
                stato_procedura_id = stato_map.get(stato_mapping[stato_norm])
                print(f"  ↳ Mappato esattamente a {stato_mapping[stato_norm]} -> {stato_procedura_id}")
            else:
                # Altrimenti cerca se una delle chiavi è contenuta nel valore normalizzato
                for key, value in stato_mapping.items():
                    if key in stato_norm:
                        stato_procedura_id = stato_map.get(value)
                        print(f"  ↳ Mappato parzialmente a {value} -> {stato_procedura_id}")
                        break
                
                if not stato_procedura_id:
                    print(f"  ⚠️ Stato procedura non mappato: '{stato_procedura}'")
                    # Usa active come default se non è stato possibile mappare
                    stato_procedura_id = stato_map.get("active")  # Default
                    print(f"  ↳ Usando valore default 'active' -> {stato_procedura_id}")

            tipo_procedura_id = None
            if tipo_procedura:
                # Dizionario di mappatura per tipo_procedura
                tipo_procedura_mapping = {
                    "aperta": "open",
                    "open": "open",
                    "ristretta": "restricted",
                    "restricted": "restricted",
                    "negoziata": "negotiated",
                    "negotiated": "negotiated",
                    "competitiva": "competitive_dialogue",
                    "competitive": "competitive_dialogue",
                    "dialogo": "competitive_dialogue",
                    "dialogue": "competitive_dialogue",
                    "competitive_dialogue": "competitive_dialogue",
                    "diretto": "direct",
                    "direct": "direct",
                    "affidamento": "direct"
                }
                    # Normalizza e cerca nella mappa
                tipo_procedura_norm = tipo_procedura.lower()
                
                # Aggiungi debug per vedere cosa contiene tipo_procedura
                print(f"  ↳ Tipo procedura trovato: '{tipo_procedura}', normalizzato: '{tipo_procedura_norm}'")
                
                # Prima verifica se il valore normalizzato è esattamente uguale a una delle chiavi
                if tipo_procedura_norm in tipo_procedura_mapping:
                    tipo_procedura_id = tipo_procedura_map.get(tipo_procedura_mapping[tipo_procedura_norm])
                    print(f"  ↳ Mappato esattamente a {tipo_procedura_mapping[tipo_procedura_norm]} -> {tipo_procedura_id}")
                else:
                    # Altrimenti cerca se una delle chiavi è contenuta nel valore normalizzato
                    for key, value in tipo_procedura_mapping.items():
                        if key in tipo_procedura_norm:
                            tipo_procedura_id = tipo_procedura_map.get(value)
                            print(f"  ↳ Mappato parzialmente a {value} -> {tipo_procedura_id}")
                            break
                    
                    if not tipo_procedura_id:
                        print(f"  ⚠️ Tipo procedura non mappato: '{tipo_procedura}'")
                        # Usa open come default se non è stato possibile mappare
                        tipo_procedura_id = tipo_procedura_map.get("open")  # Default
                        print(f"  ↳ Usando valore default 'open' -> {tipo_procedura_id}")

        # ------------------------- LOTTI -------------------------

        gara_payload = {
            "cig": cig,
            "cup": (bando_json.get("CUP") or [{}])[0].get("CUP")
                    if bando_json.get("CUP") else None,
            "ente_appaltante_id": ente_id,
            "descrizione": bando_json.get("OGGETTO_GARA"),
            "data_pubblicazione": info_bando.get("dataPubblicazione"),
            "scadenza_offerta": bando_json.get("DATA_SCADENZA_OFFERTA"),
            "importo_totale": bando_json.get("IMPORTO_COMPLESSIVO_GARA"),
            "importo_sicurezza": bando_json.get("IMPORTO_SICUREZZA"),
            "valuta": "EUR",
            "natura_principale_id": natura_principale_id,
            "criterio_aggiudicazione_id": criterio_aggiudicazione_id,
            "stato_procedura_id": stato_procedura_id,
            "tipo_procedura_id": tipo_procedura_id,
            "documenti_di_gara_link": documenti_di_gara_link,
        }
        try:
            res = (
                supabase
                .table("gara")
                .upsert(gara_payload, on_conflict="cig",
                        returning="representation")
                .execute()
            )
            gara_id = res.data[0]["id"]
            gare += 1
        except Exception as exc:
            print(f"  ↳ errore gara {cig}: {exc}")
            continue

        # ------------------------- AVVISO ------------------------
        avviso_id = info_bando.get("idAvviso")
        if avviso_id:
            avviso_payload = {
                "id": avviso_id,
                "gara_id": gara_id,
                "id_appalto": info_bando.get("idAppalto"),
                "codice_scheda": info_bando.get("codiceScheda"),
                "data_pubblicazione": info_bando.get("dataPubblicazione"),
                "data_scadenza": info_bando.get("dataScadenza"),
                "data_pcp": (info_bando.get("template") or [{}])[0]
                              .get("avviso", [{}])[0]
                              .get("dataPCP"),
                "attivo": info_bando.get("attivo", True),
            }
            try:
                supabase.table("avviso_gara").upsert(
                    avviso_payload, on_conflict="id", returning="minimal"
                ).execute()
                avvisi += 1
            except Exception as exc:
                print(f"    ↳ errore avviso {avviso_id}: {exc}")

        # ------------------------- LOTTO -------------------------
        lotto_payload = {
            "gara_id": gara_id,
            "cig": cig,
            "descrizione": bando_json.get("OGGETTO_LOTTO")
                           or bando_json.get("OGGETTO_GARA"),
            "valore": bando_json.get("IMPORTO_LOTTO")
                      or bando_json.get("IMPORTO_COMPLESSIVO_GARA"),
            "valuta": "EUR",
            "termine_ricezione": bando_json.get("DATA_SCADENZA_OFFERTA"),
            "luogo_istat": bando_json.get("LUOGO_ISTAT"),
            "cpv_id": cpv_id,  
        }
        try:
            res_lot = (
                supabase
                .table("lotto")
                .upsert(lotto_payload, on_conflict="cig",
                        returning="representation")
                .execute()
            )
            lotto_id = res_lot.data[0]["id"]
            lotti += 1
        except Exception as exc:
            print(f"    ↳ errore lotto (CIG {cig}): {exc}")
            continue

        # -------------- LOTTO ⇄ CATEGORIE OPERA (ponte) ----------
        cats = cig_details.get("categorie_opera", [])
        if isinstance(cats, str):
            try:
                cats = json.loads(cats) if cats.strip().upper() != "N/A" else []
            except json.JSONDecodeError:
                cats = []

        for c in cats:
            code      = (c.get("ID_CATEGORIA") or c.get("id_categoria"))
            ruolo_raw = c.get("COD_TIPO_CATEGORIA") or c.get("cod_tipo_categoria")
            ruolo     = "P" if (ruolo_raw or "").upper() in {"P", "1"} else "S"
            cat_id    = cat_map.get(code)
            if not cat_id:
                continue
            link_payload = {
                "lotto_id": lotto_id,
                "categoria_opera_id": cat_id,
                "ruolo": ruolo,
            }
            try:
                supabase.table("lotto_categoria_opera").upsert(
                    link_payload,
                    on_conflict="lotto_id,categoria_opera_id",
                    returning="minimal",
                ).execute()
                links += 1
            except Exception as exc:
                print(f"      ↳ errore link lotto {lotto_id}-cat {cat_id}: {exc}")

    print(f"✔  Inserite/aggiornate {gare} gare, {lotti} lotti, "
          f"{avvisi} avvisi e {links} collegamenti lotto-categoria")


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Pipeline unificata ANAC → Supabase")
    parser.add_argument("--date", required=True, help="Data target in formato YYYY-MM-DD")
    parser.add_argument("--skip-download", action="store_true", help="Salta il download dettagli CIG")
    parser.add_argument("--skip-upload", action="store_true", help="Salta l'upload su Supabase e termina dopo il merge locale")
    args = parser.parse_args()

    start = time.time()
    print(f"🚀  Pipeline avviata per {args.date}")

    target_date = (dt.datetime.strptime(args.date, "%Y-%m-%d").date()
                if args.date else dt.date.today())
    bandi = fetch_avvisi_legali(target_date)

    # Estrai CIG unici
    cig_set = {extract_cig_from_bando(b) for b in bandi if extract_cig_from_bando(b)}
    print(f"→ {len(cig_set)} CIG individuati")

    cig_files = {}
    if not args.skip_download and cig_set:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            futures = {}
            for cig in cig_set:
                futures[pool.submit(download_cig_wrapper, cig)] = cig
            for fut in futures:
                path = fut.result()
                if path:
                    cig_files[futures[fut]] = path
        print(f"→ scaricati {len(cig_files)}/{len(cig_set)} dettagli CIG")

    # Merge
    merged = []
    for b in bandi:
        cig = extract_cig_from_bando(b)
        cig_json = None
        if cig:
            cig_path = CIG_CACHE_DIR / f"{cig}.json"
            if cig_path.exists():
                with open(cig_path, "r", encoding="utf-8") as fp:
                    cig_json = json.load(fp)
        merged.append(merge_data(b, cig_json))
    merged_path = LOCAL_DIR / "bandi_completi.json"
    with merged_path.open("w", encoding="utf-8") as fp:
        json.dump(merged, fp, ensure_ascii=False, indent=2)
    print(f"→ salvato merge in {merged_path}")

    if args.skip_upload:
        print("⏩  Upload saltato per scelta utente")
        sys.exit(0)

    # Upload
    enti_map = process_enti_appaltanti(merged)
    cat_map = process_categorie_opera(merged)
    cpv_map = process_categorie_cpv(merged)
    natura_map, criterio_map, stato_map, tipo_procedura_map = get_lookup_maps()
    process_gare_e_lotti(merged, enti_map, cat_map, cpv_map, natura_map, criterio_map, stato_map, tipo_procedura_map)

    print(f"✅  Pipeline completata in {time.time() - start:.1f}s")

# ---------------------------------------------------------------------------
# Helper per download CIG in thread‑pool
# ---------------------------------------------------------------------------

def download_cig_wrapper(cig: str) -> Optional[Path]:
    path = CIG_CACHE_DIR / f"{cig}.json"
    if path.exists():
        return path
    data = fetch_cig_details(cig)
    if not data:
        return None
    return path


def process_enti_appaltanti(bandi: List[Dict]) -> Dict[str, int]:
    """
    Deduplica gli enti appaltanti (codice_fiscale), esegue upsert su `ente_appaltante`
    e restituisce una mappa codice_fiscale → id (PK autoincrement di Supabase).
    """
    print("Elaborazione enti appaltanti…")
    seen: Dict[str, Dict] = {}  # codice_fiscale → dati completi
    
    for item in bandi:
        sa = item.get("cig_details", {}).get("stazione_appaltante", {})
        if not sa:
            continue
            
        if isinstance(sa, str):  # alcune API restituiscono stringa JSON
            try:
                if sa.strip().upper() == "N/A":
                    continue
                sa = json.loads(sa)
            except json.JSONDecodeError:
                continue
                
        # Estrai i campi necessari con gestione di nomi di campo alternativi
        cf = (sa.get("CF_AMMINISTRAZIONE_APPALTANTE") or 
              sa.get("codice_fiscale"))
        denominazione = (sa.get("DENOMINAZIONE_AMMINISTRAZIONE_APPALTANTE") or 
                         sa.get("denominazione_amministrazione"))
        citta = sa.get("CITTA") or ""
        regione = sa.get("REGIONE") or ""
        
        if cf and denominazione:
            seen[cf] = {
                "codice_fiscale": cf,
                "denominazione": denominazione,
                "citta": citta,
                "regione": regione
            }

    enti_map: Dict[str, int] = {}
    for cf, ente_data in seen.items():
        try:
            res = (
                supabase
                .table("ente_appaltante")
                .upsert(ente_data, on_conflict="codice_fiscale",
                        returning="representation")
                .execute()
            )
            enti_map[cf] = res.data[0]["id"]
        except Exception as exc:
            print(f"  ↳ errore ente {cf}: {exc}")

    print(f"✔  {len(enti_map)} enti appaltanti inseriti/aggiornati")
    return enti_map


if __name__ == "__main__":
    main()
