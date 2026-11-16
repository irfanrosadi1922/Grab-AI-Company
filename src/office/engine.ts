import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { EmployeeId } from '../types'
import { buildOffice } from './build'
import { OfficeSim } from './sim'
import type { AgentInfo } from './sim'
import { disposeTextCache } from './sprites'

export interface Hooks {
  onInfo: (list: AgentInfo[]) => void
  onSelect: (id: EmployeeId) => void
}

export class OfficeEngine {
  readonly sim: OfficeSim
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private raf = 0
  private last = 0
  private infoAcc = 0
  private infoJson = ''
  private ro: ResizeObserver
  private followId: EmployeeId | null = null
  private paused = false
  private down: { x: number; y: number; t: number } | null = null
  private ray = new THREE.Raycaster()

  constructor(private box: HTMLElement, people: { id: EmployeeId; name: string; hue: number }[], private hooks: Hooks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor('#8a9b97')
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    const el = this.renderer.domElement
    el.style.display = 'block'
    el.style.width = '100%'
    el.style.height = '100%'
    box.appendChild(el)

    this.scene.add(new THREE.AmbientLight('#ffffff', 0.75))
    const sun = new THREE.DirectionalLight('#fff1dc', 1.25)
    sun.position.set(-12, 26, 16)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    const sc = sun.shadow.camera
    sc.left = -24
    sc.right = 24
    sc.top = 26
    sc.bottom = -22
    sc.near = 1
    sc.far = 90
    sun.shadow.bias = -0.0005
    sun.shadow.normalBias = 0.03
    this.scene.add(sun)
    this.scene.add(new THREE.HemisphereLight('#cfe6ff', '#7a8a80', 0.35))

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400)
    this.controls = new OrbitControls(this.camera, el)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.maxPolarAngle = Math.PI / 2.4
    this.controls.minDistance = 5
    this.controls.maxDistance = 150
    this.controls.screenSpacePanning = false

    buildOffice(
      this.scene,
      people.map((p, index) => ({ index, name: p.name })),
    )
    this.sim = new OfficeSim(this.scene, people)
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const mt = m.material as THREE.Material
      m.receiveShadow = true
      m.castShadow = !mt.transparent
    })

    this.resize()
    this.home()
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(box)

    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointerup', this.onUp)

    this.last = performance.now()
    this.raf = requestAnimationFrame(this.loop)
  }

  private resize() {
    const w = Math.max(1, this.box.clientWidth)
    const h = Math.max(1, this.box.clientHeight)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  home() {
    this.followId = null
    // Sudut isometrik seperti diorama: dari depan-kanan, agak tinggi
    const vf = THREE.MathUtils.degToRad(this.camera.fov)
    const hf = 2 * Math.atan(Math.tan(vf / 2) * this.camera.aspect)
    const dist = Math.max(18 / Math.tan(hf / 2), 17 / Math.tan(vf / 2))
    const az = THREE.MathUtils.degToRad(38)
    const el = THREE.MathUtils.degToRad(46)
    this.controls.target.set(0, 0, 4)
    this.camera.position.set(
      dist * Math.cos(el) * Math.sin(az),
      dist * Math.sin(el),
      4 + dist * Math.cos(el) * Math.cos(az),
    )
    this.controls.update()
  }

  follow(id: EmployeeId | null) {
    this.followId = id
    if (id) {
      const p = this.sim.position(id)
      if (p) {
        // dekatkan kamera ke karyawan yang dipilih
        const off = this.camera.position.clone().sub(this.controls.target)
        off.setLength(Math.min(off.length(), 9))
        this.controls.target.copy(p)
        this.camera.position.copy(p).add(off)
      }
    }
  }

  setPaused(v: boolean) {
    this.paused = v
  }

  private onDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY, t: performance.now() }
  }

  private onUp = (e: PointerEvent) => {
    const d = this.down
    this.down = null
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 450) return
    const r = this.renderer.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this.ray.setFromCamera(ndc, this.camera)
    const hits = this.ray.intersectObjects(
      this.sim.agents.map((a) => a.fig.root),
      true,
    )
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object
      while (o && !o.userData.id) o = o.parent
      if (o) {
        this.hooks.onSelect(o.userData.id as EmployeeId)
        return
      }
    }
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    if (!this.paused) this.sim.update(dt)
    this.sim.render()

    if (this.followId) {
      const p = this.sim.position(this.followId)
      if (p) {
        const before = this.controls.target.clone()
        this.controls.target.lerp(p, Math.min(1, dt * 4))
        this.camera.position.add(this.controls.target.clone().sub(before))
      }
    }
    this.controls.update()
    this.renderer.render(this.scene, this.camera)

    this.infoAcc += dt
    if (this.infoAcc > 0.5) {
      this.infoAcc = 0
      const list = this.sim.info()
      const j = JSON.stringify(list)
      if (j !== this.infoJson) {
        this.infoJson = j
        this.hooks.onInfo(list)
      }
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    const el = this.renderer.domElement
    el.removeEventListener('pointerdown', this.onDown)
    el.removeEventListener('pointerup', this.onUp)
    this.controls.dispose()
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
    })
    disposeTextCache()
    this.renderer.dispose()
    el.remove()
  }
}
