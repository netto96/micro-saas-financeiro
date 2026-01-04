import { supabase } from './supabase'

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, tipo_padrao')
    .order('name');

  if (error) throw error;
  return data;
}

export async function createCategory(name: string, tipo: 'receita' | 'despesa') {
  const { error } = await supabase
    .from('categories')
    .insert({ name, tipo_padrao: tipo });

  if (error) throw error;
}

export async function deleteCategory(categoryId: string) {
  const { data } = await supabase
    .from('transactions')
    .select('id')
    .eq('category_id', categoryId)
    .limit(1);

  if (data && data.length > 0) {
    throw new Error('Categoria em uso');
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);

  if (error) throw error;
}
