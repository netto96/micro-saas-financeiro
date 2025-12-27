'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { BUSINESS_TYPES, type BusinessType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [configured, setConfigured] = useState(false)
  const [formData, setFormData] = useState({
    business_type: '' as BusinessType | '',
    das_value: '',
    reserve_percentage: ''
  })

  useEffect(() => {
    // Verificar se Supabase está configurado
    if (!isSupabaseConfigured()) {
      setConfigured(false)
      return
    }

    setConfigured(true)

    // Verificar autenticação
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUserId(user.id)
        // Verificar se já completou onboarding
        checkOnboarding(user.id)
      }
    })
  }, [router])

  async function checkOnboarding(uid: string) {
    const { data } = await supabase
      .from('user_settings')
      .select('onboarding_completed')
      .eq('user_id', uid)
      .single()

    if (data?.onboarding_completed) {
      router.push('/dashboard')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          business_type: formData.business_type,
          das_value: parseFloat(formData.das_value) || 0,
          reserve_percentage: parseFloat(formData.reserve_percentage) || 0,
          onboarding_completed: true
        })

      if (error) throw error

      router.push('/dashboard')
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      alert('Erro ao salvar configurações. Tente novamente.')
    } finally {
      setLoading(false)
    }
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
            Para continuar, você precisa conectar sua conta Supabase.
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
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
              <CheckCircle2 className="w-8 h-8 text-purple-900" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-purple-900 mb-2">
              Configure seu negócio
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Vamos personalizar a plataforma para suas necessidades
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo de Negócio */}
            <div>
              <Label className="text-base font-semibold text-gray-900 mb-3 block">
                Tipo de Negócio
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(BUSINESS_TYPES).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, business_type: key as BusinessType })}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      formData.business_type === key
                        ? 'border-purple-900 bg-purple-50 shadow-md'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`font-medium ${
                      formData.business_type === key ? 'text-purple-900' : 'text-gray-700'
                    }`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Valor do DAS */}
            <div>
              <Label htmlFor="das_value" className="text-base font-semibold text-gray-900">
                Valor do DAS Mensal (R$)
              </Label>
              <p className="text-sm text-gray-500 mb-2">
                Valor fixo que você paga mensalmente
              </p>
              <Input
                id="das_value"
                type="number"
                step="0.01"
                placeholder="Ex: 67.00"
                value={formData.das_value}
                onChange={(e) => setFormData({ ...formData, das_value: e.target.value })}
                className="text-lg h-12 rounded-xl border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                required
              />
            </div>

            {/* Percentual de Reserva */}
            <div>
              <Label htmlFor="reserve_percentage" className="text-base font-semibold text-gray-900">
                Percentual de Reserva (%)
              </Label>
              <p className="text-sm text-gray-500 mb-2">
                Quanto você quer guardar do faturamento para emergências
              </p>
              <Input
                id="reserve_percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Ex: 10"
                value={formData.reserve_percentage}
                onChange={(e) => setFormData({ ...formData, reserve_percentage: e.target.value })}
                className="text-lg h-12 rounded-xl border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !formData.business_type}
              className="w-full h-12 text-base font-semibold bg-purple-900 hover:bg-purple-800 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Começar a usar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
