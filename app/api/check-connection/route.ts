import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("ente_appaltante").select("id").limit(1);
    
    return NextResponse.json({ connected: !error });
  } catch (error) {
    console.error("Errore nella verifica della connessione a Supabase:", error);
    return NextResponse.json({ connected: false });
  }
}