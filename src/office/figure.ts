import * as THREE from 'three'

const SKIN = ['#f1c9a5', '#e0ac82', '#c68b62', '#a8704b', '#f6d7bd']
const HAIR = ['#1c1a19', '#3a2a20', '#5b4030', '#121212', '#6b4a2b']

type HairStyle = 'swoop' | 'messy' | 'wavy' | 'bob' | 'quiff' | 'long' | 'curly' | 'side'
type Prop = 'abacus' | 'mic' | 'clipboard' | 'camera' | 'brush' | 'headset' | 'chef' | 'none'
interface Look {
  skin: string
  hair: string
  style: HairStyle
  glasses?: string
  eye: string
  props: Prop[]
}

/** Penampilan khas tiap karyawan, mengikuti ilustrasi karakter 3D kartun (urutan sama dengan daftar karyawan). */
const LOOKS: Record<string, Look> = {
  alex: { skin: '#f6d7bd', hair: '#6b4a2b', style: 'swoop', glasses: '#1e1b1a', eye: '#5a3a22', props: [] },
  daniel: { skin: '#f1c9a5', hair: '#121212', style: 'messy', eye: '#2a2018', props: ['abacus'] },
  sophia: { skin: '#f6d7bd', hair: '#b4603a', style: 'wavy', eye: '#6b4226', props: ['mic'] },
  olivia: { skin: '#f1c9a5', hair: '#141414', style: 'bob', eye: '#2a2018', props: ['chef', 'clipboard'] },
  ethan: { skin: '#f6d7bd', hair: '#d9692b', style: 'quiff', glasses: '#6b4a3a', eye: '#5a7a96', props: ['brush'] },
  isabella: { skin: '#f6d7bd', hair: '#8a63c4', style: 'long', eye: '#5b3a78', props: ['camera'] },
  william: { skin: '#f1c9a5', hair: '#6b3f2a', style: 'curly', eye: '#4a2c1c', props: ['headset'] },
  james: { skin: '#e0ac82', hair: '#15181c', style: 'side', eye: '#2a2018', props: ['clipboard'] },
}

const lambert = (color: string | THREE.Color) => new THREE.MeshLambertMaterial({ color })

export interface Figure {
  root: THREE.Group
  /** Pose dihitung ulang tiap frame dari fase waktu. */
  pose: (mode: 'walk' | 'stand' | 'sit', t: number, extra: { typing?: boolean; drinking?: boolean; talking?: boolean }) => void
  cup: THREE.Object3D
}

function limb(len: number, w: number, color: string) {
  const pivot = new THREE.Group()
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), lambert(color))
  m.position.y = -len / 2
  pivot.add(m)
  return pivot
}

