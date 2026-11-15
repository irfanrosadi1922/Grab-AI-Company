import { useState } from 'react'
import { Badge, Button, Card, CardHeader, Field, Input, Notice, PageHeader, Select, Toggle } from '../components/ui'
import type { Tone } from '../components/ui'
import { ConfirmDialog } from '../components/Overlays'
import { useApp } from '../state/AppState'
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
  const { settings, updateSettings, toast, resetDemo } = useApp()
  const [sec, setSec] = useState<Sec>('ceo')
  const [name, setName] = useState(settings.ceoName)
  const [email, setEmail] = useState(settings.ceoEmail)
  const [company, setCompany] = useState(settings.companyName)
  const [err, setErr] = useState<Record<string, string>>({})
  const [reset, setReset] = useState(false)

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

  const integ: { name: string; note: string; state: string; tone: Tone }[] = [
    { name: 'GrabMerchant', note: 'Butuh akses API resmi.', state: 'Belum terhubung', tone: 'neutral' },
    { name: 'Supabase', note: 'Database dan Edge Functions.', state: 'Belum terhubung', tone: 'neutral' },
    { name: settings.provider, note: 'Penyedia model AI.', state: 'Belum terhubung', tone: 'neutral' },
    { name: settings.voiceProvider, note: 'Suara karyawan AI.', state: 'Belum terhubung', tone: 'neutral' },
  ]

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
                <Notice>Kunci API tidak boleh disimpan di browser. Kunci disimpan di sisi server (Supabase Edge Function secrets) saat backend dibuat.</Notice>
                <Field label="Penyedia model">
                  <Select value={settings.provider} onChange={(e) => updateSettings({ provider: e.target.value })}>
                    <option>Groq</option>
                    <option>Anthropic</option>
                    <option>OpenAI</option>
                  </Select>
                </Field>
                <Field label="Nama model" hint="Dicatat sebagai preferensi, belum dipakai.">
                  <Input value={settings.model} onChange={(e) => updateSettings({ model: e.target.value })} />
                </Field>
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
              <ul>
                {integ.map((i) => (
                  <li key={i.name}>
                    <Row title={i.name} desc={i.note}>
                      <Badge tone={i.tone}>{i.state}</Badge>
                    </Row>
                  </li>
                ))}
              </ul>
            )}

            {sec === 'security' && (
              <div className="max-w-lg space-y-4">
                <Notice tone="info">Belum ada akun atau login. Seluruh data tersimpan di browser ini saja. Autentikasi dan izin akses ditambahkan saat backend dibuat.</Notice>
                <Row title="Reset data demo" desc="Mengembalikan tugas, persetujuan, toko, aset, dan pengaturan ke kondisi awal.">
                  <Button variant="danger" onClick={() => setReset(true)}>
                    Reset
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
        title="Reset semua data demo?"
        desc="Perubahan yang Anda buat akan hilang dan tidak bisa dikembalikan."
        confirmLabel="Reset"
        danger
        onConfirm={() => {
          resetDemo()
          setName('CEO')
          setEmail('')
          setCompany('Grab AI Company')
          toast('Data dikembalikan ke kondisi awal.', 'info')
        }}
      />
    </div>
  )
}
