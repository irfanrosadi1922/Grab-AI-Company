import * as THREE from 'three'
import type { EmployeeId } from '../types'
import { COFFEE, CHAT_SPOTS, DINING_SEATS, MEETING_SEATS, NODES, SOFA_SEATS, deskFor, nearestNode, route } from './layout'
import type { Desk, V2 } from './layout'
import { createFigure } from './figure'
import type { Figure } from './figure'
import { makeSprite, setSpriteText } from './sprites'

export type Act = 'work' | 'walk' | 'chat' | 'coffee' | 'eat' | 'rest' | 'meeting' | 'off'

export interface AgentInfo {
  id: EmployeeId
  name: string
  act: Act
  label: string
}

interface Final {
  pos: V2
  face: number
  mode: 'sit' | 'stand'
}

interface Agent {
  id: EmployeeId
  name: string
  fig: Figure
  tag: THREE.Sprite
  bubble: THREE.Sprite
  desk: Desk
  x: number
  z: number
  rot: number
  path: V2[]
  final: Final | null
  next: { act: Act; label: string; duration: number; claim: string | null } | null
  mode: 'sit' | 'stand'
  face: number
  act: Act
  label: string
  until: number | null
  claim: string | null
  enabled: boolean
  ready: boolean
  partner: Agent | null
  speaking: boolean
  bubbleLeft: number
  walkT: number
}

interface Chat {
  a: Agent
  b: Agent
  spot: string
  startedAt: number | null
  endAt: number
  nextTalk: number
  turn: number
}

const CHAT_LINES = [
  'Sudah cek laporan hari ini?',
  'Ada ide promo akhir pekan?',
  'Toko mana yang lagi ramai?',
  'Nanti kita bahas di rapat ya',
  'Menu baru bagaimana responsnya?',
  'Tugas dari CEO sudah beres?',
  'Mantap, lanjut ya',
  'Aku kirim drafnya sebentar lagi',
  'Ulasan pelanggan hari ini bagus',
  'Kopinya enak banget',
]
const MEETING_LINES = [
  'Ringkasan minggu ini sudah siap',
  'Ada tiga hal yang perlu keputusan CEO',
  'Promo perlu disetujui dulu',
  'Prioritas kita besok apa?',
  'Setuju, kita jalankan',
  'Catat ya, tindak lanjutnya',
]