/** Model karyawan low-poly dari bentuk dasar. Menghadap +Z pada rotasi Y = 0. */
export function createFigure(hue: number, seed: number, id?: string): Figure {
  const root = new THREE.Group()
  const shirt = id && LOOKS[id] ? new THREE.Color('#f7f6f4') : new THREE.Color().setHSL(hue / 360, 0.5, 0.45)
  const accent = new THREE.Color().setHSL(hue / 360, 0.55, 0.5)
  const pants = '#2a3038'
  const look: Look = (id && LOOKS[id]) || {
    skin: SKIN[seed % SKIN.length],
    hair: HAIR[(seed * 3) % HAIR.length],
    style: 'side',
    eye: '#2a2018',
    props: [],
  }
  const skin = look.skin
  const hair = look.hair

  const hips = new THREE.Group()
  hips.position.y = 0.82
  root.add(hips)

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.26), lambert(shirt))
  torso.position.y = 0.3
  hips.add(torso)

  // Kepala besar bergaya kartun; semua bagian wajah dan rambut ikut miring bersama kepala.
  const head = new THREE.Group()
  head.position.y = 0.8
  hips.add(head)
  const ell = (r: number, sx: number, sy: number, sz: number, color: string, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), lambert(color))
    m.scale.set(sx, sy, sz)
    m.position.set(x, y, z)
    head.add(m)
    return m
  }
  ell(0.19, 1, 1.05, 1, skin)
  ell(0.04, 0.7, 1, 0.5, skin, -0.19, -0.01, 0) // telinga
  ell(0.04, 0.7, 1, 0.5, skin, 0.19, -0.01, 0)
  ell(0.022, 1, 0.9, 0.9, skin, 0, -0.02, 0.19) // hidung
  for (const sd of [-1, 1]) {
    ell(0.04, 1, 1.15, 0.5, '#ffffff', sd * 0.075, 0.0, 0.172)
    ell(0.025, 1, 1.1, 0.5, look.eye, sd * 0.075, 0.0, 0.192)
    ell(0.011, 1, 1, 0.5, '#111111', sd * 0.075, 0.0, 0.203)
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.015, 0.015), lambert(hair))
    brow.position.set(sd * 0.075, 0.062, 0.19)
    brow.rotation.z = sd * -0.12
    head.add(brow)
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.01), lambert('#b5594f'))
  mouth.position.set(0, -0.09, 0.185)
  head.add(mouth)

  // Rambut
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.205, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), lambert(hair))
  cap.position.set(0, 0.015, -0.012)
  cap.rotation.x = -0.28
  head.add(cap)
  const st = look.style
  if (st === 'swoop' || st === 'quiff') {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.12), lambert(hair))
    f.position.set(st === 'quiff' ? 0.02 : 0.04, 0.2, 0.1)
    f.rotation.set(st === 'quiff' ? -0.5 : -0.25, 0, st === 'quiff' ? 0 : -0.2)
    head.add(f)
  } else if (st === 'messy') {
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6), lambert(hair))
      const a = (i / 7) * Math.PI * 2
      sp.position.set(Math.cos(a) * 0.11, 0.22, Math.sin(a) * 0.09)
      sp.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6)
      head.add(sp)
    }
  } else if (st === 'curly') {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2
      ell(0.065, 1, 1, 1, hair, Math.cos(a) * 0.14, 0.17, Math.sin(a) * 0.13)
    }
    ell(0.08, 1, 1, 1, hair, 0, 0.23, 0)
  } else if (st === 'wavy' || st === 'long') {
    const long = st === 'long'
    ell(0.2, 1.1, long ? 2.0 : 1.5, 0.75, hair, 0, long ? -0.17 : -0.1, -0.07)
    ell(0.07, 1, long ? 2.4 : 1.8, 1, hair, -0.17, long ? -0.15 : -0.08, 0.02)
    ell(0.07, 1, long ? 2.4 : 1.8, 1, hair, 0.17, long ? -0.15 : -0.08, 0.02)
  } else if (st === 'bob') {
    ell(0.2, 1.12, 1.0, 0.85, hair, 0, -0.04, -0.06)
    ell(0.06, 1, 1.6, 1, hair, -0.18, -0.06, 0.03)
    ell(0.06, 1, 1.6, 1, hair, 0.18, -0.06, 0.03)
  }

  // Kacamata
  if (look.glasses) {
    for (const sd of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.011, 6, 18), lambert(look.glasses))
      rim.position.set(sd * 0.075, 0.0, 0.2)
      head.add(rim)
    }
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.01), lambert(look.glasses))
    br.position.set(0, 0.01, 0.205)
    head.add(br)
  }
  // Aksesori kepala
  if (look.props.includes('chef')) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 16), lambert('#ffffff'))
    band.position.y = 0.2
    head.add(band)
    ell(0.19, 1, 0.8, 1, '#ffffff', 0, 0.3, 0)
  }
  if (look.props.includes('headset')) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.016, 6, 20, Math.PI), lambert('#2b2f36'))
    arc.rotation.z = 0
    head.add(arc)
    for (const sd of [-1, 1]) {
      const cupE = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 12), lambert('#2b2f36'))
      cupE.rotation.z = Math.PI / 2
      cupE.position.set(sd * 0.2, 0, 0)
      head.add(cupE)
    }
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.14), lambert('#2b2f36'))
    boom.position.set(0.19, -0.06, 0.08)
    head.add(boom)
    ell(0.018, 1, 1, 1, '#111111', 0.19, -0.06, 0.15)
  }
  if (look.props.includes('brush')) {
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), lambert('#c9a15a'))
    br.position.set(0.2, 0.1, 0)
    br.rotation.z = -0.5
    head.add(br)
    ell(0.014, 1, 2, 1, '#e5532d', 0.27, 0.19, 0)
  }

  // Lengan: bahu -> siku
  const mkArm = (side: number) => {
    const shoulder = new THREE.Group()
    shoulder.position.set(side * 0.29, 0.5, 0)
    const upper = limb(0.28, 0.11, shirt.getStyle())
    const elbow = new THREE.Group()
    elbow.position.y = -0.28
    const fore = limb(0.26, 0.09, skin)
    elbow.add(fore)
    upper.add(elbow)
    shoulder.add(upper)
    hips.add(shoulder)
    return { shoulder, elbow }
  }
  const armL = mkArm(-1)
  const armR = mkArm(1)

  // Kaki: pinggul -> lutut
  const mkLeg = (side: number) => {
    const hip = new THREE.Group()
    hip.position.set(side * 0.11, 0, 0)
    const thigh = limb(0.4, 0.15, pants)
    const knee = new THREE.Group()
    knee.position.y = -0.4
    const shin = limb(0.4, 0.13, pants)
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.26), lambert('#15181c'))
    foot.position.set(0, -0.4, 0.05)
    shin.add(foot)
    knee.add(shin)
    thigh.add(knee)
    hip.add(thigh)
    hips.add(hip)
    return { hip, knee }
  }
  const legL = mkLeg(-1)
  const legR = mkLeg(1)

  // Aksesori di tangan kiri
  const hand = new THREE.Group()
  hand.position.set(0, -0.27, 0.05)
  armL.elbow.add(hand)
  const box = (w: number, h: number, d: number, c: string, x = 0, y = 0, z = 0, g: THREE.Object3D = hand) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(c))
    m.position.set(x, y, z)
    g.add(m)
    return m
  }
  if (look.props.includes('abacus')) {
    box(0.2, 0.15, 0.03, '#8a5a30')
    box(0.17, 0.12, 0.034, '#e8d6b0')
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) box(0.025, 0.02, 0.04, '#6b3f1f', -0.05 + c * 0.05, -0.045 + r * 0.03, 0)
  } else if (look.props.includes('mic')) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.015, 0.16, 8), lambert('#2b2f36'))
    hand.add(h)
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), lambert('#9aa3ad'))
    hd.position.y = 0.11
    hand.add(hd)
  } else if (look.props.includes('clipboard')) {
    box(0.17, 0.22, 0.02, '#c9a36b', 0, 0.04, 0.02)
    box(0.14, 0.18, 0.024, '#f4f1ea', 0, 0.04, 0.022)
  } else if (look.props.includes('camera')) {
    box(0.16, 0.1, 0.08, '#2b2f36')
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12), lambert('#6c7a89'))
    lens.rotation.x = Math.PI / 2
    lens.position.z = 0.06
    hand.add(lens)
  }
  hand.visible = look.props.some((x) => x === 'abacus' || x === 'mic' || x === 'clipboard' || x === 'camera')

  // Dasi/aksen warna peran di kerah
  if (id && LOOKS[id]) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.02), lambert(accent.getStyle()))
    tie.position.set(0, 0.42, 0.14)
    hips.add(tie)
  }

  // Gelas kopi di tangan kanan, disembunyikan sampai dipakai.
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.1, 10), lambert('#f4efe6'))
  cup.position.set(0, -0.28, 0.06)
  cup.visible = false
  armR.elbow.add(cup)

  const pose: Figure['pose'] = (mode, t, extra) => {
    const sw = Math.sin(t * 8)
    if (mode === 'walk') {
      root.position.y = 0
      hips.position.y = 0.82 + Math.abs(Math.sin(t * 8)) * 0.025
      legL.hip.rotation.x = sw * 0.6
      legR.hip.rotation.x = -sw * 0.6
      legL.knee.rotation.x = Math.max(0, -sw) * 0.7
      legR.knee.rotation.x = Math.max(0, sw) * 0.7
      armL.shoulder.rotation.x = -sw * 0.5
      armR.shoulder.rotation.x = sw * 0.5
      armL.elbow.rotation.x = -0.3
      armR.elbow.rotation.x = -0.3
    } else if (mode === 'sit') {
      hips.position.y = 0.5
      legL.hip.rotation.x = legR.hip.rotation.x = -Math.PI / 2
      legL.knee.rotation.x = legR.knee.rotation.x = Math.PI / 2
      if (extra.typing) {
        armL.shoulder.rotation.x = -1.1 + Math.sin(t * 14) * 0.06
        armR.shoulder.rotation.x = -1.1 + Math.sin(t * 14 + 2) * 0.06
        armL.elbow.rotation.x = -0.7
        armR.elbow.rotation.x = -0.7
      } else {
        armL.shoulder.rotation.x = -0.5
        armR.shoulder.rotation.x = -0.5
        armL.elbow.rotation.x = -0.6
        armR.elbow.rotation.x = -0.6
      }
    } else {
      hips.position.y = 0.82
      legL.hip.rotation.x = legR.hip.rotation.x = 0
      legL.knee.rotation.x = legR.knee.rotation.x = 0
      armL.shoulder.rotation.x = 0
      armR.shoulder.rotation.x = 0
      armL.elbow.rotation.x = -0.1
      armR.elbow.rotation.x = -0.1
      if (extra.drinking) {
        armR.shoulder.rotation.x = -1.6 + Math.sin(t * 2) * 0.12
        armR.elbow.rotation.x = -1.2
      } else if (extra.talking) {
        armR.shoulder.rotation.x = -0.7 + Math.sin(t * 5) * 0.35
        armR.elbow.rotation.x = -0.9
        head.rotation.z = Math.sin(t * 3) * 0.06
      }
    }
    if (!extra.talking) head.rotation.z = 0
    cup.visible = !!extra.drinking
    hand.position.y = mode === 'sit' && extra.typing ? -5 : -0.27
  }

  pose('stand', 0, {})
  return { root, pose, cup }
}
