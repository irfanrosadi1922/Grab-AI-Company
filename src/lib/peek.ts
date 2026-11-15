import { supabase } from './supabase'

export interface PeekResult {
  text: string
  menuCount: number
}

export class PeekError extends Error {
  constructor(public code: string) {
    super(code)
  }
}

export const peekErrorText = (e: unknown) => {
  const code = e instanceof PeekError ? e.code : 'network'
  switch (code) {
    case 'local':
      return 'Masuk dengan akun dulu.'
    case 'bad_url':
    case 'bad_host':
      return 'Tautan harus berupa alamat https dari grab.com, misalnya halaman toko di food.grab.com.'
    case 'upstream':
    case 'redirect_blocked':
      return 'Halaman Grab menolak atau tidak bisa dibuka dari server. Coba tautan lain, atau isi data manual.'
    case 'no_content':
      return 'Halaman terbuka tapi isinya tidak terbaca (kemungkinan dimuat lewat JavaScript). Isi data manual atau impor CSV.'
    case 'timeout':
      return 'Halaman terlalu lama dibuka. Coba lagi.'
    case 'unauthorized':
      return 'Sesi login habis. Keluar lalu masuk lagi.'
    default:
      return 'Tidak bisa terhubung ke server. Periksa koneksi internet.'
  }
}

export const isGrabUrl = (v: string) => {
  try {
    const u = new URL(v)
    return u.protocol === 'https:' && (u.hostname === 'grab.com' || u.hostname.endsWith('.grab.com'))
  } catch {
    return false
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function peekStore(url: string): Promise<PeekResult> {
  if (!supabase) throw new PeekError('local')
  const { data, error } = await supabase.functions.invoke('store-peek', { body: { url } })
  if (error) {
    let code = 'network'
    const ctx = (error as any).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        code = (await ctx.json())?.error ?? 'error'
      } catch {
        code = 'error'
      }
    }
    throw new PeekError(code)
  }
  if (!data?.ok) throw new PeekError('error')
  return { text: String(data.text), menuCount: Number(data.menuCount) || 0 }
}
