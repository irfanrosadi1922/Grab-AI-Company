import { useEffect, useRef, useState } from 'react'
import { Coffee, Home, MessageCircle, Pause, Play, Presentation, Sofa, Users, Utensils } from 'lucide-react'
import { Avatar, Button, Card, ErrorState, Notice, PageHeader } from '../components/ui'
import { useApp } from '../state/AppState'
import { EMPLOYEES } from '../data/employees'
import { workState } from '../lib/work'
import { cn } from '../lib/format'
import { OfficeEngine } from '../office/engine'
import type { AgentInfo, Act } from '../office/sim'
import type { EmployeeId } from '../types'

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

export default function Office() {
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
