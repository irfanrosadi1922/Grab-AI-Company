import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Plus, Star, Trash2 } from 'lucide-react'
import { Button, Card, CardHeader, EmptyState, IconButton, Notice, PageHeader, Select, Tabs } from '../components/ui'
import { AddEntryModal, ENTRY_TITLE } from '../components/EntryModal'
import { ConfirmDialog } from '../components/Overlays'
import { useApp } from '../state/AppState'
import { salesSeries, storeTotals, weeklySeries } from '../lib/stats'
import { rupiah, rupiahShort } from '../lib/format'
import type { EntryKind } from '../types'

type Tab = 'sales' | 'orders' | 'menu' | 'stores' | 'reviews' | 'marketing' | 'trend'

const axis = { fill: '#8a9992', fontSize: 11 }
const tip = { background: '#192120', border: '1px solid #28342f', borderRadius: 10, fontSize: 12 }

function ChartBox({ children, label }: { children: React.ReactElement; label: string }) {
  return (
    <div className="h-64 sm:h-72" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

const KIND_OF: Partial<Record<Tab, EntryKind>> = { sales: 'sales', orders: 'sales', menu: 'menu', reviews: 'reviews', marketing: 'marketing' }

export default function Analytics() {
  const { stores, entries, removeEntry, toast } = useApp()
  const [tab, setTab] = useState<Tab>('sales')
  const [days, setDays] = useState('30')
  const [adding, setAdding] = useState<EntryKind | null>(null)
  const [del, setDel] = useState<{ kind: EntryKind; id: string; label: string } | null>(null)

  const series = useMemo(() => salesSeries(entries.sales, Number(days)), [entries.sales, Number(days)])
  const weekly = useMemo(() => weeklySeries(entries.sales, 12), [entries.sales])
  const totals = useMemo(() => storeTotals(stores, entries.sales, entries.reviews, Number(days)), [stores, entries, days])
  const storeName = (id: string) => stores.find((s) => s.id === id)?.name ?? 'Toko dihapus'
  const hasSales = entries.sales.length > 0
  const kind = KIND_OF[tab]
  const menuSorted = [...entries.menu].sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)
  const avg = entries.reviews.length ? entries.reviews.reduce((a, b) => a + b.rating, 0) / entries.reviews.length : null

  const addBtn = (k: EntryKind) => (
    <Button variant="primary" icon={Plus} onClick={() => setAdding(k)}>
      {ENTRY_TITLE[k]}
    </Button>
  )

  const noSales = (
    <Card>
      <EmptyState title="Belum ada data penjualan" desc="Catat penjualan harian untuk melihat grafik di sini." action={addBtn('sales')} />
    </Card>
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics"
        desc="Analisis dari data yang Anda catat sendiri."
        actions={
          <>
            {tab !== 'trend' && tab !== 'stores' && kind && addBtn(kind)}
            <Select aria-label="Periode" value={days} onChange={(e) => setDays(e.target.value)} className="w-32">
              <option value="7">7 hari</option>
              <option value="14">14 hari</option>
              <option value="30">30 hari</option>
              <option value="90">90 hari</option>
            </Select>
          </>
        }
      />
      <Notice tone="info">
        Semua angka berasal dari data yang Anda input. Belum ada sinkronisasi otomatis dari GrabMerchant.
      </Notice>
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { id: 'sales', label: 'Penjualan' },
          { id: 'orders', label: 'Pesanan' },
          { id: 'menu', label: 'Menu', count: entries.menu.length },
          { id: 'stores', label: 'Perbandingan toko' },
          { id: 'reviews', label: 'Ulasan', count: entries.reviews.length },
          { id: 'marketing', label: 'Pemasaran', count: entries.marketing.length },
          { id: 'trend', label: 'Tren' },
        ]}
      />

      {tab === 'sales' &&
        (!hasSales ? (
          noSales
        ) : (
          <>
            <Card>
              <CardHeader title="Penjualan harian" />
              <div className="p-4 sm:p-5">
                <ChartBox label="Grafik garis penjualan harian">
                  <LineChart data={series}>
                    <CartesianGrid stroke="#28342f" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={axis} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => rupiahShort(v)} />
                    <Tooltip contentStyle={tip} formatter={(v: number) => [rupiah(v), 'Penjualan']} />
                    <Line type="monotone" dataKey="sales" stroke="#00b14f" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartBox>
              </div>
            </Card>
            <Card>
              <CardHeader title="Catatan penjualan" />
              <ul className="divide-y divide-line">
                {[...entries.sales]
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .slice(0, 30)
                  .map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                      <div className="min-w-0">
                        <p className="tabular text-[13px] font-medium">{rupiah(s.amount)}</p>
                        <p className="truncate text-xs text-mute">
                          {s.date} · {storeName(s.storeId)} · {s.orders} pesanan
                        </p>
                      </div>
                      <IconButton icon={Trash2} label="Hapus catatan" onClick={() => setDel({ kind: 'sales', id: s.id, label: `${s.date}, ${rupiah(s.amount)}` })} />
                    </li>
                  ))}
              </ul>
            </Card>
          </>
        ))}

      {tab === 'orders' &&
        (!hasSales ? (
          noSales
        ) : (
          <Card>
            <CardHeader title="Pesanan per hari" />
            <div className="p-4 sm:p-5">
              <ChartBox label="Grafik batang jumlah pesanan harian">
                <BarChart data={series}>
                  <CartesianGrid stroke="#28342f" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tick={axis} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                  <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v: number) => [v, 'Pesanan']} />
                  <Bar dataKey="orders" fill="#00b14f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartBox>
            </div>
          </Card>
        ))}

      {tab === 'menu' && (
        <Card className="overflow-hidden">
          <CardHeader title="Performa menu" />
          {menuSorted.length === 0 ? (
            <EmptyState title="Belum ada data menu" desc="Tambahkan menu beserta jumlah pesanan dan pendapatannya." action={addBtn('menu')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="mt-3 w-full min-w-[460px] text-[13px]">
                <thead className="text-left text-xs text-mute">
                  <tr className="border-b border-line">
                    <th className="px-5 py-2 font-medium">Menu</th>
                    <th className="px-3 py-2 text-right font-medium">Pesanan</th>
                    <th className="px-3 py-2 text-right font-medium">Pendapatan</th>
                    <th className="w-12 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {menuSorted.map((m) => (
                    <tr key={m.id}>
                      <td className="px-5 py-3 font-medium">{m.name}</td>
                      <td className="tabular px-3 py-3 text-right">{m.orders}</td>
                      <td className="tabular px-3 py-3 text-right">{rupiah(m.revenue)}</td>
                      <td className="px-3 py-1 text-right">
                        <IconButton icon={Trash2} label="Hapus menu" onClick={() => setDel({ kind: 'menu', id: m.id, label: m.name })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'stores' && (
        <Card>
          <CardHeader title={`Penjualan per toko, ${days} hari terakhir`} />
          {stores.length === 0 || !hasSales ? (
            <EmptyState title="Belum ada data untuk dibandingkan" desc="Tambahkan toko dan catat penjualannya." action={stores.length ? addBtn('sales') : undefined} />
          ) : (
            <div className="p-4 sm:p-5">
              <ChartBox label="Grafik batang perbandingan penjualan antar toko">
                <BarChart data={totals.map((t) => ({ name: t.store.name, sales: t.sales }))}>
                  <CartesianGrid stroke="#28342f" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} />
                  <YAxis tick={axis} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => rupiahShort(v)} />
                  <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v: number) => [rupiah(v), 'Penjualan']} />
                  <Bar dataKey="sales" fill="#00b14f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartBox>
            </div>
          )}
        </Card>
      )}

      {tab === 'reviews' && (
        <Card>
          <CardHeader
            title="Ulasan pelanggan"
            aside={avg !== null ? <span className="tabular text-xs text-mute">Rata-rata {avg.toFixed(1)} dari {entries.reviews.length} ulasan</span> : undefined}
          />
          {entries.reviews.length === 0 ? (
            <EmptyState title="Belum ada ulasan" desc="Catat ulasan pelanggan agar William bisa membantu menyiapkan balasan." action={addBtn('reviews')} />
          ) : (
            <ul className="divide-y divide-line">
              {[...entries.reviews]
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((r) => (
                  <li key={r.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                    <span className="flex shrink-0 items-center gap-1 text-warn">
                      <Star size={14} fill="currentColor" aria-hidden />
                      <span className="tabular text-[13px] font-semibold">{r.rating}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px]">{r.text}</p>
                      <p className="text-xs text-mute">
                        {r.date} · {storeName(r.storeId)}
                      </p>
                    </div>
                    <IconButton icon={Trash2} label="Hapus ulasan" onClick={() => setDel({ kind: 'reviews', id: r.id, label: r.text.slice(0, 40) })} />
                  </li>
                ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'marketing' && (
        <Card className="overflow-hidden">
          <CardHeader title="Performa pemasaran" />
          {entries.marketing.length === 0 ? (
            <EmptyState title="Belum ada data pemasaran" desc="Catat biaya dan pesanan per kanal." action={addBtn('marketing')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="mt-3 w-full min-w-[480px] text-[13px]">
                <thead className="text-left text-xs text-mute">
                  <tr className="border-b border-line">
                    <th className="px-5 py-2 font-medium">Kanal</th>
                    <th className="px-3 py-2 text-right font-medium">Biaya</th>
                    <th className="px-3 py-2 text-right font-medium">Pesanan</th>
                    <th className="px-3 py-2 text-right font-medium">Biaya/pesanan</th>
                    <th className="w-12 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {entries.marketing.map((m) => (
                    <tr key={m.id}>
                      <td className="px-5 py-3 font-medium">{m.channel}</td>
                      <td className="tabular px-3 py-3 text-right">{rupiah(m.spend)}</td>
                      <td className="tabular px-3 py-3 text-right">{m.orders}</td>
                      <td className="tabular px-3 py-3 text-right">{m.orders > 0 ? rupiah(m.spend / m.orders) : '-'}</td>
                      <td className="px-3 py-1 text-right">
                        <IconButton icon={Trash2} label="Hapus data" onClick={() => setDel({ kind: 'marketing', id: m.id, label: m.channel })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'trend' &&
        (!hasSales ? (
          noSales
        ) : (
          <Card>
            <CardHeader title="Tren mingguan, 12 minggu" />
            <div className="p-4 sm:p-5">
              <ChartBox label="Grafik garis tren penjualan mingguan">
                <LineChart data={weekly}>
                  <CartesianGrid stroke="#28342f" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={20} />
                  <YAxis tick={axis} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => rupiahShort(v)} />
                  <Tooltip contentStyle={tip} formatter={(v: number) => [rupiah(v), 'Penjualan']} />
                  <Line type="monotone" dataKey="sales" stroke="#00b14f" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ChartBox>
            </div>
          </Card>
        ))}

      {adding && <AddEntryModal kind={adding} open onClose={() => setAdding(null)} />}
      <ConfirmDialog
        open={del !== null}
        onClose={() => setDel(null)}
        title="Hapus data ini?"
        desc={`"${del?.label ?? ''}" akan dihapus permanen.`}
        confirmLabel="Hapus"
        danger
        onConfirm={() => {
          if (del) removeEntry(del.kind, del.id)
          toast('Data dihapus.', 'info')
        }}
      />
    </div>
  )
}
