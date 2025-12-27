import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Verificar se as variáveis estão configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variáveis do Supabase não configuradas. Configure em: Configurações do Projeto → Integrações → Supabase')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Helper para verificar se Supabase está configurado
export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co')
}

// Helper para verificar autenticação
export async function getUser() {
  if (!isSupabaseConfigured()) {
    return { user: null, error: new Error('Supabase não configurado') }
  }
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Helper para logout
export async function signOut() {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase não configurado') }
  }
  const { error } = await supabase.auth.signOut()
  return { error }
}
