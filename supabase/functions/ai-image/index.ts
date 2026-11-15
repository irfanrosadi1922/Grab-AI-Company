// Edge Function: membuat gambar latar promosi dengan AI.
// Penyedia: Gemini jika secret GEMINI_API_KEY dipasang, selain itu Pollinations (tanpa kunci).
// Hanya akun yang sudah login yang boleh memakai (kuota penyedia tidak bisa dibakar lewat kunci publik).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// format -> ukuran piksel (Pollinations) dan rasio (Gemini)
const FORMATS: Record<string, { w: number; h: number; ratio: string }> = {
  poster: { w: 768, h: 1024, ratio: '3:4' },
  banner: { w: 1280, h: 448, ratio: '16:9' },
  social: { w: 1024, h: 1024, ratio: '1:1' },
  story: { w: 576, h: 1024, ratio: '9:16' },
}

async function isSignedIn(req: Request): Promise<boolean> {
  const auth = req.headers.get('Authorization') ?? ''
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!auth.startsWith('Bearer ') || !url || !anon) return false
  try {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: auth, apikey: anon }, signal: AbortSignal.timeout(8000) })
    if (!r.ok) return false
    const u = await r.json()
    return typeof u?.id === 'string'
  } catch {
    return false
  }
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (!(await isSignedIn(req))) return json({ error: 'unauthorized' }, 401)

  // deno-lint-ignore no-explicit-any
  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  const gemini = Deno.env.get('GEMINI_API_KEY')
  const provider = gemini ? 'gemini' : 'pollinations'
  if (body?.ping) return json({ configured: true, provider })

  const scene = typeof body?.prompt === 'string' ? body.prompt.trim().slice(0, 600) : ''
  if (scene.length < 5) return json({ error: 'bad_prompt' }, 400)
  const f = FORMATS[String(body?.format)] ?? FORMATS.poster
  // Teks dibuat aplikasi sendiri di atas gambar, jadi gambar harus bersih dari huruf.
  const prompt = `${scene}. Foto atau ilustrasi promosi makanan yang menarik, pencahayaan bagus, komposisi memberi ruang kosong untuk teks. Tanpa teks, tanpa huruf, tanpa logo, tanpa watermark.`

  try {
    if (provider === 'gemini') {
      const model = Deno.env.get('GEMINI_IMAGE_MODEL') ?? 'gemini-2.5-flash-image'
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': gemini!, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: f.ratio } },
        }),
        signal: AbortSignal.timeout(55000),
      })
      if (!r.ok) {
        let msg = ''
        try {
          msg = String((await r.json())?.error?.message ?? '').slice(0, 200)
        } catch { /* abaikan */ }
        return json({ error: 'upstream', provider, status: r.status, message: msg }, 502)
      }
      const j = await r.json()
      // deno-lint-ignore no-explicit-any
      const part = (j?.candidates?.[0]?.content?.parts ?? []).find((p: any) => p?.inlineData?.data || p?.inline_data?.data)
      const d = part?.inlineData ?? part?.inline_data
      if (!d?.data) return json({ error: 'empty', provider }, 502)
      return json({ provider, mime: d.mimeType ?? d.mime_type ?? 'image/png', data: d.data })
    }

    const seed = Math.floor(Math.random() * 1e9)
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=${f.w}&height=${f.h}&nologo=true&model=flux&seed=${seed}`
    const r = await fetch(url, { signal: AbortSignal.timeout(55000) })
    const type = r.headers.get('content-type') ?? ''
    if (!r.ok || !type.startsWith('image/')) return json({ error: 'upstream', provider, status: r.status, message: '' }, 502)
    const buf = await r.arrayBuffer()
    if (buf.byteLength > 6_000_000) return json({ error: 'too_large', provider }, 502)
    return json({ provider, mime: type.split(';')[0], data: toBase64(buf) })
  } catch {
    return json({ error: 'timeout', provider }, 504)
  }
})
