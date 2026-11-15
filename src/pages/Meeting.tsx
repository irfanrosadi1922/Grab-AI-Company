import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardPlus, Download, Mic, MicOff, PhoneOff, Play, Plus, Send, Sparkles, Square, Video, VideoOff } from 'lucide-react'
import { Avatar, Badge, Button, Card, EmptyState, Input, Notice, PageHeader, Select, Tabs, Textarea } from '../components/ui'
import { ConfirmDialog } from '../components/Overlays'
import { AssignTaskModal } from './Employees'
import { EMP } from '../data/employees'
import { cn, downloadBlob } from '../lib/format'
import { useApp } from '../state/AppState'
import { aiErrorText, askEmployee } from '../lib/ai'
import type { Msg } from '../lib/ai'
import type { EmployeeId } from '../types'

type MeetingType = 'board' | 'private' | 'department' | 'strategy' | 'emergency'

const TYPES: { id: MeetingType; label: string; people: EmployeeId[]; agenda: string[] }[] = [
  {
    id: 'board',
    label: 'Board Meeting',
    people: ['james', 'alex', 'daniel', 'sophia', 'olivia', 'ethan', 'isabella', 'william'],
    agenda: ['Ringkasan kinerja', 'Keputusan yang menunggu CEO', 'Prioritas minggu ini'],
  },
  { id: 'private', label: 'Private Meeting', people: ['james'], agenda: ['Topik pribadi CEO'] },
  {
    id: 'department',
    label: 'Department Meeting',
    people: ['james', 'sophia', 'olivia', 'ethan', 'isabella'],
    agenda: ['Status kampanye', 'Kebutuhan materi kreatif', 'Jadwal konten'],
  },
  {
    id: 'strategy',
    label: 'Strategy Meeting',
    people: ['james', 'alex', 'daniel', 'sophia'],
    agenda: ['Peluang pasar', 'Opsi strategi', 'Risiko dan anggaran'],
  },
  {
    id: 'emergency',
    label: 'Emergency Meeting',
    people: ['james', 'william', 'daniel', 'ethan'],
    agenda: ['Insiden yang terjadi', 'Dampak ke toko', 'Tindakan segera'],
  },
]

type Panel = 'chat' | 'agenda' | 'transcript' | 'minutes' | 'decisions' | 'tasks'

