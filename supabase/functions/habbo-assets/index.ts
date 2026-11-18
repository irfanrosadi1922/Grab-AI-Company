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

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'bad_request' }, 400) }

  const action = String(body.action ?? 'list')
  if (action === 'imagingInfo') {
    const classname = typeof body.classname === 'string' ? body.classname : ''
    if (!/^[a-zA-Z0-9_*.-]{1,120}$/.test(classname)) return json({ error: 'invalid_classname' }, 400)
    try {
      const response = await fetch(`https://www.habboassets.com/imaging/info/furniture/${encodeURIComponent(classname)}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) })
      if (!response.ok) return json({ error: 'habboassets_info_error', status: response.status }, 502)
      return json({ data: await response.json(), action, classname })
    } catch { return json({ error: 'upstream_unavailable' }, 504) }
  }

  // HabboAssets' public legacy furniture catalogue does not require an API token.
  // The public Imager also serves the original Habbo furniture renders directly.
  const search = typeof body.search === 'string' ? body.search.trim().slice(0, 100) : ''
  if (action === 'list') {
    const page = Math.max(1, Math.min(10000, Number(body.page) || 1))
    const perPage = Math.max(1, Math.min(60, Number(body.perPage) || 24))
    const params = new URLSearchParams({ limit: String(perPage), offset: String((page - 1) * perPage), order: 'asc' })
    if (search) params.set('term', search)
    try {
      const upstream = await fetch(`https://www.habboassets.com/api/v1/furniture?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(20000),
      })
      const raw = await upstream.text()
      if (!upstream.ok) return json({ error: 'habboassets_error', status: upstream.status, message: raw.slice(0, 240) }, 502)
      let payload: unknown
      try { payload = JSON.parse(raw) } catch { return json({ error: 'invalid_upstream_response' }, 502) }
      const rows = Array.isArray(payload) ? payload
        : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
          ? (payload as { data: unknown[] }).data : []
      const meta = payload && typeof payload === 'object' ? (payload as { meta?: { total?: number } }).meta : undefined
      const normalized = rows.map((row) => {
        const item = row as Record<string, unknown>
        const classname = String(item.classname ?? item.class_name ?? item.name ?? '')
        return {
          ...item,
          classname,
          name: String(item.name ?? item.product_name ?? classname),
          preview: String(item.preview ?? item.image ?? (classname ? `https://www.habboassets.com/imaging/furniture/${encodeURIComponent(classname)}.png` : '')),
        }
      }).filter((item) => item.classname)
      return json({ data: normalized, meta: { total: Number(meta?.total ?? normalized.length) }, action, hotelId: 1 })
    } catch { return json({ error: 'upstream_unavailable' }, 504) }
  }

  if (action === 'detail') {
    const classname = typeof body.classname === 'string' ? body.classname : ''
    if (!/^[a-zA-Z0-9_*.-]{1,120}$/.test(classname)) return json({ error: 'invalid_classname' }, 400)
    return json({ data: { classname, name: classname, preview: `https://www.habboassets.com/imaging/furniture/${encodeURIComponent(classname)}.png` }, action })
  }
  return json({ error: 'invalid_action' }, 400)
})
