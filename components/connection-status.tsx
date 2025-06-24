"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function ConnectionStatus() {
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    // Verifica la connessione a Supabase
    async function checkConnection() {
      try {
        const response = await fetch("/api/check-connection");
        const data = await response.json();
        setConnectionError(!data.connected);
      } catch (error) {
        console.error("Errore nella verifica della connessione:", error);
        setConnectionError(true);
      }
    }

    checkConnection();
  }, []);

  if (!connectionError) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Errore di connessione</AlertTitle>
      <AlertDescription>
        Non è possibile connettersi al database. Verificare le credenziali e la connessione di rete.
      </AlertDescription>
    </Alert>
  );
}