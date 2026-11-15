import { supabase } from './supabase'

export interface Msg {
  role: 'user' | 'assistant'
  content: string
}

export class AiError extends Error {
  code: string
  constructor(code: string, message = '') {
    super(message)
    this.code = code
  }
}

export const aiErrorText = (e: unknown) => {
  if (!(e instanceof AiError)) return 'Terjadi kesalahan tak terduga.'
  switch (e.code) {
    case 'local':
      return 'Masuk dengan akun dulu. AI hanya tersedia setelah Supabase terhubung.'
    case 'not_configured':
      return 'Kunci Groq belum dipasang di Supabase (secret GROQ_API_KEY).'
    case 'upstream':
      return `Groq menolak permintaan${e.message ? `: ${e.message}` : '.'} Cek nama model di Settings → Model AI.`
    case 'timeout':
      return 'AI terlalu lama membalas. Coba lagi.'
    case 'network':
      return 'Tidak bisa terhubung ke server. Periksa koneksi internet.'
    default:
      return 'AI belum bisa membalas. Coba lagi sebentar lagi.'
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function invoke(body: Record<string, unknown>): Promise<any> {
  if (!supabase) throw new AiError('local')
  const { data, error } = await supabase.functions.invoke('ai-chat', { body })
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
  return data
}

export async function askEmployee(employee: string, messages: Msg[], model?: string): Promise<string> {
  const d = await invoke({ employee, messages, model: model || undefined })
  return String(d.reply)
}

export interface AiStatus {
  configured: boolean
  valid?: boolean
  model?: string
  models?: string[]
}

export async function checkAi(): Promise<AiStatus> {
  return (await invoke({ ping: true })) as AiStatus
}
