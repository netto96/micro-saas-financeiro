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
  Crown,
  Settings,
  Edit2
} from 'lucide-react'
import CategoryManager from './components/CategoryManager'

interface Transaction {
  id: string
  amount: number
  date: string
  category: string
  tipo: 'receita' | 'despesa'
  is_business_expense?: boolean
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

interface Category {
  id: string
  name: string
  tipo_padrao: 'receita' | 'despesa'
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    tipo: 'receita' as 'receita' | 'despesa'
  })

  const defaultCategories = [
    { name: 'Alimentação', tipo_padrao: 'despesa' as const },
    { name: 'Transporte', tipo_padrao: 'despesa' as const },
    { name: 'Combustível', tipo_padrao: 'despesa' as const },
    { name: 'Manutenção', tipo_padrao: 'despesa' as const },
    { name: 'Marketing', tipo_padrao: 'despesa' as const },
    { name: 'Aluguel', tipo_padrao: 'despesa' as const },
    { name: 'Fornecedores', tipo_padrao: 'despesa' as const },
    { name: 'Outros', tipo_padrao: 'despesa' as const }
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
        const { data: newSub } = await supabase
          .from('subscription_status')
          .insert({ user_id: user.id, plan: 'free', transaction_count: 0 })
          .select()
          .single()
        subData = newSub
      }

      setSubscription(subData)

      // Carregar categorias personalizadas
      await loadCategories()

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

  async function loadCategories() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: customCategories, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) {
        console.error('Erro ao carregar categorias:', error)
      }

      if (customCategories && customCategories.length > 0) {
        setCategories(customCategories)
        if (!formData.category) {
          setFormData(prev => ({ ...prev, category: customCategories[0].name }))
        }
      } else {
        // Inserir categorias padrão se não existir nenhuma
        const { data: insertedCategories, error: insertError } = await supabase
          .from('categories')
          .insert(
            defaultCategories.map(cat => ({
              user_id: user.id,
              name: cat.name,
              tipo_padrao: cat.tipo_padrao
            }))
          )
          .select()

        if (insertError) {
          console.error('Erro ao inserir categorias padrão:', insertError)
          // Se falhar ao inserir, use categorias padrão localmente
          const localCategories = defaultCategories.map((cat, index) => ({
            id: `local-${index}`,
            name: cat.name,
            tipo_padrao: cat.tipo_padrao,
            user_id: user.id
          }))
          setCategories(localCategories)
          setFormData(prev => ({ ...prev, category: localCategories[0].name }))
        } else if (insertedCategories) {
          setCategories(insertedCategories)
          setFormData(prev => ({ ...prev, category: insertedCategories[0].name }))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
      // Em caso de erro, use categorias padrão localmente
      const localCategories = defaultCategories.map((cat, index) => ({
        id: `local-${index}`,
        name: cat.name,
        tipo_padrao: cat.tipo_padrao,
        user_id: ''
      }))
      setCategories(localCategories)
      setFormData(prev => ({ ...prev, category: localCategories[0].name }))
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

      if (editingTransaction) {
        // Atualizar transação existente
        await supabase
          .from('transactions')
          .update({
            amount: parseFloat(formData.amount),
            date: formData.date,
            category: formData.category,
            tipo: formData.tipo,
            is_business_expense: formData.tipo === 'despesa'
          })
          .eq('id', editingTransaction.id)
      } else {
        // Adicionar nova transação
        await supabase.from('transactions').insert({
          user_id: user.id,
          amount: parseFloat(formData.amount),
          date: formData.date,
          category: formData.category,
          tipo: formData.tipo,
          is_business_expense: formData.tipo === 'despesa'
        })

        // Atualizar contador apenas para novas transações
        await supabase
          .from('subscription_status')
          .update({ transaction_count: subscription.transaction_count + 1 })
          .eq('user_id', user.id)
      }

      // Resetar formulário
      setFormData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: categories[0]?.name || '',
        tipo: 'receita'
      })
      setShowTransactionForm(false)
      setEditingTransaction(null)

      // Recarregar dados
      loadData()
    } catch (error) {
      console.error('Erro ao salvar transação:', error)
    }
  }

  function handleEditTransaction(transaction: Transaction) {
    setEditingTransaction(transaction)
    setFormData({
      amount: transaction.amount.toString(),
      date: transaction.date,
      category: transaction.category,
      tipo: transaction.tipo
    })
    setShowTransactionForm(true)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Cálculos
  const ganhos = transactions
    .filter(t => t.tipo === 'receita' || (!t.tipo && !t.is_business_expense))
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

  const gastos = transactions
    .filter(t => t.tipo === 'despesa' || (!t.tipo && t.is_business_expense))
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

  const provision = settings 
    ? (ganhos * (settings.reserve_percentage / 100)) + settings.das_value
    : 0

  const realProfit = ganhos - gastos - provision

  // Análise de IA
  const categoryExpenses = transactions
    .filter(t => t.tipo === 'despesa' || (!t.tipo && t.is_business_expense))
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

  // Filtrar categorias baseado no tipo de transação
  const filteredCategories = categories.filter(cat => cat.tipo_padrao === formData.tipo)
  const categoriesToShow = filteredCategories.length > 0 ? filteredCategories : categories

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
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCategoryManager(true)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-purple-900 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Categorias</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-purple-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total de Ganhos */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/90">Total de Ganhos</span>
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-white">
              R$ {ganhos.toFixed(2)}
            </p>
          </div>

          {/* Total de Gastos */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/90">Total de Gastos</span>
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-white">
              R$ {gastos.toFixed(2)}
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
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl shadow-lg p-6">
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
                onClick={() => {
                  setEditingTransaction(null)
                  setFormData({
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    category: categories[0]?.name || '',
                    tipo: 'receita'
                  })
                  setShowTransactionForm(true)
                }}
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
                  {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                </h3>
                <form onSubmit={handleAddTransaction} className="space-y-4">
                  {/* Toggle Receita/Despesa */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Tipo de Transação
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo: 'receita' })}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                          formData.tipo === 'receita'
                            ? 'bg-green-500 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <TrendingUp className="w-5 h-5 inline-block mr-2" />
                        Receita (Ganhos)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo: 'despesa' })}
                        className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                          formData.tipo === 'despesa'
                            ? 'bg-red-500 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <TrendingDown className="w-5 h-5 inline-block mr-2" />
                        Despesa (Gastos)
                      </button>
                    </div>
                  </div>

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
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                      required
                    >
                      {categoriesToShow.length === 0 ? (
                        <option value="">Carregando categorias...</option>
                      ) : (
                        categoriesToShow.map(cat => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-purple-900 text-white py-3 rounded-xl font-semibold hover:bg-purple-800 transition-colors"
                      disabled={categoriesToShow.length === 0}
                    >
                      {editingTransaction ? 'Salvar' : 'Adicionar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTransactionForm(false)
                        setEditingTransaction(null)
                      }}
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
                  {transactions.slice(0, 10).map((transaction) => {
                    const isReceita = transaction.tipo === 'receita' || (!transaction.tipo && !transaction.is_business_expense)
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {transaction.category}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(transaction.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`font-bold ${
                              isReceita ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {isReceita ? '+' : '-'} R$ {parseFloat(transaction.amount.toString()).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {isReceita ? 'Receita' : 'Despesa'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleEditTransaction(transaction)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
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
                    {topCategory[1] > gastos * 0.4 
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

      {/* Modal de Gerenciamento de Categorias */}
      {showCategoryManager && (
        <CategoryManager
          onClose={() => setShowCategoryManager(false)}
          onCategoryChange={() => loadCategories()}
        />
      )}
    </div>
  )
}
