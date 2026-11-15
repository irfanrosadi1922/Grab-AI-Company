import type { EmployeeId } from '../types'

export interface V2 {
  x: number
  z: number
}

/** Denah gedung (meter). X ke kanan, Z ke arah depan (selatan). Lantai 24 x 16, pusat di (0,0). */
export const FLOOR = { w: 24, d: 16 }

const XS = [-10.5, -7.5, -4.5, -1.5]

export interface Desk {
  x: number
  z: number // pusat meja
  seat: V2
  /** arah hadap orang yang duduk (rotasi Y) */
  face: number
  node: string
}

export function deskFor(index: number): Desk {
  const row = index < 4 ? 'A' : 'B'
  const x = XS[index % 4]
  return row === 'A'
    ? { x, z: -4.6, seat: { x, z: -3.6 }, face: Math.PI, node: `sA${index % 4}` }
    : { x, z: 4.6, seat: { x, z: 3.6 }, face: 0, node: `sB${index % 4}` }
}

export interface Seat {
  node: string
  pos: V2
  face: number
}

const MEET_X = [6.0, 7.0, 8.0, 9.0]
export const MEETING_SEATS: Seat[] = [
  ...MEET_X.map((x, i): Seat => ({ node: `mseatS${i}`, pos: { x, z: -3.5 }, face: Math.PI })),
  ...MEET_X.map((x, i): Seat => ({ node: `mseatN${i}`, pos: { x, z: -6.1 }, face: 0 })),
]
export const DINING_SEATS: Seat[] = [
  { node: 'dseat0', pos: { x: 7.3, z: 3.8 }, face: 0 },
  { node: 'dseat1', pos: { x: 8.7, z: 3.8 }, face: 0 },
  { node: 'dseat2', pos: { x: 7.3, z: 6.2 }, face: Math.PI },
  { node: 'dseat3', pos: { x: 8.7, z: 6.2 }, face: Math.PI },
]
export const SOFA_SEATS: Seat[] = [
  { node: 'sofa0', pos: { x: 10.7, z: 4.9 }, face: -Math.PI / 2 },
  { node: 'sofa1', pos: { x: 10.7, z: 5.9 }, face: -Math.PI / 2 },
]
export const COFFEE = { node: 'coffee', pos: { x: 4.6, z: 6.6 }, face: 0 }

/** Titik ngobrol: dua orang berdiri berhadapan di kiri-kanan titik simpul. */
export const CHAT_SPOTS = ['a0', 'a1', 'a2', 'a3', 'pn2', 'hub'] as const

export const NODES: Record<string, V2> = {}
const edges: [string, string][] = []
const n = (id: string, x: number, z: number) => {
  NODES[id] = { x, z }
}
const e = (a: string, b: string) => edges.push([a, b])

// Lorong tengah ruang kerja
XS.forEach((x, i) => {
  n(`a${i}`, x, 0)
  if (i > 0) e(`a${i - 1}`, `a${i}`)
  n(`dA${i}`, x, -2.4)
  n(`sA${i}`, x, -3.6)
  e(`a${i}`, `dA${i}`)
  e(`dA${i}`, `sA${i}`)
  n(`dB${i}`, x, 2.4)
  n(`sB${i}`, x, 3.6)
  e(`a${i}`, `dB${i}`)
  e(`dB${i}`, `sB${i}`)
})
n('door', 3, 0.7)
n('hub', 6, 0.7)
e('a3', 'door')
e('door', 'hub')

// Ruang rapat
n('mDoor', 5, -1)
n('mIn', 5, -2.4)
e('hub', 'mDoor')
e('mDoor', 'mIn')
MEET_X.forEach((x, i) => {
  n(`m2_${i}`, x, -2.4)
  e(i === 0 ? 'mIn' : `m2_${i - 1}`, `m2_${i}`)
  n(`mseatS${i}`, x, -3.5)
  e(`m2_${i}`, `mseatS${i}`)
})
n('mW', 4.8, -4.8)
n('mNW', 4.8, -7.2)
e('mIn', 'mW')
e('mW', 'mNW')
MEET_X.forEach((x, i) => {
  n(`mN_${i}`, x, -7.2)
  e(i === 0 ? 'mNW' : `mN_${i - 1}`, `mN_${i}`)
  n(`mseatN${i}`, x, -6.1)
  e(`mN_${i}`, `mseatN${i}`)
})

// Pantry
n('pn1', 6, 2.4)
e('hub', 'pn1')
n('pn2', 4.6, 3)
e('pn1', 'pn2')
n('coffee', COFFEE.pos.x, COFFEE.pos.z)
e('pn2', 'coffee')
n('dn0', 7.3, 2.8)
n('dn1', 8.7, 2.8)
e('pn1', 'dn0')
e('dn0', 'dn1')
n('dseat0', 7.3, 3.8)
n('dseat1', 8.7, 3.8)
e('dn0', 'dseat0')
e('dn1', 'dseat1')
n('dE', 9.9, 3.6)
n('sofaA', 9.9, 5.4)
n('dE2', 9.9, 6.9)
n('dS1', 8.7, 6.9)
n('dS0', 7.3, 6.9)
e('dn1', 'dE')
e('dE', 'sofaA')
e('sofaA', 'dE2')
e('dE2', 'dS1')
e('dS1', 'dS0')
n('dseat2', 7.3, 6.2)
n('dseat3', 8.7, 6.2)
e('dS0', 'dseat2')
e('dS1', 'dseat3')
n('sofa0', 10.7, 4.9)
n('sofa1', 10.7, 5.9)
e('sofaA', 'sofa0')
e('sofaA', 'sofa1')

const adj: Record<string, string[]> = {}
for (const [a, b] of edges) {
  ;(adj[a] ??= []).push(b)
  ;(adj[b] ??= []).push(a)
}

const dist = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.z - b.z)

export function nearestNode(p: V2): string {
  let best = 'a0'
  let d = Infinity
  for (const [id, v] of Object.entries(NODES)) {
    const k = dist(p, v)
    if (k < d) {
      d = k
      best = id
    }
  }
  return best
}

/** Jalur terpendek antar simpul (Dijkstra pada graf kecil). */
export function route(from: string, to: string): V2[] {
  if (from === to) return [NODES[to]]
  const best: Record<string, number> = { [from]: 0 }
  const prev: Record<string, string> = {}
  const open = new Set<string>([from])
  while (open.size) {
    let cur = ''
    let cd = Infinity
    for (const id of open) {
      if (best[id] < cd) {
        cd = best[id]
        cur = id
      }
    }
    open.delete(cur)
    if (cur === to) break
    for (const nb of adj[cur] ?? []) {
      const nd = cd + dist(NODES[cur], NODES[nb])
      if (nd < (best[nb] ?? Infinity)) {
        best[nb] = nd
        prev[nb] = cur
        open.add(nb)
      }
    }
  }
  const out: V2[] = []
  let c: string | undefined = to
  while (c) {
    out.unshift(NODES[c])
    c = prev[c]
  }
  return out
}

export const ID_ORDER: EmployeeId[] = ['alex', 'daniel', 'sophia', 'olivia', 'ethan', 'isabella', 'william', 'james']
