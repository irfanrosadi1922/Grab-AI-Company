import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, ListChecks, Plus, ShieldCheck, Store } from 'lucide-react'
import { Avatar, Button, Card, CardHeader, EmptyState, PriorityBadge, Select, Stat, StatusBadge } from '../components/ui'
import { AddEntryModal } from '../components/EntryModal'
import { useApp } from '../state/AppState'
import { EMPLOYEES, EMP } from '../data/employees'
import { salesSeries, storeTotals } from '../lib/stats'
import { workState } from '../lib/work'
import { rupiah, rupiahShort } from '../lib/format'

export default function Dashboard() {
  const { tasks, approvals, stores, entries, settings } = useApp()
  const [range, setRange] = useState('30')
  const [adding, setAdding] = useState(false)
  const days = Number(range)
  const series = useMemo(() => salesSeries(entries.sales, days), [entries.sales, days])
  const total = series.reduce((a, b) => a + b.sales, 0)
  const totals = useMemo(() => storeTotals(stores, entries.sales, entries.reviews, days), [stores, entries, days])
  const hasSales = series.some((p) => p.sales > 0)

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
  const maxStore = Math.max(1, ...totals.map((s) => s.sales))

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
            aside={
              <Select aria-label="Rentang waktu" value={range} onChange={(e) => setRange(e.target.value)} className="h-8 w-28 text-xs">
                <option value="7">7 hari</option>
                <option value="30">30 hari</option>
                <option value="90">90 hari</option>
              </Select>
            }
          />
          {!hasSales ? (
            <EmptyState
              title="Belum ada data penjualan"
              desc="Catat penjualan harian Anda. Grafik dan performa toko akan muncul di sini."
              action={
                <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
                  Tambah penjualan
                </Button>
              }
            />
          ) : (
            <div className="px-4 pb-4 pt-2 sm:px-5">
              <p className="tabular text-2xl font-bold tracking-tight">{rupiah(total)}</p>
              <p className="text-xs text-mute">Total {range} hari terakhir dari data yang Anda catat</p>
              <div className="mt-3 h-56 sm:h-64" role="img" aria-label="Grafik penjualan harian">
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
          )}
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Aktivitas karyawan AI"
            aside={
              <Link to="/employees" className="text-xs font-medium text-brand hover:underline">
                Lihat semua
              </Link>
            }
          />
          <ul className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {EMPLOYEES.map((e) => {
              const st = workState(e.id, tasks, settings.employeeEnabled[e.id])
              return (
                <li key={e.id}>
                  <Link to={`/employees?open=${e.id}`} className="flex items-center gap-3 rounded-ctl px-2 py-2 hover:bg-raised">
                    <Avatar id={e.id} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{e.name}</span>
                      <span className="block truncate text-xs text-mute">{e.short}</span>
                    </span>
                    <span className={'h-2 w-2 rounded-full ' + (st === 'Bekerja' ? 'bg-brand' : st === 'Siaga' ? 'bg-warn' : 'bg-mute')} title={st} />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Performa toko" />
          {stores.length === 0 ? (
            <EmptyState
              title="Belum ada toko"
              desc="Tambahkan toko untuk melihat perbandingannya."
              action={
                <Link to="/stores">
                  <Button variant="primary">Ke Grab Stores</Button>
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3 p-4 sm:p-5">
              {totals.map((t) => (
                <li key={t.store.id}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="truncate font-medium">{t.store.name}</span>
                    <span className="tabular text-mute">{t.sales > 0 ? rupiahShort(t.sales) : '-'}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-raised">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(t.sales / maxStore) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
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
          {pendingTasks.length === 0 ? (
            <EmptyState title="Tidak ada tugas menunggu" />
          ) : (
            <ul className="divide-y divide-line">
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
          )}
        </Card>

        <Card>
          <CardHeader title="Aktivitas terbaru" />
          {recent.length === 0 ? (
            <EmptyState title="Belum ada aktivitas" desc="Aktivitas muncul saat tugas dibuat atau diubah." />
          ) : (
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
          )}
        </Card>
      </div>

      <AddEntryModal kind="sales" open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
