import { useMemo, useRef, useState } from 'react'
import { CalendarPlus, Copy, Download, ImageDown, Save, Sparkles, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Notice, PageHeader, Select, Tabs } from '../components/ui'
import { ConfirmDialog } from '../components/Overlays'
import { useApp } from '../state/AppState'
import { cn, downloadBlob } from '../lib/format'
import type { Asset } from '../types'

type Tab = 'studio' | 'caption' | 'plan' | 'library'

const FORMATS = [
  { id: 'poster', label: 'Poster A4', w: 600, h: 848 },
  { id: 'banner', label: 'Banner lebar', w: 1200, h: 400 },
  { id: 'social', label: 'Postingan persegi', w: 800, h: 800 },
  { id: 'story', label: 'Story 9:16', w: 540, h: 960 },
]

const TEMPLATES = [
  { id: 'bold', label: 'Promo tebal', headline: 'Paket Hemat Akhir Pekan', sub: 'Sabtu dan Minggu saja', cta: 'Pesan sekarang' },
  { id: 'minimal', label: 'Minimal', headline: 'Menu baru telah hadir', sub: 'Coba sebelum kehabisan', cta: 'Lihat menu' },
  { id: 'split', label: 'Dua blok', headline: 'Beli 2 gratis ongkir', sub: 'Berlaku sampai Minggu', cta: 'Pesan lewat Grab' },
]

const ACCENTS = ['#00b14f', '#e2a83e', '#5c9ae2', '#e0607a']

function wrap(text: string, max: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) {
      lines.push(cur)
      cur = w
    } else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 4)
}

interface ArtProps {
  fmt: string
  tpl: string
  headline: string
  sub: string
  cta: string
  accent: string
  light?: boolean
}

export function Art({ fmt, tpl, headline, sub, cta, accent, light }: ArtProps) {
  const f = FORMATS.find((x) => x.id === fmt) ?? FORMATS[0]
  const bg = light ? '#f4f7f5' : '#10171a'
  const fg = light ? '#10171a' : '#f2f6f4'
  const wide = f.w / f.h > 1.4
  const size = Math.min(f.w, f.h * (wide ? 1.2 : 0.7)) / (wide ? 9 : 8)
  const maxChars = wide ? 26 : 14
  const lines = wrap(headline || ' ', maxChars)
  const x = f.w * 0.08
  const startY = wide ? f.h * 0.38 : f.h * 0.34
  return (
    <svg viewBox={`0 0 ${f.w} ${f.h}`} xmlns="http://www.w3.org/2000/svg" className="h-auto w-full" role="img" aria-label={`Pratinjau ${headline}`}>
      <rect width={f.w} height={f.h} fill={bg} />
      {tpl === 'split' && <rect x={f.w * 0.62} width={f.w * 0.38} height={f.h} fill={accent} />}
      {tpl === 'bold' && <rect width={f.w} height={f.h * 0.06} fill={accent} />}
      {tpl === 'minimal' && <rect x={x} y={startY - size * 1.6} width={f.w * 0.1} height={4} fill={accent} />}
      <text x={x} y={startY} fontFamily="Plus Jakarta Sans, Arial, sans-serif" fontWeight={700} fontSize={size} fill={fg}>
        {lines.map((l, i) => (
          <tspan key={i} x={x} dy={i === 0 ? 0 : size * 1.15}>
            {l}
          </tspan>
        ))}
      </text>
      <text x={x} y={startY + lines.length * size * 1.15 + size * 0.2} fontFamily="Plus Jakarta Sans, Arial, sans-serif" fontSize={size * 0.42} fill={fg} opacity={0.7}>
        {sub}
      </text>
      <g>
        <rect x={x} y={f.h * 0.84} rx={size * 0.2} width={Math.max(150, cta.length * size * 0.32 + size * 0.9)} height={size * 0.95} fill={tpl === 'split' ? fg : accent} />
        <text
          x={x + size * 0.45}
          y={f.h * 0.84 + size * 0.62}
          fontFamily="Plus Jakarta Sans, Arial, sans-serif"
          fontWeight={700}
          fontSize={size * 0.38}
          fill={tpl === 'split' ? bg : light ? '#fff' : '#0c100f'}
        >
          {cta}
        </text>
      </g>
    </svg>
  )
}

