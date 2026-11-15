import { useMemo, useState } from 'react'
import { Link2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Notice, PageHeader, SearchInput } from '../components/ui'
import type { Tone } from '../components/ui'
import { ConfirmDialog, Modal } from '../components/Overlays'
import { useApp } from '../state/AppState'
import { rupiahShort } from '../lib/format'
import { storeTotals } from '../lib/stats'
import type { ConnectionState, Store } from '../types'

const connTone: Record<ConnectionState, Tone> = { 'Belum terhubung': 'neutral', 'Menunggu akses resmi': 'warn', Terhubung: 'brand' }
const PERIOD = 30

function AddStore({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addStore, toast } = useApp()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [mid, setMid] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const submit = () => {
    const e: Record<string, string> = {}
    if (name.trim().length < 3) e.name = 'Nama toko minimal 3 karakter.'
    if (city.trim().length < 2) e.city = 'Isi kota.'
    setErr(e)
    if (Object.keys(e).length) return
    addStore({ name: name.trim(), city: city.trim(), merchantId: mid.trim() })
    toast('Toko ditambahkan.')
    setName('')
    setCity('')
    setMid('')
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
  const { toggleStoreOpen, removeStore, stores, entries, toast } = useApp()
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
      <Notice>Belum ada toko yang terhubung ke GrabMerchant. Penjualan dicatat manual di Analytics.</Notice>
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
