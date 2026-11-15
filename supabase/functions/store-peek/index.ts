// Edge Function: membaca halaman publik toko di situs Grab (food.grab.com) agar karyawan AI punya gambaran toko.
// Hanya membaca halaman publik. Tidak login, tidak memakai akun Grab, tidak mengubah apa pun di Grab.
// Hanya akun yang sudah login di aplikasi yang boleh memakai, dan hanya domain grab.com yang diizinkan (anti SSRF).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

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

const allowed = (u: URL) => u.protocol === 'https:' && (u.hostname === 'grab.com' || u.hostname.endsWith('.grab.com')) && !u.username && !u.password

async function fetchPage(start: string): Promise<{ status: number; html: string } | null> {
  let url = new URL(start)
  for (let hop = 0; hop < 5; hop++) {
    if (!allowed(url)) return null
    const r = await fetch(url, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.6',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(12000),
    })
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location')
      if (!loc) return null
      url = new URL(loc, url)
      continue
    }
    const html = (await r.text()).slice(0, 2_500_000)
    return { status: r.status, html }
  }
  return null
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')

// deno-lint-ignore no-explicit-any
function walk(node: any, visit: (o: Record<string, unknown>) => void, depth = 0, budget = { n: 0 }) {
  if (depth > 14 || budget.n++ > 60000 || node === null || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const x of node) walk(x, visit, depth + 1, budget)
    return
  }
  visit(node)
  for (const v of Object.values(node)) walk(v, visit, depth + 1, budget)
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
  let target: URL
  try {
    target = new URL(String(body?.url ?? ''))
  } catch {
    return json({ error: 'bad_url' }, 400)
  }
  if (!allowed(target)) return json({ error: 'bad_host' }, 400)

  let page: { status: number; html: string } | null
  try {
    page = await fetchPage(target.toString())
  } catch {
    return json({ error: 'timeout' }, 504)
  }
  if (!page) return json({ error: 'redirect_blocked' }, 502)
  if (page.status >= 400) return json({ error: 'upstream', status: page.status }, 502)

  const html = page.html
  const title = decode(clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''))
  const desc = decode(clean(html.match(/<meta[^>]+(?:name|property)=["'](?:og:)?description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? ''))

  const facts: string[] = []
  const menu: string[] = []
  const seen = new Set<string>()
  const blocks: unknown[] = []
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      blocks.push(JSON.parse(m[1]))
    } catch { /* abaikan */ }
  }
  const next = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1]
  if (next) {
    try {
      blocks.push(JSON.parse(next))
    } catch { /* abaikan */ }
  }
  let source = 'text'
  for (const b of blocks) {
    walk(b, (o) => {
      const name = typeof o.name === 'string' ? clean(o.name) : ''
      if (!name || name.length > 90) return
      const rating = o.rating ?? o.ratingValue ?? o.ratingScore
      const votes = o.voteCount ?? o.ratingCount ?? o.reviewCount
      if ((typeof rating === 'number' || typeof rating === 'string') && facts.length < 4 && !seen.has(`f|${name}`)) {
        seen.add(`f|${name}`)
        const extra = [o.cuisine ?? o.servesCuisine, o.priceTag, o.isOpen === true ? 'buka' : o.isOpen === false ? 'tutup' : null].filter((x) => typeof x === 'string' && x).join(', ')
        facts.push(`${name}: rating ${rating}${votes ? ` (${votes} ulasan)` : ''}${extra ? `, ${extra}` : ''}`)
        source = 'json'
      }
      const price = typeof o.price === 'string' && /rp/i.test(o.price) ? o.price : ''
      const hasMenuShape = 'priceInMinorUnit' in o || 'available' in o || typeof o.description === 'string' || price
      if (hasMenuShape && menu.length < 60 && !seen.has(`m|${name}`) && !('rating' in o)) {
        seen.add(`m|${name}`)
        const d = typeof o.description === 'string' ? clean(o.description).slice(0, 70) : ''
        menu.push(`${name}${price ? ` (${price})` : ''}${d ? `: ${d}` : ''}`)
        source = 'json'
      }
    })
  }

  const visible = decode(
    clean(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' '),
    ),
  ).slice(0, 3000)

  const parts = [title && `Judul halaman: ${title}`, desc && `Deskripsi: ${desc}`, facts.length && `Info toko: ${facts.join(' | ')}`, menu.length && `Menu terbaca (${menu.length}): ${menu.join('; ')}`]
    .filter(Boolean)
    .join('\n')
  const text = (parts.length > 120 ? parts : `${parts}\nTeks halaman: ${visible}`).slice(0, 5000)
  if (text.replace(/\s/g, '').length < 60) return json({ error: 'no_content' }, 422)
  return json({ ok: true, text, title, source, menuCount: menu.length })
})
