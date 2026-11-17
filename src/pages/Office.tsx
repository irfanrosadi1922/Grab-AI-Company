import { useEffect, useRef, useState } from 'react'
import { Users, Trash2, UserRound, Save, Plus, Minus, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { Avatar, Button, Card, PageHeader } from '../components/ui'
import { EMPLOYEES } from '../data/employees'
import { getPlacedFurniture, type PlacedFurniture } from '../lib/officeFurniture'

type Looks = Record<string, string>
type EmployeeId = (typeof EMPLOYEES)[number]['id']
const LOOKS_KEY = 'grab-ai-agent-looks-v1'
const DEFAULT_FIGURE = 'hd-180-1.ch-210-66.lg-270-82.sh-290-80'
const readLooks = (): Looks => { try { return JSON.parse(localStorage.getItem(LOOKS_KEY) || '{}') as Looks } catch { return {} } }
const avatarUrl = (figure: string) => 'https://www.habboassets.com/imaging/avatar.png?figure=' + encodeURIComponent(figure) + '&direction=2&size=l'

export default function Office() {
  const [furniture, setFurniture] = useState<PlacedFurniture[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [looks, setLooks] = useState<Looks>({})
  const [agentId, setAgentId] = useState<EmployeeId>(EMPLOYEES[0].id)
  const [figure, setFigure] = useState(DEFAULT_FIGURE)
  const [zoom, setZoom] = useState(1)
  const pointers = useRef<Map<number, {x:number;y:number}>>(new Map())
  const pinchStart = useRef<{distance:number;zoom:number}|null>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; pointer: number; dx: number; dy: number } | null>(null)

  useEffect(() => {
    const refresh = () => setFurniture(getPlacedFurniture())
    refresh(); setLooks(readLooks())
    window.addEventListener('office-furniture-updated', refresh)
    return () => window.removeEventListener('office-furniture-updated', refresh)
  }, [])
  useEffect(() => { setFigure(looks[agentId] || DEFAULT_FIGURE) }, [agentId, looks])

  const saveFurniture = (next: PlacedFurniture[]) => {
    localStorage.setItem('grab-ai-office-furniture-v2', JSON.stringify(next))
    setFurniture(next)
    window.dispatchEvent(new CustomEvent('office-furniture-updated'))
  }
  const distance = (a:{x:number;y:number},b:{x:number;y:number}) => Math.hypot(a.x-b.x,a.y-b.y)
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY})
    if (pointers.current.size===2) {
      const pts=[...pointers.current.values()]
      pinchStart.current={distance:distance(pts[0],pts[1]),zoom}
      drag.current=null
    }
  }
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY})
    if (pointers.current.size===2 && pinchStart.current) {
      const pts=[...pointers.current.values()]
      const next=pinchStart.current.zoom*distance(pts[0],pts[1])/Math.max(1,pinchStart.current.distance)
      setZoom(Math.max(.5,Math.min(2.5,next)))
      drag.current=null
      return
    }
    moveDrag(e)
  }
  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size<2) pinchStart.current=null
    endDrag(e)
  }
  const startDrag = (e: React.PointerEvent<HTMLDivElement>, item: PlacedFurniture) => {
    if (pointers.current.size>1) return;
    if ((e.target as HTMLElement).closest('[data-resize-control]')) return
    const el = canvas.current
    if (!el) return
    const r = e.currentTarget.getBoundingClientRect()
    drag.current = { id: item.classname, pointer: e.pointerId, dx: e.clientX-r.left-r.width/2, dy: e.clientY-r.top-r.height/2 }
    el.setPointerCapture(e.pointerId)
    setSelected(item.classname)
    e.preventDefault()
  }
  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d=drag.current, el=canvas.current
    if (!d || d.pointer!==e.pointerId || !el) return
    const r=el.getBoundingClientRect()
    const x=Math.max(5,Math.min(95,((e.clientX-r.left-d.dx)/(r.width*zoom))*100))
    const y=Math.max(8,Math.min(92,((e.clientY-r.top-d.dy)/(r.height*zoom))*100))
    setFurniture(old=>old.map((it,i)=>it.classname===d.id?{...it,x,y}:it.x==null||it.y==null?{...it,x:20+(i%4)*20,y:25+Math.floor(i/4)*22}:it))
  }
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointer!==e.pointerId) return
    drag.current=null
    setFurniture(current=>{ localStorage.setItem('grab-ai-office-furniture-v2',JSON.stringify(current)); return current })
  }
  const resizeItem = (id: string, delta: number) => {
    const next=furniture.map((it,i)=>it.classname===id?{...it,size:Math.max(64,Math.min(240,(it.size??112)+delta))}:it)
    saveFurniture(next)
  }
  const saveLook = () => {
    const next={...looks,[agentId]:figure.trim()}
    localStorage.setItem(LOOKS_KEY,JSON.stringify(next)); setLooks(next)
  }

  return <div className="space-y-4">
    <PageHeader title="Kantor" desc="Atur tata letak kantor dan pilih tampilan setiap agen AI." />
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div><p className="text-sm font-semibold">Kanvas kantor</p><p className="text-xs text-mute">{furniture.length} furniture · sentuh lalu geser</p></div>
        <div className="flex items-center gap-2"><button type="button" aria-label="Perkecil kanvas" onClick={()=>setZoom(z=>Math.max(.5,+(z-.15).toFixed(2)))} className="rounded-lg border border-line bg-card p-2"><ZoomOut size={16}/></button><span className="min-w-10 text-center text-xs tabular-nums">{Math.round(zoom*100)}%</span><button type="button" aria-label="Perbesar kanvas" onClick={()=>setZoom(z=>Math.min(2.5,+(z+.15).toFixed(2)))} className="rounded-lg border border-line bg-card p-2"><ZoomIn size={16}/></button><button type="button" aria-label="Reset zoom" onClick={()=>setZoom(1)} className="rounded-lg border border-line bg-card p-2"><RotateCcw size={16}/></button></div>
        {selected && <Button size="sm" variant="danger" icon={Trash2} onClick={()=>{saveFurniture(furniture.filter(x=>x.classname!==selected));setSelected(null)}}>Hapus pilihan</Button>}
      </div>
      <div ref={canvas} onPointerDown={handleCanvasPointerDown} onPointerMove={handleCanvasPointerMove} onPointerUp={handleCanvasPointerUp} onPointerCancel={handleCanvasPointerUp} className="relative min-h-[58dvh] overflow-hidden bg-white" style={{backgroundImage:'linear-gradient(#d9d5cc 1px, transparent 1px),linear-gradient(90deg,#d9d5cc 1px,transparent 1px)',backgroundSize:`${24*zoom}px ${24*zoom}px`,touchAction:'none'}}>
        <div className="absolute inset-0 origin-center" style={{transform:`scale(${zoom})`}}>
          <div className="absolute left-[3%] right-[3%] top-[3%] flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div><p className="text-[10px] font-bold tracking-[0.22em] text-slate-500">GRAB AI COMPANY</p><p className="text-sm font-bold text-slate-800">AI Operations Office</p></div>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">TEAM WORKSPACE</span>
          </div>
          <div className="absolute left-[3%] right-[3%] top-[17%] h-[37%] rounded-2xl border-2 border-slate-200 bg-slate-50/80">
            <p className="absolute left-3 top-2 text-[9px] font-bold tracking-wider text-slate-400">TEAM WORKSTATIONS</p>
            {EMPLOYEES.map((employee,i)=>{const pos=[{x:13,y:39},{x:37,y:39},{x:63,y:39},{x:87,y:39},{x:13,y:78},{x:37,y:78},{x:63,y:78},{x:87,y:78}][i];return <div key={employee.id} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{left:pos.x+"%",top:pos.y+"%"}}><div className="flex h-9 w-12 items-center justify-center rounded-lg border border-slate-300 bg-white text-xl shadow-sm">🖥️</div><div className="mt-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-center shadow-sm"><p className="text-[9px] font-bold text-slate-800">{employee.name}</p><p className="max-w-[76px] truncate text-[8px] text-slate-500">{employee.role}</p></div></div>})}
          </div>
          <div className="absolute bottom-[5%] left-[3%] flex h-[23%] w-[43%] flex-col items-center justify-center rounded-2xl border-2 border-amber-200 bg-amber-50">
            <span className="text-2xl">🪑</span><p className="mt-1 text-[10px] font-bold text-amber-900">MEETING ROOM</p><p className="text-[8px] text-amber-700">Team briefing &amp; planning</p><div className="mt-2 flex gap-2 text-lg">🪑　🪑　🪑</div>
          </div>
          <div className="absolute bottom-[5%] right-[3%] flex h-[23%] w-[43%] flex-col items-center justify-center rounded-2xl border-2 border-indigo-200 bg-indigo-50">
            <span className="text-2xl">👑</span><p className="mt-1 text-[10px] font-bold text-indigo-900">DIRECTOR OFFICE · JOKO</p><p className="text-[8px] text-indigo-700">AI Managing Director</p><div className="mt-1 text-lg">🖥️　🪴</div>
          </div>
          {furniture.map((item,i)=>{const size=item.size??112;return <div key={item.classname} onPointerDown={e=>startDrag(e,item)} role="button" tabIndex={0} onClick={()=>setSelected(item.classname)} aria-label={"Pindahkan "+item.name} className={`absolute flex flex-col items-center justify-center rounded-xl border p-2 text-center shadow-sm select-none ${selected===item.classname?"z-10 border-brand bg-brand/10 ring-2 ring-brand/30":"border-transparent bg-transparent"}`} style={{left:(item.x??(20+(i%4)*20))+"%",top:(item.y??(25+Math.floor(i/4)*22))+"%",width:size,height:size,touchAction:"none",transform:"translate(-50%,-50%)"}}><img src={item.image} alt={item.name} draggable={false} className="pointer-events-none h-[78%] w-full object-contain"/><span className="mt-1 line-clamp-1 w-full text-[10px] text-[#45423c]">{item.name}</span>{selected===item.classname&&<div data-resize-control className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border border-line bg-white p-1 shadow"><button type="button" aria-label="Perkecil" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();resizeItem(item.classname,-16)}} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-800"><Minus size={16}/></button><button type="button" aria-label="Perbesar" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();resizeItem(item.classname,16)}} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-800"><Plus size={16}/></button></div>}</div>})}
        </div>
      </div>
    </Card>
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2"><UserRound size={18}/><h2 className="text-sm font-semibold">Personalisasi karakter agen</h2></div>
      <p className="text-xs text-mute">Pilih agen dan gunakan figure string dari Habbo Avatar Imager. Setiap agen menyimpan tampilan sendiri.</p>
      <select className="h-10 w-full rounded-ctl border border-line bg-canvas px-3 text-sm" value={agentId} onChange={e=>setAgentId(e.target.value as EmployeeId)}>{EMPLOYEES.map(x=><option key={x.id} value={x.id}>{x.name} — {x.role}</option>)}</select>
      <div className="flex items-center gap-4 rounded-xl border border-line bg-canvas p-3"><div className="flex h-36 w-24 items-center justify-center rounded-lg bg-[#e7e8e6]"><img src={avatarUrl(figure||DEFAULT_FIGURE)} alt="Pratinjau avatar" className="max-h-full max-w-full object-contain"/></div><div><p className="text-sm font-semibold">{EMPLOYEES.find(x=>x.id===agentId)?.name}</p><a className="mt-2 inline-block text-xs text-brand underline" href="https://www.habboassets.com/imager?type=avatar" target="_blank" rel="noreferrer">Buka Habbo Avatar Imager</a></div></div>
      <label className="block space-y-1"><span className="text-xs font-medium">Figure string Habbo</span><input className="h-10 w-full rounded-ctl border border-line bg-canvas px-3 text-xs" value={figure} onChange={e=>setFigure(e.target.value)} placeholder={DEFAULT_FIGURE}/></label>
      <Button icon={Save} onClick={saveLook} disabled={!figure.trim()}>Simpan tampilan agen</Button>
    </Card>
    <section className="space-y-2"><h2 className="text-sm font-semibold">Tim kantor</h2><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{EMPLOYEES.map(x=><button key={x.id} onClick={()=>setAgentId(x.id)} className={`flex items-center gap-3 rounded-ctl border px-3 py-2.5 text-left ${agentId===x.id?'border-brand bg-brand/5':'border-line bg-card'}`}><Avatar id={x.id} size={36}/><span className="min-w-0"><span className="block truncate text-[13px] font-semibold">{x.name}</span><span className="block truncate text-xs text-mute">{x.role}</span></span></button>)}</div></section>
  </div>
}