const fmt = (s: number) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`
}

export default function Meeting() {
  const nav = useNavigate()
  const { toast, settings } = useApp()
  const [type, setType] = useState<MeetingType>('board')
  const [privateWith, setPrivateWith] = useState<EmployeeId>('james')
  const [speaker, setSpeaker] = useState<EmployeeId>('james')
  const [live, setLive] = useState(false)
  const [secs, setSecs] = useState(0)
  const [mic, setMic] = useState(false)
  const [cam, setCam] = useState(false)
  const [panel, setPanel] = useState<Panel>('agenda')
  const [leave, setLeave] = useState(false)
  const [assign, setAssign] = useState(false)

  const [chat, setChat] = useState<{ who: 'CEO' | EmployeeId; text: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [sumBusy, setSumBusy] = useState(false)
  const [chatText, setChatText] = useState('')
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [extraAgenda, setExtraAgenda] = useState<string[]>([])
  const [agendaText, setAgendaText] = useState('')
  const [minutes, setMinutes] = useState('')
  const [decisions, setDecisions] = useState<{ at: string; text: string }[]>([])
  const [decText, setDecText] = useState('')

  const cfg = TYPES.find((t) => t.id === type)!
  const people = useMemo<EmployeeId[]>(
    () => (type === 'private' ? Array.from(new Set<EmployeeId>(['james', privateWith])) : cfg.people),
    [type, privateWith, cfg],
  )
  const agenda = [...cfg.agenda, ...extraAgenda]

  useEffect(() => {
    if (!people.includes(speaker)) setSpeaker(people[0])
  }, [people, speaker])

  useEffect(() => {
    if (!live) return
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [live])

  const meetingContext = () =>
    `Jenis rapat: ${cfg.label}. Moderator: James. Peserta: ${people.map((p) => `${EMP[p].name} (${EMP[p].role})`).join(', ')}.\n` +
    `Agenda: ${agenda.join('; ')}.\n` +
    `Keputusan sejauh ini: ${decisions.length ? decisions.map((d) => d.text).join('; ') : 'belum ada'}.`

  // James (moderator) selalu menjawab; pembicara terpilih ikut menjawab jika berbeda.
  const sendChat = async () => {
    const t = chatText.trim()
    if (!t || busy) return
    const responders = Array.from(new Set<EmployeeId>(['james', ...(people.includes(speaker) ? [speaker] : [])])).filter(
      (id) => settings.employeeEnabled[id],
    )
    if (responders.length === 0) return toast('Karyawan yang dipilih sedang dinonaktifkan di Settings.', 'error')

    let thread: { who: 'CEO' | EmployeeId; text: string }[] = [...chat, { who: 'CEO', text: t }]
    setChat(thread)
    setChatText('')
    setBusy(true)
    try {
      for (const r of responders) {
        const history: Msg[] = thread.map((m) =>
          m.who === 'CEO'
            ? { role: 'user', content: m.text }
            : m.who === r
              ? { role: 'assistant', content: m.text }
              : { role: 'user', content: `[${EMP[m.who].name}, peserta lain]: ${m.text}` },
        )
        const role =
          r === 'james'
            ? 'Kamu bertindak sebagai moderator rapat: ringkas, arahkan pembahasan, dan tutup dengan tindak lanjut jika perlu.'
            : 'Kamu peserta rapat: jawab dari bidangmu saja dan singkat.'
        const reply = await askEmployee(r, history, { model: settings.model, context: `${meetingContext()}\n${role}`, maxTokens: 350 })
        thread = [...thread, { who: r, text: reply }]
        setChat(thread)
        setSpeaker(r)
      }
    } catch (e) {
      toast(aiErrorText(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const summarize = async () => {
    const lines = chat.map((m) => `${m.who === 'CEO' ? 'CEO' : EMP[m.who].name}: ${m.text}`).join('\n')
    if (!lines && decisions.length === 0 && !minutes.trim()) return toast('Belum ada chat, keputusan, atau catatan untuk diringkas.', 'error')
    setSumBusy(true)
    try {
      const text = await askEmployee(
        'james',
        [{ role: 'user', content: 'Tulis notulen rapat ringkas: poin pembahasan, keputusan, dan tindak lanjut (siapa mengerjakan apa). Jangan menambah hal yang tidak ada di bahan.' }],
        {
          model: settings.model,
          maxTokens: 600,
          context: `${meetingContext()}\nChat rapat:\n${lines.slice(-1200)}\nCatatan CEO: ${minutes.slice(0, 500)}`,
        },
      )
      setMinutes((m) => (m.trim() ? `${m.trim()}\n\n--- Ringkasan AI ---\n${text}` : text))
      toast('Ringkasan ditambahkan ke notulen. Periksa sebelum diunduh.', 'info')
    } catch (e) {
      toast(aiErrorText(e), 'error')
    } finally {
      setSumBusy(false)
    }
  }

  const addDecision = () => {
    const t = decText.trim()
    if (t.length < 3) return toast('Tulis keputusan minimal 3 karakter.', 'error')
    setDecisions((d) => [{ at: fmt(secs), text: t }, ...d])
    setDecText('')
  }

  const exportMinutes = () => {
    const body =
      `Notulen - ${cfg.label}\nDurasi: ${fmt(secs)}\nPeserta: ${people.map((p) => EMP[p].name).join(', ')}\n\n` +
      `Agenda:\n${agenda.map((a) => '- ' + a).join('\n')}\n\nCatatan:\n${minutes || '(kosong)'}\n\n` +
      `Keputusan:\n${decisions.length ? decisions.map((d) => `- [${d.at}] ${d.text}`).join('\n') : '(belum ada)'}\n`
    downloadBlob('notulen-rapat.txt', body, 'text/plain;charset=utf-8')
  }

  return (
    <div>
      <PageHeader
        title="AI Meeting Room"
        desc="Ruang rapat virtual dengan James sebagai moderator."
        actions={
          <Select aria-label="Jenis rapat" value={type} onChange={(e) => setType(e.target.value as MeetingType)} className="w-52">
            {TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        }
      />

      <Notice>
        Suara dua arah, transkrip langsung, dan avatar interaktif belum aktif. Semuanya butuh backend dan layanan suara
        ({settings.voiceProvider}) yang belum terhubung. Yang berfungsi sekarang: agenda, chat tertulis dengan AI (James dan pembicara terpilih menjawab), ringkasan notulen oleh AI, log keputusan, dan penugasan.
      </Notice>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Stage */}
        <div className="flex min-w-0 flex-col gap-3">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', live ? 'bg-danger' : 'bg-mute')} />
                <span className="text-[13px] font-semibold">{live ? 'Rapat berlangsung' : 'Rapat belum dimulai'}</span>
                <span className="tabular font-mono text-xs text-mute">{fmt(secs)}</span>
              </div>
              <Badge tone="info">{cfg.label}</Badge>
            </div>

            <div className="flex aspect-[16/10] max-h-[420px] w-full flex-col items-center justify-center gap-3 bg-canvas sm:aspect-[16/8]">
              <Avatar id={speaker} size={104} ring />
              <div className="text-center">
                <p className="text-base font-semibold">{EMP[speaker].name}</p>
                <p className="text-xs text-mute">
                  {EMP[speaker].role}
                  {speaker === 'james' && ' · Moderator'}
                </p>
              </div>
              <p className="text-xs text-mute">Pembicara dipilih manual</p>
            </div>

            {type === 'private' && (
              <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
                <span className="text-xs text-mute">Rapat dengan</span>
                <Select aria-label="Peserta rapat pribadi" value={privateWith} onChange={(e) => setPrivateWith(e.target.value as EmployeeId)} className="h-8 w-44 text-xs">
                  {Object.values(EMP).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <ul className="grid grid-cols-4 gap-2 border-t border-line p-3 sm:grid-cols-8">
              {people.map((id) => (
                <li key={id}>
                  <button
                    onClick={() => setSpeaker(id)}
                    aria-pressed={speaker === id}
                    className={cn(
                      'flex w-full flex-col items-center gap-1 rounded-ctl border px-1 py-2 transition-colors',
                      speaker === id ? 'border-brand bg-brand/5' : 'border-line hover:bg-raised',
                    )}
                  >
                    <Avatar id={id} size={36} />
                    <span className="max-w-full truncate text-[11px] font-medium">{EMP[id].name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant={mic ? 'primary' : 'outline'} icon={mic ? Mic : MicOff} onClick={() => setMic((m) => !m)} aria-pressed={mic}>
              {mic ? 'Mikrofon aktif' : 'Mikrofon mati'}
            </Button>
            <Button variant={cam ? 'primary' : 'outline'} icon={cam ? Video : VideoOff} onClick={() => setCam((c) => !c)} aria-pressed={cam}>
              Kamera
            </Button>
            {live ? (
              <Button icon={Square} onClick={() => setLive(false)}>
                Jeda
              </Button>
            ) : (
              <Button variant="primary" icon={Play} onClick={() => setLive(true)}>
                {secs > 0 ? 'Lanjutkan' : 'Mulai rapat'}
              </Button>
            )}
            <Button variant="danger" icon={PhoneOff} onClick={() => setLeave(true)}>
              Keluar
            </Button>
          </div>
          {(mic || cam) && <p className="text-center text-xs text-mute">Tombol mikrofon dan kamera hanya mengubah status tampilan. Tidak ada audio atau video yang direkam atau dikirim.</p>}
        </div>

        {/* Side panel */}
        <Card className="flex min-h-[420px] flex-col lg:max-h-[640px]">
          <div className="border-b border-line p-2">
            <Tabs<Panel>
              value={panel}
              onChange={setPanel}
              items={[
                { id: 'agenda', label: 'Agenda' },
                { id: 'chat', label: 'Chat' },
                { id: 'transcript', label: 'Transkrip' },
                { id: 'minutes', label: 'Notulen' },
                { id: 'decisions', label: 'Keputusan', count: decisions.length },
                { id: 'tasks', label: 'Tugas' },
              ]}
              className="border-0 p-0"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {panel === 'agenda' && (
              <div className="space-y-3">
                <ul className="space-y-1">
                  {agenda.map((a) => (
                    <li key={a}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-ctl px-2 py-2 hover:bg-raised">
                        <input
                          type="checkbox"
                          checked={!!checked[a]}
                          onChange={(e) => setChecked((c) => ({ ...c, [a]: e.target.checked }))}
                          className="h-4 w-4 accent-[#00b14f]"
                        />
                        <span className={cn('text-[13px]', checked[a] && 'text-mute line-through')}>{a}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const t = agendaText.trim()
                    if (t) {
                      setExtraAgenda((x) => [...x, t])
                      setAgendaText('')
                    }
                  }}
                >
                  <Input value={agendaText} onChange={(e) => setAgendaText(e.target.value)} placeholder="Tambah agenda" aria-label="Tambah agenda" />
                  <Button type="submit" icon={Plus} aria-label="Tambah" />
                </form>
              </div>
            )}

            {panel === 'chat' && (
              <div className="flex h-full flex-col">
                <div className="flex-1 space-y-2">
                  {chat.length === 0 && <EmptyState title="Belum ada pesan" desc="James menjawab sebagai moderator. Pilih peserta lain di panggung agar ikut menjawab. Pesan hilang saat halaman ditutup." />}
                  {chat.map((m, i) =>
                    m.who === 'CEO' ? (
                      <p key={i} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-xl bg-brand px-3 py-2 text-[13px] text-canvas">
                        {m.text}
                      </p>
                    ) : (
                      <div key={i} className="flex max-w-[92%] gap-2">
                        <Avatar id={m.who} size={26} />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-mute">{EMP[m.who].name}</p>
                          <p className="whitespace-pre-wrap rounded-xl bg-raised px-3 py-2 text-[13px]">{m.text}</p>
                        </div>
                      </div>
                    ),
                  )}
                  {busy && <p className="text-xs text-mute">Peserta sedang mengetik...</p>}
                </div>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void sendChat()
                  }}
                >
                  <Input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Tulis pesan" aria-label="Pesan rapat" disabled={busy} maxLength={1500} />
                  <Button variant="primary" type="submit" icon={Send} aria-label="Kirim" disabled={busy || !chatText.trim()} />
                </form>
              </div>
            )}

            {panel === 'transcript' && (
              <EmptyState
                title="Transkrip langsung belum aktif"
                desc="Butuh layanan suara dan backend yang belum dibangun. Gunakan tab Chat untuk berdiskusi tertulis dan Notulen untuk mencatat."
              />
            )}

            {panel === 'minutes' && (
              <div className="space-y-3">
                <Textarea value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Catat poin penting rapat" className="min-h-[200px]" aria-label="Notulen" />
                <div className="flex flex-wrap gap-2">
                  <Button icon={Sparkles} onClick={() => void summarize()} disabled={sumBusy}>
                    {sumBusy ? 'Meringkas...' : 'Ringkas dengan AI'}
                  </Button>
                  <Button icon={Download} onClick={exportMinutes}>
                    Unduh notulen (.txt)
                  </Button>
                </div>
              </div>
            )}

            {panel === 'decisions' && (
              <div className="space-y-3">
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    addDecision()
                  }}
                >
                  <Input value={decText} onChange={(e) => setDecText(e.target.value)} placeholder="Catat keputusan" aria-label="Keputusan" />
                  <Button type="submit" icon={Plus} aria-label="Tambah" />
                </form>
                {decisions.length === 0 ? (
                  <EmptyState title="Belum ada keputusan" />
                ) : (
                  <ul className="divide-y divide-line">
                    {decisions.map((d, i) => (
                      <li key={i} className="py-2.5 text-[13px]">
                        <span className="tabular mr-2 font-mono text-xs text-mute">{d.at}</span>
                        {d.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {panel === 'tasks' && (
              <div className="space-y-3">
                <p className="text-[13px] text-mute">Tugaskan tindak lanjut rapat ke salah satu karyawan AI. Tugas akan muncul di Task Center.</p>
                <Button variant="primary" icon={ClipboardPlus} onClick={() => setAssign(true)}>
                  Buat tugas
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <AssignTaskModal open={assign} onClose={() => setAssign(false)} initial={speaker} />
      <ConfirmDialog
        open={leave}
        onClose={() => setLeave(false)}
        title="Keluar dari rapat?"
        desc="Notulen, chat, dan keputusan yang belum diunduh akan hilang."
        confirmLabel="Keluar"
        danger
        onConfirm={() => nav('/')}
      />
    </div>
  )
}
