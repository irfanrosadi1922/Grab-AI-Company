import * as THREE from 'three'
import { DINING_SEATS, FLOOR, MEETING_SEATS, deskFor } from './layout'
import { makeSprite } from './sprites'

const mats = new Map<string, THREE.MeshStandardMaterial>()
const mat = (c: string, opacity = 1) => {
  const k = `${c}|${opacity}`
  let m = mats.get(k)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 })
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

function wallX(parent: THREE.Object3D, x: number, z0: number, z1: number, color = '#a9bfa3') {
  const len = z1 - z0
  box(parent, 0.14, 1.0, len, x, 0.5, (z0 + z1) / 2, color)
  box(parent, 0.18, 0.05, len, x, 1.02, (z0 + z1) / 2, '#e9e4d8')
  box(parent, 0.05, 1.3, len, x, 1.7, (z0 + z1) / 2, '#bfe2ee', 0.22)
}
function wallZ(parent: THREE.Object3D, z: number, x0: number, x1: number, color = '#a9bfa3') {
  const len = x1 - x0
  box(parent, len, 1.0, 0.14, (x0 + x1) / 2, 0.5, z, color)
  box(parent, len, 0.05, 0.18, (x0 + x1) / 2, 1.02, z, '#e9e4d8')
  box(parent, len, 1.3, 0.05, (x0 + x1) / 2, 1.7, z, '#bfe2ee', 0.22)
}

function sphere(parent: THREE.Object3D, r: number, x: number, y: number, z: number, color: string) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat(color))
  m.position.set(x, y, z)
  parent.add(m)
  return m
}

const GROUND = -0.3

function car(parent: THREE.Object3D, x: number, z: number, rot: number, color: string) {
  const c = new THREE.Group()
  c.position.set(x, GROUND, z)
  c.rotation.y = rot
  box(c, 1.9, 0.55, 4.2, 0, 0.55, 0, color)
  box(c, 1.7, 0.5, 2.3, 0, 1.07, -0.1, color)
  box(c, 1.74, 0.34, 2.0, 0, 1.1, -0.1, '#2b3a48')
  box(c, 1.6, 0.06, 2.1, 0, 1.34, -0.1, color)
  for (const sx of [-1, 1])
    for (const sz of [-1.35, 1.35]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.26, 14), mat('#1b1d20'))
      w.rotation.z = Math.PI / 2
      w.position.set(sx * 0.95, 0.38, sz)
      c.add(w)
    }
  parent.add(c)
}

function tree(parent: THREE.Object3D, x: number, z: number) {
  cyl(parent, 0.18, 0.24, 1.6, x, GROUND + 0.8, z, '#6b4a33')
  sphere(parent, 1.3, x, GROUND + 2.3, z, '#3b8f4f')
  sphere(parent, 0.95, x + 0.6, GROUND + 3.1, z - 0.2, '#47a45c')
  sphere(parent, 0.8, x - 0.6, GROUND + 2.9, z + 0.3, '#3a8647')
}

