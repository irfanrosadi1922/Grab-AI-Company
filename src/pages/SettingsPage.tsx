import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardHeader, Field, Input, Notice, PageHeader, Select, Toggle } from '../components/ui'
import type { Tone } from '../components/ui'
import { ConfirmDialog } from '../components/Overlays'
import { useApp } from '../state/AppState'
import { useAuth } from '../state/Auth'
import { aiErrorText, checkAi } from '../lib/ai'
import type { AiStatus } from '../lib/ai'
import { EMPLOYEES } from '../data/employees'
import { cn } from '../lib/format'

type Sec = 'ceo' | 'company' | 'employees' | 'model' | 'voice' | 'perm' | 'notify' | 'integ' | 'security'
const SECTIONS: { id: Sec; label: string }[] = [
  { id: 'ceo', label: 'Profil CEO' },
  { id: 'company', label: 'Perusahaan' },
  { id: 'employees', label: 'Karyawan AI' },
  { id: 'model', label: 'Model AI' },
  { id: 'voice', label: 'Suara' },
  { id: 'perm', label: 'Izin dan persetujuan' },
  { id: 'notify', label: 'Notifikasi' },
  { id: 'integ', label: 'Integrasi' },
  { id: 'security', label: 'Keamanan' },
]

function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{title}</p>
        {desc && <p className="text-xs text-mute">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { settings, updateSettings, toast, resetAll, sync } = useApp()
  const { user, signOut, enabled } = useAuth()
  const [sec, setSec] = useState<Sec>('ceo')
  const [name, setName] = useState(settings.ceoName)
  const [email, setEmail] = useState(settings.ceoEmail)
  const [company, setCompany] = useState(settings.companyName)
  const [err, setErr] = useState<Record<string, string>>({})
  const [reset, setReset] = useState(false)
  const [ai, setAi] = useState<AiStatus | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiErr, setAiErr] = useState('')

  const testAi = async () => {
    setAiBusy(true)
    setAiErr('')
    setAi(null)
    try {
      setAi(await checkAi())
    } catch (e) {
      setAiErr(aiErrorText(e))
    } finally {
      setAiBusy(false)
    }
  }

  const saveCeo = () => {
    const e: Record<string, string> = {}
    if (name.trim().length < 2) e.name = 'Nama minimal 2 karakter.'
    if (email && !/^\S+@\S+\.\S+$/.test(email)) e.email = 'Format email tidak valid.'
    setErr(e)
    if (Object.keys(e).length) return
    updateSettings({ ceoName: name.trim(), ceoEmail: email.trim() })
    toast('Profil disimpan.')
  }

  const saveCompany = () => {
    if (company.trim().length < 2) return setErr({ company: 'Nama perusahaan minimal 2 karakter.' })
    setErr({})
    updateSettings({ companyName: company.trim() })
    toast('Pengaturan perusahaan disimpan.')
  }

  type GroqState = 'idle' | 'checking' | 'ok' | 'nokey' | 'rejected' | 'error'
  const [groq, setGroq] = useState<GroqState>('idle')
  const [groqModel, setGroqModel] = useState('')
  const [groqErr, setGroqErr] = useState('')

  const checkGroq = async () => {
    setGroq('checking')
    setGroqErr('')
    try {
      const r = await checkAi()
      if (!r.configured) setGroq('nokey')
      else if (!r.valid) setGroq('rejected')
      else {
        setGroqModel(r.model ?? '')
        setGroq('ok')
      }
    } catch (e) {
      setGroqErr(aiErrorText(e))
      setGroq('error')
    }
  }

  useEffect(() => {
    if (sec === 'integ' && user) void checkGroq()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sec, user?.id])

  const groqBadge: Record<GroqState, { label: string; tone: Tone }> = {
    idle: { label: 'Belum diperiksa', tone: 'neutral' },
    checking: { label: 'Memeriksa...', tone: 'neutral' },
    ok: { label: 'Terhubung', tone: 'brand' },
    nokey: { label: 'Kunci belum dipasang', tone: 'warn' },
    rejected: { label: 'Kunci ditolak', tone: 'danger' },
    error: { label: 'Tidak bisa diperiksa', tone: 'danger' },
  }

  return (
    <div>
      <PageHeader title="Settings" desc="Pengaturan disimpan di browser ini. Penyimpanan akun lintas perangkat butuh backend." />
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Bagian pengaturan" className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSec(s.id)}
              aria-current={sec === s.id}
              className={cn(
                'h-10 shrink-0 rounded-ctl px-3 text-left text-[13px] font-medium',
                sec === s.id ? 'bg-raised text-ink' : 'text-mute hover:bg-raised/60 hover:text-ink',
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <Card className="min-w-0">
          <CardHeader title={SECTIONS.find((s) => s.id === sec)!.label} />
          <div className="p-4 sm:p-5">
            {sec === 'ceo' && (
              <div className="max-w-md space-y-4">
                <Field label="Nama" error={err.name}>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Email" error={err.email}>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Button variant="primary" onClick={saveCeo}>
                  Simpan
                </Button>
              </div>
            )}

            {sec === 'company' && (
              <div className="max-w-md space-y-4">
                <Field label="Nama perusahaan" error={err.company}>
                  <Input value={company} onChange={(e) => setCompany(e.target.value)} />
                </Field>
                <Field label="Zona waktu">
                  <Select value={settings.timezone} onChange={(e) => updateSettings({ timezone: e.target.value })}>
                    <option>Asia/Kuala_Lumpur</option>
                    <option>Asia/Jakarta</option>
                    <option>Asia/Singapore</option>
                  </Select>
                </Field>
                <Field label="Mata uang">
                  <Select value={settings.currency} onChange={(e) => updateSettings({ currency: e.target.value })}>
                    <option>IDR</option>
                    <option>MYR</option>
                    <option>SGD</option>
                  </Select>
                </Field>
                <Button variant="primary" onClick={saveCompany}>
                  Simpan
                </Button>
                <p className="text-xs text-mute">Mata uang dan zona waktu baru tersimpan sebagai preferensi. Tampilan angka masih memakai Rupiah.</p>
              </div>
            )}

            {sec === 'employees' && (
              <div>
                {EMPLOYEES.map((e) => (
                  <Row key={e.id} title={`${e.name} · ${e.role}`} desc="Nonaktifkan agar tidak bisa diberi tugas baru.">
                    <Toggle
                      label={`Aktifkan ${e.name}`}
                      checked={settings.employeeEnabled[e.id]}
                      onChange={(v) => updateSettings({ employeeEnabled: { ...settings.employeeEnabled, [e.id]: v } })}
                    />
                  </Row>
                ))}
              </div>
            )}

            {sec === 'model' && (
              <div className="max-w-md space-y-4">
                <Notice tone="info">
                  Kunci API tidak disimpan di aplikasi. Kunci ada di secret Supabase (GROQ_API_KEY) dan dipakai lewat Edge Function ai-chat.
                </Notice>
                <Field label="Penyedia model">
                  <Select value={settings.provider} onChange={(e) => updateSettings({ provider: e.target.value })}>
                    <option>Groq</option>
                  </Select>
                </Field>
                <Field label="Nama model" hint="Kosongkan untuk memakai model bawaan server.">
                  <Input value={settings.model} onChange={(e) => updateSettings({ model: e.target.value.trim() })} placeholder="mis. llama-3.3-70b-versatile" />
                </Field>
                <Button onClick={() => void testAi()} disabled={aiBusy || !user}>
                  {aiBusy ? 'Memeriksa...' : 'Cek koneksi AI'}
                </Button>
                {!user && <p className="text-xs text-mute">Masuk dengan akun untuk memeriksa koneksi.</p>}
                {aiErr && <Notice>{aiErr}</Notice>}
                {ai && !ai.configured && <Notice>Kunci Groq belum dipasang. Tambahkan secret GROQ_API_KEY di Supabase (Edge Functions → Secrets).</Notice>}
                {ai && ai.configured && ai.valid === false && <Notice>Kunci terpasang tetapi ditolak Groq. Periksa kuncinya.</Notice>}
                {ai && ai.valid && (
                  <div className="space-y-2">
                    <Badge tone="brand">Terhubung ke Groq</Badge>
                    <p className="text-xs text-mute">Model bawaan server: {ai.model}. Ketuk untuk memakai model lain:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(ai.models ?? []).map((m) => (
                        <button
                          key={m}
                          onClick={() => updateSettings({ model: m })}
                          className={cn('rounded-md border px-2 py-1 font-mono text-[11px]', settings.model === m ? 'border-brand text-brand' : 'border-line text-mute hover:text-ink')}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {sec === 'voice' && (
              <div className="max-w-md space-y-4">
                <Notice>Suara karyawan AI belum diimplementasikan. Pengaturan ini baru mencatat preferensi.</Notice>
                <Field label="Penyedia suara">
                  <Select value={settings.voiceProvider} onChange={(e) => updateSettings({ voiceProvider: e.target.value })}>
                    <option>ElevenLabs</option>
                    <option>Browser (Web Speech)</option>
                  </Select>
                </Field>
                <Row title="Aktifkan suara" desc="Tidak berpengaruh sampai backend suara tersedia.">
                  <Toggle label="Aktifkan suara" checked={settings.voiceEnabled} onChange={(v) => updateSettings({ voiceEnabled: v })} />
                </Row>
              </div>
            )}

            {sec === 'perm' && (
              <div>
                <p className="mb-2 text-[13px] text-mute">Tindakan di bawah ini wajib menunggu persetujuan CEO.</p>
                {Object.keys(settings.needApproval).map((k) => (
                  <Row key={k} title={k}>
                    <Toggle
                      label={`Wajib persetujuan: ${k}`}
                      checked={settings.needApproval[k]}
                      onChange={(v) => updateSettings({ needApproval: { ...settings.needApproval, [k]: v } })}
                    />
                  </Row>
                ))}
              </div>
            )}

            {sec === 'notify' && (
              <div>
                {[
                  ['approvals', 'Persetujuan baru'],
                  ['taskDone', 'Tugas selesai'],
                  ['taskFailed', 'Tugas gagal'],
                  ['dailyDigest', 'Ringkasan harian'],
                ].map(([k, label]) => (
                  <Row key={k} title={label}>
                    <Toggle label={label} checked={!!settings.notify[k]} onChange={(v) => updateSettings({ notify: { ...settings.notify, [k]: v } })} />
                  </Row>
                ))}
                <p className="mt-3 text-xs text-mute">Pengiriman notifikasi ke email atau ponsel belum aktif. Pengaturan ini baru tersimpan sebagai preferensi.</p>
              </div>
            )}

            {sec === 'integ' && (
              <div>
                <Row title="Supabase" desc={enabled && user ? `Login sebagai ${user.email ?? 'akun Anda'}. Data tersimpan di database.` : 'Variabel VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum diisi.'}>
                  <Badge tone={enabled && user ? (sync === 'error' ? 'danger' : 'brand') : 'neutral'}>
                    {enabled && user ? (sync === 'error' ? 'Gagal menyimpan' : 'Terhubung') : 'Belum dikonfigurasi'}
                  </Badge>
                </Row>
                <Row
                  title="Groq (model AI)"
                  desc={
                    groq === 'ok'
                      ? `Model bawaan server: ${groqModel}`
                      : groq === 'nokey'
                        ? 'Tambahkan secret GROQ_API_KEY di Supabase: Edge Functions, Secrets.'
                        : groq === 'rejected'
                          ? 'Kunci terpasang tetapi ditolak Groq. Periksa kuncinya.'
                          : groq === 'error'
                            ? groqErr
                            : 'Dipakai untuk chat dan fitur AI.'
                  }
                >
                  <div className="flex items-center gap-2">
                    <Badge tone={groqBadge[groq].tone}>{groqBadge[groq].label}</Badge>
                    {user && groq !== 'checking' && (
                      <Button size="sm" onClick={() => void checkGroq()}>
                        Periksa
                      </Button>
                    )}
                  </div>
                </Row>
                <Row title={settings.voiceProvider} desc="Suara karyawan AI. Fitur suara belum dibangun.">
                  <Badge>Belum diimplementasikan</Badge>
                </Row>
                <Row title="GrabMerchant" desc="Butuh akses API resmi dari GrabMerchant. Sampai itu ada, catat penjualan manual di Analytics.">
                  <Badge tone="warn">Butuh akses resmi</Badge>
                </Row>
              </div>
            )}

            {sec === 'security' && (
              <div className="max-w-lg space-y-4">
                {enabled && user ? (
                  <>
                    <Row title="Akun" desc={user.email ?? ''}>
                      <Button onClick={() => void signOut()}>Keluar</Button>
                    </Row>
                    <Row title="Sinkronisasi Supabase" desc="Data tersimpan di akun ini dan tersedia di perangkat lain.">
                      <Badge tone={sync === 'error' ? 'danger' : sync === 'saving' ? 'warn' : 'brand'}>
                        {sync === 'error' ? 'Gagal menyimpan' : sync === 'saving' ? 'Menyimpan' : 'Tersimpan'}
                      </Badge>
                    </Row>
                  </>
                ) : (
                  <Notice tone="info">Mode lokal: Supabase belum dikonfigurasi, data tersimpan di browser ini saja.</Notice>
                )}
                <Row title="Hapus semua data" desc="Menghapus tugas, persetujuan, toko, data analitik, aset, catatan, dan pengaturan dari akun ini.">
                  <Button variant="danger" onClick={() => setReset(true)}>
                    Hapus
                  </Button>
                </Row>
              </div>
            )}
          </div>
        </Card>
      </div>
      <ConfirmDialog
        open={reset}
        onClose={() => setReset(false)}
        title="Hapus semua data?"
        desc="Seluruh data Anda di akun ini akan terhapus permanen dan tidak bisa dikembalikan."
        confirmLabel="Hapus semua"
        danger
        onConfirm={() => {
          resetAll()
          setName('CEO')
          setEmail('')
          setCompany('Grab AI Company')
          toast('Semua data dihapus.', 'info')
        }}
      />
    </div>
  )
}
