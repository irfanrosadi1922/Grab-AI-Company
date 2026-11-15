import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Avatar, Badge, Button, Card, EmptyState, Field, PageHeader, Tabs, Textarea } from '../components/ui'
import type { Tone } from '../components/ui'
import { ConfirmDialog, Modal } from '../components/Overlays'
import { useApp } from '../state/AppState'
import { EMP } from '../data/employees'
import type { Approval } from '../types'

const riskTone: Record<Approval['risk'], Tone> = { Rendah: 'brand', Sedang: 'warn', Tinggi: 'danger' }

function Review({ a, onClose }: { a: Approval; onClose: () => void }) {
  const { decide, toast } = useApp()
  const [approve, setApprove] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')

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
  const pending = approvals.filter((a) => !a.decision)
  const history = approvals.filter((a) => a.decision)
  const list = tab === 'pending' ? pending : history
  const selected = approvals.find((a) => a.id === sel)

  return (
    <div className="space-y-4">
      <PageHeader title="Approval Center" desc="Tindakan sensitif menunggu keputusan CEO sebelum dijalankan." />
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
    </div>
  )
}
