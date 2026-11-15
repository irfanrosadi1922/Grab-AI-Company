import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarClock, KanbanSquare, List, Plus } from 'lucide-react'
import { Avatar, Button, Card, EmptyState, Field, PageHeader, PriorityBadge, SearchInput, Select, StatusBadge, Tabs, Textarea } from '../components/ui'
import { Modal } from '../components/Overlays'
import { AssignTaskModal } from './Employees'
import { useApp } from '../state/AppState'
import { EMP, EMPLOYEES } from '../data/employees'
import type { Task, TaskStatus } from '../types'
import { cn, todayStr } from '../lib/format'
import { ConfirmDialog } from '../components/Overlays'

export const STATUSES: TaskStatus[] = ['Pending', 'Assigned', 'In Progress', 'Review', 'Completed', 'Failed', 'Requires Approval']

const isLate = (t: Task) => t.deadline < todayStr() && !['Completed', 'Failed'].includes(t.status)

function TaskDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { tasks, setTaskStatus, setTaskResult, removeTask, toast } = useApp()
  const t = tasks.find((x) => x.id === id)
  const [result, setResult] = useState(t?.result ?? '')
  const [del, setDel] = useState(false)
  if (!t) return null
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={`${t.id} · ${t.title}`}
      footer={
        <>
          <Button variant="danger" onClick={() => setDel(true)} className="mr-auto">
            Hapus
          </Button>
          <Button onClick={onClose}>Tutup</Button>
          <Button
            variant="primary"
            onClick={() => {
              setTaskResult(t.id, result.trim())
              toast('Hasil tugas disimpan.')
            }}
          >
            Simpan hasil
          </Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1fr_220px]">
        <div className="space-y-4">
          <p className="text-sm text-mute">{t.description || 'Tanpa deskripsi.'}</p>
          <Field label="Hasil tugas" hint="Catat atau tempel hasil kerja. Hasil otomatis dari AI belum aktif.">
            <Textarea value={result} onChange={(e) => setResult(e.target.value)} placeholder="Belum ada hasil." />
          </Field>
          <div>
            <p className="mb-2 text-xs font-semibold text-mute">Riwayat</p>
            <ol className="space-y-2 border-l border-line pl-4">
              {t.history.map((h, i) => (
                <li key={i} className="relative text-[13px]">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-line" />
                  {h.text}
                  <span className="block text-xs text-mute">{h.at}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Status">
            <Select value={t.status} onChange={(e) => setTaskStatus(t.id, e.target.value as TaskStatus)}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <div className="space-y-2 text-[13px]">
            <div className="flex items-center gap-2">
              <Avatar id={t.assignee} size={28} />
              <span>
                {EMP[t.assignee].name}
                <span className="block text-xs text-mute">{EMP[t.assignee].short}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-mute">Prioritas</span>
              <PriorityBadge p={t.priority} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-mute">Tenggat</span>
              <span className={cn('tabular', isLate(t) && 'text-danger')}>{t.deadline}</span>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={del}
        onClose={() => setDel(false)}
        title="Hapus tugas ini?"
        desc={`"${t.title}" beserta riwayatnya akan dihapus permanen.`}
        confirmLabel="Hapus"
        danger
        onConfirm={() => {
          removeTask(t.id)
          toast('Tugas dihapus.', 'info')
          onClose()
        }}
      />
    </Modal>
  )
}

function TaskCard({ t, onOpen }: { t: Task; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="w-full rounded-ctl border border-line bg-surface p-3 text-left hover:bg-raised">
      <p className="text-[13px] font-medium leading-snug">{t.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge p={t.priority} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-mute">
        <span className="flex items-center gap-1.5">
          <Avatar id={t.assignee} size={20} />
          {EMP[t.assignee].name}
        </span>
        <span className={cn('flex items-center gap-1 tabular', isLate(t) && 'text-danger')}>
          <CalendarClock size={12} aria-hidden />
          {t.deadline.slice(5)}
        </span>
      </div>
    </button>
  )
}

export default function Tasks() {
  const { tasks } = useApp()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'list' | 'board'>('list')
  const [q, setQ] = useState('')
  const [who, setWho] = useState('all')
  const [status, setStatus] = useState('all')
  const [creating, setCreating] = useState(false)
  const open = params.get('open')

  const list = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (t.title + t.id).toLowerCase().includes(q.toLowerCase()) &&
          (who === 'all' || t.assignee === who) &&
          (status === 'all' || t.status === status),
      ),
    [tasks, q, who, status],
  )

  return (
    <div>
      <PageHeader
        title="Task Center"
        desc="Kelola pekerjaan karyawan AI dari penugasan sampai selesai."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
            Tugas baru
          </Button>
        }
      />

      <div className="mb-4 grid gap-2 md:grid-cols-[1fr_180px_180px_auto]">
        <SearchInput value={q} onChange={setQ} placeholder="Cari tugas" />
        <Select aria-label="Filter karyawan" value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="all">Semua karyawan</option>
          {EMPLOYEES.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Semua status</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Tabs
          value={view}
          onChange={setView}
          items={[
            { id: 'list', label: 'Daftar' },
            { id: 'board', label: 'Kanban' },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={view === 'list' ? List : KanbanSquare}
            title="Tidak ada tugas"
            desc="Ubah filter atau buat tugas baru."
            action={
              <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
                Tugas baru
              </Button>
            }
          />
        </Card>
      ) : view === 'list' ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {list.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setParams({ open: t.id })}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 text-left hover:bg-raised/60 md:grid-cols-[90px_1fr_130px_90px_110px_150px] sm:px-5"
                >
                  <span className="tabular hidden font-mono text-xs text-mute md:block">{t.id}</span>
                  <span className="min-w-0 truncate text-[13px] font-medium">{t.title}</span>
                  <span className="hidden items-center gap-2 text-[13px] md:flex">
                    <Avatar id={t.assignee} size={22} />
                    {EMP[t.assignee].name}
                  </span>
                  <span className="hidden md:block">
                    <PriorityBadge p={t.priority} />
                  </span>
                  <span className={cn('tabular hidden text-[13px] md:block', isLate(t) ? 'text-danger' : 'text-mute')}>{t.deadline}</span>
                  <span className="justify-self-end md:justify-self-start">
                    <StatusBadge status={t.status} />
                  </span>
                  <span className="col-span-2 flex items-center gap-2 text-xs text-mute md:hidden">
                    <Avatar id={t.assignee} size={18} /> {EMP[t.assignee].name} · {t.deadline} · {t.priority}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 lg:mx-0 lg:px-0">
          {STATUSES.map((s) => {
            const col = list.filter((t) => t.status === s)
            return (
              <div key={s} className="w-[272px] shrink-0 snap-start">
                <div className="mb-2 flex items-center justify-between px-1">
                  <StatusBadge status={s} />
                  <span className="tabular text-xs text-mute">{col.length}</span>
                </div>
                <div className="space-y-2 rounded-card border border-dashed border-line p-2">
                  {col.length === 0 && <p className="py-6 text-center text-xs text-mute">Kosong</p>}
                  {col.map((t) => (
                    <TaskCard key={t.id} t={t} onOpen={() => setParams({ open: t.id })} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {open && <TaskDetail id={open} onClose={() => setParams({}, { replace: true })} />}
      <AssignTaskModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
