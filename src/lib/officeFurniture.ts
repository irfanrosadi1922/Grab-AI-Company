export type PlacedFurniture = { id?: string; classname: string; name: string; image: string; x?: number; y?: number; size?: number; direction?: number; state?: number; states?: number }
const KEY = 'grab-ai-office-furniture-v2'
export function getPlacedFurniture(): PlacedFurniture[] {
  try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : [] } catch { return [] }
}
export function addPlacedFurniture(item: PlacedFurniture) {
  const items = getPlacedFurniture()
  items.push({ ...item, x: item.x ?? 50, y: item.y ?? 50, id: item.id || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : item.classname + '-' + Date.now()) })
  localStorage.setItem(KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('office-furniture-updated'))
  return true
}