function svgString(el: SVGSVGElement | null) {
  if (!el) return ''
  return new XMLSerializer().serializeToString(el)
}

function Studio() {
  const { addAsset, toast } = useApp()
  const [fmt, setFmt] = useState('poster')
  const [tpl, setTpl] = useState('bold')
  const [headline, setHeadline] = useState(TEMPLATES[0].headline)
  const [sub, setSub] = useState(TEMPLATES[0].sub)
  const [cta, setCta] = useState(TEMPLATES[0].cta)
  const [accent, setAccent] = useState(ACCENTS[0])
  const [light, setLight] = useState(false)
  const [err, setErr] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const idx = useRef(0)

  const generate = () => {
    idx.current = (idx.current + 1) % TEMPLATES.length
    const t = TEMPLATES[idx.current]
    setTpl(t.id)
    setHeadline(t.headline)
    setSub(t.sub)
    setCta(t.cta)
    setErr('')
    toast('Teks disusun dari template. Anda bisa mengubahnya.', 'info')
  }

  const valid = () => {
    if (headline.trim().length < 3) {
      setErr('Judul minimal 3 karakter.')
      return false
    }
    setErr('')
    return true
  }

  const save = () => {
    if (!valid()) return
    addAsset({ name: headline.trim(), format: fmt, template: tpl, headline: headline.trim(), sub, accent })
    toast('Disimpan ke Aset.')
  }

  const downloadSvg = () => {
    if (!valid()) return
    const s = svgString(box.current?.querySelector('svg') ?? null)
    downloadBlob(`${fmt}-${tpl}.svg`, s, 'image/svg+xml')
  }

  const downloadPng = () => {
    if (!valid()) return
    const f = FORMATS.find((x) => x.id === fmt)!
    const s = svgString(box.current?.querySelector('svg') ?? null)
    const img = new Image()
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = f.w * 2
        c.height = f.h * 2
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        c.toBlob((b) => {
          if (!b) return toast('Gagal membuat PNG.', 'error')
          const a = document.createElement('a')
          a.href = URL.createObjectURL(b)
          a.download = `${fmt}-${tpl}.png`
          a.click()
          setTimeout(() => URL.revokeObjectURL(a.href), 1000)
        })
      } catch {
        toast('Browser menolak ekspor PNG. Gunakan unduhan SVG.', 'error')
      }
    }
    img.onerror = () => toast('Gagal membuat PNG. Gunakan unduhan SVG.', 'error')
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr_280px]">
      <Card className="order-2 lg:order-1">
        <CardHeader title="Template" />
        <ul className="space-y-2 p-4">
          {TEMPLATES.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => {
                  setTpl(t.id)
                  setHeadline(t.headline)
                  setSub(t.sub)
                  setCta(t.cta)
                }}
                aria-pressed={tpl === t.id}
                className={cn('w-full rounded-ctl border px-3 py-2.5 text-left text-[13px] font-medium', tpl === t.id ? 'border-brand bg-brand/5' : 'border-line hover:bg-raised')}
              >
                {t.label}
                <span className="block text-xs font-normal text-mute">{t.headline}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="order-1 min-w-0 lg:order-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <Select aria-label="Format" value={fmt} onChange={(e) => setFmt(e.target.value)} className="h-9 w-48">
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </Select>
          <div className="flex flex-wrap gap-2">
            <Button icon={Sparkles} onClick={generate}>
              Generate
            </Button>
            <Button icon={Save} onClick={save}>
              Save
            </Button>
            <Button variant="primary" icon={Download} onClick={downloadSvg}>
              SVG
            </Button>
            <Button variant="primary" icon={ImageDown} onClick={downloadPng}>
              PNG
            </Button>
          </div>
        </div>
        <div className="flex justify-center bg-canvas p-4 sm:p-6">
          <div ref={box} className={cn('w-full overflow-hidden rounded-ctl border border-line', fmt === 'story' ? 'max-w-[260px]' : fmt === 'poster' ? 'max-w-[340px]' : fmt === 'social' ? 'max-w-[420px]' : 'max-w-full')}>
            <Art fmt={fmt} tpl={tpl} headline={headline} sub={sub} cta={cta} accent={accent} light={light} />
          </div>
        </div>
        <p className="border-t border-line px-4 py-2.5 text-xs text-mute">Generate menyusun teks dari template. Pembuatan gambar oleh AI belum aktif.</p>
      </Card>

      <Card className="order-3">
        <CardHeader title="Pengaturan desain" />
        <div className="space-y-4 p-4">
          <Field label="Judul" error={err}>
            <Input value={headline} maxLength={60} onChange={(e) => setHeadline(e.target.value)} />
          </Field>
          <Field label="Subjudul">
            <Input value={sub} maxLength={60} onChange={(e) => setSub(e.target.value)} />
          </Field>
          <Field label="Teks tombol">
            <Input value={cta} maxLength={30} onChange={(e) => setCta(e.target.value)} />
          </Field>
          <div>
            <p className="mb-1.5 text-xs font-medium text-mute">Warna aksen</p>
            <div className="flex gap-2">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  aria-label={`Warna ${c}`}
                  aria-pressed={accent === c}
                  onClick={() => setAccent(c)}
                  className={cn('h-8 w-8 rounded-full border-2', accent === c ? 'border-ink' : 'border-transparent')}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <Field label="Latar">
            <Select value={light ? 'light' : 'dark'} onChange={(e) => setLight(e.target.value === 'light')}>
              <option value="dark">Gelap</option>
              <option value="light">Terang</option>
            </Select>
          </Field>
        </div>
      </Card>
    </div>
  )
}