const SPEED = 1.5
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export class OfficeSim {
  agents: Agent[] = []
  private chats: Chat[] = []
  private taken = new Set<string>()
  private now = 0
  private acc = 0
  private meetingEnd: number | null = null
  private nextMeeting = 70
  private nextMeetingTalk = 0
  /** Bobot kemungkinan istirahat: karyawan yang sedang mengerjakan tugas lebih jarang meninggalkan meja. */
  workWeight: (id: EmployeeId) => number = () => 1

  constructor(scene: THREE.Object3D, people: { id: EmployeeId; name: string; hue: number }[]) {
    people.forEach((p, i) => {
      const desk = deskFor(i)
      const fig = createFigure(p.hue, i + 1, p.id)
      const tag = makeSprite(p.name, 'name', 0.22)
      tag.position.y = 1.95
      const bubble = makeSprite(' ', 'bubble', 0.2)
      bubble.position.y = 2.3
      bubble.visible = false
      fig.root.add(tag)
      fig.root.add(bubble)
      fig.root.userData.id = p.id
      scene.add(fig.root)
      const a: Agent = {
        id: p.id,
        name: p.name,
        fig,
        tag,
        bubble,
        desk,
        x: desk.seat.x,
        z: desk.seat.z,
        rot: desk.face,
        path: [],
        final: null,
        next: null,
        mode: 'sit',
        face: desk.face,
        act: 'work',
        label: 'Bekerja di meja',
        until: null,
        claim: null,
        enabled: true,
        ready: false,
        partner: null,
        speaking: false,
        bubbleLeft: 0,
        walkT: Math.random() * 10,
      }
      this.agents.push(a)
    })
  }

  info(): AgentInfo[] {
    return this.agents.map((a) => ({ id: a.id, name: a.name, act: a.act, label: a.label }))
  }

  position(id: EmployeeId): THREE.Vector3 | null {
    const a = this.agents.find((x) => x.id === id)
    return a ? new THREE.Vector3(a.x, a.mode === 'sit' ? 0.8 : 1, a.z) : null
  }

  meetingActive() {
    return this.meetingEnd !== null
  }

  setEnabled(id: EmployeeId, on: boolean) {
    const a = this.agents.find((x) => x.id === id)
    if (!a || a.enabled === on) return
    a.enabled = on
    this.release(a)
    this.goDesk(a)
  }

  private say(a: Agent, text: string, secs: number) {
    setSpriteText(a.bubble, text, 'bubble', 0.2)
    a.bubble.visible = true
    a.bubbleLeft = secs
  }

  private release(a: Agent) {
    if (a.claim) this.taken.delete(a.claim)
    a.claim = null
    a.until = null
    a.ready = false
    a.speaking = false
    a.next = null
    const c = this.chats.find((x) => x.a === a || x.b === a)
    if (c) {
      const other = c.a === a ? c.b : c.a
      this.chats = this.chats.filter((x) => x !== c)
      this.taken.delete(`chat:${c.spot}`)
      other.partner = null
      other.speaking = false
      other.ready = false
      this.goDesk(other)
    }
    a.partner = null
    a.bubble.visible = false
  }

  private send(a: Agent, node: string, final: Final, next: Agent['next'], walkLabel: string) {
    const from = nearestNode({ x: a.x, z: a.z })
    const path = route(from, node)
    // lewati titik awal jika sudah sangat dekat
    if (path.length > 1 && Math.hypot(path[0].x - a.x, path[0].z - a.z) < 0.05) path.shift()
    a.path = path
    a.final = final
    a.next = next
    a.act = 'walk'
    a.label = walkLabel
    a.until = null
    a.ready = false
    a.bubble.visible = false
  }

  private goDesk(a: Agent) {
    const d = a.desk
    this.send(
      a,
      d.node,
      { pos: d.seat, face: d.face, mode: 'sit' },
      { act: a.enabled ? 'work' : 'off', label: a.enabled ? 'Bekerja di meja' : 'Nonaktif (di meja)', duration: 0, claim: null },
      'Kembali ke meja',
    )
  }

  private arrive(a: Agent) {
    const f = a.final
    const nx = a.next
    a.final = null
    a.next = null
    if (!f || !nx) return
    a.x = f.pos.x
    a.z = f.pos.z
    a.mode = f.mode
    a.face = f.face
    a.rot = f.face
    a.act = nx.act
    a.label = nx.label
    a.claim = nx.claim
    a.ready = true
    a.until = nx.duration > 0 ? this.now + nx.duration : null
    if (nx.act === 'rest') this.say(a, 'Zzz... istirahat sebentar', 6)
    if (nx.act === 'eat') this.say(a, 'Makan dulu ya', 5)
  }

  private idle(a: Agent) {
    return a.enabled && a.act === 'work' && a.path.length === 0 && a.mode === 'sit'
  }

  private away() {
    return this.agents.filter((a) => a.act !== 'work' && a.act !== 'off').length
  }

  private weighted(list: Agent[]) {
    const ws = list.map((a) => this.workWeight(a.id))
    let r = Math.random() * ws.reduce((s, w) => s + w, 0)
    for (let i = 0; i < list.length; i++) {
      r -= ws[i]
      if (r <= 0) return list[i]
    }
    return list[list.length - 1]
  }

  private startChat(a: Agent, b: Agent) {
    const free = CHAT_SPOTS.filter((s) => !this.taken.has(`chat:${s}`))
    if (free.length === 0) return
    const spot = pick(free)
    this.taken.add(`chat:${spot}`)
    const p = NODES[spot]
    const label = spot === 'pn2' || spot === 'hub' ? 'pantry' : 'lorong'
    const mk = (me: Agent, other: Agent, side: number) => {
      this.send(
        me,
        spot,
        { pos: { x: p.x + side * 0.45, z: p.z }, face: side < 0 ? Math.PI / 2 : -Math.PI / 2, mode: 'stand' },
        { act: 'chat', label: `Ngobrol dengan ${other.name}`, duration: 0, claim: null },
        `Menuju ${label} untuk ngobrol`,
      )
      me.partner = other
    }
    mk(a, b, -1)
    mk(b, a, 1)
    this.chats.push({ a, b, spot, startedAt: null, endAt: 0, nextTalk: 0, turn: 0 })
  }

  private startSolo(a: Agent, kind: 'coffee' | 'eat' | 'rest') {
    if (kind === 'coffee') {
      if (this.taken.has('coffee')) return
      this.taken.add('coffee')
      this.send(a, COFFEE.node, { pos: COFFEE.pos, face: COFFEE.face, mode: 'stand' }, { act: 'coffee', label: 'Minum kopi', duration: rand(9, 14), claim: 'coffee' }, 'Menuju pantry untuk kopi')
      return
    }
    const seats = kind === 'eat' ? DINING_SEATS : SOFA_SEATS
    const free = seats.filter((s) => !this.taken.has(s.node))
    if (free.length === 0) return
    const s = pick(free)
    this.taken.add(s.node)
    if (kind === 'eat') this.send(a, s.node, { pos: s.pos, face: s.face, mode: 'sit' }, { act: 'eat', label: 'Makan di pantry', duration: rand(14, 20), claim: s.node }, 'Menuju pantry untuk makan')
    else this.send(a, s.node, { pos: s.pos, face: s.face, mode: 'sit' }, { act: 'rest', label: 'Istirahat di sofa', duration: rand(14, 22), claim: s.node }, 'Menuju sofa untuk istirahat')
  }

  callMeeting(auto = false) {
    const people = this.agents.filter((a) => a.enabled)
    if (people.length < 2) return false
    for (const a of this.agents) this.release(a)
    this.chats = []
    this.taken.clear()
    people.forEach((a, i) => {
      const s = MEETING_SEATS[i % MEETING_SEATS.length]
      this.taken.add(s.node)
      this.send(a, s.node, { pos: s.pos, face: s.face, mode: 'sit' }, { act: 'meeting', label: 'Rapat di ruang rapat', duration: 0, claim: s.node }, 'Menuju ruang rapat')
    })
    this.meetingEnd = this.now + (auto ? 40 : 60)
    this.nextMeetingTalk = this.now + 8
    return true
  }

  dismissMeeting() {
    if (this.meetingEnd === null) return
    this.meetingEnd = null
    this.nextMeeting = this.now + rand(100, 160)
    for (const a of this.agents) {
      if (a.act === 'meeting' || (a.act === 'walk' && a.next?.act === 'meeting')) {
        this.release(a)
        this.goDesk(a)
      }
    }
  }

  private schedule() {
    if (this.meetingEnd !== null) return
    if (this.now > this.nextMeeting) {
      this.nextMeeting = this.now + rand(110, 170)
      if (this.agents.filter((a) => this.idle(a)).length >= 4) {
        this.callMeeting(true)
        return
      }
    }
    if (this.away() >= 4) return
    const cand = this.agents.filter((a) => this.idle(a))
    if (cand.length === 0) return
    const r = Math.random()
    if (r < 0.18) return // kadang semua fokus bekerja
    if (r < 0.55 && cand.length >= 2) {
      const a = this.weighted(cand)
      const b = this.weighted(cand.filter((x) => x !== a))
      this.startChat(a, b)
    } else if (r < 0.75) this.startSolo(this.weighted(cand), 'coffee')
    else if (r < 0.88) this.startSolo(this.weighted(cand), 'eat')
    else this.startSolo(this.weighted(cand), 'rest')
  }

  update(dt: number) {
    this.now += dt
    this.acc += dt
    if (this.acc > 2.5) {
      this.acc = 0
      this.schedule()
    }

    // Rapat: berakhir sendiri, dan ada yang "bicara" bergantian setelah semua duduk.
    if (this.meetingEnd !== null) {
      const sitting = this.agents.filter((a) => a.act === 'meeting')
      if (this.now > this.meetingEnd) this.dismissMeeting()
      else if (sitting.length > 0 && this.now > this.nextMeetingTalk) {
        this.nextMeetingTalk = this.now + 4.5
        const s = pick(sitting)
        this.say(s, pick(MEETING_LINES), 4)
      }
    }

    // Ngobrol: mulai saat keduanya sudah tiba, bergantian bicara, lalu bubar.
    for (const c of [...this.chats]) {
      if (c.startedAt === null) {
        if (c.a.act === 'chat' && c.b.act === 'chat' && c.a.ready && c.b.ready) {
          c.startedAt = this.now
          c.endAt = this.now + rand(13, 20)
          c.nextTalk = this.now
        }
        continue
      }
      if (this.now > c.endAt) {
        this.chats = this.chats.filter((x) => x !== c)
        this.taken.delete(`chat:${c.spot}`)
        for (const m of [c.a, c.b]) {
          m.partner = null
          m.speaking = false
          m.bubble.visible = false
          this.goDesk(m)
        }
        continue
      }
      if (this.now > c.nextTalk) {
        c.nextTalk = this.now + 3.6
        const sp = c.turn++ % 2 === 0 ? c.a : c.b
        const other = sp === c.a ? c.b : c.a
        sp.speaking = true
        other.speaking = false
        other.bubble.visible = false
        this.say(sp, pick(CHAT_LINES), 3.4)
      }
    }

    for (const a of this.agents) {
      a.walkT += dt
      if (a.bubbleLeft > 0) {
        a.bubbleLeft -= dt
        if (a.bubbleLeft <= 0) {
          a.bubble.visible = false
          a.speaking = false
        }
      }

      // Selesai beraktivitas: kembali ke meja.
      if (a.until !== null && this.now > a.until && (a.act === 'coffee' || a.act === 'eat' || a.act === 'rest')) {
        this.release(a)
        this.goDesk(a)
      }

      if (a.path.length > 0) {
        const t = a.path[0]
        const dx = t.x - a.x
        const dz = t.z - a.z
        const d = Math.hypot(dx, dz)
        const step = SPEED * dt
        if (d <= step) {
          a.x = t.x
          a.z = t.z
          a.path.shift()
          if (a.path.length === 0) {
            // langkah terakhir dari simpul ke posisi akhir (misalnya ke samping teman ngobrol)
            if (a.final && Math.hypot(a.final.pos.x - a.x, a.final.pos.z - a.z) > 0.02) a.path = [a.final.pos]
            else this.arrive(a)
          }
        } else {
          a.x += (dx / d) * step
          a.z += (dz / d) * step
          const want = Math.atan2(dx, dz)
          a.rot += wrapAngle(want - a.rot) * Math.min(1, dt * 10)
        }
      } else {
        a.rot += wrapAngle(a.face - a.rot) * Math.min(1, dt * 8)
      }
    }
  }

  render() {
    for (const a of this.agents) {
      const moving = a.path.length > 0
      a.fig.root.position.set(a.x, 0, a.z)
      a.fig.root.rotation.y = a.rot
      a.fig.pose(moving ? 'walk' : a.mode, a.walkT, {
        typing: a.act === 'work',
        drinking: a.act === 'coffee' && !moving,
        talking: a.speaking && !moving,
      })
      a.tag.material.opacity = a.enabled ? 1 : 0.5
    }
  }
}
