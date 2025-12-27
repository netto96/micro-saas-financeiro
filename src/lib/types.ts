export type BusinessType = 'mei' | 'motorista_app' | 'comercio'

export interface UserSettings {
  id: string
  user_id: string
  business_type: BusinessType
  das_value: number
  reserve_percentage: number
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  amount: number
  date: string
  category: string
  is_business_expense: boolean
  description?: string
  created_at: string
  updated_at: string
}

export const BUSINESS_TYPES = {
  mei: 'MEI',
  motorista_app: 'Motorista de App',
  comercio: 'Pequeno Comércio'
}

export const DEFAULT_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Combustível',
  'Manutenção',
  'Marketing',
  'Fornecedores',
  'Aluguel',
  'Contas',
  'Equipamentos',
  'Outros'
]
