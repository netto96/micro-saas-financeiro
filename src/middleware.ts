import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Verificar se as variáveis do Supabase estão configuradas
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Se não configurado, permitir acesso apenas à página inicial
    if (req.nextUrl.pathname !== '/') {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return res
  }

  // Se configurado, importar dinamicamente o cliente do Supabase
  const { createMiddlewareClient } = await import('@supabase/auth-helpers-nextjs')
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Rotas públicas
  if (req.nextUrl.pathname === '/login') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return res
  }

  // Rotas protegidas
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Verificar onboarding
  if (req.nextUrl.pathname === '/dashboard') {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('onboarding_completed')
      .eq('user_id', session.user.id)
      .single()

    if (!settings?.onboarding_completed) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding', '/login']
}