function Caption() {
  const { toast } = useApp()
  const [dish, setDish] = useState('')
  const [tone, setTone] = useState('hangat')
  const [goal, setGoal] = useState('promo')
  const [out, setOut] = useState<string[]>([])
  const [err, setErr] = useState('')

  const make = () => {
    if (dish.trim().length < 2) return setErr('Isi nama menu atau promo.')
    setErr('')
    const d = dish.trim()
    const T: Record<string, string[]> = {
      hangat: [`${d} siap menemani harimu. Pesan lewat Grab, kami antar selagi hangat.`, `Lagi cari yang pas? ${d} jawabannya.`],
      santai: [`${d} hari ini? Boleh banget.`, `Gak usah ribet, ${d} tinggal klik.`],
      tegas: [`${d}. Tersedia hari ini. Pesan sekarang.`, `Stok ${d} terbatas. Jangan sampai kehabisan.`],
    }
    const G: Record<string, string> = { promo: 'Cek promo di aplikasi.', menu: 'Menu baru, rasa yang dijaga.', ulasan: 'Terima kasih untuk ulasan kalian.' }
    setOut([...T[tone].map((c) => `${c} ${G[goal]}`), `${d} | ${G[goal]}`])
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader title="Caption generator" />
        <div className="space-y-4 p-4">
          <Field label="Menu atau promo" error={err}>
            <Input value={dish} onChange={(e) => setDish(e.target.value)} placeholder="Contoh: Ayam geprek" />
          </Field>
          <Field label="Nada">
            <Select value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="hangat">Hangat</option>
              <option value="santai">Santai</option>
              <option value="tegas">Tegas</option>
            </Select>
          </Field>
          <Field label="Tujuan">
            <Select value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="promo">Promo</option>
              <option value="menu">Menu baru</option>
              <option value="ulasan">Terima kasih</option>
            </Select>
          </Field>
          <Button variant="primary" icon={Sparkles} onClick={make} className="w-full">
            Generate
          </Button>
          <p className="text-xs text-mute">Dibuat dari template teks, belum memakai model AI.</p>
        </div>
      </Card>
      <Card>
        <CardHeader title="Hasil" />
        {out.length === 0 ? (
          <EmptyState title="Belum ada caption" desc="Isi form di samping lalu tekan Generate." />
        ) : (
          <ul className="divide-y divide-line">
            {out.map((c, i) => (
              <li key={i} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
                <p className="text-[13px]">{c}</p>
                <Button
                  size="sm"
                  icon={Copy}
                  onClick={() =>
                    navigator.clipboard
                      ?.writeText(c)
                      .then(() => toast('Caption disalin.'))
                      .catch(() => toast('Tidak bisa menyalin otomatis.', 'error'))
                  }
                >
                  Salin
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

interface PlanItem {
  id: number
  date: string
  title: string
  channel: string
  kind: 'Konten' | 'Kampanye'
}

function Plan() {
  const { toast } = useApp()
  const [items, setItems] = useState<PlanItem[]>([])
  const [date, setDate] = useState('')
  const [title, setTitle] = useState('')
  const [channel, setChannel] = useState('Instagram')
  const [kind, setKind] = useState<PlanItem['kind']>('Konten')
  const [err, setErr] = useState('')

  const add = () => {
    if (!date || title.trim().length < 3) return setErr('Isi tanggal dan judul (min. 3 karakter).')
    setErr('')
    setItems((p) => [...p, { id: Date.now(), date, title: title.trim(), channel, kind }].sort((a, b) => (a.date < b.date ? -1 : 1)))
    setTitle('')
    toast('Ditambahkan ke kalender.')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader title="Tambah jadwal" />
        <div className="space-y-4 p-4">
          <Field label="Jenis">
            <Select value={kind} onChange={(e) => setKind(e.target.value as PlanItem['kind'])}>
              <option>Konten</option>
              <option>Kampanye</option>
            </Select>
          </Field>
          <Field label="Judul" error={err}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Tanggal">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Kanal">
            <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option>Instagram</option>
              <option>Aplikasi Grab</option>
              <option>Poster di toko</option>
              <option>WhatsApp</option>
            </Select>
          </Field>
          <Button variant="primary" icon={CalendarPlus} onClick={add} className="w-full">
            Tambah
          </Button>
        </div>
      </Card>
      <Card>
        <CardHeader title="Kalender konten dan kampanye" />
        {items.length === 0 ? (
          <EmptyState title="Kalender kosong" desc="Jadwal di sini hanya tersimpan selama halaman terbuka." />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{it.title}</p>
                  <p className="tabular text-xs text-mute">
                    {it.date} · {it.channel}
                  </p>
                </div>
                <Badge tone={it.kind === 'Kampanye' ? 'warn' : 'info'}>{it.kind}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Library() {
  const { assets, removeAsset, toast } = useApp()
  const [del, setDel] = useState<Asset | null>(null)
  const light = false
  const thumbs = useMemo(() => assets, [assets])
  if (thumbs.length === 0) {
    return (
      <Card>
        <EmptyState title="Belum ada aset" desc="Simpan desain dari tab Studio, aset akan muncul di sini." />
      </Card>
    )
  }
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {thumbs.map((a) => (
          <Card key={a.id} className="overflow-hidden">
            <div className="flex h-44 items-center justify-center bg-canvas p-3">
              <div className="max-h-full w-full max-w-[120px] overflow-hidden rounded-md border border-line">
                <Art fmt={a.format} tpl={a.template} headline={a.headline} sub={a.sub} cta="Pesan" accent={a.accent} light={light} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{a.name}</p>
                <p className="text-xs text-mute">{a.createdAt}</p>
              </div>
              <Button size="sm" variant="danger" icon={Trash2} aria-label="Hapus" onClick={() => setDel(a)} />
            </div>
          </Card>
        ))}
      </div>
      <ConfirmDialog
        open={del !== null}
        onClose={() => setDel(null)}
        title="Hapus aset?"
        desc={`"${del?.name ?? ''}" akan dihapus dari library. Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        danger
        onConfirm={() => {
          if (del) removeAsset(del.id)
          toast('Aset dihapus.')
        }}
      />
    </>
  )
}

export default function Marketing() {
  const { assets } = useApp()
  const [tab, setTab] = useState<Tab>('studio')
  return (
    <div className="space-y-4">
      <PageHeader title="Marketing Studio" desc="Buat materi promosi, tulis caption, dan atur jadwal konten." />
      <Notice tone="info">Desain dibuat dari template dan diekspor sebagai SVG atau PNG. Pembuatan gambar dan teks oleh AI belum terhubung.</Notice>
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { id: 'studio', label: 'Studio desain' },
          { id: 'caption', label: 'Caption' },
          { id: 'plan', label: 'Kampanye dan kalender' },
          { id: 'library', label: 'Aset', count: assets.length },
        ]}
      />
      {tab === 'studio' && <Studio />}
      {tab === 'caption' && <Caption />}
      {tab === 'plan' && <Plan />}
      {tab === 'library' && <Library />}
    </div>
  )
}
