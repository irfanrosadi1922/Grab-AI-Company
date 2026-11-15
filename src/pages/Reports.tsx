import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, Field, PageHeader, Select } from '../components/ui'
import { useApp } from '../state/AppState'
import { downloadBlob, lastDays, rupiah } from '../lib/format'
import { storeTotals } from '../lib/stats'
import { EMP } from '../data/employees'

type Kind = 'sales' | 'menu' | 'stores' | 'tasks' | 'marketing'
const KINDS: { id: Kind; label: string; desc: string }[] = [
  { id: 'sales', label: 'Penjualan', desc: 'Catatan penjualan yang Anda input pada periode terpilih.' },
  { id: 'menu', label: 'Performa menu', desc: 'Pesanan dan pendapatan per menu.' },
  { id: 'stores', label: 'Perbandingan toko', desc: 'Penjualan, pesanan, dan rating tiap toko pada periode terpilih.' },
  { id: 'marketing', label: 'Pemasaran', desc: 'Biaya, pesanan, dan biaya per pesanan tiap kanal.' },
  { id: 'tasks', label: 'Tugas karyawan AI', desc: 'Seluruh tugas, status, dan tenggat.' },
]

export default function Reports() {
  const { stores, tasks, entries } = useApp()
  const [kind, setKind] = useState<Kind>('sales')
  const [days, setDays] = useState('30')
  const [rows, setRows] = useState<string[][] | null>(null)
  const [title, setTitle] = useState('')

  const build = () => {
    let head: string[] = []
    let body: string[][] = []
    const storeName = (id: string) => stores.find((s) => s.id === id)?.name ?? 'Toko dihapus'
    if (kind === 'sales') {
      const from = lastDays(Number(days))[0]
      head = ['Tanggal', 'Toko', 'Penjualan (Rp)', 'Pesanan']
      body = entries.sales
        .filter((s) => s.date >= from)
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((s) => [s.date, storeName(s.storeId), String(s.amount), String(s.orders)])
    } else if (kind === 'menu') {
      head = ['Menu', 'Pesanan', 'Pendapatan (Rp)']
      body = [...entries.menu].sort((a, b) => b.revenue - a.revenue).map((m) => [m.name, String(m.orders), String(m.revenue)])
    } else if (kind === 'stores') {
      head = ['Toko', 'Kota', 'Koneksi', 'Penjualan (Rp)', 'Pesanan', 'Rating rata-rata']
      body = storeTotals(stores, entries.sales, entries.reviews, Number(days)).map((t) => [
        t.store.name,
        t.store.city,
        t.store.connection,
        String(t.sales),
        String(t.orders),
        t.avgRating != null ? t.avgRating.toFixed(1) : '-',
      ])
    } else if (kind === 'marketing') {
      head = ['Kanal', 'Biaya (Rp)', 'Pesanan', 'Biaya per pesanan (Rp)']
      body = entries.marketing.map((m) => [m.channel, String(m.spend), String(m.orders), m.orders > 0 ? String(Math.round(m.spend / m.orders)) : '-'])
    } else {
      head = ['ID', 'Judul', 'Karyawan', 'Prioritas', 'Status', 'Tenggat']
      body = tasks.map((t) => [t.id, t.title, EMP[t.assignee].name, t.priority, t.status, t.deadline])
    }
    setRows([head, ...body])
    setTitle(KINDS.find((k) => k.id === kind)!.label)
  }

  const csv = () => {
    if (!rows) return
    const esc = (c: string) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)
    downloadBlob(`laporan-${kind}.csv`, rows.map((r) => r.map(esc).join(',')).join('\n'), 'text/csv;charset=utf-8')
  }

  const cur = KINDS.find((k) => k.id === kind)!
  const usesPeriod = kind === 'sales' || kind === 'stores'

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" desc="Susun laporan dari data Anda dan unduh sebagai CSV." />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader title="Buat laporan" />
          <div className="space-y-4 p-4">
            <Field label="Jenis laporan">
              <Select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as Kind)
                  setRows(null)
                }}
              >
                {KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="text-xs text-mute">{cur.desc}</p>
            {usesPeriod && (
              <Field label="Periode">
                <Select value={days} onChange={(e) => setDays(e.target.value)}>
                  <option value="7">7 hari</option>
                  <option value="30">30 hari</option>
                  <option value="90">90 hari</option>
                </Select>
              </Field>
            )}
            <Button variant="primary" icon={FileText} className="w-full" onClick={build}>
              Buat laporan
            </Button>
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader
            title={rows ? title : 'Pratinjau'}
            aside={
              rows && rows.length > 1 ? (
                <Button size="sm" variant="primary" icon={Download} onClick={csv}>
                  Unduh CSV
                </Button>
              ) : undefined
            }
          />
          {!rows ? (
            <EmptyState title="Belum ada laporan" desc="Pilih jenis laporan lalu tekan Buat laporan." />
          ) : rows.length === 1 ? (
            <EmptyState title="Tidak ada data" desc="Belum ada data untuk laporan ini. Isi dulu di Analytics, Grab Stores, atau Task Center." />
          ) : (
            <>
              <div className="mt-3 max-h-[480px] overflow-auto">
                <table className="w-full min-w-[480px] text-[13px]">
                  <thead className="sticky top-0 bg-surface text-left text-xs text-mute">
                    <tr className="border-b border-line">
                      {rows[0].map((h) => (
                        <th key={h} className="px-4 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.slice(1).map((r, i) => (
                      <tr key={i}>
                        {r.map((c, j) => (
                          <td key={j} className="tabular px-4 py-2.5">
                            {/^\d{6,}$/.test(c) ? rupiah(Number(c)) : c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-xs text-mute">
                <Badge>{rows.length - 1} baris</Badge>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
