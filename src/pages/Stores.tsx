import { useMemo, useState } from 'react'
import { ExternalLink, Link2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Notice, PageHeader, SearchInput, Textarea } from '../components/ui'
import type { Tone } from '../components/ui'
import { ConfirmDialog, Modal } from '../components/Overlays'
import { useApp } from '../state/AppState'
import { rupiahShort } from '../lib/format'
import { storeTotals } from '../lib/stats'
import { isGrabUrl, peekErrorText, peekStore } from '../lib/peek'
import type { ConnectionState, Store } from '../types'

const connTone: Record<ConnectionState, Tone> = { 'Belum terhubung': 'neutral', 'Menunggu akses resmi': 'warn', Terhubung: 'brand' }
const PERIOD = 30

function AddStore({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addStore, toast } = useApp()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [mid, setMid] = useState('')
  const [url, setUrl] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const submit = () => {
    const e: Record<string, string> = {}
    if (name.trim().length < 3) e.name = 'Nama toko minimal 3 karakter.'
    if (city.trim().length < 2) e.city = 'Isi kota.'
    if (url.trim() && !isGrabUrl(url.trim())) e.url = 'Tautan harus https dari grab.com.'
    setErr(e)
    if (Object.keys(e).length) return
    addStore({ name: name.trim(), city: city.trim(), merchantId: mid.trim(), publicUrl: url.trim() })
    toast('Toko ditambahkan.')
    setName('')
    setCity('')
    setMid('')
    setUrl('')
    onClose()
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah toko"
      footer={
        <>
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" onClick={submit}>
            Tambah
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nama toko" error={err.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Kota" error={err.city}>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="Merchant ID (opsional)" hint="Menyimpan ID tidak menghubungkan toko. Koneksi butuh akses resmi GrabMerchant.">
          <Input value={mid} onChange={(e) => setMid(e.target.value)} />
        </Field>
        <Field label="Tautan GrabFood toko (opsional)" error={err.url} hint="Alamat halaman toko Anda di food.grab.com. Dipakai karyawan AI untuk melihat info publik toko.">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://food.grab.com/id/..." inputMode="url" autoCapitalize="off" />
        </Field>
      </div>
    </Modal>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
      <span className="text-mute">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  )
}

function Detail({ s, onClose }: { s: Store; onClose: () => void }) {
  const { toggleStoreOpen, removeStore, updateStore, stores, entries, toast } = useApp()
  const [link, setLink] = useState(s.publicUrl)
  const [linkErr, setLinkErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [paste, setPaste] = useState('')
  const [connect, setConnect] = useState(false)
  const [del, setDel] = useState(false)
  const t = useMemo(() => storeTotals(stores, entries.sales, entries.reviews, PERIOD).find((x) => x.store.id === s.id), [stores, entries, s.id])
  return (
    <>
      <Modal open wide onClose={onClose} title={s.name}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3 text-[13px]">
            <p className="text-xs font-semibold text-mute">Profil</p>
            <Row k="Kota" v={s.city} />
            <Row k="Merchant ID" v={s.merchantId || 'Belum diisi'} />
            <Row k="Status toko" v={<Badge tone={s.open ? 'brand' : 'neutral'}>{s.open ? 'Buka' : 'Tutup'}</Badge>} />
            <Button
              size="sm"
              onClick={() => {
                toggleStoreOpen(s.id)
                toast('Status diubah. Ini hanya tercatat di aplikasi, belum dikirim ke GrabMerchant.', 'info')
              }}
            >
              Ubah status buka/tutup
            </Button>
          </div>
          <div className="space-y-3 text-[13px]">
            <p className="text-xs font-semibold text-mute">Koneksi dan sinkronisasi</p>
            <Row k="Koneksi" v={<Badge tone={connTone[s.connection]}>{s.connection}</Badge>} />
            <Row k="Sinkron terakhir" v={s.lastSync ?? 'Belum pernah'} />
            <Button size="sm" icon={Link2} onClick={() => setConnect(true)}>
              Hubungkan GrabMerchant
            </Button>
          </div>
          <div className="space-y-3 md:col-span-2">
            <p className="text-xs font-semibold text-mute">Pantau lewat web (halaman publik toko)</p>
            <p className="text-[13px] text-mute">
              Selama koneksi resmi belum ada, karyawan AI bisa membaca halaman publik toko Anda di Grab (menu, rating, dan info yang tampil untuk pelanggan). Ini bukan data penjualan atau pesanan, dan tidak memakai akun Grab Anda.
            </p>
            <Field label="Tautan GrabFood toko" error={linkErr}>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://food.grab.com/id/..." inputMode="url" autoCapitalize="off" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                icon={RefreshCw}
                disabled={busy || !link.trim()}
                onClick={async () => {
                  const v = link.trim()
                  if (!isGrabUrl(v)) return setLinkErr('Tautan harus https dari grab.com.')
                  setLinkErr('')
                  setBusy(true)
                  try {
                    const r = await peekStore(v)
                    updateStore(s.id, { publicUrl: v, peekText: r.text, peekAt: new Date().toLocaleString('id-ID') })
                    toast(r.menuCount > 0 ? `Info toko diperbarui (${r.menuCount} menu terbaca).` : 'Info toko diperbarui. Menu tidak terbaca, hanya teks halaman.', 'info')
                  } catch (e) {
                    setLinkErr(peekErrorText(e))
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {busy ? 'Membaca halaman...' : 'Perbarui info dari web'}
              </Button>
              {link.trim() && isGrabUrl(link.trim()) && (
                <a href={link.trim()} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-ctl border border-line px-3 text-xs font-medium hover:bg-raised">
                  <ExternalLink size={14} aria-hidden /> Buka di Grab
                </a>
              )}
              {link.trim() !== s.publicUrl && (
                <Button size="sm" onClick={() => (link.trim() && !isGrabUrl(link.trim()) ? setLinkErr('Tautan harus https dari grab.com.') : (updateStore(s.id, { publicUrl: link.trim() }), setLinkErr(''), toast('Tautan disimpan.')))}>
                  Simpan tautan
                </Button>
              )}
            </div>
            <Field label="Tempel teks halaman (cara paling andal)" hint="Buka halaman toko Anda di browser, pilih semua teks (menu, harga, deskripsi), salin, lalu tempel di sini. Gambar tidak ikut terbaca.">
              <Textarea value={paste} onChange={(e) => setPaste(e.target.value)} className="min-h-[88px] text-xs" maxLength={20000} />
            </Field>
            <Button
              size="sm"
              disabled={paste.trim().length < 80}
              onClick={() => {
                updateStore(s.id, { peekText: paste.trim().replace(/\s+\n/g, '\n').slice(0, 5000), peekAt: `${new Date().toLocaleString('id-ID')} (ditempel manual)` })
                setPaste('')
                toast('Teks halaman disimpan. Semua karyawan AI memakainya.', 'info')
              }}
            >
              Simpan teks halaman
            </Button>
            {s.peekText ? (
              <div className="rounded-ctl border border-line bg-canvas p-3">
                <p className="mb-1 text-xs text-mute">Dibaca {s.peekAt}. Semua karyawan AI memakai ringkasan ini.</p>
                <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs">{s.peekText}</p>
              </div>
            ) : (
              <p className="text-xs text-mute">Belum ada info yang dibaca.</p>
            )}
          </div>
          <div className="md:col-span-2">
            <p className="mb-2 text-xs font-semibold text-mute">Performa {PERIOD} hari terakhir (dari data yang Anda catat)</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ['Penjualan', t && t.sales > 0 ? rupiahShort(t.sales) : '-'],
                ['Pesanan', t && t.orders > 0 ? String(t.orders) : '-'],
                ['Rating rata-rata', t?.avgRating != null ? `${t.avgRating.toFixed(1)} (${t.reviewCount})` : '-'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-ctl border border-line p-3">
                  <p className="tabular text-lg font-bold">{v}</p>
                  <p className="text-xs text-mute">{k}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => setDel(true)}>
              Hapus toko
            </Button>
          </div>
        </div>
      </Modal>
      <Modal open={connect} onClose={() => setConnect(false)} title="Hubungkan GrabMerchant" footer={<Button onClick={() => setConnect(false)}>Mengerti</Button>}>
        <p className="text-sm text-mute">
          Koneksi sungguhan membutuhkan akses API resmi dari GrabMerchant dan backend yang menyimpan kredensial dengan aman. Akses resmi itu belum ada,
          sehingga toko ini tidak akan ditandai Terhubung. Sementara itu, catat penjualan secara manual di Analytics.
        </p>
      </Modal>
      <ConfirmDialog
        open={del}
        onClose={() => setDel(false)}
        title="Hapus toko ini?"
        desc={`"${s.name}" beserta seluruh catatan penjualan dan ulasan miliknya akan dihapus permanen.`}
        confirmLabel="Hapus"
        danger
        onConfirm={() => {
          removeStore(s.id)
          toast('Toko dihapus.', 'info')
          onClose()
        }}
      />
    </>
  )
}

export default function Stores() {
  const { stores, entries } = useApp()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [add, setAdd] = useState(false)
  const list = stores.filter((s) => (s.name + s.city).toLowerCase().includes(q.toLowerCase()))
  const selected = stores.find((s) => s.id === sel)
  const totals = useMemo(() => storeTotals(stores, entries.sales, entries.reviews, PERIOD), [stores, entries])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Grab Stores"
        desc="Kelola beberapa toko, status koneksi, dan sinkronisasi data."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setAdd(true)}>
            Tambah toko
          </Button>
        }
      />
      <Notice>Belum ada toko yang terhubung ke GrabMerchant. Penjualan dicatat manual atau diimpor dari CSV di Analytics. Info publik toko bisa dibaca lewat tautan GrabFood.</Notice>
      {stores.length > 0 && (
        <div className="max-w-md">
          <SearchInput value={q} onChange={setQ} placeholder="Cari toko" />
        </div>
      )}
      {stores.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada toko"
            desc="Tambahkan toko GrabMerchant Anda untuk mulai mencatat penjualan."
            action={
              <Button variant="primary" icon={Plus} onClick={() => setAdd(true)}>
                Tambah toko
              </Button>
            }
          />
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState title="Toko tidak ditemukan" />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => {
            const t = totals.find((x) => x.store.id === s.id)
            return (
              <Card key={s.id} className="flex flex-col">
                <CardHeader title={s.name} aside={<Badge tone={s.open ? 'brand' : 'neutral'}>{s.open ? 'Buka' : 'Tutup'}</Badge>} />
                <div className="flex-1 space-y-3 p-4 sm:p-5">
                  <p className="text-xs text-mute">{s.city}</p>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-mute">Koneksi</span>
                    <Badge tone={connTone[s.connection]}>{s.connection}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-1.5 text-mute">
                      <RefreshCw size={13} aria-hidden /> Sinkron
                    </span>
                    <span>{s.lastSync ?? 'Belum pernah'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-mute">Penjualan {PERIOD} hari</span>
                    <span className="tabular font-semibold">{t && t.sales > 0 ? rupiahShort(t.sales) : '-'}</span>
                  </div>
                </div>
                <div className="border-t border-line p-3">
                  <Button className="w-full" onClick={() => setSel(s.id)}>
                    Lihat detail
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <AddStore open={add} onClose={() => setAdd(false)} />
      {selected && <Detail s={selected} onClose={() => setSel(null)} />}
    </div>
  )
}
