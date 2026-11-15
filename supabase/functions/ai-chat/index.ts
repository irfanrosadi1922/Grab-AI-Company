// Edge Function: jembatan aman antara aplikasi dan Groq.
// Kunci GROQ_API_KEY hanya ada di secrets Supabase, tidak pernah dikirim ke browser.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const EMP: Record<string, { name: string; role: string; duty: string }> = {
  alex: { name: 'Alex', role: 'Research Director', duty: 'riset pasar, kompetitor, dan tren kuliner' },
  daniel: { name: 'Daniel', role: 'Data Analyst', duty: 'analisis penjualan, pesanan, dan performa menu' },
  sophia: { name: 'Sophia', role: 'Marketing Director', duty: 'strategi promosi dan kampanye' },
  olivia: { name: 'Olivia', role: 'Menu Specialist & Copywriter', duty: 'deskripsi menu dan naskah promosi' },
  ethan: { name: 'Ethan', role: 'Creative Designer', duty: 'konsep poster, banner, dan materi visual' },
  isabella: { name: 'Isabella', role: 'Content Manager', duty: 'kalender konten dan jadwal unggahan' },
  william: { name: 'William', role: 'Customer Relations Manager', duty: 'ulasan pelanggan dan draf balasan' },
  james: { name: 'James', role: 'AI Managing Director & Operations Manager', duty: 'koordinasi tim AI dan operasional' },
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const GROQ = 'https://api.groq.com/openai/v1'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const key = Deno.env.get('GROQ_API_KEY')
  const defaultModel = Deno.env.get('GROQ_MODEL') ?? 'llama-3.3-70b-versatile'

  // deno-lint-ignore no-explicit-any
  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  // Cek koneksi: apakah kunci terpasang dan valid, plus daftar model yang tersedia.
  if (body?.ping) {
    if (!key) return json({ configured: false })
    try {
      const r = await fetch(`${GROQ}/models`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000) })
      if (!r.ok) return json({ configured: true, valid: false, status: r.status })
      const j = await r.json()
      // deno-lint-ignore no-explicit-any
      const models = (j.data ?? []).map((m: any) => m.id).filter((id: string) => !/whisper|tts|guard|embed/i.test(id)).slice(0, 30)
      return json({ configured: true, valid: true, model: defaultModel, models })
    } catch {
      return json({ configured: true, valid: false })
    }
  }

  if (!key) return json({ error: 'not_configured' }, 503)

  const e = EMP[String(body?.employee)]
  if (!e) return json({ error: 'bad_employee' }, 400)

  const raw = Array.isArray(body?.messages) ? body.messages : []
  const messages = raw
    // deno-lint-ignore no-explicit-any
    .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string' && m.content.trim())
    .slice(-12)
    // deno-lint-ignore no-explicit-any
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') return json({ error: 'bad_messages' }, 400)

  const requested = typeof body?.model === 'string' && /^[\w.\-:/]{1,80}$/.test(body.model) ? body.model : defaultModel

  const system =
    `Kamu ${e.name}, ${e.role} di Grab AI Company, perusahaan AI yang membantu CEO mengelola toko restoran di GrabMerchant. ` +
    `Bidangmu: ${e.duty}.\n` +
    `Aturan:\n` +
    `- Jawab dalam Bahasa Indonesia, singkat, praktis, dan langsung ke inti.\n` +
    `- Kamu TIDAK punya akses ke data penjualan, pesanan, atau toko yang nyata. Jangan mengarang angka, nama pesaing, atau fakta. Jika butuh data, katakan data itu belum tersedia dan sarankan langkah selanjutnya.\n` +
    `- Kamu tidak bisa menjalankan tindakan (mengubah harga, memublikasikan, membalas ulasan secara publik, mengubah status toko). Kamu hanya menyusun draf dan rekomendasi untuk disetujui CEO.\n` +
    `- Jangan mengaku sudah mengerjakan sesuatu yang belum kamu kerjakan.`

  try {
    const r = await fetch(`${GROQ}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: requested,
        messages: [{ role: 'system', content: system }, ...messages],
        temperature: 0.6,
        max_tokens: 700,
      }),
      signal: AbortSignal.timeout(25000),
    })
    if (!r.ok) {
      let msg = ''
      try {
        msg = String((await r.json())?.error?.message ?? '').slice(0, 200)
      } catch { /* abaikan */ }
      return json({ error: 'upstream', status: r.status, message: msg }, 502)
    }
    const j = await r.json()
    const reply = String(j?.choices?.[0]?.message?.content ?? '').trim()
    if (!reply) return json({ error: 'empty' }, 502)
    return json({ reply, model: requested })
  } catch {
    return json({ error: 'timeout' }, 504)
  }
})
