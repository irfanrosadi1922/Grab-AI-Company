import { useMemo, useRef, useState } from 'react'
import { Download, FileUp } from 'lucide-react'
import { Button, Field, Notice, Select, Textarea } from './ui'
import { Modal } from './Overlays'
import { useApp } from '../state/AppState'
import { downloadBlob } from '../lib/format'
import { buildRows, parseCsv } from '../lib/csv'
import type { EntryKind, EntryOf } from '../types'

const TITLE: Record<EntryKind, string> = {
  sales: 'Penjualan harian',
  menu: 'Performa menu',
  reviews: 'Ulasan pelanggan',
  marketing: 'Data pemasaran',
}

const COLUMNS: Record<EntryKind, string> = {
  sales: 'tanggal, toko (opsional), penjualan, pesanan',
  menu: 'menu, pesanan, pendapatan',
  reviews: 'rating, ulasan, tanggal (opsional), toko (opsional)',
  marketing: 'kanal, biaya, pesanan',
}

const SAMPLE: Record<EntryKind, string> = {
  sales: 'tanggal,toko,penjualan,pesanan\n2026-11-01,Nama Toko Anda,1250000,34\n2026-11-02,Nama Toko Anda,980000,27\n',
  menu: 'menu,pesanan,pendapatan\nNasi Goreng Spesial,120,3000000\nEs Teh Manis,200,1000000\n',
  reviews: 'rating,ulasan,tanggal,toko\n5,Enak dan cepat,2026-11-01,Nama Toko Anda\n3,Porsi kurang banyak,2026-11-02,Nama Toko Anda\n',
  marketing: 'kanal,biaya,pesanan\nInstagram,300000,25\nPromo di aplikasi,500000,60\n',
}

export function ImportModal({ open, onClose, initialKind = 'sales' }: { open: boolean; onClose: () => void; initialKind?: EntryKind }) {
  const { stores, entries, addEntry, toast } = useApp()
  const [kind, setKind] = useState<EntryKind>(initialKind)
  const [storeId, setStoreId] = useState(stores[0]?.id ?? '')
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const file = useRef<HTMLInputElement>(null)

  const needsStore = kind === 'sales' || kind === 'reviews'
  const result = useMemo(() => {
    if (!text.trim()) return null
    return buildRows(kind, parseCsv(text), { stores, defaultStoreId: storeId, existing: entries })
  }, [text, kind, stores, storeId, entries])

  const onFile = async (f: File | undefined) => {
    if (!f) return
    if (f.size > 2_000_000) return toast('File terlalu besar (maks 2 MB).', 'error')
    setFileName(f.name)
    setText(await f.text())
  }

  const run = () => {
    if (!result || result.rows.length === 0) return
    for (const r of result.rows) addEntry(kind, r as Omit<EntryOf<typeof kind>, 'id'>)
    toast(`${result.rows.length} baris diimpor${result.skipped ? `, ${result.skipped} dilewati` : ''}.`)
    setText('')
    setFileName('')
    onClose()
  }

  const noStore = needsStore && stores.length === 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Impor dari CSV"
      footer={
        <>
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" icon={FileUp} onClick={run} disabled={!result || result.rows.length === 0 || noStore}>
            {result && result.rows.length ? `Impor ${result.rows.length} baris` : 'Impor'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Jenis data">
          <Select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as EntryKind)
              setText('')
              setFileName('')
            }}
          >
            {(Object.keys(TITLE) as EntryKind[]).map((k) => (
              <option key={k} value={k}>
                {TITLE[k]}
              </option>
            ))}
          </Select>
        </Field>

        {noStore && <Notice tone="warn">Tambahkan toko dulu di Grab Stores. Penjualan dan ulasan harus terkait ke sebuah toko.</Notice>}

        {needsStore && !noStore && (
          <Field label="Toko bawaan" hint="Dipakai untuk baris tanpa kolom toko. Kolom toko di file boleh berisi nama toko atau ID merchant yang Anda catat di Grab Stores.">
            <Select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <p className="text-[13px] text-mute">
          Kolom yang dibaca: <span className="text-ink">{COLUMNS[kind]}</span>. Judul kolom boleh bahasa Indonesia atau Inggris. Tanggal: 2026-11-01 atau 01/11/2026. Angka boleh memakai Rp dan titik ribuan.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button icon={FileUp} onClick={() => file.current?.click()}>
            Pilih file CSV
          </Button>
          <Button icon={Download} onClick={() => downloadBlob(`contoh-${kind}.csv`, SAMPLE[kind], 'text/csv')}>
            Unduh contoh
          </Button>
          <input ref={file} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
        {fileName && <p className="text-xs text-mute">File: {fileName}</p>}

        <Field label="Atau tempel isi CSV di sini">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[96px] font-mono text-xs" placeholder={SAMPLE[kind]} />
        </Field>

        {result && (
          <div className="space-y-2 text-[13px]">
            {result.missingColumns.length > 0 ? (
              <Notice tone="warn">Kolom wajib tidak ditemukan: {result.missingColumns.join(', ')}. Periksa judul kolom di baris pertama.</Notice>
            ) : (
              <p>
                <span className="font-semibold text-brand">{result.rows.length} baris siap diimpor</span>
                {result.skipped > 0 && <span className="text-mute">, {result.skipped} dilewati</span>}
              </p>
            )}
            {result.errors.length > 0 && result.missingColumns.length === 0 && (
              <ul className="space-y-0.5 rounded-ctl border border-line bg-canvas p-3 text-xs text-mute">
                {result.errors.map((er) => (
                  <li key={er}>{er}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
