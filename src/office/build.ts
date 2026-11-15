import * as THREE from 'three'
import { DINING_SEATS, FLOOR, MEETING_SEATS, deskFor } from './layout'
import { makeSprite } from './sprites'

const mats = new Map<string, THREE.MeshLambertMaterial>()
const mat = (c: string, opacity = 1) => {
  const k = `${c}|${opacity}`
  let m = mats.get(k)
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: c, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 })
    mats.set(k, m)
  }
  return m
}

function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, color: string, opacity = 1) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opacity))
  m.position.set(x, y, z)
  parent.add(m)
  return m
}

function cyl(parent: THREE.Object3D, rt: number, rb: number, h: number, x: number, y: number, z: number, color: string) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 14), mat(color))
  m.position.set(x, y, z)
  parent.add(m)
  return m
}

function chair(parent: THREE.Object3D, x: number, z: number, face: number, color = '#2e3a44') {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  g.rotation.y = face
  box(g, 0.5, 0.07, 0.5, 0, 0.45, 0, color)
  box(g, 0.5, 0.5, 0.06, 0, 0.75, -0.22, color)
  cyl(g, 0.04, 0.04, 0.4, 0, 0.22, 0, '#1a1f24')
  cyl(g, 0.22, 0.22, 0.03, 0, 0.02, 0, '#1a1f24')
  parent.add(g)
}

function plant(parent: THREE.Object3D, x: number, z: number) {
  cyl(parent, 0.22, 0.17, 0.4, x, 0.2, z, '#8a5a3c')
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), mat('#2f8f4e'))
  s.position.set(x, 0.75, z)
  parent.add(s)
  const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), mat('#3aa55c'))
  s2.position.set(x + 0.15, 1.05, z - 0.05)
  parent.add(s2)
}

function wallX(parent: THREE.Object3D, x: number, z0: number, z1: number, glass: boolean) {
  const len = z1 - z0
  box(parent, 0.12, 0.45, len, x, 0.225, (z0 + z1) / 2, '#cfd6d2')
  if (glass) box(parent, 0.05, 2.0, len, x, 1.45, (z0 + z1) / 2, '#9fd4e6', 0.22)
}
function wallZ(parent: THREE.Object3D, z: number, x0: number, x1: number, glass: boolean) {
  const len = x1 - x0
  box(parent, len, 0.45, 0.12, (x0 + x1) / 2, 0.225, z, '#cfd6d2')
  if (glass) box(parent, len, 2.0, 0.05, (x0 + x1) / 2, 1.45, z, '#9fd4e6', 0.22)
}

