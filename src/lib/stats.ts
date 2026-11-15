import type { Review, SaleEntry, Store } from '../types'
import { dayLabel, lastDays } from './format'

export interface DayPoint {
  date: string
  label: string
  sales: number
  orders: number
}

/** Penjualan per hari untuk n hari terakhir (hari tanpa data bernilai 0). */
export function salesSeries(sales: SaleEntry[], days: number, storeId?: string): DayPoint[] {
  const map = new Map<string, { sales: number; orders: number }>()
  for (const s of sales) {
    if (storeId && s.storeId !== storeId) continue
    const cur = map.get(s.date) ?? { sales: 0, orders: 0 }
    cur.sales += s.amount
    cur.orders += s.orders
    map.set(s.date, cur)
  }
  return lastDays(days).map((d) => ({ date: d, label: dayLabel(d), sales: map.get(d)?.sales ?? 0, orders: map.get(d)?.orders ?? 0 }))
}

export interface WeekPoint {
  label: string
  sales: number
}

/** Total per minggu untuk n minggu terakhir (minggu terakhir = 7 hari terakhir). */
export function weeklySeries(sales: SaleEntry[], weeks: number): WeekPoint[] {
  const days = salesSeries(sales, weeks * 7)
  const out: WeekPoint[] = []
  for (let i = 0; i < weeks; i++) {
    const chunk = days.slice(i * 7, i * 7 + 7)
    out.push({ label: dayLabel(chunk[0].date), sales: chunk.reduce((a, b) => a + b.sales, 0) })
  }
  return out
}

export interface StoreTotal {
  store: Store
  sales: number
  orders: number
  avgRating: number | null
  reviewCount: number
}

export function storeTotals(stores: Store[], sales: SaleEntry[], reviews: Review[], days: number): StoreTotal[] {
  const from = lastDays(days)[0]
  return stores.map((store) => {
    const ss = sales.filter((s) => s.storeId === store.id && s.date >= from)
    const rr = reviews.filter((r) => r.storeId === store.id)
    return {
      store,
      sales: ss.reduce((a, b) => a + b.amount, 0),
      orders: ss.reduce((a, b) => a + b.orders, 0),
      avgRating: rr.length ? rr.reduce((a, b) => a + b.rating, 0) / rr.length : null,
      reviewCount: rr.length,
    }
  })
}
