import { supabase } from './supabase'
import type { ProviderId } from '../data/providers'

export interface EmployeeAi {
  provider: ProviderId
  model: string
  /** 4 karakter terakhir kunci khusus; kosong jika karyawan memakai kunci bersama. */
  last4: string
}

/** Pengaturan AI per karyawan. Browser hanya bisa menulis kunci; yang bisa dibaca kembali hanya 4 karakter terakhir. */
export async function loadEmployeeAi(): Promise<Record<string, EmployeeAi>> {
  if (!supabase) return {}
  const { data, error } = await supabase.from('employee_keys').select('employee,last4,provider,model')
  if (error) throw error
  return Object.fromEntries(
    (data ?? []).map((r: { employee: string; last4: string; provider: ProviderId; model: string }) => [r.employee, { provider: r.provider, model: r.model, last4: r.last4 }]),
  )
}

/** Menyimpan penyedia dan model; kunci hanya ditimpa jika diisi. */
export async function saveEmployeeAi(userId: string, employee: string, v: { provider: ProviderId; model: string; key?: string; clearKey?: boolean }) {
  if (!supabase) throw new Error('local')
  const key = v.key?.trim()
  const patch: Record<string, string> = { provider: v.provider, model: v.model.trim(), updated_at: new Date().toISOString() }
  if (key) {
    patch.api_key = key
    patch.last4 = key.slice(-4)
  } else if (v.clearKey) {
    // ganti penyedia tanpa kunci baru: kunci lama milik penyedia lain tidak boleh terpakai
    patch.api_key = ''
    patch.last4 = ''
  }
  const upd = await supabase.from('employee_keys').update(patch).eq('user_id', userId).eq('employee', employee).select('employee')
  if (upd.error) throw upd.error
  if ((upd.data ?? []).length > 0) return
  const ins = await supabase.from('employee_keys').insert({ user_id: userId, employee, api_key: key ?? '', last4: key ? key.slice(-4) : '', ...patch })
  if (ins.error) throw ins.error
}

/** Menghapus kunci khusus (penyedia dan model tetap). */
export async function clearEmployeeKey(userId: string, employee: string) {
  if (!supabase) throw new Error('local')
  const { error } = await supabase.from('employee_keys').update({ api_key: '', last4: '' }).eq('user_id', userId).eq('employee', employee)
  if (error) throw error
}
