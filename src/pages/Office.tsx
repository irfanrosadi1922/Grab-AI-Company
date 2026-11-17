import { useEffect, useRef, useState } from 'react'
import { Users, Trash2, UserRound, Save } from 'lucide-react'
import { Avatar, Button, Card, PageHeader } from '../components/ui'
import { EMPLOYEES } from '../data/employees'
import { getPlacedFurniture, type PlacedFurniture } from '../lib/officeFurniture'

type Looks = Record<string, string>
const LOOKS_KEY = 'grab-ai-agent-looks-v1'
const DEFAULT_FIGURE = 'hd-180-1.ch-210-66.lg-270-82.sh-290-80'
const readLooks = (): Looks => { try { return JSON.parse(localStorage.getItem(LOOKS_KEY) || '{}') as Looks } catch { return {} } }
const avatarUrl = (figure: string) => 'https://www.habboassets.com/imaging/avatar.png?figure=' + encodeURIComponent(figure) + '&direction=2&size=l'

export default function Office() {
  const [furniture, setFurniture] = useState<PlacedFurniture[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [looks, setLooks] = useState<Looks>({})
  const [agentId, setAgentId] = useState(EMPLOYEES[0].id)
  const [figure, setFigure] = useState(DEFAULT_FIGURE)
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
  const startDrag = (e: React.PointerEvent<HTMLButtonElement>, item: PlacedFurniture) => {
    const r = e.currentTarget.getBoundingClientRect()
    drag.current = { id: item.classname, pointer: e.pointerId, dx: e.clientX-r.left-r.width/2, dy: e.clientY-r.top-r.height/2 }
    e.currentTarget.setPointerCapture(e.pointerId); setSelected(item.classname)
  }
  const moveDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d=drag.current, el=canvas.current
    if (!d || d.pointer!==e.pointerId || !el) return
    const r=el.getBoundingClientRect()
    const x=Math.max(5,Math.min(95,((e.clientX-r.left-d.dx)/r.width)*100))
    const y=Math.max(8,Math.min(92,((e.clientY-r.top-d.dy)/r.height)*100))
    setFurniture(old=>old.map((it,i)=>it.classname===d.id?{...it,x,y}:it.x==null||it.y==null?{...it,x:20+(i%4)*20,y:25+Math.floor(i/4)*22}:it))
  }
  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current || drag.current.pointer!==e.pointerId) return
    drag.current=null
    setFurniture(current=>{ localStorage.setItem('grab-ai-office-furniture-v2',JSON.stringify(current)); return current })
  }
  const saveLook = () => {
    const next={...looks,[agentId]:figure.trim()}
    localStorage.setItem(LOOKS_KEY,JSON.stringify(next)); setLooks(next)
  }

  return <div className="space-y-4">
    <PageHeader title="Kantor" desc="Atur tata letak kantor dan pilih tampilan setiap agen AI." />
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div><p className="text-sm font-semibold">Kanvas kantor</p><p className="text-xs text-mute">{furniture.length} furniture · seret untuk memindahkan</p></div>
        {selected && <Button size="sm" variant="danger" icon={Trash2} onClick={()=>{saveFurniture(furniture.filter(x=>x.classname!==selected));setSelected(null)}}>Hapus pilihan</Button>}
      </div>
      <div ref={canvas} className="relative min-h-[58dvh] overflow-hidden bg-[#f5f3ee]" style={{backgroundImage:'linear-gradient(#d9d5cc 1px, transparent 1px),linear-gradient(90deg,#d9d5cc 1px,transparent 1px)',backgroundSize:'24px 24px',touchAction:'none'}}>
        {furniture.length===0 ? <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"><Users className="mb-3 text-[#77736b]" size={30}/><p className="text-sm font-semibold text-[#45423c]">Kanvas masih kosong</p><p className="mt-1 max-w-xs text-xs text-[#77736b]">Tambahkan furniture dari Habbo Asset Library.</p></div> :
          furniture.map((item,i)=><button key={item.classname} type="button" onPointerDown={e=>startDrag(e,item)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onClick={()=>setSelected(item.classname)} aria-label={'Pindahkan '+item.name} className={`absolute flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-xl border p-2 text-center shadow-sm ${selected===item.classname?'z-10 border-brand bg-brand/10 ring-2 ring-brand/30':'border-[#d6d1c7] bg-white/85'}`} style={{left:(item.x??(20+(i%4)*20))+'%',top:(item.y??(25+Math.floor(i/4)*22))+'%',touchAction:'none'}}><img src={item.image} alt={item.name} draggable={false} className="pointer-events-none h-20 w-full object-contain"/><span className="mt-1 line-clamp-1 w-full text-[10px] text-[#45423c]">{item.name}</span></button>)}
      </div>
      <div className="border-t border-line px-4 py-3 text-xs text-mute">Sentuh dan tahan furniture lalu geser. Pilih item dan tekan Hapus pilihan untuk menghapusnya.</div>
    </Card>
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2"><UserRound size={18}/><h2 className="text-sm font-semibold">Personalisasi karakter agen</h2></div>
      <p className="text-xs text-mute">Pilih agen dan gunakan figure string dari Habbo Avatar Imager. Setiap agen menyimpan tampilan sendiri.</p>
      <select className="h-10 w-full rounded-ctl border border-line bg-canvas px-3 text-sm" value={agentId} onChange={e=>setAgentId(e.target.value)}>{EMPLOYEES.map(x=><option key={x.id} value={x.id}>{x.name} — {x.role}</option>)}</select>
      <div className="flex items-center gap-4 rounded-xl border border-line bg-canvas p-3"><div className="flex h-36 w-24 items-center justify-center rounded-lg bg-[#e7e8e6]"><img src={avatarUrl(figure||DEFAULT_FIGURE)} alt="Pratinjau avatar" className="max-h-full max-w-full object-contain"/></div><div><p className="text-sm font-semibold">{EMPLOYEES.find(x=>x.id===agentId)?.name}</p><a className="mt-2 inline-block text-xs text-brand underline" href="https://www.habboassets.com/imager?type=avatar" target="_blank" rel="noreferrer">Buka Habbo Avatar Imager</a></div></div>
      <label className="block space-y-1"><span className="text-xs font-medium">Figure string Habbo</span><input className="h-10 w-full rounded-ctl border border-line bg-canvas px-3 text-xs" value={figure} onChange={e=>setFigure(e.target.value)} placeholder={DEFAULT_FIGURE}/></label>
      <Button icon={Save} onClick={saveLook} disabled={!figure.trim()}>Simpan tampilan agen</Button>
    </Card>
    <section className="space-y-2"><h2 className="text-sm font-semibold">Tim kantor</h2><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{EMPLOYEES.map(x=><button key={x.id} onClick={()=>setAgentId(x.id)} className={`flex items-center gap-3 rounded-ctl border px-3 py-2.5 text-left ${agentId===x.id?'border-brand bg-brand/5':'border-line bg-card'}`}><Avatar id={x.id} size={36}/><span className="min-w-0"><span className="block truncate text-[13px] font-semibold">{x.name}</span><span className="block truncate text-xs text-mute">{x.role}</span></span></button>)}</div></section>
  </div>
}
