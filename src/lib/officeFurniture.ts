export type PlacedFurniture = { classname: string; name: string; image: string }
const KEY = 'grab-ai-office-furniture-v2'
export function getPlacedFurniture(): PlacedFurniture[] {
  try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : [] } catch { return [] }
}
export function addPlacedFurniture(item: PlacedFurniture) {
  const items = getPlacedFurniture()
  if (items.some((x) => x.classname === item.classname)) return false
  items.push(item)
  localStorage.setItem(KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('office-furniture-updated'))
  return true
}
