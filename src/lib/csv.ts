import type { Entries, EntryKind, EntryOf, Store } from '../types'

/** Pembaca CSV sederhana: mendukung tanda kutip, pemisah koma, titik koma, atau tab. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '')
  const first = src.split(/\r?\n/, 1)[0] ?? ''
  const counts: [string, number][] = [',', ';', '\t'].map((d) => [d, first.split(d).length - 1])
  const delim = counts.sort((a, b) => b[1] - a[1])[0][0]
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (q) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else q = false
      } else cell += c
    } else if (c === '"') q = true
    else if (c === delim) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      if (row.some((x) => x.trim() !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim() !== '')) rows.push(row)
  return rows
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

const ALIASES: Record<string, string[]> = {
  date: ['tanggal', 'tgl', 'date', 'orderdate', 'tanggalpesanan'],
  store: ['toko', 'store', 'outlet', 'namatoko', 'storename', 'merchantid', 'idmerchant', 'idtoko', 'storeid', 'merchant'],
  amount: ['penjualan', 'pendapatan', 'omzet', 'total', 'amount', 'revenue', 'sales', 'gross', 'grosssales', 'totalpenjualan', 'nominal', 'itemgrosssalesrm', 'itemgrosssales', 'grosssalesrm'],
  orders: ['pesanan', 'orders', 'order', 'jumlahpesanan', 'totalpesanan', 'qty', 'jumlah', 'terjual', 'unitssold', 'unitsold', 'quantity'],
  name: ['menu', 'nama', 'namamenu', 'item', 'name', 'produk'],
  revenue: ['pendapatan', 'revenue', 'omzet', 'penjualan', 'total', 'amount', 'itemgrosssalesrm', 'itemgrosssales', 'grosssales', 'grosssalesrm'],
  rating: ['rating', 'bintang', 'nilai', 'star', 'stars'],
  text: ['ulasan', 'komentar', 'review', 'text', 'isi', 'catatan', 'comment'],
  channel: ['kanal', 'channel', 'platform', 'sumber'],
  spend: ['biaya', 'spend', 'cost', 'anggaran', 'budget'],
}

function colIndex(header: string[], field: string): number {
  const keys = ALIASES[field]
  const h = header.map(norm)
  for (const k of keys) {
    const i = h.indexOf(k)
    if (i >= 0) return i
  }
  return -1
}

export function parseNumber(raw: string): number | null {
  let s = raw.trim().replace(/rp\.?|rm/gi, '').replace(/\s/g, '')
  if (!s) return null
  const neg = s.startsWith('-')
  if (neg) s = s.slice(1)
  if (!/^[\d.,]+$/.test(s)) return null
  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  let dec = ''
  if (lastDot >= 0 && lastComma >= 0) {
    const sep = lastDot > lastComma ? '.' : ','
    const i = s.lastIndexOf(sep)
    dec = s.slice(i + 1)
    s = s.slice(0, i)
  } else {
    const sep = lastDot >= 0 ? '.' : lastComma >= 0 ? ',' : ''
    if (sep) {
      const parts = s.split(sep)
      const tail = parts[parts.length - 1]
      // satu pemisah dengan 3 angka di belakang = ribuan; selain itu desimal
      if (parts.length === 2 && tail.length !== 3) {
        dec = tail
        s = parts[0]
      }
    }
  }
  s = s.replace(/[.,]/g, '')
  if (!/^\d+$/.test(s) || !/^\d*$/.test(dec)) return null
  const n = Number(dec ? `${s}.${dec}` : s)
  return neg ? -n : n
}

export function parseDate(raw: string): string | null {
  const s = raw.trim()
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  let y: number, mo: number, d: number
  if (m) [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  else {
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
    if (!m) return null
    ;[d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])]
  }
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export interface ImportResult<K extends EntryKind> {
  rows: Omit<EntryOf<K>, 'id'>[]
  errors: string[]
  skipped: number
  missingColumns: string[]
}

const REQUIRED: Record<EntryKind, string[]> = {
  sales: ['date', 'amount'],
  menu: ['name', 'orders', 'revenue'],
  reviews: ['rating', 'text'],
  marketing: ['channel', 'spend', 'orders'],
}
const LABEL: Record<string, string> = {
  date: 'tanggal',
  amount: 'penjualan',
  orders: 'pesanan',
  name: 'nama menu',
  revenue: 'pendapatan',
  rating: 'rating',
  text: 'ulasan',
  channel: 'kanal',
  spend: 'biaya',
}

export const MAX_ROWS = 2000

/** Menerjemahkan baris CSV menjadi data aplikasi. Baris yang salah dilewati dan dilaporkan, tidak membatalkan sisanya. */
export function buildRows<K extends EntryKind>(
  kind: K,
  table: string[][],
  ctx: { stores: Store[]; defaultStoreId: string; existing: Entries },
): ImportResult<K> {
  const out: ImportResult<K> = { rows: [], errors: [], skipped: 0, missingColumns: [] }
  if (table.length < 2) {
    out.errors.push('File kosong atau hanya berisi judul kolom.')
    return out
  }
  const header = table[0]
  const idx: Record<string, number> = {}
  for (const f of Object.keys(ALIASES)) idx[f] = colIndex(header, f)
  // "pendapatan/omzet/total" bisa cocok untuk amount dan revenue; masing-masing dipakai sesuai jenis data
  out.missingColumns = REQUIRED[kind].filter((f) => idx[f] < 0).map((f) => LABEL[f])
  if (out.missingColumns.length) return out

  const body = table.slice(1, MAX_ROWS + 1)
  if (table.length - 1 > MAX_ROWS) out.errors.push(`Hanya ${MAX_ROWS} baris pertama yang dibaca.`)
  const seen = new Set(ctx.existing.sales.map((s) => `${s.date}|${s.storeId}`))
  const salesAgg = new Map<string, Omit<EntryOf<'sales'>, 'id'>>()
  const menuAgg = new Map<string, Omit<EntryOf<'menu'>, 'id'>>()
  const existingMenu = new Set(ctx.existing.menu.map((m) => norm(m.name)))
  const get = (r: string[], f: string) => (idx[f] >= 0 ? (r[idx[f]] ?? '').trim() : '')

  const findStore = (v: string): string | null => {
    if (!v) return ctx.defaultStoreId || null
    const n = norm(v)
    const s =
      ctx.stores.find((x) => norm(x.name) === n || (x.merchantId && norm(x.merchantId) === n)) ??
      ctx.stores.find((x) => {
        const m = norm(x.name)
        return m.length >= 4 && n.length >= 4 && (m.includes(n) || n.includes(m))
      })
    if (s) return s.id
    return ctx.stores.length === 1 ? ctx.stores[0].id : ctx.defaultStoreId || null
  }

  body.forEach((r, i) => {
    const line = i + 2
    const bad = (why: string) => {
      if (out.errors.length < 12) out.errors.push(`Baris ${line}: ${why}`)
      out.skipped++
    }
    if (kind === 'sales') {
      const date = parseDate(get(r, 'date'))
      const amount = parseNumber(get(r, 'amount'))
      const orders = idx.orders >= 0 ? parseNumber(get(r, 'orders')) : 0
      const storeId = findStore(get(r, 'store'))
      if (!date) return bad('tanggal tidak dikenali')
      if (amount === null || amount < 0) return bad('penjualan bukan angka')
      if (orders === null || orders < 0) return bad('jumlah pesanan bukan angka')
      if (!storeId) return bad(`toko "${get(r, 'store')}" tidak ada di Grab Stores`)
      const key = `${date}|${storeId}`
      if (seen.has(key)) return bad(`sudah ada penjualan toko ini pada ${date}`)
      const acc = salesAgg.get(key)
      if (acc) {
        acc.amount += amount
        acc.orders += orders
      } else salesAgg.set(key, { date, storeId, amount, orders })
    } else if (kind === 'menu') {
      const name = get(r, 'name').slice(0, 80)
      const orders = parseNumber(get(r, 'orders'))
      const revenue = parseNumber(get(r, 'revenue'))
      if (!name) return bad('nama menu kosong')
      if (orders === null || orders < 0) return bad('jumlah pesanan bukan angka')
      if (revenue === null || revenue < 0) return bad('pendapatan bukan angka')
      const k = norm(name)
      if (existingMenu.has(k)) return bad(`menu "${name}" sudah ada`)
      const acc = menuAgg.get(k)
      if (acc) {
        acc.orders += orders
        acc.revenue += revenue
      } else menuAgg.set(k, { name, orders, revenue })
    } else if (kind === 'reviews') {
      const rating = parseNumber(get(r, 'rating'))
      const text = get(r, 'text').slice(0, 500)
      const date = idx.date >= 0 ? parseDate(get(r, 'date')) : new Date().toISOString().slice(0, 10)
      const storeId = findStore(get(r, 'store'))
      if (rating === null || rating < 1 || rating > 5) return bad('rating harus 1 sampai 5')
      if (!text) return bad('isi ulasan kosong')
      if (!date) return bad('tanggal tidak dikenali')
      if (!storeId) return bad(`toko "${get(r, 'store')}" tidak ada di Grab Stores`)
      ;(out.rows as Omit<EntryOf<'reviews'>, 'id'>[]).push({ storeId, rating, text, date })
    } else {
      const channel = get(r, 'channel').slice(0, 60)
      const spend = parseNumber(get(r, 'spend'))
      const orders = parseNumber(get(r, 'orders'))
      if (!channel) return bad('kanal kosong')
      if (spend === null || spend < 0) return bad('biaya bukan angka')
      if (orders === null || orders < 0) return bad('jumlah pesanan bukan angka')
      ;(out.rows as Omit<EntryOf<'marketing'>, 'id'>[]).push({ channel, spend, orders })
    }
  })
  const r2 = (n: number) => Math.round(n * 100) / 100
  if (kind === 'sales') {
    out.rows = [...salesAgg.values()].map((x) => ({ ...x, amount: r2(x.amount) })) as ImportResult<K>['rows']
    if (idx.orders >= 0 && norm(header[idx.orders]) === 'unitssold')
      out.errors.unshift('Catatan: "Units Sold" adalah jumlah item terjual, bukan jumlah pesanan. Dipakai sebagai pesanan.')
    if (idx.orders < 0) out.errors.unshift('Catatan: file tanpa kolom pesanan, jumlah pesanan diisi 0.')
  } else if (kind === 'menu') {
    out.rows = [...menuAgg.values()].map((x) => ({ ...x, revenue: r2(x.revenue) })) as ImportResult<K>['rows']
  }
  return out
}
