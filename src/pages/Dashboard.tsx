import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, ListChecks, ShieldCheck, Store } from 'lucide-react'
import { Avatar, Badge, Card, CardHeader, DemoTag, PriorityBadge, Select, Stat, StatusBadge } from '../components/ui'
import { useApp } from '../state/AppState'
import { EMPLOYEES, EMP } from '../data/employees'
import { demoSeries } from '../data/seed'
import { rupiah, rupiahShort } from '../lib/format'

const RANGES = [
  { v: '7', label: '7 hari' },
  { v: '30', label: '30 hari' },
  { v: '90', label: '90 hari' },
]

export default function Dashboard() {
  const { tasks, approvals, stores, settings } = useApp()
  const [range, setRange] = useState('30')
  const series = useMemo(() => demoSeries(Number(range)), [range])
  const total = series.reduce((a, b) => a + b.sales, 0)

  const active = tasks.filter((t) => ['Assigned', 'In Progress', 'Review'].includes(t.status)).length
  const done = tasks.filter((t) => t.status === 'Completed').length
  const pendingApprovals = approvals.filter((a) => !a.decision).length
  const pendingTasks = tasks.filter((t) => ['Pending', 'Assigned', 'Requires Approval'].includes(t.status)).slice(0, 5)
  const recent = [...tasks]
    .flatMap((t) => t.history.map((h) => ({ ...h, who: t.assignee, task: t.title })))
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 5)

  const hour = new Date().getHours()
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam'
  const maxStore = Math.max(1, ...stores.map((s) => s.demoSales))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {greet}, {settings.ceoName}
        </h1>
        <p className="mt-1 text-sm text-mute">
          {pendingApprovals > 0
            ? `${pendingApprovals} keputusan menunggu persetujuan Anda.`
            : 'Tidak ada keputusan yang menunggu persetujuan.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Total toko" value={stores.length} note={`${stores.filter((s) => s.open).length} buka`} icon={Store} />
        <Stat label="Tugas aktif" value={active} note="Assigned, In Progress, Review" icon={ListChecks} />
        <Stat label="Tugas selesai" value={done} note="Seluruh waktu" icon={CheckCircle2} />
        <Stat label="Menunggu persetujuan" value={pendingApprovals} note="Butuh keputusan CEO" icon={ShieldCheck} />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader
            title="Ringkasan penjualan"
            demo
            aside={
              <Select aria-label="Rentang waktu" value={range} onChange={(e) => setRange(e.target.value)} className="h-8 w-28 text-xs">
                {RANGES.map((r) => (
                  <option key={r.v} value={r.v}>
                    {r.label}
                  </option>
                ))}
              </Select>
            }
          />
          <div className="px-4 pb-4 pt-2 sm:px-5">
            <p className="tabular text-2xl font-bold tracking-tight">{rupiah(total)}</p>
            <p className="text-xs text-mute">Total dalam {range} hari terakhir (data contoh)</p>
            <div className="mt-3 h-56 sm:h-64" role="img" aria-label="Grafik penjualan harian, data demo">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00b14f" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#00b14f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#28342f" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#8a9992', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis tick={{ fill: '#8a9992', fontSize: 11 }} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => rupiahShort(v)} />
                  <Tooltip
                    contentStyle={{ background: '#192120', border: '1px solid #28342f', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number) => [rupiah(v), 'Penjualan']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#00b14f" strokeWidth={2} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Aktivitas karyawan AI"
            demo
            aside={
              <Link to="/employees" className="text-xs font-medium text-brand hover:underline">
                Lihat semua
              </Link>
            }
          />
          <ul className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {EMPLOYEES.map((e) => (
              <li key={e.id}>
                <Link to={`/employees?open=${e.id}`} className="flex items-center gap-3 rounded-ctl px-2 py-2 hover:bg-raised">
                  <Avatar id={e.id} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{e.name}</span>
                    <span className="block truncate text-xs text-mute">{e.short}</span>
                  </span>
                  <span
                    className={
                      'h-2 w-2 rounded-full ' +
                      (e.state === 'Bekerja' ? 'bg-brand' : e.state === 'Dalam rapat' ? 'bg-info' : e.state === 'Siaga' ? 'bg-warn' : 'bg-mute')
                    }
                    title={e.state}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Performa toko" demo />
          <ul className="space-y-3 p-4 sm:p-5">
            {stores.map((s) => (
              <li key={s.id}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="truncate font-medium">{s.name}</span>
                  <span className="tabular text-mute">{rupiahShort(s.demoSales)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-raised">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(s.demoSales / maxStore) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Tugas menunggu"
            aside={
              <Link to="/tasks" className="text-xs font-medium text-brand hover:underline">
                Task Center
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {pendingTasks.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-mute">Tidak ada tugas menunggu.</li>}
            {pendingTasks.map((t) => (
              <li key={t.id}>
                <Link to={`/tasks?open=${t.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-raised/60 sm:px-5">
                  <Avatar id={t.assignee} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{t.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={t.status} />
                      <PriorityBadge p={t.priority} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Aktivitas terbaru" />
          <ul className="divide-y divide-line">
            {recent.map((r, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <Avatar id={r.who} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px]">
                    <span className="font-semibold">{EMP[r.who].name}</span> · {r.text}
                  </p>
                  <p className="truncate text-xs text-mute">
                    {r.task} · {r.at}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="flex items-center gap-2 text-xs text-mute">
        <DemoTag /> Penjualan, grafik, dan performa toko memakai data contoh sampai GrabMerchant terhubung.
        <Badge tone="neutral" className="hidden sm:inline-flex">
          Tugas dan persetujuan berasal dari data lokal Anda
        </Badge>
      </p>
    </div>
  )
}
