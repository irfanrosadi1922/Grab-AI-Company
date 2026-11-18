export type PlacedFurniture = { id?: string; classname: string; name: string; image: string; x?: number; y?: number; size?: number; direction?: number; state?: number; states?: number; groupId?: string }
const KEY = 'grab-ai-office-furniture-v2'
const LAST_POSITION_KEY = 'grab-ai-office-last-placement-v1'
export function getPlacedFurniture(): PlacedFurniture[] {
  try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : [] } catch { return [] }
}
export function addPlacedFurniture(item: PlacedFurniture) {
  const items = getPlacedFurniture()
  let position = { x: 24, y: 24 }
  try {
    const last = JSON.parse(localStorage.getItem(LAST_POSITION_KEY) || 'null') as {x:number;y:number}|null
    if (last && Number.isFinite(last.x) && Number.isFinite(last.y)) {
      let x = last.x + 9
      let y = last.y + 7
      if (x > 86) { x = 24; y = y + 12 }
      if (y > 86) { x = 24; y = 24 }
      position = { x, y }
    } else if (items.length) {
      const lastItem = items[items.length - 1]
      position = { x: Math.min(86, (lastItem.x ?? 24) + 9), y: Math.min(86, (lastItem.y ?? 24) + 7) }
    }
  } catch { /* use the default placement */ }
  const placed = { ...item, x: item.x ?? position.x, y: item.y ?? position.y, id: item.id || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : item.classname + '-' + Date.now()) }
  items.push(placed)
  localStorage.setItem(KEY, JSON.stringify(items))
  localStorage.setItem(LAST_POSITION_KEY, JSON.stringify({ x: placed.x, y: placed.y }))
  window.dispatchEvent(new CustomEvent('office-furniture-updated'))
  return true
}
