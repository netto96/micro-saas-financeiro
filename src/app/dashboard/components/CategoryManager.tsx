'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react'

interface Category {
  id: string
  name: string
  tipo_padrao: 'receita' | 'despesa'
}

interface CategoryManagerProps {
  onClose: () => void
  onCategoryChange: () => void
}

export default function CategoryManager({ onClose, onCategoryChange }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCategory, setNewCategory] = useState({
    name: '',
    tipo_padrao: 'despesa' as 'receita' | 'despesa'
  })

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) {
        console.error('Erro ao carregar categorias:', error)
        // Se a tabela não existir, mostrar mensagem
        if (error.code === '42P01') {
          alert('A tabela de categorias ainda não foi criada no Supabase. Por favor, execute o SQL fornecido no dashboard do Supabase.')
        }
      } else {
        setCategories(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    
    if (!newCategory.name.trim()) {
      alert('Por favor, digite um nome para a categoria.')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: newCategory.name.trim(),
          tipo_padrao: newCategory.tipo_padrao
        })

      if (error) throw error

      setNewCategory({ name: '', tipo_padrao: 'despesa' })
      setShowAddForm(false)
      await loadCategories()
      onCategoryChange()
    } catch (error: any) {
      console.error('Erro ao adicionar categoria:', error)
      if (error.code === '23505') {
        alert('Já existe uma categoria com esse nome.')
      } else {
        alert('Erro ao adicionar categoria. Tente novamente.')
      }
    }
  }

  async function handleUpdateCategory(id: string) {
    if (!editName.trim()) {
      alert('Por favor, digite um nome para a categoria.')
      return
    }

    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editName.trim() })
        .eq('id', id)

      if (error) throw error

      setEditingId(null)
      setEditName('')
      await loadCategories()
      onCategoryChange()
    } catch (error: any) {
      console.error('Erro ao atualizar categoria:', error)
      if (error.code === '23505') {
        alert('Já existe uma categoria com esse nome.')
      } else {
        alert('Erro ao atualizar categoria.')
      }
    }
  }

  async function handleDeleteCategory(id: string, name: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Verificar se categoria está em uso
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('category', name)
        .limit(1)

      if (transactions && transactions.length > 0) {
        alert('Esta categoria não pode ser excluída pois está sendo usada em transações.')
        return
      }

      if (!confirm(`Tem certeza que deseja excluir a categoria "${name}"?`)) {
        return
      }

      // Marcar como inativa em vez de deletar (workaround para RLS)
      const { error } = await supabase
        .from('categories')
        .update({ name: `[EXCLUÍDA] ${name}` })
        .eq('id', id)

      if (error) throw error

      await loadCategories()
      onCategoryChange()
      alert('Categoria marcada como excluída. Você pode renomeá-la ou criar uma nova.')
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
      alert('Erro ao excluir categoria.')
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Categorias</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Botão Adicionar */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-purple-900 text-white py-3 rounded-xl font-semibold hover:bg-purple-800 transition-colors flex items-center justify-center gap-2 mb-6"
          >
            <Plus className="w-5 h-5" />
            Nova Categoria
          </button>
        )}

        {/* Formulário Adicionar */}
        {showAddForm && (
          <div className="bg-purple-50 rounded-xl p-4 mb-6">
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  required
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Alimentação"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo Padrão
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNewCategory({ ...newCategory, tipo_padrao: 'receita' })}
                    className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all ${
                      newCategory.tipo_padrao === 'receita'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    Receita
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCategory({ ...newCategory, tipo_padrao: 'despesa' })}
                    className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all ${
                      newCategory.tipo_padrao === 'despesa'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    Despesa
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-purple-900 text-white py-2 rounded-xl font-semibold hover:bg-purple-800 transition-colors"
                >
                  Adicionar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewCategory({ name: '', tipo_padrao: 'despesa' })
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Categorias */}
        <div className="space-y-3">
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                Nenhuma categoria cadastrada ainda
              </p>
              <p className="text-sm text-gray-400">
                Clique em "Nova Categoria" para começar
              </p>
            </div>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                {editingId === category.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdateCategory(category.id)}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditName('')
                      }}
                      className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{category.name}</p>
                      <p className={`text-sm ${
                        category.tipo_padrao === 'receita' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {category.tipo_padrao === 'receita' ? 'Receita' : 'Despesa'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(category.id)
                          setEditName(category.name)
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Instruções SQL se tabela não existir */}
        {categories.length === 0 && !loading && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-sm text-yellow-800 font-semibold mb-2">
              ⚠️ Tabela de categorias não encontrada
            </p>
            <p className="text-xs text-yellow-700 mb-3">
              Execute o SQL abaixo no dashboard do Supabase (SQL Editor):
            </p>
            <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
{`CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  tipo_padrao TEXT NOT NULL CHECK (tipo_padrao IN ('receita', 'despesa')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);`}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
