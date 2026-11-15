import { useState } from 'react'
import { Check, Plus, Sparkles, X } from 'lucide-react'
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Tabs, Textarea } from '../components/ui'
import type { Tone } from '../components/ui'
import { ConfirmDialog, Modal } from '../components/Overlays'
import { useApp } from '../state/AppState'
import { EMP, EMPLOYEES } from '../data/employees'
import { aiErrorText, askEmployee } from '../lib/ai'
import type { Approval, EmployeeId } from '../types'

function NewApproval({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addApproval, toast } = useApp()
  const [title, setTitle] = useState('')
  const [by, setBy] = useState<EmployeeId>('james')
  const [category, setCategory] = useState('Anggaran')
  const [summary, setSummary] = useState('')
  const [rec, setRec] = useState('')
  const [risk, setRisk] = useState<Approval['risk']>('Sedang')
  const [err, setErr] = useState<Record<string, string>>({})

  const submit = () => {
    const e: Record<string, string> = {}
    if (title.trim().length < 4) e.title = 'Judul minimal 4 karakter.'
    if (summary.trim().length < 5) e.summary = 'Jelaskan permintaannya (min. 5 karakter).'
    setErr(e)
    if (Object.keys(e).length) return
    addApproval({ title: title.trim(), requestedBy: by, category, summary: summary.trim(), recommendation: rec.trim(), risk })
    toast('Permintaan ditambahkan.')
    setTitle('')
    setSummary('')
    setRec('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Permintaan persetujuan baru"
      footer={
        <>
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" onClick={submit}>
            Tambah
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Judul" error={err.title}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Anggaran promo akhir pekan" maxLength={100} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Diajukan oleh">
            <Select value={by} onChange={(e) => setBy(e.target.value as EmployeeId)}>
              {EMPLOYEES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.short}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Kategori">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {['Anggaran', 'Harga', 'Komunikasi pelanggan', 'Materi promosi', 'Status toko', 'Lainnya'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Risiko">
          <Select value={risk} onChange={(e) => setRisk(e.target.value as Approval['risk'])}>
            <option>Rendah</option>
            <option>Sedang</option>
            <option>Tinggi</option>
          </Select>
        </Field>
        <Field label="Ringkasan" error={err.summary}>
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={600} />
        </Field>
        <Field label="Rekomendasi (opsional)" hint="Bisa dikosongkan, lalu minta tinjauan AI setelah permintaan dibuat.">
          <Textarea value={rec} onChange={(e) => setRec(e.target.value)} maxLength={600} />
        </Field>
      </div>
    </Modal>
  )
}

const riskTone: Record<Approval['risk'], Tone> = { Rendah: 'brand', Sedang: 'warn', Tinggi: 'danger' }

function Review({ a, onClose }: { a: Approval; onClose: () => void }) {
  const { decide, toast, settings } = useApp()
  const [analysis, setAnalysis] = useState('')
  const [busy, setBusy] = useState(false)
  const [approve, setApprove] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')

  const analyze = async () => {
    setBusy(true)
    try {
      const text = await askEmployee(
        'james',
        [
          {
            role: 'user',
            content:
              'Tinjau permintaan persetujuan ini untuk CEO. Format: 1) Ringkasan satu kalimat. 2) Tiga hal yang perlu dicek atau risiko. 3) Satu pertanyaan yang sebaiknya diajukan sebelum memutuskan. Jangan memutuskan menyetujui atau menolak.',
          },
        ],
        {
          model: settings.model,
          maxTokens: 450,
          context: `Judul: ${a.title}\nDiajukan oleh: ${EMP[a.requestedBy].name}\nKategori: ${a.category}\nRisiko: ${a.risk}\nRingkasan: ${a.summary}\nRekomendasi pengaju: ${a.recommendation}`,
        },
      )
      setAnalysis(text)
    } catch (e) {
      toast(aiErrorText(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const reject = () => {
    if (reason.trim().length < 5) return setErr('Tulis alasan penolakan (min. 5 karakter).')
    decide(a.id, 'Rejected', reason.trim())
    toast('Permintaan ditolak.', 'info')
    onClose()
  }

  return (
    <>
      <Modal
        open
        wide
        onClose={onClose}
        title={a.title}
        footer={
          a.decision ? (
            <Button onClick={onClose}>Tutup</Button>
          ) : rejecting ? (
            <>
              <Button onClick={() => setRejecting(false)}>Kembali</Button>
              <Button variant="danger" icon={X} onClick={reject}>
                Konfirmasi tolak
              </Button>
            </>
          ) : (
            <>
              <Button variant="danger" icon={X} onClick={() => setRejecting(true)}>
                Tolak
              </Button>
              <Button variant="primary" icon={Check} onClick={() => setApprove(true)}>
                Setujui
              </Button>
            </>
          )
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Avatar id={a.requestedBy} size={28} />
            <span className="text-[13px]">
              Diajukan oleh <span className="font-semibold">{EMP[a.requestedBy].name}</span> · {a.createdAt}
            </span>
            <Badge>{a.category}</Badge>
            <Badge tone={riskTone[a.risk]}>Risiko {a.risk.toLowerCase()}</Badge>
          </div>
          <p className="text-sm">{a.summary}</p>
          <div className="rounded-ctl border border-line bg-canvas p-3.5">
            <p className="mb-1 text-xs font-semibold text-mute">Rekomendasi AI</p>
            <p className="text-[13px]">{a.recommendation}</p>
          </div>
          {!a.decision && (
            <div className="space-y-2">
              <Button icon={Sparkles} onClick={() => void analyze()} disabled={busy}>
                {busy ? 'Joko meninjau...' : 'Minta tinjauan AI'}
              </Button>
              {analysis && (
                <div className="rounded-ctl border border-info/30 bg-info/5 p-3.5">
                  <p className="mb-1 text-xs font-semibold text-mute">Tinjauan Joko (AI). Bukan keputusan; keputusan tetap di tangan Anda.</p>
                  <p className="whitespace-pre-wrap text-[13px]">{analysis}</p>
                </div>
              )}
            </div>
          )}
          {a.decision && (
            <div className="text-[13px]">
              <Badge tone={a.decision === 'Approved' ? 'brand' : 'danger'}>{a.decision === 'Approved' ? 'Disetujui' : 'Ditolak'}</Badge>
              <span className="ml-2 text-mute">{a.decidedAt}</span>
              {a.reason && <p className="mt-2 text-mute">Alasan: {a.reason}</p>}
            </div>
          )}
          {rejecting && !a.decision && (
            <Field label="Alasan penolakan" error={err}>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </Field>
          )}
        </div>
      </Modal>
      <ConfirmDialog
        open={approve}
        onClose={() => setApprove(false)}
        title="Setujui permintaan ini?"
        desc={`Anda menyetujui "${a.title}". Keputusan tercatat di riwayat.`}
        confirmLabel="Ya, setujui"
        onConfirm={() => {
          decide(a.id, 'Approved')
          toast('Permintaan disetujui.')
          onClose()
        }}
      />
    </>
  )
}

export default function Approvals() {
  const { approvals } = useApp()
  const [tab, setTab] = useState<'pending' | 'history'>('pending')
  const [sel, setSel] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const pending = approvals.filter((a) => !a.decision)
  const history = approvals.filter((a) => a.decision)
  const list = tab === 'pending' ? pending : history
  const selected = approvals.find((a) => a.id === sel)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Approval Center"
        desc="Tindakan sensitif menunggu keputusan CEO sebelum dijalankan."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
            Permintaan baru
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'pending', label: 'Menunggu', count: pending.length },
          { id: 'history', label: 'Riwayat', count: history.length },
        ]}
      />
      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState
            title={tab === 'pending' ? 'Tidak ada yang menunggu' : 'Belum ada riwayat'}
            desc={tab === 'pending' ? 'Semua permintaan sudah diputuskan.' : 'Keputusan Anda akan muncul di sini.'}
          />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((a) => (
              <li key={a.id}>
                <button onClick={() => setSel(a.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-raised/60 sm:px-5">
                  <Avatar id={a.requestedBy} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{a.title}</span>
                    <span className="block truncate text-xs text-mute">
                      {EMP[a.requestedBy].name} · {a.category} · {a.createdAt}
                    </span>
                  </span>
                  {a.decision ? (
                    <Badge tone={a.decision === 'Approved' ? 'brand' : 'danger'}>{a.decision === 'Approved' ? 'Disetujui' : 'Ditolak'}</Badge>
                  ) : (
                    <Badge tone={riskTone[a.risk]}>{a.risk}</Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {selected && <Review a={selected} onClose={() => setSel(null)} />}
      <NewApproval open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
