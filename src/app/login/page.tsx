'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    // Verificar se Supabase está configurado
    if (!isSupabaseConfigured()) {
      setLoading(false)
      setConfigured(false)
      return
    }

    setConfigured(true)

    // Verificar se já está autenticado
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard')
      } else {
        setLoading(false)
      }
    })

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900"></div>
      </div>
    )
  }

  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Configuração Necessária
          </h1>
          <p className="text-gray-600 mb-6">
            Para fazer login, você precisa conectar sua conta Supabase.
          </p>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-left">
            <p className="text-sm text-purple-900 font-semibold mb-2">
              Como configurar:
            </p>
            <ol className="text-sm text-purple-800 space-y-1 list-decimal list-inside">
              <li>Vá em <strong>Configurações do Projeto</strong></li>
              <li>Clique em <strong>Integrações</strong></li>
              <li>Conecte sua conta <strong>Supabase</strong></li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-purple-900 mb-2">
              Lucro Real
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Gestão financeira inteligente para seu negócio
            </p>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#581c87',
                    brandAccent: '#7c3aed',
                  },
                },
              },
              className: {
                container: 'w-full',
                button: 'rounded-lg font-medium transition-all duration-200',
                input: 'rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500',
              },
            }}
            providers={[]}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email',
                  password_label: 'Senha',
                  button_label: 'Entrar',
                  loading_button_label: 'Entrando...',
                  link_text: 'Já tem uma conta? Entre',
                },
                sign_up: {
                  email_label: 'Email',
                  password_label: 'Senha',
                  button_label: 'Criar conta',
                  loading_button_label: 'Criando conta...',
                  link_text: 'Não tem conta? Cadastre-se',
                },
              },
            }}
          />
        </div>

        <p className="text-center text-gray-500 text-xs sm:text-sm mt-6">
          Controle suas finanças e descubra seu lucro real
        </p>
      </div>
    </div>
  )
}
