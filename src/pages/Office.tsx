import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent } from 'react'
import { Coffee, Home, MessageCircle, Minus, Pause, Play, Plus, Presentation, Sofa, Users, Utensils } from 'lucide-react'
import { Avatar, Button, Card, ErrorState, IconButton, Notice, PageHeader } from '../components/ui'
import { useApp } from '../state/AppState'
import { EMPLOYEES } from '../data/employees'
import { workState } from '../lib/work'
import { cn } from '../lib/format'
import { OfficeEngine } from '../office/engine'
import type { AgentInfo, Act } from '../office/sim'
import type { EmployeeId } from '../types'
import { HQ_H, HQ_ROOMS, HQ_W } from '../office/hqRooms'

const ICON: Record<Act, typeof Coffee> = {
  work: Users,
  walk: Users,
  chat: MessageCircle,
  coffee: Coffee,
  eat: Utensils,
  rest: Sofa,
  meeting: Presentation,
  off: Users,
}

function Office3D() {
  const { tasks, settings } = useApp()
  const box = useRef<HTMLDivElement>(null)
  const engine = useRef<OfficeEngine | null>(null)
  const [info, setInfo] = useState<AgentInfo[]>([])
  const [sel, setSel] = useState<EmployeeId | null>(null)
  const [paused, setPaused] = useState(false)
  const [meeting, setMeeting] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!box.current) return
    try {
      const eng = new OfficeEngine(
        box.current,
        EMPLOYEES.map((e) => ({ id: e.id, name: e.name, hue: e.hue })),
        { onInfo: (l) => setInfo(l), onSelect: (id) => setSel(id) },
      )
      engine.current = eng
      setInfo(eng.sim.info())
    } catch {
      setFailed(true)
    }
    return () => {
      engine.current?.dispose()
      engine.current = null
    }
  }, [])

  // Karyawan yang sedang mengerjakan tugas lebih jarang meninggalkan meja; karyawan nonaktif tetap di mejanya.
  useEffect(() => {
    const eng = engine.current
    if (!eng) return
    eng.sim.workWeight = (id) => (workState(id, tasks, settings.employeeEnabled[id]) === 'Bekerja' ? 0.35 : 1)
    for (const e of EMPLOYEES) eng.sim.setEnabled(e.id, settings.employeeEnabled[e.id])
  }, [tasks, settings.employeeEnabled, failed])

  useEffect(() => {
    const t = setInterval(() => setMeeting(engine.current?.sim.meetingActive() ?? false), 700)
    return () => clearInterval(t)
  }, [])

  const pick = (id: EmployeeId) => {
    setSel(id)
    engine.current?.follow(id)
  }

  if (failed) {
    return <ErrorState title="3D tidak bisa ditampilkan" desc="Perangkat atau browser ini tidak mendukung WebGL. Coba browser lain." onRetry={() => window.location.reload()} />
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Kantor 3D" desc="Pantau karyawan AI di dalam gedung. Geser untuk memutar, cubit untuk zoom, ketuk karyawan untuk mengikuti." />
      <Notice tone="info">
        Ini visualisasi. Gerakan, obrolan, dan jam istirahat adalah simulasi dan bukan pekerjaan AI yang sebenarnya. Satu-satunya yang nyata: karyawan yang sedang mengerjakan tugas Anda lebih jarang meninggalkan meja, dan karyawan nonaktif tetap duduk di mejanya.
      </Notice>

      <Card className="overflow-hidden">
        <div className="relative">
          <div ref={box} className="h-[58dvh] min-h-[380px] w-full touch-none bg-canvas" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={meeting ? 'danger' : 'primary'}
              icon={Presentation}
              onClick={() => {
                if (meeting) engine.current?.sim.dismissMeeting()
                else engine.current?.sim.callMeeting()
                setMeeting(engine.current?.sim.meetingActive() ?? false)
              }}
            >
              {meeting ? 'Bubarkan rapat' : 'Panggil rapat'}
            </Button>
            <Button
              size="sm"
              icon={paused ? Play : Pause}
              onClick={() => {
                engine.current?.setPaused(!paused)
                setPaused(!paused)
              }}
            >
              {paused ? 'Lanjut' : 'Jeda'}
            </Button>
            <Button
              size="sm"
              icon={Home}
              onClick={() => {
                setSel(null)
                engine.current?.home()
              }}
            >
              Tampilan awal
            </Button>
          </div>
        </div>
      </Card>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {EMPLOYEES.map((e) => {
          const a = info.find((x) => x.id === e.id)
          const Icon = ICON[a?.act ?? 'work']
          return (
            <li key={e.id}>
              <button
                onClick={() => pick(e.id)}
                aria-pressed={sel === e.id}
                className={cn('flex w-full items-center gap-3 rounded-ctl border px-3 py-2.5 text-left transition-colors', sel === e.id ? 'border-brand bg-brand/5' : 'border-line hover:bg-raised')}
              >
                <Avatar id={e.id} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{e.name}</span>
                  <span className="block truncate text-xs text-mute">{a?.label ?? 'Bekerja di meja'}</span>
                </span>
                <Icon size={16} className="shrink-0 text-mute" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface View {
  k: number
  x: number
  y: number
}

/** Markas isometrik pixel-art (SVG vektor): geser, cubit untuk zoom, ketuk nama ruangan untuk mendekat. */
function HqView() {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [v, setV] = useState<View>({ k: 1, x: 0, y: 0 })
  const [anim, setAnim] = useState(false)
  const [room, setRoom] = useState<string | null>(null)
  const ptrs = useRef(new Map<number, { x: number; y: number }>())
  const last = useRef<{ d: number; cx: number; cy: number } | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const base = size.w ? size.w / HQ_W : 1
  const imgW = HQ_W * base
  const imgH = HQ_H * base

  const clamp = (n: View): View => {
    const k = Math.min(12, Math.max(1, n.k))
    const cw = imgW * k
    const ch = imgH * k
    const fix = (pos: number, content: number, view: number) => (content <= view ? (view - content) / 2 : Math.min(0, Math.max(view - content, pos)))
    return { k, x: fix(n.x, cw, size.w), y: fix(n.y, ch, size.h) }
  }

  // Zoom di sekitar titik layar (px, py)
  const zoomAt = (nk: number, px: number, py: number, from: View = v) => {
    const k = Math.min(12, Math.max(1, nk))
    const r = k / from.k
    return clamp({ k, x: px - (px - from.x) * r, y: py - (py - from.y) * r })
  }

  const reset = () => {
    setAnim(true)
    setRoom(null)
    setV(clamp({ k: 1, x: 0, y: 0 }))
  }

  const focus = (id: string) => {
    const r = HQ_ROOMS.find((x) => x.id === id)
    if (!r || !size.w) return
    const k = Math.min(8, Math.max(2.2, (size.w / (r.span * 32 * base * 1.1)) * 0.9))
    setAnim(true)
    setRoom(id)
    setV(clamp({ k, x: size.w / 2 - r.cx * base * k, y: size.h / 2 - r.cy * base * k }))
  }

  const onDown = (e: RPointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    last.current = null
    setAnim(false)
  }
  const onMove = (e: RPointerEvent) => {
    const m = ptrs.current
    const prev = m.get(e.pointerId)
    if (!prev) return
    const rect = box.current?.getBoundingClientRect()
    if (!rect) return
    m.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (m.size === 1) {
      setV((c) => clamp({ ...c, x: c.x + e.clientX - prev.x, y: c.y + e.clientY - prev.y }))
    } else if (m.size >= 2) {
      const [a, b] = [...m.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const cx = (a.x + b.x) / 2 - rect.left
      const cy = (a.y + b.y) / 2 - rect.top
      const l = last.current
      last.current = { d, cx, cy }
      if (l && l.d > 0) setV((c) => zoomAt(c.k * (d / l.d), cx, cy, { ...c, x: c.x + cx - l.cx, y: c.y + cy - l.cy }))
    }
  }
  const onUp = (e: RPointerEvent) => {
    ptrs.current.delete(e.pointerId)
    last.current = null
  }
  const onWheel = (e: React.WheelEvent) => {
    const rect = box.current?.getBoundingClientRect()
    if (!rect) return
    const f = Math.exp(-e.deltaY * 0.0015)
    setAnim(false)
    setV((c) => zoomAt(c.k * f, e.clientX - rect.left, e.clientY - rect.top, c))
  }
  const step = (f: number) => {
    setAnim(true)
    setV((c) => zoomAt(c.k * f, size.w / 2, size.h / 2, c))
  }

  const src = `${import.meta.env.BASE_URL}hq/grab-ai-company.svg`

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="relative">
          <div
            ref={box}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onWheel={onWheel}
            className="h-[58dvh] min-h-[380px] w-full touch-none select-none overflow-hidden bg-[#20262b]"
          >
            <img
              src={src}
              alt="Denah markas Grab AI Company"
              draggable={false}
              style={{
                width: imgW,
                height: imgH,
                maxWidth: 'none',
                transformOrigin: '0 0',
                transform: `translate(${v.x}px, ${v.y}px) scale(${v.k})`,
                transition: anim ? 'transform 380ms ease' : 'none',
                imageRendering: 'auto',
              }}
            />
          </div>
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            <IconButton icon={Plus} label="Perbesar" className="bg-surface/90 border border-line" onClick={() => step(1.6)} />
            <IconButton icon={Minus} label="Perkecil" className="bg-surface/90 border border-line" onClick={() => step(1 / 1.6)} />
            <IconButton icon={Home} label="Tampilan awal" className="bg-surface/90 border border-line" onClick={reset} />
          </div>
        </div>
      </Card>
      <div>
        <h2 className="mb-2 text-[13px] font-semibold">Ketuk untuk mendekat ke ruangan</h2>
        <ul className="flex flex-wrap gap-2">
          {HQ_ROOMS.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => focus(r.id)}
                aria-pressed={room === r.id}
                className={cn('rounded-full border px-3 py-1.5 text-xs transition-colors', room === r.id ? 'border-brand bg-brand/10 font-semibold' : 'border-line hover:bg-raised')}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function Office() {
  const [mode, setMode] = useState<'hq' | '3d'>('hq')
  return (
    <div className="space-y-4">
      {mode === 'hq' ? <PageHeader title="Markas Perusahaan" desc="Denah isometrik pixel-art markas Grab AI Company dengan 14 ruangan. Geser untuk menjelajah, cubit untuk zoom." /> : null}
      <div className="flex gap-2">
        <Button size="sm" variant={mode === 'hq' ? 'primary' : 'outline'} onClick={() => setMode('hq')}>
          Markas
        </Button>
        <Button size="sm" variant={mode === '3d' ? 'primary' : 'outline'} onClick={() => setMode('3d')}>
          Kantor 3D (lama)
        </Button>
      </div>
      {mode === 'hq' ? <HqView /> : <Office3D />}
    </div>
  )
}
