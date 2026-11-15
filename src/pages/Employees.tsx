import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClipboardPlus, MessageSquare, Send } from 'lucide-react'
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Notice, PageHeader, SearchInput, Select, Tabs, Textarea } from '../components/ui'
import { Modal } from '../components/Overlays'
import { useApp } from '../state/AppState'
import { EMPLOYEES, EMP } from '../data/employees'
import type { ChatMsg, EmployeeId, Priority } from '../types'
import { aiErrorText, askEmployee, checkEmployeeAi } from '../lib/ai'
import type { Msg } from '../lib/ai'
import { StatusBadge } from '../components/ui'
import { clearEmployeeKey, loadEmployeeAi, saveEmployeeAi } from '../lib/keys'
import type { EmployeeAi } from '../lib/keys'
import { PROVIDERS, providerById } from '../data/providers'
import type { ProviderId } from '../data/providers'
import { employeeStats, workState } from '../lib/work'

const stateTone = { Bekerja: 'brand', Siaga: 'warn', Nonaktif: 'neutral' } as const

export function AssignTaskModal({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: EmployeeId }) {
  const { addTask, toast, settings } = useApp()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [who, setWho] = useState<EmployeeId>(initial ?? 'james')
  const [prio, setPrio] = useState<Priority>('Medium')
  const [deadline, setDeadline] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setWho(initial ?? 'james')
      setTitle('')
      setDesc('')
      setDeadline('')
      setPrio('Medium')
      setErr({})
    }
  }, [open, initial])

  const submit = () => {
    const e: Record<string, string> = {}
    if (title.trim().length < 4) e.title = 'Judul minimal 4 karakter.'
    if (!deadline) e.deadline = 'Pilih tenggat waktu.'
    if (!settings.employeeEnabled[who]) e.who = `${EMP[who].name} sedang dinonaktifkan di Settings.`
    setErr(e)
    if (Object.keys(e).length) return
    addTask({ title: title.trim(), description: desc.trim(), assignee: who, priority: prio, deadline })
    toast(`Tugas ditugaskan ke ${EMP[who].name}.`)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Beri tugas"
      footer={
        <>
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" onClick={submit}>
            Tugaskan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Judul tugas" error={err.title}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Riset promo kompetitor" />
        </Field>
        <Field label="Deskripsi (opsional)">
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Karyawan AI" error={err.who}>
            <Select value={who} onChange={(e) => setWho(e.target.value as EmployeeId)}>
              {EMPLOYEES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.short}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioritas">
            <Select value={prio} onChange={(e) => setPrio(e.target.value as Priority)}>
              {(['Low', 'Medium', 'High', 'Urgent'] as Priority[]).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Tenggat" error={err.deadline}>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

function ChatDrawer({ id, onClose }: { id: EmployeeId | null; onClose: () => void }) {
  const { settings, chats, setChat } = useApp()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setText('')
    setBusy(false)
  }, [id])
  if (!id) return null
  const e = EMP[id]
  const msgs: ChatMsg[] = chats[id] ?? []

  const send = async () => {
    const t = text.trim()
    if (!t || busy) return
    const history: Msg[] = [
      ...msgs.filter((m) => m.from !== 'sys').map((m): Msg => ({ role: m.from === 'ceo' ? 'user' : 'assistant', content: m.text })),
      { role: 'user', content: t },
    ]
    let thread: ChatMsg[] = [...msgs, { from: 'ceo', text: t }]
    setChat(id, thread)
    setText('')
    setBusy(true)
    try {
      const note = settings.notes[id]?.trim()
      const reply = await askEmployee(id, history, {
        model: settings.model,
        context: note ? `Catatan CEO untuk kamu (preferensi dan hal yang perlu diingat): ${note}` : undefined,
      })
      thread = [...thread, { from: 'ai', text: reply }]
      setChat(id, thread)
    } catch (err) {
      setChat(id, [...thread, { from: 'sys', text: aiErrorText(err) }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Percakapan dengan ${e.name}`}>
      <Notice tone="info">
        {e.name} menjawab lewat model AI, tetapi belum punya akses ke data toko nyata dan tidak bisa menjalankan tindakan. Pesan Anda dikirim ke {settings.provider}.
      </Notice>
      <div className="mt-4 min-h-[160px] space-y-2" aria-live="polite">
        {msgs.length === 0 && <p className="py-8 text-center text-[13px] text-mute">Belum ada pesan. Tanyakan sesuatu pada {e.name}.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={m.from === 'ceo' ? 'flex justify-end' : 'flex'}>
            <p
              className={
                'max-w-[88%] whitespace-pre-wrap rounded-xl px-3 py-2 text-[13px] ' +
                (m.from === 'ceo' ? 'bg-brand text-canvas' : m.from === 'ai' ? 'bg-raised text-ink' : 'border border-warn/30 text-mute')
              }
            >
              {m.text}
            </p>
          </div>
        ))}
        {busy && <p className="text-xs text-mute">{e.name} sedang mengetik...</p>}
      </div>
      {msgs.length > 0 && !busy && (
        <button type="button" onClick={() => setChat(id, [])} className="mt-2 text-xs text-mute underline">
          Hapus riwayat percakapan
        </button>
      )}
      <form
        className="mt-4 flex gap-2"
        onSubmit={(ev) => {
          ev.preventDefault()
          void send()
        }}
      >
        <Input value={text} onChange={(e2) => setText(e2.target.value)} placeholder={`Tulis pesan untuk ${e.name}`} aria-label="Pesan" disabled={busy} maxLength={1500} />
        <Button variant="primary" icon={Send} type="submit" aria-label="Kirim" disabled={busy || !text.trim()}>
          <span className="hidden sm:inline">Kirim</span>
        </Button>
      </form>
    </Modal>
  )
}

function KeyTab({ id }: { id: EmployeeId }) {
  const { userId, toast } = useApp()
  const e = EMP[id]
  const [cfg, setCfg] = useState<EmployeeAi | null>(null)
  const [loading, setLoading] = useState(true)
  const [provider, setProvider] = useState<ProviderId>('groq')
  const [model, setModel] = useState('')
  const [val, setVal] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [test, setTest] = useState('')

  useEffect(() => {
    let off = false
    loadEmployeeAi()
      .then((m) => {
        if (off) return
        const c = m[id] ?? null
        setCfg(c)
        setProvider(c?.provider ?? 'groq')
        setModel(c?.model ?? '')
      })
      .catch(() => undefined)
      .finally(() => !off && setLoading(false))
    return () => {
      off = true
    }
  }, [id])

  if (!userId) return <Notice tone="info">Masuk dengan akun dulu untuk mengatur model dan kunci AI.</Notice>

  const info = providerById(provider)
  const hasKey = !!cfg?.last4
  const dirty = provider !== (cfg?.provider ?? 'groq') || model.trim() !== (cfg?.model ?? '') || val.trim() !== ''

  const save = async () => {
    const k = val.trim()
    if (k && (k.length < 20 || /\s/.test(k))) return setErr('Kunci tidak valid. Tempel kunci lengkap tanpa spasi.')
    if (provider !== 'groq' && !k && !(hasKey && provider === cfg?.provider)) return setErr(`${info.label} butuh kunci API milik Anda.`)
    setErr('')
    setBusy(true)
    try {
      const switched = provider !== (cfg?.provider ?? 'groq')
      await saveEmployeeAi(userId, id, { provider, model, key: k, clearKey: switched })
      const keep = k ? k.slice(-4) : switched ? '' : cfg?.last4 ?? ''
      setCfg({ provider, model: model.trim(), last4: keep })
      setVal('')
      setTest('')
      toast(`Pengaturan AI ${e.name} disimpan.`)
    } catch {
      toast('Gagal menyimpan. Coba lagi.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await clearEmployeeKey(userId, id)
      setCfg((c) => (c ? { ...c, last4: '' } : c))
      setTest('')
      toast('Kunci dihapus.', 'info')
    } catch {
      toast('Gagal menghapus kunci.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const runTest = async () => {
    setBusy(true)
    setTest('')
    try {
      const r = await checkEmployeeAi(id)
      if (!r.configured) setTest(`Belum ada kunci untuk ${providerById(r.provider ?? provider).label}.`)
      else if (!r.valid) setTest('Kunci ditolak penyedia. Periksa kunci yang tersimpan.')
      else {
        setModels(r.models ?? [])
        setTest(`Tersambung ke ${providerById(r.provider ?? provider).label}. Model aktif: ${r.model}. ${r.models?.length ?? 0} model tersedia (muncul sebagai saran di kolom model).`)
      }
    } catch (er) {
      setTest(aiErrorText(er))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-[13px] text-mute">
        Pilih penyedia dan model AI khusus untuk {e.name}. Tiap karyawan bisa berbeda. Kunci tersimpan di akun Anda dan hanya dipakai server; setelah disimpan, aplikasi tidak bisa menampilkannya lagi.
      </p>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <Badge tone={hasKey ? 'brand' : 'neutral'}>{loading ? 'Memeriksa...' : hasKey ? 'Kunci khusus terpasang' : provider === 'groq' ? 'Memakai kunci bersama (Groq)' : 'Belum ada kunci'}</Badge>
        {hasKey && <span className="tabular font-mono text-xs text-mute">••••{cfg?.last4}</span>}
      </div>
      <Field label="Penyedia">
        <Select value={provider} onChange={(ev) => { setProvider(ev.target.value as ProviderId); setModels([]); setTest('') }}>
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Model" hint={`Kosongkan untuk memakai bawaan (${info.defaultModel}). Nama model bisa berubah di penyedia; jalankan Tes koneksi untuk melihat daftar yang tersedia.`}>
        <Input value={model} onChange={(ev) => setModel(ev.target.value)} placeholder={info.defaultModel} list="model-suggestions" autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={80} />
        <datalist id="model-suggestions">
          {models.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </Field>
      <Field label={hasKey && provider === cfg?.provider ? 'Ganti kunci API (opsional)' : 'Kunci API'} error={err}>
        <Input type="password" value={val} onChange={(ev) => setVal(ev.target.value)} placeholder={info.keyHint} autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={200} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void save()} disabled={busy || !dirty}>
          Simpan
        </Button>
        <Button onClick={() => void runTest()} disabled={busy || dirty}>
          Tes koneksi
        </Button>
        {hasKey && (
          <Button variant="danger" onClick={() => void clear()} disabled={busy}>
            Hapus kunci
          </Button>
        )}
      </div>
      {dirty && <p className="text-xs text-mute">Simpan dulu sebelum tes koneksi.</p>}
      {test && <Notice tone="info">{test}</Notice>}
    </div>
  )
}

function Detail({ id, onClose, onAssign, onChat }: { id: EmployeeId; onClose: () => void; onAssign: () => void; onChat: () => void }) {
  const { tasks, settings, updateSettings, toast } = useApp()
  const e = EMP[id]
  const [tab, setTab] = useState<'info' | 'tasks' | 'memory' | 'key'>('info')
  const mine = tasks.filter((t) => t.assignee === id)
  const st = workState(id, tasks, settings.employeeEnabled[id])
  const stats = employeeStats(id, tasks)
  const [note, setNote] = useState(settings.notes[id] ?? '')
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={e.name}
      footer={
        <>
          <Button icon={MessageSquare} onClick={onChat}>
            Buka percakapan
          </Button>
          <Button variant="primary" icon={ClipboardPlus} onClick={onAssign}>
            Beri tugas
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <Avatar id={id} size={64} />
        <div className="min-w-0">
          <p className="font-semibold">{e.role}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone={stateTone[st]}>{st}</Badge>
          </div>
        </div>
      </div>
      <Tabs
        className="mt-4"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'info', label: 'Ringkasan' },
          { id: 'tasks', label: 'Riwayat tugas', count: mine.length },
          { id: 'memory', label: 'Catatan' },
          { id: 'key', label: 'Model & Kunci' },
        ]}
      />
      {tab === 'info' && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-mute">{e.summary}</p>
          <div>
            <p className="mb-2 text-xs font-semibold text-mute">Tanggung jawab</p>
            <ul className="space-y-1.5 text-[13px]">
              {e.duties.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Tugas selesai', stats.done],
              ['Sedang berjalan', stats.active],
              ['Gagal', stats.failed],
            ].map(([k, v]) => (
              <div key={k} className="rounded-ctl border border-line p-3">
                <p className="tabular text-lg font-bold">{v}</p>
                <p className="text-xs text-mute">{k}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'tasks' && (
        <ul className="mt-4 divide-y divide-line">
          {mine.length === 0 && <EmptyState title="Belum ada tugas" desc="Beri tugas pertama untuk karyawan ini." />}
          {mine.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">{t.title}</span>
                <span className="text-xs text-mute">
                  {t.id} · tenggat {t.deadline}
                </span>
              </span>
              <StatusBadge status={t.status} />
            </li>
          ))}
        </ul>
      )}
      {tab === 'key' && <KeyTab id={id} />}
      {tab === 'memory' && (
        <div className="mt-4 space-y-3">
          <Field label={`Catatan untuk ${e.name}`} hint="Preferensi atau hal yang perlu diingat. Dikirim sebagai konteks saat Anda chat dengan karyawan ini.">
            <Textarea value={note} onChange={(ev) => setNote(ev.target.value)} maxLength={600} placeholder="Contoh: Gaya bahasa santai, hindari kata 'murah'." />
          </Field>
          <Button
            variant="primary"
            onClick={() => {
              updateSettings({ notes: { ...settings.notes, [id]: note.trim() } })
              toast('Catatan disimpan.')
            }}
          >
            Simpan catatan
          </Button>
        </div>
      )}
    </Modal>
  )
}

export default function Employees() {
  const { settings, tasks } = useApp()
  const [q, setQ] = useState('')
  const [state, setState] = useState('all')
  const [params, setParams] = useSearchParams()
  const open = (params.get('open') as EmployeeId | null) ?? null
  const [assign, setAssign] = useState<EmployeeId | null>(null)
  const [chat, setChat] = useState<EmployeeId | null>(null)

  const list = useMemo(
    () =>
      EMPLOYEES.filter(
        (e) =>
          (e.name + e.role).toLowerCase().includes(q.toLowerCase()) &&
          (state === 'all' || workState(e.id, tasks, settings.employeeEnabled[e.id]) === state),
      ),
    [q, state, tasks, settings.employeeEnabled],
  )

  const close = () => setParams({}, { replace: true })

  return (
    <div>
      <PageHeader title="AI Employees" desc="Delapan karyawan AI dengan peran masing-masing. Status dan statistik dihitung dari tugas yang Anda berikan." />
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_200px]">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama atau jabatan" />
        <Select aria-label="Filter status" value={state} onChange={(e) => setState(e.target.value)}>
          <option value="all">Semua status</option>
          <option>Bekerja</option>
          <option>Siaga</option>
          <option>Nonaktif</option>
        </Select>
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState title="Tidak ada karyawan yang cocok" desc="Ubah kata kunci atau filter status." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((e) => {
            const st = workState(e.id, tasks, settings.employeeEnabled[e.id])
            return (
              <Card key={e.id} className="flex flex-col p-4">
                <button className="flex items-center gap-3 text-left" onClick={() => setParams({ open: e.id })}>
                  <Avatar id={e.id} size={48} />
                  <span className="min-w-0">
                    <span className="block font-semibold">{e.name}</span>
                    <span className="block truncate text-xs text-mute">{e.role}</span>
                  </span>
                </button>
                <p className="mt-3 line-clamp-3 flex-1 text-[13px] text-mute">{e.summary}</p>
                <div className="mt-3">
                  <Badge tone={stateTone[st]}>{st}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" icon={MessageSquare} onClick={() => setChat(e.id)}>
                    Chat
                  </Button>
                  <Button size="sm" variant="primary" icon={ClipboardPlus} onClick={() => setAssign(e.id)}>
                    Tugas
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {open && EMP[open] && (
        <Detail id={open} onClose={close} onAssign={() => setAssign(open)} onChat={() => setChat(open)} />
      )}
      <AssignTaskModal open={assign !== null} initial={assign ?? undefined} onClose={() => setAssign(null)} />
      <ChatDrawer id={chat} onClose={() => setChat(null)} />
    </div>
  )
}
