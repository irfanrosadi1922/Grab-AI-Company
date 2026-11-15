import { supabase } from './supabase'

/** Kunci API per karyawan. Browser hanya bisa menulis kunci; yang bisa dibaca kembali hanya 4 karakter terakhir. */
export async function loadKeyInfo(): Promise<Record<string, string>> {
  if (!supabase) return {}
  const { data, error } = await supabase.from('employee_keys').select('employee,last4')
  if (error) throw error
  return Object.fromEntries((data ?? []).map((r: { employee: string; last4: string }) => [r.employee, r.last4]))
}

export async function saveKey(userId: string, employee: string, key: string) {
  if (!supabase) throw new Error('local')
  const k = key.trim()
  const { error } = await supabase
    .from('employee_keys')
    .upsert({ user_id: userId, employee, api_key: k, last4: k.slice(-4), updated_at: new Date().toISOString() }, { onConflict: 'user_id,employee' })
  if (error) throw error
}

export async function removeKey(userId: string, employee: string) {
  if (!supabase) throw new Error('local')
  const { error } = await supabase.from('employee_keys').delete().eq('user_id', userId).eq('employee', employee)
  if (error) throw error
}
