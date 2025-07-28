// Funzione per determinare la variante del badge in base alla natura principale
export function getNaturaBadgeVariant(natura?: string): "lavori" | "forniture" | "servizi" | "outline" {
  if (!natura) return "outline"
  
  switch (natura.toLowerCase()) {
    case "lavori":
      return "lavori" // bordo blu
    case "forniture":
      return "forniture" // bordo grigio
    case "servizi":
      return "servizi" // bordo ambra
    default:
      return "outline"
  }
}

// Funzione per determinare lo stile della scadenza in base alla data
export function getDeadlineStyle(deadlineDate: string): { color: string; text: string } {
  const today = new Date();
  const deadline = new Date(deadlineDate);
  const oneWeek = 7 * 24 * 60 * 60 * 1000; // Una settimana in millisecondi
  
  // Rimuovi l'orario per confrontare solo le date
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  
  const timeDiff = deadline.getTime() - today.getTime();
  
  if (timeDiff < 0) {
    // Scadenza passata
    return { 
      color: "text-red-600 bg-red-50", 
      text: "Scaduta il" 
    };
  } else if (timeDiff <= oneWeek) {
    // Scadenza entro una settimana
    return { 
      color: "text-yellow-600 bg-yellow-50", 
      text: "Scade" 
    };
  } else {
    // Scadenza oltre una settimana (default)
    return { 
      color: "text-green-600 bg-green-50", 
      text: "Scade" 
    };
  }
}