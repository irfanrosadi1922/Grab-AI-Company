import { useEffect, useRef, useState } from 'react'
import { Trash2, Copy, UserRound, Save, Plus, Minus, ZoomIn, ZoomOut, RotateCcw, RotateCw, Play, Pause, Lightbulb } from 'lucide-react'
import { Avatar, Button, Card, PageHeader } from '../components/ui'
import { EMPLOYEES } from '../data/employees'
import { getPlacedFurniture, type PlacedFurniture } from '../lib/officeFurniture'
import { supabase } from '../lib/supabase'

type Looks = Record<string, string>
type HabboFurniture = { classname: string; name?: string; preview?: string; image?: string }
type EmployeeId = (typeof EMPLOYEES)[number]['id']
const LOOKS_KEY = 'grab-ai-agent-looks-v1'
const DEFAULT_FIGURE = 'hd-180-1.ch-210-66.lg-270-82.sh-290-80'
const DEFAULT_LOOKS: Looks = {
  alex: 'hd-180-1.hr-115-45.ch-5204-82.lg-270-64.sh-290-91',
  daniel: 'sh-290-93.lg-285-92.hr-831-49.ch-3001-93-1408.ea-1406-1408.hd-180-1.ca-1813-63.ha-3272-93-92',
  sophia: 'sh-290-93.lg-285-92.hr-831-49.ea-1406-1408.hd-180-1.ca-5410-82.ha-3272-93-92.ch-5585',
  olivia: 'sh-290-93.lg-285-92.hr-831-49.ch-3001-93-1408.ea-1406-1408.hd-180-1.ha-3272-93-92.ca-6238-82-1408',
  ethan: 'hr-832-38.hd-615-8.ch-822-96.lg-700-64.sh-3206-1338.ha-1012-93.ea-1406',
  isabella: 'hd-180-14.ch-806-73.lg-270-82.sh-3035-92.ha-1002-82.ea-1406',
  william: 'sh-290-93.lg-285-92.hr-831-49.ch-3001-93-1408.ea-1406-1408.hd-180-1.ha-3272-93-92.ca-5410-82',
  james: 'sh-290-93.lg-285-92.hr-831-49.ch-5585.ea-1406-1408.hd-180-1.ha-3272-93-92.ca-6238-82-1408',
}
const OFFICE_ZOOM_KEY = 'grab-ai-office-canvas-zoom-v1'
const readOfficeZoom = () => { try { const value = Number(localStorage.getItem(OFFICE_ZOOM_KEY)); return Number.isFinite(value) && value >= .5 && value <= 2.5 ? value : 1 } catch { return 1 } }
const readLooks = (): Looks => { try { return { ...DEFAULT_LOOKS, ...(JSON.parse(localStorage.getItem(LOOKS_KEY) || '{}') as Looks) } } catch { return { ...DEFAULT_LOOKS } } }
const avatarUrl = (figure: string) => 'https://www.habboassets.com/imaging/avatar.png?figure=' + encodeURIComponent(figure) + '&direction=2&size=l'