export function buildOffice(scene: THREE.Scene, deskLabels: { index: number; name: string }[]) {
  const W = FLOOR.w / 2
  const D = FLOOR.d / 2
  const g = new THREE.Group()
  scene.add(g)

  // Lantai dasar dan zona
  box(g, FLOOR.w + 0.6, 0.3, FLOOR.d + 0.6, 0, -0.15, 0, '#d9ddd9')
  box(g, 14.9, 0.02, FLOOR.d, -W + 7.45, 0.01, 0, '#c7b79e') // ruang kerja (kayu)
  box(g, 9, 0.02, 7, 7.5, 0.012, -4.5, '#8fa3b5') // ruang rapat (karpet)
  box(g, 9, 0.02, 6.4, 7.5, 0.012, 4.8, '#e8dcc6') // pantry
  box(g, 3.2, 0.025, 2.4, 10.2, 0.02, 5.4, '#b86a5a') // karpet sofa

  // Dinding luar (kaca + alas), bagian depan diberi pintu masuk
  wallZ(g, -D, -W, W, true)
  wallX(g, -W, -D, D, true)
  wallX(g, W, -D, D, true)
  wallZ(g, D, -W, -1.2, true)
  wallZ(g, D, 1.2, W, true)
  // Penyekat: ruang rapat dan pantry (ada celah jalan di x=3)
  wallX(g, 3, -D, -1.2, true)
  wallX(g, 3, 2.6, D, true)
  wallZ(g, -1, 3, 3.8, true)
  wallZ(g, -1, 6.2, W, true)

  // Papan nama perusahaan di depan
  const sign = makeSprite('GRAB AI COMPANY', 'sign', 0.9)
  sign.position.set(0, 3.2, D + 0.4)
  g.add(sign)

  // Meja kerja per karyawan
  for (const { index, name } of deskLabels) {
    const d = deskFor(index)
    const dir = d.face === Math.PI ? 1 : -1 // arah dari meja menuju kursi
    box(g, 1.6, 0.06, 0.8, d.x, 0.74, d.z, '#e9e4da')
    box(g, 0.06, 0.72, 0.7, d.x - 0.72, 0.36, d.z, '#9ea6a4')
    box(g, 0.06, 0.72, 0.7, d.x + 0.72, 0.36, d.z, '#9ea6a4')
    // monitor menghadap kursi
    const mon = new THREE.Group()
    mon.position.set(d.x, 0.77, d.z - dir * 0.18)
    mon.rotation.y = d.face === Math.PI ? 0 : Math.PI
    box(mon, 0.6, 0.36, 0.03, 0, 0.36, 0, '#161a1d')
    box(mon, 0.54, 0.3, 0.01, 0, 0.36, 0.02, '#4f9ff0')
    box(mon, 0.06, 0.18, 0.05, 0, 0.09, 0, '#22282c')
    g.add(mon)
    box(g, 0.45, 0.02, 0.15, d.x, 0.78, d.z + dir * 0.18, '#2a2f33') // keyboard
    chair(g, d.seat.x, d.seat.z, d.face)
    const tag = makeSprite(name, 'dim', 0.2)
    tag.position.set(d.x, 1.0, d.z)
    g.add(tag)
  }

  // Ruang rapat
  box(g, 4.2, 0.08, 1.7, 7.5, 0.74, -4.8, '#d8c3a5')
  box(g, 0.5, 0.72, 0.5, 6.4, 0.36, -4.8, '#6b5a47')
  box(g, 0.5, 0.72, 0.5, 8.6, 0.36, -4.8, '#6b5a47')
  for (const s of MEETING_SEATS) chair(g, s.pos.x, s.pos.z, s.face, '#3a4a5c')
  box(g, 3.4, 1.6, 0.06, 7.5, 1.5, -7.9, '#f5f7f6') // layar presentasi
  box(g, 3.5, 1.7, 0.04, 7.5, 1.5, -7.93, '#22282c')
  const board = makeSprite('Rapat Tim', 'dim', 0.35)
  board.position.set(7.5, 1.5, -7.8)
  g.add(board)
  plant(g, 11.2, -7.2)

  // Pantry: konter, mesin kopi, kulkas, meja makan, sofa
  box(g, 3.2, 0.9, 0.7, 5.1, 0.45, 7.6, '#e3e6e4')
  box(g, 3.2, 0.04, 0.74, 5.1, 0.92, 7.6, '#4a4f52')
  box(g, 0.45, 0.5, 0.4, 4.6, 1.19, 7.6, '#2b2f33')
  box(g, 0.08, 0.08, 0.02, 4.6, 1.3, 7.39, '#e0453a')
  box(g, 0.9, 1.9, 0.7, 3.5, 0.95, 7.55, '#cfd6d2') // kulkas
  box(g, 2.7, 0.06, 1.3, 8, 0.74, 5, '#c9b08a')
  box(g, 0.2, 0.72, 0.2, 8, 0.36, 5, '#6b5a47')
  for (const s of DINING_SEATS) chair(g, s.pos.x, s.pos.z, s.face, '#c9803f')
  // sofa menghadap barat
  box(g, 1.0, 0.45, 2.6, 11.2, 0.23, 5.4, '#5b6e86')
  box(g, 0.25, 0.9, 2.6, 11.75, 0.62, 5.4, '#5b6e86')
  box(g, 0.9, 0.35, 0.9, 9.6, 0.18, 5.4, '#b7a68c') // meja kopi
  plant(g, 11.3, 2.2)
  plant(g, -11.3, -7.2)
  plant(g, -11.3, 7.2)
  plant(g, 2.2, 7.2)

  // Pintu masuk: karpet
  box(g, 2.4, 0.02, 1.6, 0, 0.012, D - 0.8, '#3d4a44')

  return g
}
