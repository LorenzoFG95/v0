import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export interface CompleteUserData {
  user: any
  profile: any
  azienda: any
  favorites: string[]
}

export async function getCompleteUserData(): Promise<CompleteUserData | null> {
  const supabase = createClient()
  
  // Verifica autenticazione
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return null
  }

  try {
    // Recupera tutti i dati in parallelo
    const [profileResult, aziendaResult, favoritesResult] = await Promise.all([
      // Profilo utente
      supabase
        .from('utente')
        .select('*')
        .eq('id', user.id)
        .single(),
      
      // Azienda (se esiste)
      supabase
        .from('utente')
        .select('azienda_id')
        .eq('id', user.id)
        .single()
        .then(async (result) => {
          if (result.data?.azienda_id) {
            const { data } = await supabase
              .from('azienda')
              .select('*')
              .eq('id', result.data.azienda_id)
              .single()
            return { data }
          }
          return { data: null }
        }),
      
      // Lista preferiti
      supabase
        .from('preferiti')
        .select('tender_id')
        .eq('user_id', user.id)
    ])

    return {
      user: {
        id: user.id,
        email: user.email,
        ...user
      },
      profile: profileResult.data,
      azienda: aziendaResult.data,
      favorites: favoritesResult.data?.map(f => f.tender_id) || []
    }
  } catch (error) {
    console.error('Errore nel recupero dati utente:', error)
    return {
      user: {
        id: user.id,
        email: user.email,
        ...user
      },
      profile: null,
      azienda: null,
      favorites: []
    }
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const userData = await getCompleteUserData()
  return userData !== null
}