export default function Office() {
  const [furniture, setFurniture] = useState<PlacedFurniture[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [looks, setLooks] = useState<Looks>({})
  const [agentId, setAgentId] = useState<EmployeeId>(EMPLOYEES[0].id)
  const [figure, setFigure] = useState(DEFAULT_FIGURE)
  const [zoom, setZoom] = useState(readOfficeZoom)
  const [building, setBuilding] = useState(false)
  const [buildError, setBuildError] = useState('')
  const [statePlaying, setStatePlaying] = useState(false)
  const pointers = useRef<Map<number, {x:number;y:number;target:string|null}>>(new Map())
  const pinchStart = useRef<{distance:number;zoom:number}|null>(null)
  const furniturePinchStart = useRef<{id:string;distance:number;size:number}|null>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; pointer: number; dx: number; dy: number } | null>(null)

  useEffect(() => {
    if (!building) return
    const watchdog = window.setTimeout(() => {
      setBuilding(false)
      setBuildError('Proses mengambil aset Habbo terhenti. Coba lagi; periksa koneksi dan fungsi HabboAssets.')
    }, 45000)
    return () => window.clearTimeout(watchdog)
  }, [building])

  useEffect(() => {
    const refresh = () => setFurniture(getPlacedFurniture())
    refresh(); setLooks(readLooks())
    window.addEventListener('office-furniture-updated', refresh)
    return () => window.removeEventListener('office-furniture-updated', refresh)
  }, [])
  useEffect(() => { setFigure(looks[agentId] || DEFAULT_FIGURE) }, [agentId, looks])
  useEffect(() => { try { localStorage.setItem(OFFICE_ZOOM_KEY, String(zoom)) } catch { /* storage may be unavailable */ } }, [zoom])
  useEffect(() => {
    const item = furniture.find(x => (x.id || x.classname) === selected)
    if (!item || item.states || !supabase) return
    let active = true
    void supabase.functions.invoke('habbo-assets', { body: { action: 'imagingInfo', classname: item.classname } }).then(({ data, error }) => {
      if (!active || error) return
      const info = data?.data
      const rawStates = info?.states ?? info?.state_count ?? info?.meta?.states
      const count = Array.isArray(rawStates) ? rawStates.length
        : rawStates && typeof rawStates === 'object' ? Object.keys(rawStates).length
        : Number(rawStates ?? 1)
      const safeCount = Number.isFinite(count) ? Math.max(1, Math.min(32, count)) : 1
      const next = furniture.map(x => (x.id || x.classname) === selected ? { ...x, states: safeCount, state: Math.min(x.state ?? 0, safeCount - 1) } : x)
      localStorage.setItem('grab-ai-office-furniture-v2', JSON.stringify(next)); setFurniture(next)
    }).catch(() => undefined)
    return () => { active = false }
  }, [selected, furniture])
  useEffect(() => {
    const client = supabase
    if (furniture.length || building || !client) return
    let cancelled = false
    const build = async () => {
      setBuilding(true); setBuildError('')
      try {
        const terms = ['desk', 'chair', 'computer', 'table', 'plant', 'sofa', 'partition']
        const responses = await Promise.all(terms.map(search => Promise.race([
          client.functions.invoke('habbo-assets', {
            body: { action: 'list', search, page: 1, perPage: 30, hotelId: 1 },
          }),
          new Promise<never>((_, reject) => window.setTimeout(
            () => reject(new Error('Permintaan HabboAssets melewati batas 35 detik. Periksa koneksi atau API token.')),
            35000,
          )),
        ])))
        if (cancelled) return
        const pools: HabboFurniture[][] = responses.map(response => {
          if (response.error) throw new Error(response.error.message)
          const payload = response.data?.data
          const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
          return (rows as HabboFurniture[]).filter((item: HabboFurniture) => item.classname)
        })
        const pick = (index: number, words: string[]): HabboFurniture | undefined => pools[index].find((item: HabboFurniture) => words.some((word: string) => (item.name || item.classname || '').toLowerCase().includes(word))) || pools[index][0]
        const desk = pick(0, ['desk', 'office'])
        const chair = pick(1, ['chair', 'seat'])
        const computer = pick(2, ['computer', 'pc', 'monitor'])
        const table = pick(3, ['meeting', 'table'])
        const plant = pick(4, ['plant', 'tree'])
        const sofa = pick(5, ['sofa', 'couch'])
        const partition = pick(6, ['partition', 'screen', 'divider', 'room divider'])
        const imageFor = (item: HabboFurniture): string => item.preview || item.image || 'https://www.habboassets.com/imaging/furniture/' + encodeURIComponent(item.classname) + '.png'
        const make = (item: HabboFurniture, x: number, y: number, size: number): PlacedFurniture => ({ id: item.classname + '-' + x + '-' + y, classname: item.classname, name: item.name || item.classname, image: imageFor(item), x, y, size })
        const layout: PlacedFurniture[] = []
        for (let i=0;i<8;i++) {
          const x = 12 + (i%4)*25, y = i<4 ? 26 : 54
          if (desk) layout.push(make(desk,x,y,94))
          if (chair) layout.push(make(chair,x,y+10,62))
          if (computer) layout.push(make(computer,x,y-7,54))
          if (partition) {
            if (i%4!==3) layout.push(make(partition,x+12,y+9,58))
            if (i<4) layout.push(make(partition,x+12,y+25,58))
          }
        }
        if (table) layout.push(make(table,22,83,130), make(table,75,83,118))
        if (sofa) layout.push(make(sofa,48,83,105))
        if (plant) layout.push(make(plant,5,8,68), make(plant,94,8,68))
        if (!layout.length) throw new Error('Tidak ada furniture yang ditemukan di Habbo Asset Library.')
        if (!cancelled) {
          localStorage.setItem('grab-ai-office-furniture-v2', JSON.stringify(layout))
          setFurniture(layout)
          window.dispatchEvent(new CustomEvent('office-furniture-updated'))
        }
      } catch (error) {
        if (!cancelled) setBuildError(error instanceof Error ? error.message : 'Gagal mengambil furniture dari Habbo Asset Library.')
      } finally { if (!cancelled) setBuilding(false) }
    }
    void build()
    return () => { cancelled = true }
  }, [furniture.length])


  const selectedItem = furniture.find(item => (item.id || item.classname) === selected)
  const updateSelected = (patch: Partial<PlacedFurniture>) => {
    if (!selected) return
    saveFurniture(furniture.map(item => (item.id || item.classname) === selected ? { ...item, ...patch } : item))
  }
  const furnitureImage = (item: PlacedFurniture) => {
    const direction = item.direction ?? 2
    const state = item.state ?? 0
    // HabStats renders the original furniture SWF as animated APNG when a furniture state is active.
    if (state > 0) return `https://habstats.net/api/v1/imaging/furniture/${encodeURIComponent(item.classname)}?hotel=com&direction=${direction}&state=${state}&format=apng`
    return `https://www.habboassets.com/imaging/furniture/${encodeURIComponent(item.classname)}.png?direction=${direction}&state=${state}`
  }
  const fallbackFurnitureImage = (item: PlacedFurniture) => `https://www.habboassets.com/imaging/furniture/${encodeURIComponent(item.classname)}.png?direction=${item.direction ?? 2}&state=${item.state ?? 0}`
  const saveFurniture = (next: PlacedFurniture[]) => {
    localStorage.setItem('grab-ai-office-furniture-v2', JSON.stringify(next))
    setFurniture(next)
    window.dispatchEvent(new CustomEvent('office-furniture-updated'))
  }

  const applyConceptLayout = async () => {
    if (!supabase) {
      setBuildError('Supabase belum dikonfigurasi.'); return
    }
    const client = supabase
    setBuilding(true); setBuildError('')
    try {
      const terms = ['desk', 'chair', 'computer', 'meeting table', 'plant', 'sofa', 'partition']
      const responses = await Promise.all(terms.map(search => Promise.race([
        client.functions.invoke('habbo-assets', {
          body: { action: 'list', search, page: 1, perPage: 40, hotelId: 1 },
        }),
        new Promise<never>((_, reject) => window.setTimeout(
          () => reject(new Error('Permintaan HabboAssets melewati batas 35 detik. Periksa koneksi atau API token.')),
          35000,
        )),
      ])))
      const pools: HabboFurniture[][] = responses.map(response => {
        if (response.error) throw new Error(response.error.message || 'Gagal mengambil katalog HabboAssets.')
        const payload = response.data?.data
        const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
        return (rows as HabboFurniture[]).filter(item => item.classname)
      })
      const pick = (index: number, words: string[]): HabboFurniture | undefined =>
        pools[index].find(item => words.some(word => (item.name || item.classname || '').toLowerCase().includes(word)))
        || furniture.find(item => words.some(word => (item.name + ' ' + item.classname).toLowerCase().includes(word)))
        || pools[index][0]
      const desk = pick(0, ['desk', 'office'])
      const chair = pick(1, ['chair', 'seat'])
      const computer = pick(2, ['computer', 'pc', 'monitor'])
      const table = pick(3, ['meeting', 'table'])
      const plant = pick(4, ['plant', 'tree'])
      const sofa = pick(5, ['sofa', 'couch'])
      const partition = pick(6, ['partition', 'screen', 'divider'])
      const imageFor = (item: HabboFurniture) => item.preview || item.image || 'https://www.habboassets.com/imaging/furniture/' + encodeURIComponent(item.classname) + '.png'
      const next: PlacedFurniture[] = []
      const put = (item: HabboFurniture | PlacedFurniture | undefined, x: number, y: number, size: number, suffix: string) => {
        if (!item?.classname) return
        next.push({
          id: 'habbo-office-' + suffix + '-' + next.length,
          classname: item.classname,
          name: item.name || item.classname,
          image: 'preview' in item && item.preview ? item.preview : 'image' in item && item.image ? item.image : imageFor(item as HabboFurniture),
          x, y, size,
        })
      }
      const stations = [
        { x: 18, y: 29 }, { x: 39, y: 29 }, { x: 60, y: 29 }, { x: 81, y: 29 },
        { x: 18, y: 58 }, { x: 39, y: 58 }, { x: 60, y: 58 }, { x: 81, y: 58 },
      ]
      stations.forEach((point, index) => {
        put(desk, point.x, point.y, 100, 'desk-' + index)
        put(chair, point.x, point.y + 7, 62, 'chair-' + index)
        put(computer, point.x, point.y - 6, 50, 'computer-' + index)
        if (index % 4 !== 3) put(partition, point.x + 10, point.y + 12, 58, 'partition-' + index)
      })
      put(desk, 12, 84, 112, 'reception')
      put(table, 48, 84, 128, 'meeting')
      put(sofa, 82, 84, 108, 'lounge')
      put(plant, 5, 9, 70, 'plant-left')
      put(plant, 94, 9, 70, 'plant-right')
      if (!next.length) throw new Error('HabboAssets tidak mengembalikan furniture untuk kantor.')
      saveFurniture(next)
      setSelected(null)
    } catch (error) {
      setBuildError(error instanceof Error ? error.message : 'Gagal menyusun furniture dari Habbo Asset Library.')
    } finally {
      setBuilding(false)
    }
  }
  const distance = (a:{x:number;y:number},b:{x:number;y:number}) => Math.hypot(a.x-b.x,a.y-b.y)
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-furniture-id]')?.dataset.furnitureId ?? null
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY,target})
    if (pointers.current.size===2) {
      const pts=[...pointers.current.values()]
      const startDistance=Math.max(1,distance(pts[0],pts[1]))
      if (pts[0].target && pts[0].target===pts[1].target) {
        const item=furniture.find(x=>(x.id || x.classname)===pts[0].target)
        furniturePinchStart.current=item?{id:pts[0].target,distance:startDistance,size:item.size??112}:null
        pinchStart.current=null
      } else {
        furniturePinchStart.current=null
        pinchStart.current={distance:startDistance,zoom}
      }
      drag.current=null
    }
  }
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointers.current.has(e.pointerId)) {
      e.preventDefault()
      const previous=pointers.current.get(e.pointerId)!
      pointers.current.set(e.pointerId,{...previous,x:e.clientX,y:e.clientY})
    }
    if (pointers.current.size===2) {
      const pts=[...pointers.current.values()]
      if (furniturePinchStart.current) {
        const start=furniturePinchStart.current
        const nextSize=Math.max(48,Math.min(320,start.size*distance(pts[0],pts[1])/start.distance))
        setFurniture(current=>current.map(item=>(item.id || item.classname)===start.id?{...item,size:nextSize}:item))
      } else if (pinchStart.current) {
        const next=pinchStart.current.zoom*distance(pts[0],pts[1])/pinchStart.current.distance
        setZoom(Math.max(.5,Math.min(2.5,next)))
      }
      drag.current=null
      return
    }
    moveDrag(e)
  }
  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size<2) {
      pinchStart.current=null
      furniturePinchStart.current=null
      setFurniture(current=>{localStorage.setItem('grab-ai-office-furniture-v2',JSON.stringify(current));return current})
    }
    endDrag(e)
  }
  const startDrag = (e: React.PointerEvent<HTMLDivElement>, item: PlacedFurniture) => {
    if (pointers.current.size>1) return;
    if ((e.target as HTMLElement).closest('[data-resize-control]')) return
    const el = canvas.current
    if (!el) return
    const r = e.currentTarget.getBoundingClientRect()
    drag.current = { id: item.id || item.classname, pointer: e.pointerId, dx: e.clientX-r.left-r.width/2, dy: e.clientY-r.top-r.height/2 }
    el.setPointerCapture(e.pointerId)
    setSelected(item.id || item.classname)
    e.preventDefault()
  }
  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d=drag.current, el=canvas.current
    if (!d || d.pointer!==e.pointerId || !el) return
    const r=el.getBoundingClientRect()
    const x=((e.clientX-r.left-d.dx)/(r.width*zoom))*100
    const y=((e.clientY-r.top-d.dy)/(r.height*zoom))*100
    setFurniture(old=>old.map((it,i)=>(it.id || it.classname)===d.id?{...it,x,y}:it.x==null||it.y==null?{...it,x:20+(i%4)*20,y:25+Math.floor(i/4)*22}:it))
  }
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointer!==e.pointerId) return
    drag.current=null
    setFurniture(current=>{ localStorage.setItem('grab-ai-office-furniture-v2',JSON.stringify(current)); return current })
  }
  const resizeItem = (id: string, delta: number) => {
    const next=furniture.map((it,i)=>(it.id || it.classname)===id?{...it,size:Math.max(64,Math.min(240,(it.size??112)+delta))}:it)
    saveFurniture(next)
  }
  const saveLook = () => {
    const next={...looks,[agentId]:figure.trim()}
    localStorage.setItem(LOOKS_KEY,JSON.stringify(next)); setLooks(next)
  }

  return <div className="space-y-4">
    <PageHeader title="Kantor" desc="Susun kantor menggunakan furniture asli dari Habbo Asset Library." />
    <div className="flex flex-wrap justify-end gap-2"><Button icon={RotateCcw} onClick={() => void applyConceptLayout()} disabled={building}>{building ? "Mengambil aset Habbo..." : "Terapkan desain Habbo Office"}</Button><a href="/assets" className="inline-flex h-10 items-center gap-2 rounded-ctl bg-brand px-4 text-sm font-semibold text-canvas"><Plus size={16}/> Tambah furniture dari Asset Library</a></div>
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div><p className="text-sm font-semibold">Kanvas kantor</p><p className="text-xs text-mute">{furniture.length} furniture Habbo · sentuh lalu geser</p></div>
        <div className="flex items-center gap-2"><button type="button" aria-label="Perkecil kanvas" onClick={()=>setZoom(z=>Math.max(.5,+(z-.15).toFixed(2)))} className="rounded-lg border border-line bg-card p-2"><ZoomOut size={16}/></button><span className="min-w-10 text-center text-xs tabular-nums">{Math.round(zoom*100)}%</span><button type="button" aria-label="Perbesar kanvas" onClick={()=>setZoom(z=>Math.min(2.5,+(z+.15).toFixed(2)))} className="rounded-lg border border-line bg-card p-2"><ZoomIn size={16}/></button><button type="button" aria-label="Reset zoom" onClick={()=>setZoom(1)} className="rounded-lg border border-line bg-card p-2"><RotateCcw size={16}/></button></div>

      </div>
      <div ref={canvas} onPointerDown={handleCanvasPointerDown} onPointerMove={handleCanvasPointerMove} onPointerUp={handleCanvasPointerUp} onPointerCancel={handleCanvasPointerUp} className="relative h-[72dvh] overflow-auto" style={{backgroundColor:"#171a22",backgroundImage:'linear-gradient(45deg, rgba(255,255,255,.10) 1px, transparent 1px),linear-gradient(-45deg, rgba(255,255,255,.10) 1px, transparent 1px)',backgroundSize:`${36*zoom}px ${36*zoom}px`,backgroundPosition:"center center",touchAction:'none'}}>
        <div className="relative origin-top-left overflow-hidden" style={{width:"1800px", height:"1200px", minWidth:"1800px", transform:`scale(${zoom})`, transformOrigin:"top left", backgroundColor:"#c9c3b5", backgroundImage:"linear-gradient(45deg, rgba(255,255,255,.18) 25%, transparent 25%, transparent 75%, rgba(255,255,255,.18) 75%),linear-gradient(45deg, rgba(255,255,255,.18) 25%, transparent 25%, transparent 75%, rgba(255,255,255,.18) 75%)", backgroundSize:"48px 48px", backgroundPosition:"0 0,24px 24px"}}>
          {furniture.length === 0 && <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"><p className="text-sm font-semibold text-slate-100">{building ? 'Mengambil furniture asli dari Habbo Asset Library…' : 'Kanvas kantor belum terisi'}</p><p className="mt-1 max-w-xs text-xs text-slate-400">{buildError || 'Kantor sedang disusun menggunakan aset Habbo.'}</p><a href="/assets" className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Buka Habbo Asset Library</a></div>}
          {furniture.map((item,i)=>{const size=item.size??112;return <div key={item.id || item.classname} data-furniture-id={item.id || item.classname} onPointerDown={e=>startDrag(e,item)} role="button" tabIndex={0} onClick={()=>{setSelected(item.id || item.classname);setStatePlaying(false)}} aria-label={"Pindahkan "+item.name} className={`absolute flex flex-col items-center justify-center rounded-xl border p-2 text-center shadow-sm select-none ${selected===(item.id || item.classname)?"z-10 border-brand bg-brand/10 ring-2 ring-brand/30":"border-transparent bg-transparent"}`} style={{left:(item.x??(20+(i%4)*20))+"%",top:(item.y??(25+Math.floor(i/4)*22))+"%",width:size,height:size,touchAction:"none",transform:"translate(-50%,-50%)"}}><img src={furnitureImage(item)} alt={item.name} draggable={false} onError={e=>{const img=e.currentTarget;if(img.src!==fallbackFurnitureImage(item))img.src=fallbackFurnitureImage(item)}} className="pointer-events-none h-[78%] w-full object-contain"/>{selected===(item.id || item.classname)&&<div data-resize-control className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-white p-1 shadow"><button type="button" aria-label="Putar furniture" title="Putar 45 derajat" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();updateSelected({direction:((item.direction ?? 2)+1)%8})}} className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-800"><RotateCw size={14}/></button><button type="button" aria-label="Perkecil furniture" title="Perkecil furniture" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();resizeItem(item.id || item.classname,-16)}} className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-800"><ZoomOut size={14}/></button><button type="button" aria-label="Perbesar furniture" title="Perbesar furniture" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();resizeItem(item.id || item.classname,16)}} className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-800"><ZoomIn size={14}/></button><button type="button" aria-label="Salin furniture" title="Gandakan furniture" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();const copyId=(globalThis.crypto?.randomUUID?.() || `copy-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);const duplicate:PlacedFurniture={...item,id:copyId,x:Math.min(96,(item.x??50)+5),y:Math.min(96,(item.y??50)+5)};saveFurniture([...furniture,duplicate]);setSelected(copyId);setStatePlaying(false)}} className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700"><Copy size={14}/></button><button type="button" aria-label="Hapus furniture" title="Hapus furniture" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();saveFurniture(furniture.filter(x=>(x.id || x.classname)!==(item.id || item.classname)));setSelected(null);setStatePlaying(false)}} className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-700"><Trash2 size={14}/></button>{(item.states ?? 1)>1&&<><button type="button" data-resize-control aria-label="Ganti state furniture" title={(item.states ?? 1)===2?((item.state ?? 0)===0?"Nyalakan":"Matikan"):"Ganti state"} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();const total=item.states??1;updateSelected({state:((item.state??0)+1)%total});setStatePlaying(false)}} className={`flex h-7 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-bold ${(item.state??0)>0?"bg-amber-300 text-amber-950":"bg-gray-100 text-gray-800"}`}><Lightbulb size={14}/>{(item.states??1)===2?((item.state??0)===0?"OFF":"ON"):`S${item.state??0}`}</button><button type="button" data-resize-control aria-label={statePlaying?"Hentikan animasi state":"Jalankan animasi state"} title={statePlaying?"Hentikan animasi":"Putar animasi state"} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();const nextState=statePlaying?0:1;updateSelected({state:nextState});setStatePlaying(!statePlaying)}} className={`flex h-7 w-7 items-center justify-center rounded-full ${statePlaying?"bg-amber-300 text-amber-950":"bg-gray-100 text-gray-800"}`}>{statePlaying?<Pause size={14}/>:<Play size={14}/>}</button></>}</div>}</div>})}
          
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-[#243b48] to-[#49636b] shadow-lg"/>
            <div className="absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-[#243b48] to-[#49636b]"/>
            <div className="absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-[#243b48] to-[#49636b]"/>
            <div className="absolute left-[3%] top-[7%] h-[30%] w-[92%] rounded-xl border-[10px] border-[#6e5845] bg-[#d7c7a9]/70 shadow-inner"/>
            <div className="absolute left-[3%] top-[42%] h-[29%] w-[92%] rounded-xl border-[10px] border-[#6e5845] bg-[#cbb99b]/65 shadow-inner"/>
            <div className="absolute left-[3%] top-[74%] h-[22%] w-[92%] rounded-xl border-[10px] border-[#6e5845] bg-[#d7c7a9]/70 shadow-inner"/>
            <div className="absolute left-[3%] top-[7%] h-[30%] w-[92%] rounded-xl border-t-[18px] border-[#8c7056]"/>
            <div className="absolute left-[3%] top-[42%] h-[29%] w-[92%] rounded-xl border-t-[18px] border-[#8c7056]"/>
            <div className="absolute left-[3%] top-[74%] h-[22%] w-[92%] rounded-xl border-t-[18px] border-[#8c7056]"/>
            <div className="absolute left-[4%] top-[3%] rounded-xl border-4 border-[#294a42] bg-gradient-to-br from-[#397d66] to-[#173f37] px-8 py-4 text-center text-white shadow-xl"><p className="text-3xl font-black tracking-widest">GRAB AI COMPANY</p><p className="text-sm font-semibold tracking-[.35em]">HABBO OFFICE · TEAM HQ</p></div>
            <div className="absolute left-[4%] top-[40%] rounded-lg bg-[#283d4a] px-4 py-2 text-xs font-black tracking-[.2em] text-white shadow">PRIVATE WORKSTATIONS · AI TEAM</div>
            <div className="absolute left-[4%] top-[72%] rounded-lg bg-[#283d4a] px-4 py-2 text-xs font-black tracking-[.2em] text-white shadow">WELCOME · COLLABORATION · LOUNGE</div>
            <div className="absolute left-[3%] top-[3%] h-[93%] w-[92%] rounded-xl border-[18px] border-[#354b52] shadow-[inset_0_0_0_5px_#b9a486,0_20px_50px_rgba(0,0,0,.35)]"/>
          </div>
          <div className="pointer-events-none absolute left-[5%] top-[10%] rounded-md bg-[#243b48]/90 px-3 py-1 text-xs font-bold text-white">RECEPTION</div>
          <div className="pointer-events-none absolute left-[43%] top-[10%] rounded-md bg-[#243b48]/90 px-3 py-1 text-xs font-bold text-white">MEETING ROOM</div>
          <div className="pointer-events-none absolute left-[77%] top-[10%] rounded-md bg-[#243b48]/90 px-3 py-1 text-xs font-bold text-white">LOUNGE</div>
          {EMPLOYEES.map((employee,index)=>{const x=[17,37,57,77][index%4],y=index<4?18:48;const look=looks[employee.id]||DEFAULT_LOOKS[employee.id]||DEFAULT_FIGURE;return <div key={employee.id} className="pointer-events-none absolute z-[5] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{left:x+"%",top:y+"%"}}><img src={avatarUrl(look)} alt={employee.name} className="h-24 w-16 object-contain drop-shadow-lg"/><span className="rounded-md border border-white/30 bg-[#172c35]/95 px-2 py-1 text-[11px] font-bold text-white shadow">{employee.name}</span></div>})}

          <div className="pointer-events-none absolute rounded-2xl border-4 border-emerald-800/70 bg-emerald-700 px-8 py-4 text-center text-white shadow-xl" style={{left:"25%",top:"2%"}}>
            <p className="text-3xl font-black tracking-widest">GRAB AI COMPANY</p><p className="text-sm font-semibold tracking-[.35em]">HABBO OFFICE · TEAM HQ</p>
          </div>
          {[
            {label:"RESEARCH · ANDI",x:18,y:17},{label:"DATA · DIMAS",x:39,y:17},{label:"MARKETING · SINTA",x:60,y:17},{label:"MENU · OKTA",x:81,y:17},
            {label:"DESIGN · EKO",x:18,y:46},{label:"CONTENT · INDAH",x:39,y:46},{label:"CUSTOMER · WAHYU",x:60,y:46},{label:"OPERATIONS · JOKO",x:81,y:46},
            {label:"RECEPTION",x:12,y:75},{label:"MEETING ROOM",x:48,y:75},{label:"LOUNGE",x:82,y:75},
          ].map(zone=><div key={zone.label} className="absolute -translate-x-1/2 rounded-md border border-slate-700/40 bg-slate-900/85 px-3 py-1 text-xs font-bold tracking-wide text-white shadow-lg" style={{left:(zone.x/40)+"%",top:(zone.y/40)+"%"}}>{zone.label}</div>)}
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
