import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

async function signedIn(req: Request): Promise<boolean> {
  const auth = req.headers.get('Authorization') ?? ''
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!auth.startsWith('Bearer ') || !url || !anon) return false
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: auth, apikey: anon },
      signal: AbortSignal.timeout(8000),
    })
    return r.ok
  } catch {
    return false
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!await signedIn(req)) return json({ error: 'unauthorized' }, 401)

  const token = Deno.env.get('HABBOASSETS_API_KEY')
  if (!token) return json({ error: 'habboassets_not_configured' }, 503)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'bad_request' }, 400) }

  const action = String(body.action ?? 'list')
  const hotel = Math.min(100, Math.max(1, Number(body.hotelId) || 1))
  const params = new URLSearchParams()
  const search = typeof body.search === 'string' ? body.search.trim().slice(0, 100) : ''
  if (search) params.set('search', search)
  const category = typeof body.category === 'string' ? body.category.trim().slice(0, 60) : ''
  if (category) params.set('category', category)

  let endpoint = '/furniture'
  if (action === 'categories') endpoint = '/furniture/categories'
  else if (action === 'types') endpoint = '/furniture/types'
  else if (action === 'detail') {
    const classname = typeof body.classname === 'string' ? body.classname : ''
    if (!/^[a-zA-Z0-9_*.-]{1,120}$/.test(classname)) return json({ error: 'invalid_classname' }, 400)
    endpoint = `/furniture/${encodeURIComponent(classname)}`
  } else if (action !== 'list') return json({ error: 'invalid_action' }, 400)

  if (action === 'list') {
    const page = Math.max(1, Math.min(10000, Number(body.page) || 1))
    const perPage = Math.max(1, Math.min(60, Number(body.perPage) || 24))
    params.set('page', String(page))
    params.set('per_page', String(perPage))
    params.set('sort', 'name')
  }
  const url = `https://www.habboassets.com/api/v2${endpoint}${params.size ? `?${params.toString()}` : ''}`
  try {
    const upstream = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Hotel-ID': String(hotel),
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    })
    const raw = await upstream.text()
    if (!upstream.ok) {
      return json({ error: 'habboassets_error', status: upstream.status, message: raw.slice(0, 240) }, 502)
    }
    let data: unknown
    try { data = JSON.parse(raw) } catch { return json({ error: 'invalid_upstream_response' }, 502) }
    return json({ data, action, hotelId: hotel })
  } catch {
    return json({ error: 'upstream_unavailable' }, 504)
  }
})