/** Lingkungan luar: tapak, jalan parkir, mobil, semak, pohon, papan nama, dan dinding bata. */
function buildExterior(g: THREE.Group, W: number, D: number) {
  const BRICK = '#9c5b46'
  const BRICK_D = '#7d4636'
  const CAP = '#c98c72'

  // Tapak seperti diorama: alas tebal + aspal
  box(g, 31.4, 0.5, 29.6, 0, GROUND - 0.7, 3.8, '#706c66')
  box(g, 30.6, 0.5, 28.8, 0, GROUND - 0.25, 3.8, '#52565b')
  box(g, 30.6, 0.04, 2.4, 0, GROUND + 0.02, D + 1.2, '#bdb9af') // trotoar depan
  box(g, 2.4, 0.04, FLOOR.d + 2, W + 1.2, GROUND + 0.02, 0, '#bdb9af') // trotoar timur
  box(g, 30.6, 0.03, 2.6, 0, GROUND + 0.02, -D - 1.7, '#6f9a5b') // rumput belakang
  for (const x of [-12, -8.5, -5, 3.8, 7.3, 9.8, 13.4]) box(g, 0.14, 0.02, 4.6, x, GROUND + 0.02, 14.5, '#e8e8e4')

  car(g, -10.25, 14.4, 0.04, '#b8bcc2')
  car(g, -6.75, 14.6, -0.03, '#9aa1a8')
  car(g, 5.5, 14.5, 0.02, '#2f5fb3')
  car(g, 11.6, 14.4, -0.04, '#b5302b')

  for (const x of [-12, -10.6, -9.2, -7.8, -6.4, -5, -3.6, 3.6, 5, 6.4, 7.8, 9.2, 10.6, 12]) {
    sphere(g, 0.5, x, GROUND + 0.45, D + 2, (Math.round(x * 3) & 1) === 0 ? '#3f9a52' : '#4aa95c')
  }
  tree(g, -14, -8.8)
  tree(g, 14, -8.8)
  tree(g, 14.6, 17.6)

  // Papan nama di tapak
  box(g, 3.4, 0.4, 0.6, -12.6, GROUND + 0.2, 11.4, '#76726b')
  box(g, 3.2, 1.5, 0.2, -12.6, GROUND + 1.15, 11.4, '#1e2a38')
  const mono = makeSprite('GRAB AI COMPANY', 'sign', 0.42)
  mono.position.set(-12.6, GROUND + 1.15, 11.55)
  g.add(mono)

  // Dinding belakang dan kiri (tinggi, sisi dalam berwarna), terlihat dari kamera depan-kanan
  box(g, FLOOR.w + 0.3, 3.0, 0.25, 0, 1.5, -D - 0.12, '#eadfc8')
  box(g, FLOOR.w + 0.3, 0.1, 0.3, 0, 3.02, -D - 0.12, CAP)
  box(g, 0.25, 3.0, FLOOR.d + 0.3, -W - 0.12, 1.5, 0, '#a592d0')
  box(g, 0.3, 0.1, FLOOR.d + 0.3, -W - 0.12, 3.02, 0, CAP)
  // Jendela dan jam di dinding belakang
  for (const x of [-8, -3.5, 1.5]) {
    box(g, 2.0, 1.3, 0.05, x, 1.9, -D + 0.03, '#d7ecf5')
    box(g, 2.1, 0.08, 0.07, x, 2.58, -D + 0.04, '#f4f1ea')
    box(g, 2.1, 0.08, 0.07, x, 1.22, -D + 0.04, '#f4f1ea')
    for (let k = 0; k < 5; k++) box(g, 1.9, 0.02, 0.06, x, 1.35 + k * 0.23, -D + 0.05, '#e7e2d6') // kerai
  }
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 20), mat('#f4f1ea'))
  clock.rotation.x = Math.PI / 2
  clock.position.set(5.8, 2.5, -D + 0.05)
  g.add(clock)
  box(g, 0.03, 0.22, 0.02, 5.8, 2.55, -D + 0.1, '#1b1d20')
  box(g, 0.16, 0.03, 0.02, 5.85, 2.5, -D + 0.1, '#1b1d20')
  // Papan pengumuman dan lemari arsip di dinding kiri
  box(g, 0.05, 1.0, 2.0, -W + 0.04, 1.7, -3, '#c8a06b')
  box(g, 0.06, 0.8, 1.8, -W + 0.05, 1.7, -3, '#e0c9a0')
  for (const z of [-6.2, -5.4, 5.8, 6.6]) {
    box(g, 0.6, 1.3, 0.7, -W + 0.4, 0.65, z, '#8e9aa2')
    box(g, 0.62, 0.02, 0.72, -W + 0.4, 0.98, z, '#6f7a82')
  }

  // Dinding depan dan kanan (rendah, bata) dengan jendela, agar isi gedung terlihat
  const H = 1.5
  const wallS = (x0: number, x1: number, wins: number[]) => {
    const len = x1 - x0
    const cx = (x0 + x1) / 2
    box(g, len, H, 0.26, cx, H / 2, D + 0.1, BRICK)
    box(g, len, 0.3, 0.3, cx, 0.15, D + 0.1, BRICK_D)
    box(g, len, 0.08, 0.34, cx, H + 0.04, D + 0.1, CAP)
    for (const x of wins) {
      box(g, 1.5, 0.7, 0.05, x, 0.85, D + 0.25, '#27394d')
      box(g, 1.6, 0.06, 0.08, x, 0.5, D + 0.26, '#d9c7b8')
    }
  }
  wallS(-W - 0.3, -1.2, [-10.6, -8.4, -6.2, -4])
  wallS(1.2, W + 0.3, [4, 6.2, 8.4, 10.6])
  box(g, 0.26, H, FLOOR.d + 0.3, W + 0.1, H / 2, 0, BRICK)
  box(g, 0.3, 0.3, FLOOR.d + 0.3, W + 0.1, 0.15, 0, BRICK_D)
  box(g, 0.34, 0.08, FLOOR.d + 0.3, W + 0.1, H + 0.04, 0, CAP)
  for (const z of [-5.5, -2.5, 0.5, 3.5, 6.2]) {
    box(g, 0.05, 0.7, 1.5, W + 0.25, 0.85, z, '#27394d')
    box(g, 0.08, 0.06, 1.6, W + 0.26, 0.5, z, '#d9c7b8')
  }

  // Pintu masuk dan papan di atasnya
  box(g, 0.16, 2.2, 0.26, -1.25, 1.1, D + 0.1, '#35261f')
  box(g, 0.16, 2.2, 0.26, 1.25, 1.1, D + 0.1, '#35261f')
  box(g, 2.7, 0.18, 0.28, 0, 2.2, D + 0.1, '#35261f')
  box(g, 2.3, 1.9, 0.04, 0, 0.95, D + 0.1, '#bfe2ee', 0.25)
  box(g, 5.2, 0.95, 0.16, 0, 2.85, D + 0.1, '#1e2a38')
  box(g, 5.3, 0.06, 0.2, 0, 3.35, D + 0.1, CAP)
  const sign = makeSprite('GRAB AI COMPANY', 'sign', 0.62)
  sign.position.set(0, 2.85, D + 0.28)
  g.add(sign)
  // Dispenser air dan alat pemadam di depan
  cyl(g, 0.22, 0.22, 0.7, 4, GROUND + 0.35, D + 1.3, '#d8e4ea')
  sphere(g, 0.26, 4, GROUND + 0.95, D + 1.3, '#7fb5d8')
  cyl(g, 0.1, 0.1, 0.4, W + 0.45, 0.2, 6.9, '#c43a34')
}

