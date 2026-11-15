import { useState } from 'react'
import { Button, Card, Field, Input, Notice } from '../components/ui'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<Record<string, string>>({})
  const [info, setInfo] = useState('')

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Format email tidak valid.'
    if (password.length < 8) e.password = 'Kata sandi minimal 8 karakter.'
    setErr(e)
    setInfo('')
    if (Object.keys(e).length || !supabase) return
    setBusy(true)
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) setErr({ form: error.message })
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) setErr({ form: error.message })
        else if (!data.session) setInfo('Akun dibuat. Buka email Anda dan konfirmasi, lalu masuk.')
      }
    } catch {
      setErr({ form: 'Tidak bisa terhubung ke server. Periksa koneksi internet lalu coba lagi.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-canvas" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight">Grab AI Company</h1>
            <p className="text-xs text-mute">{mode === 'in' ? 'Masuk sebagai CEO' : 'Buat akun CEO'}</p>
          </div>
        </div>
        <form
          className="space-y-4"
          onSubmit={(ev) => {
            ev.preventDefault()
            void submit()
          }}
        >
          <Field label="Email" error={err.email}>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Kata sandi" error={err.password}>
            <Input
              type="password"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {err.form && <Notice>{err.form}</Notice>}
          {info && <Notice tone="info">{info}</Notice>}
          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? 'Memproses...' : mode === 'in' ? 'Masuk' : 'Daftar'}
          </Button>
        </form>
        <button
          className="mt-4 w-full text-center text-[13px] text-mute hover:text-ink"
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in')
            setErr({})
            setInfo('')
          }}
        >
          {mode === 'in' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
        </button>
      </Card>
    </div>
  )
}
