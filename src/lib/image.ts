import { supabase } from './supabase'
import { AiError } from './ai'

const BUCKET = 'marketing-assets'

export const imageErrorText = (e: unknown) => {
  if (!(e instanceof AiError)) return 'Gambar gagal dibuat. Coba lagi.'
  switch (e.code) {
    case 'local':
      return 'Masuk dengan akun dulu. Pembuatan gambar butuh Supabase.'
    case 'unauthorized':
      return 'Sesi login habis. Keluar lalu masuk lagi.'
    case 'upstream':
      return `Penyedia gambar menolak permintaan${e.message ? `: ${e.message}` : '.'} Coba lagi, atau pasang kunci Gemini (secret GEMINI_API_KEY) di Supabase.`
    case 'timeout':
      return 'Pembuatan gambar terlalu lama. Coba lagi.'
    case 'bad_prompt':
      return 'Deskripsi gambar minimal 5 karakter.'
    case 'network':
      return 'Tidak bisa terhubung ke server. Periksa koneksi internet.'
    default:
      return 'Gambar belum bisa dibuat. Coba lagi sebentar lagi.'
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function generateImage(prompt: string, format: string): Promise<string> {
  if (!supabase) throw new AiError('local')
  const { data, error } = await supabase.functions.invoke('ai-image', { body: { prompt, format } })
  if (error) {
    let code = 'network'
    let message = ''
    const ctx = (error as any).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const j = await ctx.json()
        code = j?.error ?? 'error'
        message = j?.message ?? ''
      } catch {
        code = 'error'
      }
    }
    throw new AiError(code, message)
  }
  if (!data?.data) throw new AiError('empty')
  return `data:${data.mime ?? 'image/png'};base64,${data.data}`
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })

/** Unggah gambar (data URL) ke penyimpanan pribadi akun. Mengembalikan jalur file. */
export async function uploadImage(userId: string, dataUrl: string): Promise<string> {
  if (!supabase) throw new AiError('local')
  const blob = await (await fetch(dataUrl)).blob()
  const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false })
  if (error) throw new AiError('upload', error.message)
  return path
}

const cache = new Map<string, Promise<string>>()

/** Mengunduh gambar tersimpan sebagai data URL (aman untuk ekspor PNG, tidak mencemari canvas). */
export function loadStoredImage(path: string): Promise<string> {
  let p = cache.get(path)
  if (!p) {
    p = (async () => {
      if (!supabase) throw new AiError('local')
      const { data, error } = await supabase.storage.from(BUCKET).download(path)
      if (error || !data) throw new AiError('download')
      return blobToDataUrl(data)
    })()
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return p
}
