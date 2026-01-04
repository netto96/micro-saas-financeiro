'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { AlertCircle } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      // Verificar se Supabase está configurado
      if (!isSupabaseConfigured) {
        setError(true)
        setLoading(false)
        return
      }

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Erro ao verificar sessão:', sessionError)
          setError(true)
          setLoading(false)
          return
        }

        if (session) {
          router.push('/dashboard')
        } else {
          router.push('/login')
        }
      } catch (err) {
        console.error('Erro inesperado:', err)
        setError(true)
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (error) {
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
            Para usar o app, você precisa conectar sua conta Supabase.
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900"></div>
      </div>
    )
  }

  return null
}