export function buildOffice(scene: THREE.Scene, deskLabels: { index: number; name: string }[]) {
  const W = FLOOR.w / 2
  const D = FLOOR.d / 2
  const g = new THREE.Group()
  scene.add(g)

  // Lantai dasar dan zona
  box(g, FLOOR.w + 0.6, 0.3, FLOOR.d + 0.6, 0, -0.15, 0, '#d9ddd9')
  box(g, 14.9, 0.02, FLOOR.d, -W + 7.45, 0.01, 0, '#8e9eb0') // ruang kerja (karpet abu-biru)
  box(g, 9, 0.02, 7, 7.5, 0.012, -4.5, '#7e9d8a') // ruang rapat (karpet)
  box(g, 9, 0.02, 6.4, 7.5, 0.012, 4.8, '#e6d3ad') // pantry
  box(g, 3.2, 0.025, 2.4, 10.2, 0.02, 5.4, '#b86a5a') // karpet sofa

  buildExterior(g, W, D)
  // Penyekat: ruang rapat dan pantry (ada celah jalan di x=3)
  wallX(g, 3, -D, -1.2, '#a9bfa3')
  wallX(g, 3, 2.6, D, '#e3d6b8')
  wallZ(g, -1, 3, 3.8, '#a9bfa3')
  wallZ(g, -1, 6.2, W, '#a9bfa3')
  // Lemari arsip, printer, dan dispenser di ruang kerja
  for (const x of [-11.2, -10.3, 1.4, 2.3]) {
    box(g, 0.8, 1.3, 0.6, x, 0.65, -D + 0.45, '#8f9ba3')
    box(g, 0.82, 0.02, 0.62, x, 0.99, -D + 0.45, '#6d787f')
    box(g, 0.82, 0.02, 0.62, x, 0.66, -D + 0.45, '#6d787f')
  }
  box(g, 1.2, 0.75, 0.7, -6.6, 0.375, -D + 0.45, '#cfd3d6')
  box(g, 0.7, 0.3, 0.5, -6.6, 0.9, -D + 0.45, '#e9e9e6')
  box(g, 0.5, 0.03, 0.4, -6.6, 1.06, -D + 0.4, '#ffffff')
  cyl(g, 0.22, 0.22, 0.9, -2.4, 0.45, -D + 0.5, '#e6eef2')
  sphere(g, 0.26, -2.4, 1.15, -D + 0.5, '#7fb5d8')
  // Karpet jalan
  box(g, 14, 0.015, 1.4, -4.5, 0.02, 0, '#6d7e92')

  // Mesin penjual otomatis di pantry
  box(g, 0.9, 1.8, 0.7, 9.6, 0.9, 7.55, '#3a5f9e')
  box(g, 0.7, 1.1, 0.04, 9.6, 1.1, 7.18, '#9ad2f0')
  box(g, 0.9, 1.8, 0.7, 10.6, 0.9, 7.55, '#b8433b')
  box(g, 0.7, 1.1, 0.04, 10.6, 1.1, 7.18, '#f0d9a0')

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
    // kotak PC, kertas, lampu meja, dan cangkir
    box(g, 0.22, 0.45, 0.5, d.x + 0.55, 0.27, d.z + dir * 0.0, '#d8d2c4')
    box(g, 0.3, 0.025, 0.4, d.x - 0.5, 0.79, d.z + dir * 0.1, '#f7f7f4')
    box(g, 0.28, 0.025, 0.38, d.x - 0.46, 0.815, d.z + dir * 0.12, '#eceae4')
    cyl(g, 0.03, 0.05, 0.02, d.x + 0.6, 0.78, d.z - dir * 0.22, '#2d3338')
    box(g, 0.02, 0.28, 0.02, d.x + 0.6, 0.92, d.z - dir * 0.22, '#2d3338')
    box(g, 0.14, 0.04, 0.08, d.x + 0.6, 1.07, d.z - dir * 0.22, '#f0b429')
    cyl(g, 0.04, 0.035, 0.09, d.x + 0.32, 0.82, d.z + dir * 0.22, '#e8eaeb')
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
