'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PiggyBank, 
  Plus,
  LogOut,
  Sparkles,
  Crown
} from 'lucide-react'

interface Transaction {
  id: string
  amount: number
  date: string
  category: string
  is_business_expense: boolean
}

interface UserSettings {
  das_value: number
  reserve_percentage: number
  business_type: string
}

interface SubscriptionStatus {
  plan: string
  transaction_count: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Alimentação',
    is_business_expense: false
  })

  const categories = [
    'Alimentação',
    'Transporte',
    'Combustível',
    'Manutenção',
    'Marketing',
    'Aluguel',
    'Fornecedores',
    'Outros'
  ]

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Carregar configurações
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setSettings(settingsData)

      // Carregar status de assinatura
      let { data: subData } = await supabase
        .from('subscription_status')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!subData) {
        // Criar registro de assinatura se não existir
        const { data: newSub } = await supabase
          .from('subscription_status')
          .insert({ user_id: user.id, plan: 'free', transaction_count: 0 })
          .select()
          .single()
        subData = newSub
      }

      setSubscription(subData)

      // Carregar transações do mês atual
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', firstDay.toISOString().split('T')[0])
        .lte('date', lastDay.toISOString().split('T')[0])
        .order('date', { ascending: false })

      setTransactions(transactionsData || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault()
    
    if (!subscription || subscription.transaction_count >= 15) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Adicionar transação
      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: parseFloat(formData.amount),
        date: formData.date,
        category: formData.category,
        is_business_expense: formData.is_business_expense
      })

      // Atualizar contador
      await supabase
        .from('subscription_status')
        .update({ transaction_count: subscription.transaction_count + 1 })
        .eq('user_id', user.id)

      // Resetar formulário
      setFormData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: 'Alimentação',
        is_business_expense: false
      })
      setShowTransactionForm(false)

      // Recarregar dados
      loadData()
    } catch (error) {
      console.error('Erro ao adicionar transação:', error)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Cálculos
  const revenue = transactions
    .filter(t => !t.is_business_expense)
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

  const expenses = transactions
    .filter(t => t.is_business_expense)
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

  const provision = settings 
    ? (revenue * (settings.reserve_percentage / 100)) + settings.das_value
    : 0

  const realProfit = revenue - expenses - provision

  // Análise de IA
  const categoryExpenses = transactions
    .filter(t => t.is_business_expense)
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount.toString())
      return acc
    }, {} as Record<string, number>)

  const topCategory = Object.entries(categoryExpenses)
    .sort(([, a], [, b]) => b - a)[0]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900"></div>
      </div>
    )
  }

  const isBlocked = subscription && subscription.transaction_count >= 15

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-purple-900">Lucro Real</h1>
              <p className="text-sm text-gray-600">{settings?.business_type}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-purple-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Faturamento Bruto */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Faturamento Bruto</span>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              R$ {revenue.toFixed(2)}
            </p>
          </div>

          {/* Gastos Operacionais */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Gastos Operacionais</span>
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              R$ {expenses.toFixed(2)}
            </p>
          </div>

          {/* Provisão */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Provisão</span>
              <PiggyBank className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              R$ {provision.toFixed(2)}
            </p>
          </div>

          {/* Lucro Real */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/90">Lucro Real</span>
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-white">
              R$ {realProfit.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Card de Upgrade (se bloqueado) */}
        {isBlocked && (
          <div className="bg-gradient-to-br from-purple-900 to-purple-700 rounded-2xl shadow-2xl p-8 mb-8 text-center">
            <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Limite de Lançamentos Atingido
            </h2>
            <p className="text-purple-100 mb-6">
              Você atingiu o limite de 15 transações do plano gratuito.
              Faça upgrade para o Plano Pro e tenha lançamentos ilimitados!
            </p>
            <button className="bg-yellow-400 text-purple-900 px-8 py-3 rounded-xl font-bold hover:bg-yellow-300 transition-all transform hover:scale-105">
              Assinar Plano Pro
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Botão Adicionar Transação */}
            {!isBlocked && !showTransactionForm && (
              <button
                onClick={() => setShowTransactionForm(true)}
                className="w-full bg-purple-900 text-white py-4 rounded-2xl font-semibold hover:bg-purple-800 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Nova Transação
              </button>
            )}

            {/* Formulário de Transação */}
            {showTransactionForm && !isBlocked && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Nova Transação
                </h3>
                <form onSubmit={handleAddTransaction} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="business-expense"
                      checked={formData.is_business_expense}
                      onChange={(e) => setFormData({ ...formData, is_business_expense: e.target.checked })}
                      className="w-5 h-5 text-purple-900 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="business-expense" className="text-sm font-medium text-gray-700">
                      Despesa do Negócio?
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-purple-900 text-white py-3 rounded-xl font-semibold hover:bg-purple-800 transition-colors"
                    >
                      Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTransactionForm(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Últimas Transações */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Últimas Transações
              </h3>
              {transactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Nenhuma transação registrada este mês
                </p>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {transaction.category}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          transaction.is_business_expense 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {transaction.is_business_expense ? '-' : '+'} R$ {parseFloat(transaction.amount.toString()).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {transaction.is_business_expense ? 'Despesa' : 'Receita'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Análise da IA */}
            <div className="bg-gradient-to-br from-purple-900 to-purple-700 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-bold">Análise da IA</h3>
              </div>
              {topCategory ? (
                <div className="space-y-3">
                  <p className="text-purple-100">
                    Sua maior categoria de gastos este mês é <strong>{topCategory[0]}</strong> com R$ {topCategory[1].toFixed(2)}.
                  </p>
                  <p className="text-purple-100">
                    {topCategory[1] > expenses * 0.4 
                      ? '⚠️ Atenção: Esta categoria representa mais de 40% dos seus gastos. Considere revisar esses custos.'
                      : '✅ Seus gastos estão bem distribuídos entre as categorias.'}
                  </p>
                  <p className="text-purple-100">
                    💡 Dica: {realProfit > 0 
                      ? 'Seu negócio está lucrativo! Continue monitorando suas despesas.'
                      : 'Seu lucro está negativo. Revise suas despesas e busque aumentar o faturamento.'}
                  </p>
                </div>
              ) : (
                <p className="text-purple-100">
                  Adicione transações para receber insights personalizados sobre seu negócio.
                </p>
              )}
            </div>

            {/* Contador de Lançamentos */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Plano Atual
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Lançamentos</span>
                  <span className="font-bold text-purple-900">
                    {subscription?.transaction_count || 0} / 15
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-900 h-2 rounded-full transition-all"
                    style={{ width: `${((subscription?.transaction_count || 0) / 15) * 100}%` }}
                  ></div>
                </div>
                {subscription && subscription.transaction_count >= 12 && subscription.transaction_count < 15 && (
                  <p className="text-sm text-orange-600">
                    ⚠️ Você está próximo do limite!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
