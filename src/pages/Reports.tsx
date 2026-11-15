import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { Badge, Button, Card, CardHeader, DemoTag, EmptyState, Field, Notice, PageHeader, Select } from '../components/ui'
import { useApp } from '../state/AppState'
import { MARKETING_DEMO, MENU_DEMO, demoSeries } from '../data/seed'
import { downloadBlob, rupiah } from '../lib/format'
import { EMP } from '../data/employees'

type Kind = 'sales' | 'menu' | 'stores' | 'tasks' | 'marketing'
const KINDS: { id: Kind; label: string; desc: string; demo: boolean }[] = [
  { id: 'sales', label: 'Penjualan harian', desc: 'Penjualan dan jumlah pesanan per hari.', demo: true },
  { id: 'menu', label: 'Performa menu', desc: 'Pesanan dan pendapatan per menu.', demo: true },
  { id: 'stores', label: 'Perbandingan toko', desc: 'Penjualan, pesanan, dan rating tiap toko.', demo: true },
  { id: 'marketing', label: 'Pemasaran', desc: 'Biaya, pesanan, dan ROAS per kanal.', demo: true },
  { id: 'tasks', label: 'Tugas karyawan AI', desc: 'Seluruh tugas, status, dan tenggat.', demo: false },
]

export default function Reports() {
  const { stores, tasks } = useApp()
  const [kind, setKind] = useState<Kind>('sales')
  const [days, setDays] = useState('30')
  const [rows, setRows] = useState<string[][] | null>(null)
  const [title, setTitle] = useState('')

  const build = () => {
    let head: string[] = []
    let body: string[][] = []
    if (kind === 'sales') {
      head = ['Tanggal', 'Penjualan (Rp)', 'Pesanan']
      body = demoSeries(Number(days)).map((r) => [r.label, String(r.sales), String(r.orders)])
    } else if (kind === 'menu') {
      head = ['Menu', 'Pesanan', 'Pendapatan (Rp)', 'Tren (%)']
      body = MENU_DEMO.map((m) => [m.name, String(m.orders), String(m.revenue), String(m.trend)])
    } else if (kind === 'stores') {
      head = ['Toko', 'Kota', 'Koneksi', 'Penjualan (Rp)', 'Pesanan', 'Rating']
      body = stores.map((s) => [s.name, s.city, s.connection, String(s.demoSales), String(s.demoOrders), String(s.demoRating)])
    } else if (kind === 'marketing') {
      head = ['Kanal', 'Biaya (Rp)', 'Pesanan', 'ROAS']
      body = MARKETING_DEMO.map((m) => [m.channel, String(m.spend), String(m.orders), String(m.roas)])
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
    const demo = KINDS.find((k) => k.id === kind)!.demo
    const text = (demo ? '# DATA DEMO, bukan data nyata\n' : '') + rows.map((r) => r.map(esc).join(',')).join('\n')
    downloadBlob(`laporan-${kind}.csv`, text, 'text/csv;charset=utf-8')
  }

  const cur = KINDS.find((k) => k.id === kind)!

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" desc="Susun laporan dari data yang tersedia dan unduh sebagai CSV." />
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
            {kind === 'sales' && (
              <Field label="Periode">
                <Select value={days} onChange={(e) => setDays(e.target.value)}>
                  <option value="7">7 hari</option>
                  <option value="30">30 hari</option>
                  <option value="90">90 hari</option>
                </Select>
              </Field>
            )}
            {cur.demo && <Notice>Laporan ini berisi data contoh (DEMO).</Notice>}
            <Button variant="primary" icon={FileText} className="w-full" onClick={build}>
              Buat laporan
            </Button>
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader
            title={rows ? title : 'Pratinjau'}
            demo={rows ? cur.demo : false}
            aside={
              rows && (
                <Button size="sm" variant="primary" icon={Download} onClick={csv}>
                  Unduh CSV
                </Button>
              )
            }
          />
          {!rows ? (
            <EmptyState title="Belum ada laporan" desc="Pilih jenis laporan lalu tekan Buat laporan." />
          ) : rows.length === 1 ? (
            <EmptyState title="Tidak ada data" desc="Belum ada baris untuk laporan ini." />
          ) : (
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
          )}
          {rows && (
            <div className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-xs text-mute">
              <Badge>{rows.length - 1} baris</Badge>
              {cur.demo && <DemoTag />}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
