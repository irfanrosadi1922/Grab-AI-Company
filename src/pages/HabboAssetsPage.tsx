import { useCallback, useEffect, useState } from 'react'
import { Search, RefreshCw, Package, ExternalLink, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import { PageHeader, Card, Badge, Button } from '../components/ui'
import { supabase } from '../lib/supabase'

type Furniture = {
  classname?: string
  name?: string
  description?: string
  category?: string
  type?: string
  revision?: number | string
  icon?: string
  preview?: string
  image?: string
}
type ApiPayload = Furniture[] | { data?: Furniture[]; meta?: { total?: number } } | Furniture
type ApiResult = { data?: ApiPayload; error?: string; message?: string; status?: number }

const inputClass = 'h-10 w-full rounded-ctl border border-line bg-canvas px-3 text-sm outline-none focus:border-brand'
const buttonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-ctl border border-line px-3 text-sm font-medium hover:bg-raised disabled:opacity-50'

export default function HabboAssetsPage() {
  const [items, setItems] = useState<Furniture[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Furniture | null>(null)
  const [hotelId, setHotelId] = useState(1)

  const load = useCallback(async (nextPage = page) => {
    if (!supabase) {
      setError('Supabase belum dikonfigurasi. Hubungkan environment Supabase terlebih dahulu.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<ApiResult>('habbo-assets', {
        body: { action: 'list', search, category, page: nextPage, perPage: 24, hotelId },
      })
      if (invokeError) {
        let detail = invokeError.message || 'Permintaan ke Edge Function gagal.'
        const context = (invokeError as typeof invokeError & { context?: unknown }).context
        if (context instanceof Response) {
          try {
            const body = await context.clone().json() as { error?: string; message?: string; status?: number }
            detail = body.message
              ? `${body.error || 'Error'} (HTTP ${context.status}${body.status ? `, upstream ${body.status}` : ''}): ${body.message}`
              : `${body.error || detail} (HTTP ${context.status})`
          } catch {
            detail = `HTTP ${context.status}: ${detail}`
          }
        }
        throw new Error(detail)
      }
      if (data?.error) throw new Error(`${data.error}${data.status ? ` (HTTP ${data.status})` : ''}: ${data.message || 'Permintaan gagal'}`)
      const payload = data?.data
      const rows = Array.isArray(payload) ? payload : payload && 'data' in payload ? payload.data : undefined
      if (!Array.isArray(rows)) throw new Error('Format data dari HabboAssets tidak sesuai. Respons API tidak berisi daftar furniture.')
      const meta = payload && !Array.isArray(payload) && 'meta' in payload ? payload.meta : undefined
      setItems(rows)
      setTotal(Number(meta?.total ?? rows.length))
      setPage(nextPage)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tidak dapat mengambil katalog HabboAssets.')
    } finally {
      setLoading(false)
    }
  }, [page, search, category, hotelId])

  useEffect(() => { void load(1) }, [category, hotelId])

  const openDetail = async (item: Furniture) => {
    setSelected(item)
    if (!item.classname || !supabase) return
    const { data } = await supabase.functions.invoke<ApiResult>('habbo-assets', {
      body: { action: 'detail', classname: item.classname, hotelId },
    })
    if (data?.data && !Array.isArray(data.data)) {
      const detail = data.data as Furniture
      setSelected({ ...item, ...((detail as unknown as { furnidata?: Furniture }).furnidata ?? detail) })
    }
  }

  const imageFor = (item: Furniture) => item.preview || item.image || (item.classname
    ? `https://www.habboassets.com/imaging/furniture/${encodeURIComponent(item.classname)}.png`
    : item.icon || '')

  return (
    <div className="space-y-4">
      <PageHeader title="Habbo Asset Library" desc="Katalog furniture HabboAssets untuk membangun dan mengisi kantor virtual." />
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <input className={inputClass + ' pl-9'} value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void load(1)} placeholder="Cari sofa, meja, tanaman..." />
          </div>
          <select className={inputClass + ' w-auto min-w-[150px]'} value={hotelId} onChange={(e) => setHotelId(Number(e.target.value))}>
            <option value={1}>Habbo.com</option>
            <option value={2}>Habbo Brasil</option>
            <option value={3}>Habbo España</option>
            <option value={5}>Habbo France</option>
            <option value={6}>Habbo Germany</option>
            <option value={10}>Habbo Sandbox</option>
          </select>
          <Button onClick={() => void load(1)} disabled={loading} icon={RefreshCw}>Cari</Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-mute">Pilih hotel dan cari furniture berdasarkan nama atau classname.</p>
          <Badge tone="neutral">{total.toLocaleString('id-ID')} item</Badge>
        </div>
      </Card>

      {error && <Card className="border border-danger/30 p-4"><p className="text-sm font-semibold text-danger">Katalog belum dapat dimuat</p><p className="mt-1 break-words text-sm text-mute">{error}</p><p className="mt-2 text-xs text-mute">Pastikan secret HABBOASSETS_API_KEY sudah dipasang dan Edge Function habbo-assets sudah di-deploy.</p></Card>}

      {loading && <p className="py-8 text-center text-sm text-mute">Memuat furniture Habbo...</p>}
      {!loading && !error && items.length === 0 && <Card className="p-8 text-center"><Package className="mx-auto mb-2 text-mute" /><p className="text-sm text-mute">Belum ada item. Masukkan kata pencarian lalu tekan Cari.</p></Card>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {items.map((item, i) => (
          <button key={item.classname || i} onClick={() => void openDetail(item)} className="overflow-hidden rounded-ctl border border-line bg-surface text-left transition hover:border-brand">
            <div className="flex h-36 items-center justify-center bg-[#e7e8e6] p-2">
              {imageFor(item) ? <img src={imageFor(item)} alt={item.name || item.classname || 'Habbo furniture'} loading="lazy" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="text-gray-500" />}
            </div>
            <div className="space-y-1 p-3">
              <p className="line-clamp-2 min-h-10 text-sm font-semibold">{item.name || item.classname || 'Furniture'}</p>
              <p className="truncate text-xs text-mute">{item.classname || 'Classname tidak tersedia'}</p>
              <div className="flex items-center justify-between gap-2"><Badge tone="neutral">{item.category || item.type || 'Furniture'}</Badge>{item.revision && <span className="text-[10px] text-mute">r{item.revision}</span>}</div>
            </div>
          </button>
        ))}
      </div>

      {items.length > 0 && <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => void load(Math.max(1, page - 1))} disabled={page <= 1 || loading} icon={ChevronLeft}>Sebelumnya</Button>
        <span className="text-xs text-mute">Halaman {page}</span>
        <Button variant="secondary" onClick={() => void load(page + 1)} disabled={loading || (total > 0 && page * 24 >= total)} icon={ChevronRight}>Berikutnya</Button>
      </div>}

      {selected && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
        <div className="w-full max-w-md overflow-hidden rounded-xl border border-line bg-surface shadow-pop" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-line p-4"><h2 className="font-semibold">{selected.name || selected.classname}</h2><button onClick={() => setSelected(null)} className="text-sm text-mute">Tutup</button></div>
          <div className="flex h-64 items-center justify-center bg-[#e7e8e6] p-4"><img src={imageFor(selected)} alt={selected.name || 'Furniture'} className="max-h-full max-w-full object-contain" /></div>
          <div className="space-y-2 p-4 text-sm">
            <p><span className="text-mute">Classname:</span> {selected.classname}</p>
            <p><span className="text-mute">Kategori:</span> {selected.category || selected.type || '—'}</p>
            <p><span className="text-mute">Deskripsi:</span> {selected.description || 'Tidak ada deskripsi.'}</p>
            {selected.classname && <a className="inline-flex items-center gap-1 text-brand underline" href={`https://www.habboassets.com/furniture/${encodeURIComponent(selected.classname)}`} target="_blank" rel="noreferrer">Buka di HabboAssets <ExternalLink size={13} /></a>}
          </div>
        </div>
      </div>}
    </div>
  )
}
