import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Field, Input, Notice, Select, Textarea } from './ui'
import { Modal } from './Overlays'
import { useApp } from '../state/AppState'
import { parseInteger, todayStr } from '../lib/format'
import type { EntryKind } from '../types'

export const ENTRY_TITLE: Record<EntryKind, string> = {
  sales: 'Tambah penjualan',
  menu: 'Tambah menu',
  reviews: 'Tambah ulasan',
  marketing: 'Tambah data pemasaran',
}

const CHANNELS = ['Promo di aplikasi', 'Instagram', 'TikTok', 'WhatsApp', 'Poster di toko', 'Lainnya']

export function AddEntryModal({ kind, open, onClose }: { kind: EntryKind; open: boolean; onClose: () => void }) {
  const { stores, addEntry, toast } = useApp()
  const [date, setDate] = useState(todayStr())
  const [storeId, setStoreId] = useState('')
  const [amount, setAmount] = useState('')
  const [orders, setOrders] = useState('')
  const [name, setName] = useState('')
  const [rating, setRating] = useState('5')
  const [text, setText] = useState('')
  const [channel, setChannel] = useState(CHANNELS[0])
  const [err, setErr] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setDate(todayStr())
    setStoreId(stores[0]?.id ?? '')
    setAmount('')
    setOrders('')
    setName('')
    setRating('5')
    setText('')
    setChannel(CHANNELS[0])
    setErr({})
  }, [open, kind, stores])

  const needStore = (kind === 'sales' || kind === 'reviews') && stores.length === 0

  const submit = () => {
    const e: Record<string, string> = {}
    const money = parseInteger(amount)
    const ord = orders.trim() === '' ? 0 : parseInteger(orders)

    if (kind === 'sales') {
      if (!date) e.date = 'Pilih tanggal.'
      else if (date > todayStr()) e.date = 'Tanggal tidak boleh di masa depan.'
      if (!storeId) e.storeId = 'Pilih toko.'
      if (money === null) e.amount = 'Isi jumlah penjualan (angka bulat).'
      if (ord === null) e.orders = 'Jumlah pesanan harus angka bulat.'
      setErr(e)
      if (Object.keys(e).length) return
      addEntry('sales', { date, storeId, amount: money!, orders: ord! })
    } else if (kind === 'menu') {
      if (name.trim().length < 2) e.name = 'Nama menu minimal 2 karakter.'
      if (ord === null) e.orders = 'Jumlah pesanan harus angka bulat.'
      if (amount.trim() !== '' && money === null) e.amount = 'Pendapatan harus angka bulat.'
      setErr(e)
      if (Object.keys(e).length) return
      addEntry('menu', { name: name.trim(), orders: ord!, revenue: money ?? 0 })
    } else if (kind === 'reviews') {
      if (!storeId) e.storeId = 'Pilih toko.'
      if (!date) e.date = 'Pilih tanggal.'
      if (text.trim().length < 3) e.text = 'Isi ulasan minimal 3 karakter.'
      setErr(e)
      if (Object.keys(e).length) return
      addEntry('reviews', { storeId, rating: Number(rating), text: text.trim(), date })
    } else {
      if (!channel) e.channel = 'Pilih kanal.'
      if (money === null) e.amount = 'Isi biaya (angka bulat, boleh 0).'
      if (ord === null) e.orders = 'Jumlah pesanan harus angka bulat.'
      setErr(e)
      if (Object.keys(e).length) return
      addEntry('marketing', { channel, spend: money!, orders: ord! })
    }
    toast('Data ditambahkan.')
    onClose()
  }

  const storeField = (
    <Field label="Toko" error={err.storeId}>
      <Select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
    </Field>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ENTRY_TITLE[kind]}
      footer={
        <>
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" onClick={submit} disabled={needStore}>
            Simpan
          </Button>
        </>
      }
    >
      {needStore ? (
        <Notice>
          Belum ada toko. Tambahkan toko dulu di{' '}
          <Link to="/stores" className="font-semibold text-brand underline" onClick={onClose}>
            Grab Stores
          </Link>
          .
        </Notice>
      ) : (
        <div className="space-y-4">
          {kind === 'sales' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tanggal" error={err.date}>
                  <Input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
                </Field>
                {storeField}
              </div>
              <Field label="Penjualan (Rp)" error={err.amount} hint="Angka bulat tanpa titik, mis. 1500000. Isi lagi untuk hari yang sama bila ada tambahan.">
                <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1500000" />
              </Field>
              <Field label="Jumlah pesanan (opsional)" error={err.orders}>
                <Input inputMode="numeric" value={orders} onChange={(e) => setOrders(e.target.value)} placeholder="0" />
              </Field>
            </>
          )}
          {kind === 'menu' && (
            <>
              <Field label="Nama menu" error={err.name}>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Jumlah pesanan" error={err.orders}>
                  <Input inputMode="numeric" value={orders} onChange={(e) => setOrders(e.target.value)} placeholder="0" />
                </Field>
                <Field label="Pendapatan (Rp, opsional)" error={err.amount}>
                  <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
                </Field>
              </div>
            </>
          )}
          {kind === 'reviews' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {storeField}
                <Field label="Tanggal" error={err.date}>
                  <Input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
                </Field>
              </div>
              <Field label="Rating">
                <Select value={rating} onChange={(e) => setRating(e.target.value)}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} bintang
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Isi ulasan" error={err.text}>
                <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
              </Field>
            </>
          )}
          {kind === 'marketing' && (
            <>
              <Field label="Kanal" error={err.channel}>
                <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
                  {CHANNELS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Biaya (Rp)" error={err.amount}>
                  <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
                </Field>
                <Field label="Pesanan dari kanal ini" error={err.orders}>
                  <Input inputMode="numeric" value={orders} onChange={(e) => setOrders(e.target.value)} placeholder="0" />
                </Field>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
