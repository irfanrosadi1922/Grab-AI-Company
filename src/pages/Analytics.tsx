import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Star } from 'lucide-react'
import { Badge, Card, CardHeader, DemoTag, Notice, PageHeader, Select, Tabs } from '../components/ui'
import { MARKETING_DEMO, MENU_DEMO, REVIEWS_DEMO, demoSeries } from '../data/seed'
import { useApp } from '../state/AppState'
import { rupiah, rupiahShort } from '../lib/format'

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

function Trend({ v }: { v: number }) {
  return <Badge tone={v >= 0 ? 'brand' : 'danger'}>{(v >= 0 ? '+' : '') + v}%</Badge>
}

export default function Analytics() {
  const { stores } = useApp()
  const [tab, setTab] = useState<Tab>('sales')
  const [days, setDays] = useState('30')
  const series = useMemo(() => demoSeries(Number(days)), [days])
  const weekly = useMemo(() => {
    const s = demoSeries(84)
    const out: { label: string; sales: number }[] = []
    for (let i = 0; i < 12; i++) {
      const chunk = s.slice(i * 7, i * 7 + 7)
      out.push({ label: 'M' + (i + 1), sales: chunk.reduce((a, b) => a + b.sales, 0) })
    }
    return out
  }, [])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics"
        desc="Analisis penjualan, pesanan, menu, toko, ulasan, dan pemasaran."
        actions={
          <Select aria-label="Periode" value={days} onChange={(e) => setDays(e.target.value)} className="w-32">
            <option value="7">7 hari</option>
            <option value="14">14 hari</option>
            <option value="30">30 hari</option>
          </Select>
        }
      />
      <Notice>Seluruh angka dan grafik di halaman ini adalah data contoh (DEMO). Integrasi GrabMerchant belum terhubung, jadi belum ada data penjualan nyata.</Notice>
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { id: 'sales', label: 'Penjualan' },
          { id: 'orders', label: 'Pesanan' },
          { id: 'menu', label: 'Menu' },
          { id: 'stores', label: 'Perbandingan toko' },
          { id: 'reviews', label: 'Ulasan' },
          { id: 'marketing', label: 'Pemasaran' },
          { id: 'trend', label: 'Tren' },
        ]}
      />

      {tab === 'sales' && (
        <Card>
          <CardHeader title="Penjualan harian" demo />
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
      )}

      {tab === 'orders' && (
        <Card>
          <CardHeader title="Pesanan per hari" demo />
          <div className="p-4 sm:p-5">
            <ChartBox label="Grafik batang jumlah pesanan harian">
              <BarChart data={series}>
                <CartesianGrid stroke="#28342f" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={axis} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v: number) => [v, 'Pesanan']} />
                <Bar dataKey="orders" fill="#00b14f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartBox>
          </div>
        </Card>
      )}

      {tab === 'menu' && (
        <Card className="overflow-hidden">
          <CardHeader title="Performa menu" demo />
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[480px] text-[13px]">
              <thead className="text-left text-xs text-mute">
                <tr className="border-b border-line">
                  <th className="px-5 py-2 font-medium">Menu</th>
                  <th className="px-3 py-2 text-right font-medium">Pesanan</th>
                  <th className="px-3 py-2 text-right font-medium">Pendapatan</th>
                  <th className="px-5 py-2 text-right font-medium">Tren</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {MENU_DEMO.map((m) => (
                  <tr key={m.name}>
                    <td className="px-5 py-3 font-medium">{m.name}</td>
                    <td className="tabular px-3 py-3 text-right">{m.orders}</td>
                    <td className="tabular px-3 py-3 text-right">{rupiah(m.revenue)}</td>
                    <td className="px-5 py-3 text-right">
                      <Trend v={m.trend} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'stores' && (
        <Card>
          <CardHeader title="Penjualan per toko" demo />
          <div className="p-4 sm:p-5">
            <ChartBox label="Grafik batang perbandingan penjualan antar toko">
              <BarChart data={stores.map((s) => ({ name: s.name, sales: s.demoSales }))}>
                <CartesianGrid stroke="#28342f" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} />
                <YAxis tick={axis} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => rupiahShort(v)} />
                <Tooltip contentStyle={tip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v: number) => [rupiah(v), 'Penjualan']} />
                <Bar dataKey="sales" fill="#00b14f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartBox>
          </div>
        </Card>
      )}

      {tab === 'reviews' && (
        <Card>
          <CardHeader title="Ulasan pelanggan" demo />
          <ul className="divide-y divide-line">
            {REVIEWS_DEMO.map((r, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <span className="flex shrink-0 items-center gap-1 text-warn">
                  <Star size={14} fill="currentColor" aria-hidden />
                  <span className="tabular text-[13px] font-semibold">{r.rating}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-[13px]">{r.text}</p>
                  <p className="text-xs text-mute">
                    {r.who} · {r.store}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'marketing' && (
        <Card className="overflow-hidden">
          <CardHeader title="Performa pemasaran" demo />
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[460px] text-[13px]">
              <thead className="text-left text-xs text-mute">
                <tr className="border-b border-line">
                  <th className="px-5 py-2 font-medium">Kanal</th>
                  <th className="px-3 py-2 text-right font-medium">Biaya</th>
                  <th className="px-3 py-2 text-right font-medium">Pesanan</th>
                  <th className="px-5 py-2 text-right font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {MARKETING_DEMO.map((m) => (
                  <tr key={m.channel}>
                    <td className="px-5 py-3 font-medium">{m.channel}</td>
                    <td className="tabular px-3 py-3 text-right">{rupiah(m.spend)}</td>
                    <td className="tabular px-3 py-3 text-right">{m.orders}</td>
                    <td className="tabular px-5 py-3 text-right">{m.roas.toFixed(1)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'trend' && (
        <Card>
          <CardHeader title="Tren mingguan, 12 minggu" demo />
          <div className="p-4 sm:p-5">
            <ChartBox label="Grafik garis tren penjualan mingguan">
              <LineChart data={weekly}>
                <CartesianGrid stroke="#28342f" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
                <YAxis tick={axis} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => rupiahShort(v)} />
                <Tooltip contentStyle={tip} formatter={(v: number) => [rupiah(v), 'Penjualan']} />
                <Line type="monotone" dataKey="sales" stroke="#00b14f" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ChartBox>
          </div>
        </Card>
      )}
      <p className="flex items-center gap-2 text-xs text-mute">
        <DemoTag /> Data contoh dihasilkan secara deterministik, bukan angka acak dan bukan data nyata.
      </p>
    </div>
  )
}
