import { NextRequest, NextResponse } from 'next/server';
import { getCittaByRegione } from '@/lib/data';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const regione = searchParams.get('regione');
  
  if (!regione) {
    return NextResponse.json({ error: 'Parametro regione mancante' }, { status: 400 });
  }
  
  try {
    const citta = await getCittaByRegione(regione);
    return NextResponse.json(citta);
  } catch (error) {
    console.error('Errore nel recupero delle città:', error);
    return NextResponse.json({ error: 'Errore nel recupero delle città' }, { status: 500 });
  }
}