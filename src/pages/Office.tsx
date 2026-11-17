import { useEffect, useState } from 'react'
import { Users, Trash2 } from 'lucide-react'
import { Avatar, Button, Card, PageHeader } from '../components/ui'
import { EMPLOYEES } from '../data/employees'
import { getPlacedFurniture, type PlacedFurniture } from '../lib/officeFurniture'

export default function Office() {
  const [furniture, setFurniture] = useState<PlacedFurniture[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const refresh = () => setFurniture(getPlacedFurniture())
    refresh()
    window.addEventListener('office-furniture-updated', refresh)
    return () => window.removeEventListener('office-furniture-updated', refresh)
  }, [])

  const removeSelected = () => {
    if (!selected) return
    const next = furniture.filter((item) => item.classname !== selected)
    localStorage.setItem('grab-ai-office-furniture-v2', JSON.stringify(next))
    setFurniture(next)
    setSelected(null)
    window.dispatchEvent(new CustomEvent('office-furniture-updated'))
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Kantor" desc="Ruang kerja kosong. Tambahkan furniture dari Habbo Asset Library untuk mulai menata kantor." />

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Kanvas kantor</p>
            <p className="text-xs text-mute">{furniture.length} furniture ditempatkan</p>
          </div>
          {selected && <Button size="sm" variant="danger" icon={Trash2} onClick={removeSelected}>Hapus pilihan</Button>}
        </div>

        <div
          className="relative min-h-[58dvh] overflow-hidden bg-[#f5f3ee]"
          style={{
            backgroundImage: 'linear-gradient(#d9d5cc 1px, transparent 1px), linear-gradient(90deg, #d9d5cc 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          {furniture.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-[#aaa59a] bg-white/70">
                <Users className="text-[#77736b]" size={25} />
              </div>
              <p className="text-sm font-semibold text-[#45423c]">Kanvas masih kosong</p>
              <p className="mt-1 max-w-xs text-xs text-[#77736b]">Buka Habbo Asset Library, pilih furniture, lalu tekan “Tempatkan di Kantor”.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4">
              {furniture.map((item) => (
                <button
                  key={item.classname}
                  type="button"
                  onClick={() => setSelected(selected === item.classname ? null : item.classname)}
                  aria-pressed={selected === item.classname}
                  className={`flex min-h-32 flex-col items-center justify-center rounded-xl border p-3 text-center transition ${selected === item.classname ? 'border-brand bg-brand/10 ring-2 ring-brand/30' : 'border-[#d6d1c7] bg-white/85 hover:border-brand'}`}
                >
                  <img src={item.image} alt={item.name} className="h-20 w-full object-contain" loading="lazy" />
                  <span className="mt-2 line-clamp-2 text-xs font-medium text-[#45423c]">{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-line px-4 py-3 text-xs text-mute">
          Pilih furniture pada kanvas untuk menghapusnya. Tambahkan item lain melalui Habbo Asset Library.
        </div>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Tim yang akan bekerja di kantor ini</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {EMPLOYEES.map((employee) => (
            <div key={employee.id} className="flex items-center gap-3 rounded-ctl border border-line bg-card px-3 py-2.5">
              <Avatar id={employee.id} size={36} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold">{employee.name}</span>
                <span className="block truncate text-xs text-mute">{employee.role}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
