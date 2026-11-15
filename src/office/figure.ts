import * as THREE from 'three'

const SKIN = ['#f1c9a5', '#e0ac82', '#c68b62', '#a8704b', '#f6d7bd']
const HAIR = ['#1c1a19', '#3a2a20', '#5b4030', '#121212', '#6b4a2b']

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
export function createFigure(hue: number, seed: number): Figure {
  const root = new THREE.Group()
  const shirt = new THREE.Color().setHSL(hue / 360, 0.5, 0.45)
  const pants = '#2a3038'
  const skin = SKIN[seed % SKIN.length]
  const hair = HAIR[(seed * 3) % HAIR.length]

  const hips = new THREE.Group()
  hips.position.y = 0.82
  root.add(hips)

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.26), lambert(shirt))
  torso.position.y = 0.3
  hips.add(torso)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), lambert(skin))
  head.position.y = 0.72
  hips.add(head)
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), lambert(hair))
  hairCap.position.y = 0.74
  hairCap.rotation.x = -0.25
  hips.add(hairCap)

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
  }

  pose('stand', 0, {})
  return { root, pose, cup }
}
