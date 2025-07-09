import json
import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Carica le variabili d'ambiente
load_dotenv()

# Configura il client Supabase
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    print("Errore: Variabili d'ambiente Supabase non configurate.")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def load_categorie_opera(json_file_path):
    """Carica le categorie opera da un file JSON nel database."""
    try:
        # Leggi il file JSON
        with open(json_file_path, 'r', encoding='utf-8') as f:
            categorie = json.load(f)
        
        print(f"Lette {len(categorie)} categorie dal file JSON")
        
        # Prepara i dati per l'inserimento
        records = []
        for categoria in categorie:
            # Assicurati che i campi necessari siano presenti
            if 'id_categoria' not in categoria or 'descrizione' not in categoria:
                print(f"Attenzione: categoria non valida: {categoria}")
                continue
                
            record = {
                'id_categoria': categoria['id_categoria'],
                'descrizione': categoria['descrizione']
                # Rimosso il campo cod_tipo_categoria che non esiste nella tabella
            }
            records.append(record)
        
        # Inserisci i dati nel database
        if records:
            result = supabase.table("categoria_opera").insert(records).execute()
            print(f"Inserite {len(result.data)} categorie nel database")
            return True
        else:
            print("Nessuna categoria valida da inserire")
            return False
            
    except Exception as e:
        print(f"Errore durante il caricamento delle categorie: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("Utilizzo: python load_categorie_opera.py <percorso_file_json>")
        sys.exit(1)
    
    json_file_path = sys.argv[1]
    if not os.path.exists(json_file_path):
        print(f"Errore: Il file {json_file_path} non esiste")
        sys.exit(1)
    
    success = load_categorie_opera(json_file_path)
    if success:
        print("Caricamento completato con successo")
    else:
        print("Caricamento fallito")
        sys.exit(1)

if __name__ == "__main__":
    main()