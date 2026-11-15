import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  CheckSquare,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Megaphone,
  MoreHorizontal,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Users,
  Video,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../lib/format'
import { useApp } from '../state/AppState'
import { EMPLOYEES } from '../data/employees'
import { Badge } from './ui'
import { Modal, ToastHost } from './Overlays'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employees', label: 'AI Employees', icon: Users },
  { to: '/meeting', label: 'AI Meeting Room', icon: Video },
  { to: '/tasks', label: 'Task Center', icon: CheckSquare },
  { to: '/marketing', label: 'Marketing Studio', icon: Megaphone },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/stores', label: 'Grab Stores', icon: Store },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/approvals', label: 'Approval Center', icon: ShieldCheck },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-canvas" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
      <span className="text-[15px] font-bold leading-tight tracking-tight">
        Grab AI
        <br />
        Company
      </span>
    </div>
  )
}

export function Sidebar() {
  const { approvals } = useApp()
  const pending = approvals.filter((a) => !a.decision).length
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
      <div className="px-5 pb-4 pt-5">
        <BrandMark />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Navigasi utama">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex h-10 items-center gap-3 rounded-ctl px-3 text-[13px] font-medium transition-colors',
                isActive ? 'bg-raised text-ink' : 'text-mute hover:bg-raised/60 hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? 'text-brand' : ''} aria-hidden />
                <span className="flex-1 truncate">{label}</span>
                {to === '/approvals' && pending > 0 && (
                  <span className="tabular rounded-full bg-warn/20 px-1.5 text-[11px] font-semibold text-warn">{pending}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export function BottomNav() {
  const [more, setMore] = useState(false)
  const loc = useLocation()
  const primary = [NAV[0], NAV[2], NAV[3], NAV[8]]
  const restActive = !primary.some((n) => (n.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(n.to)))
  const { approvals } = useApp()
  const pending = approvals.filter((a) => !a.decision).length

  useEffect(() => setMore(false), [loc.pathname])

  return (
    <>
      <nav
        aria-label="Navigasi bawah"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {primary.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn('relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium', isActive ? 'text-brand' : 'text-mute')
                }
              >
                <Icon size={20} aria-hidden />
                {label.replace('AI ', '').replace(' Center', '').replace(' Room', '')}
                {to === '/approvals' && pending > 0 && (
                  <span className="absolute right-[26%] top-2 h-2 w-2 rounded-full bg-warn" aria-label={`${pending} menunggu`} />
                )}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              onClick={() => setMore(true)}
              className={cn('flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium', restActive ? 'text-brand' : 'text-mute')}
            >
              <MoreHorizontal size={20} aria-hidden />
              More
            </button>
          </li>
        </ul>
      </nav>
      <Modal open={more} onClose={() => setMore(false)} title="Menu lainnya">
        <ul className="grid grid-cols-2 gap-2">
          {NAV.filter((n) => !primary.includes(n)).map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className="flex h-14 items-center gap-3 rounded-ctl border border-line px-3 text-[13px] font-medium hover:bg-raised"
              >
                <Icon size={18} className="text-brand" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}

export function Topbar() {
  const { settings, approvals, tasks, sync, userId, retrySave } = useApp()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const [bell, setBell] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setFocus(false)
        setBell(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    const pages = NAV.filter((n) => n.label.toLowerCase().includes(s)).map((n) => ({ key: n.to, label: n.label, hint: 'Halaman', to: n.to }))
    const emps = EMPLOYEES.filter((e) => (e.name + e.role).toLowerCase().includes(s)).map((e) => ({
      key: 'e' + e.id,
      label: `${e.name} · ${e.role}`,
      hint: 'Karyawan AI',
      to: '/employees?open=' + e.id,
    }))
    const tk = tasks
      .filter((t) => (t.title + t.id).toLowerCase().includes(s))
      .slice(0, 4)
      .map((t) => ({ key: t.id, label: t.title, hint: 'Tugas ' + t.id, to: '/tasks?open=' + t.id }))
    return [...pages, ...emps, ...tk].slice(0, 8)
  }, [q, tasks])

  const pending = approvals.filter((a) => !a.decision)
  const failed = tasks.filter((t) => t.status === 'Failed')
  const notifCount = pending.length + failed.length

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur lg:px-8">
      <div className="lg:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-canvas" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
      </div>

      <div ref={boxRef} className="relative flex min-w-0 flex-1 items-center gap-3 lg:max-w-xl">
        <div className="relative w-full">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocus(true)}
            placeholder="Cari halaman, karyawan, tugas"
            aria-label="Pencarian global"
            className="h-10 w-full rounded-ctl border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-mute/70 focus:border-brand focus:outline-none"
          />
          {focus && q.trim() && (
            <div className="absolute inset-x-0 top-12 overflow-hidden rounded-ctl border border-line bg-raised shadow-pop">
              {results.length === 0 ? (
                <p className="px-4 py-3 text-[13px] text-mute">Tidak ada hasil untuk "{q}".</p>
              ) : (
                <ul>
                  {results.map((r) => (
                    <li key={r.key}>
                      <button
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[13px] hover:bg-surface"
                        onClick={() => {
                          nav(r.to)
                          setQ('')
                          setFocus(false)
                        }}
                      >
                        <span className="truncate">{r.label}</span>
                        <span className="shrink-0 text-xs text-mute">{r.hint}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {userId && (
          <button
            onClick={() => sync === 'error' && retrySave()}
            aria-live="polite"
            title={sync === 'error' ? 'Ketuk untuk mencoba lagi' : undefined}
            className={cn(
              'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium',
              sync === 'error' ? 'border-danger/40 text-danger' : 'border-line text-mute',
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', sync === 'error' ? 'bg-danger' : sync === 'saving' ? 'bg-warn' : 'bg-brand')} />
            {sync === 'error' ? 'Gagal, ulangi' : sync === 'saving' ? 'Menyimpan' : 'Tersimpan'}
          </button>
        )}

        <div className="relative">
          <button
            aria-label={`Notifikasi, ${notifCount} item`}
            onClick={() => setBell((b) => !b)}
            className="relative flex h-10 w-10 items-center justify-center rounded-ctl text-mute hover:bg-raised hover:text-ink"
          >
            <Bell size={18} aria-hidden />
            {notifCount > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-warn" />}
          </button>
          {bell && (
            <div className="absolute right-0 top-12 w-72 overflow-hidden rounded-ctl border border-line bg-raised shadow-pop">
              <p className="border-b border-line px-4 py-2.5 text-xs font-semibold text-mute">Perlu perhatian</p>
              {notifCount === 0 ? (
                <p className="px-4 py-4 text-[13px] text-mute">Tidak ada notifikasi.</p>
              ) : (
                <ul>
                  {pending.length > 0 && (
                    <li>
                      <button
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] hover:bg-surface"
                        onClick={() => {
                          nav('/approvals')
                          setBell(false)
                        }}
                      >
                        Persetujuan menunggu <Badge tone="warn">{pending.length}</Badge>
                      </button>
                    </li>
                  )}
                  {failed.length > 0 && (
                    <li>
                      <button
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] hover:bg-surface"
                        onClick={() => {
                          nav('/tasks')
                          setBell(false)
                        }}
                      >
                        Tugas gagal <Badge tone="danger">{failed.length}</Badge>
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => nav('/settings')}
        className="ml-auto flex items-center gap-2.5 rounded-ctl py-1 pl-1 pr-2 hover:bg-raised"
        aria-label="Profil dan pengaturan"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-raised text-sm font-semibold text-brand">
          {settings.ceoName.trim()[0]?.toUpperCase() ?? 'C'}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[13px] font-semibold">{settings.ceoName}</span>
          <span className="block text-xs text-mute">Pemilik bisnis</span>
        </span>
        <ChevronDown size={14} className="hidden text-mute sm:block" aria-hidden />
      </button>
    </header>
  )
}

export function AppShell() {
  const loc = useLocation()
  const main = useRef<HTMLElement>(null)
  useEffect(() => {
    main.current?.scrollTo({ top: 0 })
  }, [loc.pathname])
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main ref={main} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-24 pt-5 lg:px-8 lg:pb-10 lg:pt-6">
          <div className="mx-auto w-full min-w-0 max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
      <ToastHost />
    </div>
  )
}

