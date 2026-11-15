import * as THREE from 'three'

const cache = new Map<string, THREE.CanvasTexture>()

/** Tekstur teks (label nama, gelembung ucapan). Dicache per teks dan gaya. */
export function textTexture(text: string, kind: 'name' | 'bubble' | 'dim' | 'sign'): THREE.CanvasTexture {
  const key = `${kind}|${text}`
  const hit = cache.get(key)
  if (hit) return hit
  const font = kind === 'sign' ? 'bold 44px sans-serif' : kind === 'bubble' ? '26px sans-serif' : 'bold 28px sans-serif'
  const c = document.createElement('canvas')
  const g = c.getContext('2d')!
  g.font = font
  const maxW = kind === 'bubble' ? 360 : 600
  // bungkus teks per kata
  const lines: string[] = []
  let cur = ''
  for (const w of text.split(' ')) {
    const t = cur ? `${cur} ${w}` : w
    if (g.measureText(t).width > maxW && cur) {
      lines.push(cur)
      cur = w
    } else cur = t
  }
  if (cur) lines.push(cur)
  const lh = kind === 'bubble' ? 32 : kind === 'sign' ? 54 : 36
  const w = Math.ceil(Math.max(...lines.map((l) => g.measureText(l).width)) + 28)
  const h = lines.length * lh + 18
  c.width = w
  c.height = h
  g.font = font
  g.fillStyle = kind === 'bubble' ? 'rgba(255,255,255,0.96)' : kind === 'sign' ? 'rgba(12,16,15,0.9)' : kind === 'dim' ? 'rgba(40,46,50,0.85)' : 'rgba(12,16,15,0.78)'
  const r = 14
  g.beginPath()
  g.moveTo(r, 0)
  g.arcTo(w, 0, w, h, r)
  g.arcTo(w, h, 0, h, r)
  g.arcTo(0, h, 0, 0, r)
  g.arcTo(0, 0, w, 0, r)
  g.closePath()
  g.fill()
  g.fillStyle = kind === 'bubble' ? '#10171a' : kind === 'dim' ? '#9aa5a0' : '#f2f6f4'
  g.textBaseline = 'middle'
  g.textAlign = 'center'
  lines.forEach((l, i) => g.fillText(l, w / 2, 9 + lh / 2 + i * lh))
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  cache.set(key, tex)
  return tex
}

export function makeSprite(text: string, kind: 'name' | 'bubble' | 'dim' | 'sign', height: number): THREE.Sprite {
  const tex = textTexture(text, kind)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  const s = new THREE.Sprite(mat)
  const img = tex.image as HTMLCanvasElement
  s.scale.set((img.width / img.height) * height, height, 1)
  return s
}

export function setSpriteText(s: THREE.Sprite, text: string, kind: 'name' | 'bubble' | 'dim' | 'sign', height: number) {
  const tex = textTexture(text, kind)
  const mat = s.material as THREE.SpriteMaterial
  mat.map = tex
  mat.needsUpdate = true
  const img = tex.image as HTMLCanvasElement
  s.scale.set((img.width / img.height) * height, height, 1)
}

export function disposeTextCache() {
  for (const t of cache.values()) t.dispose()
  cache.clear()
}
