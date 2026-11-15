import { useState } from 'react'
import { Link2, Plus, RefreshCw } from 'lucide-react'
import { Badge, Button, Card, CardHeader, DemoTag, EmptyState, Field, Input, Notice, PageHeader, SearchInput } from '../components/ui'
import type { Tone } from '../components/ui'
import { Modal } from '../components/Overlays'
import { useApp } from '../state/AppState'
import { rupiahShort } from '../lib/format'
import type { ConnectionState, Store } from '../types'

const connTone: Record<ConnectionState, Tone> = { 'Belum terhubung': 'neutral', 'Menunggu akses resmi': 'warn', Terhubung: 'brand' }

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
    toast('Toko ditambahkan dengan status Belum terhubung.')
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

function Detail({ s, onClose }: { s: Store; onClose: () => void }) {
  const { toggleStoreOpen, toast } = useApp()
  const [connect, setConnect] = useState(false)
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
                toast(`Status toko diubah. Perubahan ini hanya tercatat di aplikasi, belum dikirim ke GrabMerchant.`, 'info')
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
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-mute">
              Performa toko <DemoTag />
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Penjualan', rupiahShort(s.demoSales)],
                ['Pesanan', String(s.demoOrders)],
                ['Rating', s.demoRating ? s.demoRating.toFixed(1) : '-'],
                ['Pertumbuhan', (s.demoGrowth >= 0 ? '+' : '') + s.demoGrowth + '%'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-ctl border border-line p-3">
                  <p className="tabular text-lg font-bold">{v}</p>
                  <p className="text-xs text-mute">{k}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
      <Modal open={connect} onClose={() => setConnect(false)} title="Hubungkan GrabMerchant" footer={<Button onClick={() => setConnect(false)}>Mengerti</Button>}>
        <p className="text-sm text-mute">
          Koneksi sungguhan membutuhkan akses API resmi dari GrabMerchant dan backend yang menyimpan kredensial dengan aman. Keduanya belum tersedia,
          sehingga toko ini tidak akan ditandai Terhubung. Aplikasi tidak membuat koneksi palsu.
        </p>
      </Modal>
    </>
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

export default function Stores() {
  const { stores } = useApp()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [add, setAdd] = useState(false)
  const list = stores.filter((s) => (s.name + s.city).toLowerCase().includes(q.toLowerCase()))
  const selected = stores.find((s) => s.id === sel)

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
      <Notice>Belum ada toko yang terhubung ke GrabMerchant. Angka performa di bawah adalah data contoh.</Notice>
      <div className="max-w-md">
        <SearchInput value={q} onChange={setQ} placeholder="Cari toko" />
      </div>
      {list.length === 0 ? (
        <Card>
          <EmptyState title="Toko tidak ditemukan" />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
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
                  <span className="flex items-center gap-2 text-mute">
                    Penjualan <DemoTag />
                  </span>
                  <span className="tabular font-semibold">{rupiahShort(s.demoSales)}</span>
                </div>
              </div>
              <div className="border-t border-line p-3">
                <Button className="w-full" onClick={() => setSel(s.id)}>
                  Lihat detail
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <AddStore open={add} onClose={() => setAdd(false)} />
      {selected && <Detail s={selected} onClose={() => setSel(null)} />}
    </div>
  )
}
