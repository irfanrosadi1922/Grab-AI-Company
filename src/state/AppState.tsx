import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Approval, Asset, ChatMsg, Entries, EntryKind, EntryOf, EmployeeId, MeetingRecord, PlanItem, Store, Task, TaskStatus } from '../types'
import { newId, nowStamp } from '../lib/format'
import { supabase } from '../lib/supabase'
import { fingerprints, loadRemote, saveRemote } from '../lib/remote'

export interface Settings {
  ceoName: string
  ceoEmail: string
  companyName: string
  timezone: string
  currency: string
  provider: string
  model: string
  voiceProvider: string
  voiceEnabled: boolean
  notify: Record<string, boolean>
  needApproval: Record<string, boolean>
  employeeEnabled: Record<EmployeeId, boolean>
  /** Catatan CEO per karyawan AI. Dikirim sebagai konteks saat chat. */
  notes: Record<EmployeeId, string>
}

const ALL_IDS: EmployeeId[] = ['alex', 'daniel', 'sophia', 'olivia', 'ethan', 'isabella', 'william', 'james']
const byId = <T,>(v: T) => Object.fromEntries(ALL_IDS.map((i) => [i, v])) as Record<EmployeeId, T>

export const DEFAULT_SETTINGS: Settings = {
  ceoName: 'CEO',
  ceoEmail: '',
  companyName: 'Grab AI Company',
  timezone: 'Asia/Kuala_Lumpur',
  currency: 'IDR',
  provider: 'Groq',
  model: '',
  voiceProvider: 'ElevenLabs',
  voiceEnabled: false,
  notify: { approvals: true, taskDone: true, taskFailed: true, dailyDigest: false },
  needApproval: {
    'Ubah harga menu': true,
    'Anggaran promosi': true,
    'Balasan ulasan publik': true,
    'Publikasi materi promosi': true,
    'Ubah status toko': true,
  },
  employeeEnabled: byId(true),
  notes: byId(''),
}

export type ToastTone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  msg: string
  tone: ToastTone
}

export type SyncState = 'local' | 'saving' | 'saved' | 'error' | 'loadError'

interface Ctx {
  ready: boolean
  sync: SyncState
  userId?: string
  tasks: Task[]
  addTask: (t: Omit<Task, 'id' | 'history' | 'status'> & { status?: TaskStatus }, by?: string) => Task
  removeTask: (id: string) => void
  setTaskStatus: (id: string, status: TaskStatus, note?: string) => void
  setTaskResult: (id: string, result: string) => void
  approvals: Approval[]
  addApproval: (a: Pick<Approval, 'title' | 'requestedBy' | 'category' | 'summary' | 'recommendation' | 'risk'>) => void
  decide: (id: string, decision: 'Approved' | 'Rejected', reason?: string) => void
  stores: Store[]
  addStore: (s: Pick<Store, 'name' | 'city' | 'merchantId'>) => void
  removeStore: (id: string) => void
  toggleStoreOpen: (id: string) => void
  entries: Entries
  addEntry: <K extends EntryKind>(kind: K, e: Omit<EntryOf<K>, 'id'>) => void
  removeEntry: (kind: EntryKind, id: string) => void
  assets: Asset[]
  addAsset: (a: Omit<Asset, 'id' | 'createdAt'>) => void
  removeAsset: (id: string) => void
  plans: PlanItem[]
  addPlan: (p: Omit<PlanItem, 'id'>) => void
  removePlan: (id: string) => void
  meetings: MeetingRecord[]
  /** Menyimpan (membuat atau memperbarui) catatan rapat. */
  saveMeeting: (m: MeetingRecord) => void
  removeMeeting: (id: string) => void
  chats: Record<string, ChatMsg[]>
  setChat: (employee: string, msgs: ChatMsg[]) => void
  /** Coba simpan ulang ke Supabase sekarang juga. */
  retrySave: () => void
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  toasts: ToastItem[]
  toast: (msg: string, tone?: ToastTone) => void
  dismissToast: (id: number) => void
  resetAll: () => void
}

const AppCtx = createContext<Ctx | null>(null)
const KEY = 'grab-ai-company:v2'

const EMPTY_ENTRIES: Entries = { sales: [], menu: [], reviews: [], marketing: [] }

interface Persisted {
  tasks: Task[]
  approvals: Approval[]
  stores: Store[]
  assets: Asset[]
  entries: Entries
  plans: PlanItem[]
  meetings: MeetingRecord[]
  chats: Record<string, ChatMsg[]>
  settings: Settings
}

const emptyState = (): Persisted => ({
  tasks: [],
  approvals: [],
  stores: [],
  assets: [],
  entries: EMPTY_ENTRIES,
  plans: [],
  meetings: [],
  chats: {},
  settings: DEFAULT_SETTINGS,
})

const mergeSettings = (s?: Partial<Settings>): Settings => ({
  ...DEFAULT_SETTINGS,
  ...(s ?? {}),
  notify: { ...DEFAULT_SETTINGS.notify, ...(s?.notify ?? {}) },
  needApproval: { ...DEFAULT_SETTINGS.needApproval, ...(s?.needApproval ?? {}) },
  employeeEnabled: { ...DEFAULT_SETTINGS.employeeEnabled, ...(s?.employeeEnabled ?? {}) },
  notes: { ...DEFAULT_SETTINGS.notes, ...(s?.notes ?? {}) },
})

function load(): Persisted {
  const fallback = emptyState()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw) as Partial<Persisted>
    return {
      tasks: p.tasks ?? [],
      approvals: p.approvals ?? [],
      stores: p.stores ?? [],
      assets: p.assets ?? [],
      entries: { ...EMPTY_ENTRIES, ...(p.entries ?? {}) },
      plans: p.plans ?? [],
      meetings: p.meetings ?? [],
      chats: p.chats ?? {},
      settings: mergeSettings(p.settings),
    }
  } catch {
    return fallback
  }
}

export function AppStateProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const initial = useRef(userId ? emptyState() : load()).current
  const [tasks, setTasks] = useState<Task[]>(initial.tasks)
  const [approvals, setApprovals] = useState<Approval[]>(initial.approvals)
  const [stores, setStores] = useState<Store[]>(initial.stores)
  const [assets, setAssets] = useState<Asset[]>(initial.assets)
  const [entries, setEntries] = useState<Entries>(initial.entries)
  const [plans, setPlans] = useState<PlanItem[]>(initial.plans)
  const [meetings, setMeetings] = useState<MeetingRecord[]>(initial.meetings)
  const [chats, setChats] = useState<Record<string, ChatMsg[]>>(initial.chats)
  const [settings, setSettings] = useState<Settings>(initial.settings)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastId = useRef(0)

  const [ready, setReady] = useState(!userId)
  const [sync, setSync] = useState<SyncState>(userId ? 'saved' : 'local')
  const loaded = useRef(!userId)
  const inFlight = useRef(false)
  const again = useRef(false)
  const saved = useRef(new Map<string, string>())

  // Akun masuk: muat dari Supabase. Akun baru (belum ada baris pengaturan) mulai kosong dan langsung menyimpan.
  useEffect(() => {
    if (!userId || !supabase) return
    let cancelled = false
    loadRemote(supabase, userId)
      .then((r) => {
        if (cancelled) return
        if (r) {
          const merged = mergeSettings(r.settings)
          // Sidik jari data server: penyimpanan berikutnya hanya menulis bagian yang benar-benar berubah.
          saved.current = fingerprints(userId, { ...r, settings: merged })
          setTasks(r.tasks)
          setApprovals(r.approvals)
          setStores(r.stores)
          setAssets(r.assets)
          setEntries(r.entries)
          setPlans(r.plans)
          setMeetings(r.meetings)
          setChats(r.chats)
          setSettings(merged)
        }
        loaded.current = true
        setReady(true)
      })
      .catch(() => {
        if (cancelled) return
        // Gagal memuat: jangan menyimpan apa pun agar data di server tidak tertimpa data kosong.
        setSync('loadError')
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  // Selalu berisi data terbaru, dibaca oleh penyimpanan yang berjalan di luar siklus render.
  const latest = useRef({ tasks, approvals, stores, assets, entries, plans, meetings, chats, settings })
  latest.current = { tasks, approvals, stores, assets, entries, plans, meetings, chats, settings }

  // Penyimpanan berurutan: tidak pernah dua permintaan sekaligus; perubahan yang masuk saat menyimpan memicu putaran berikutnya.
  const flush = useCallback(async () => {
    if (!userId || !supabase || !loaded.current) return
    if (inFlight.current) {
      again.current = true
      return
    }
    inFlight.current = true
    setSync('saving')
    try {
      do {
        again.current = false
        await saveRemote(supabase, userId, latest.current, saved.current)
      } while (again.current)
      setSync('saved')
    } catch {
      setSync('error')
    } finally {
      inFlight.current = false
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      try {
        localStorage.setItem(KEY, JSON.stringify({ tasks, approvals, stores, assets, entries, plans, meetings, chats, settings }))
      } catch {
        /* penyimpanan penuh atau diblokir: aplikasi tetap berjalan */
      }
      return
    }
    if (!supabase || !ready || !loaded.current) return
    setSync('saving')
    const t = setTimeout(() => void flush(), 400)
    return () => clearTimeout(t)
  }, [userId, ready, flush, tasks, approvals, stores, assets, entries, plans, meetings, chats, settings])

  // Simpan seketika saat aplikasi disembunyikan atau ditutup, supaya perubahan terakhir tidak tertinggal.
  useEffect(() => {
    if (!userId) return
    const hide = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    const leave = () => void flush()
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('pagehide', leave)
    return () => {
      document.removeEventListener('visibilitychange', hide)
      window.removeEventListener('pagehide', leave)
    }
  }, [userId, flush])

  // Gagal menyimpan: coba lagi otomatis setiap 8 detik sampai berhasil.
  useEffect(() => {
    if (sync !== 'error') return
    const t = setTimeout(() => void flush(), 8000)
    return () => clearTimeout(t)
  }, [sync, flush])

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback(
    (msg: string, tone: ToastTone = 'success') => {
      const id = ++toastId.current
      setToasts((t) => [...t, { id, msg, tone }])
      setTimeout(() => dismissToast(id), 4000)
    },
    [dismissToast],
  )

  const addTask: Ctx['addTask'] = useCallback((t, by = 'CEO') => {
    const status = t.status ?? 'Assigned'
    const task: Task = {
      ...t,
      status,
      id: newId('T'),
      history: [
        { at: nowStamp(), text: `Tugas dibuat oleh ${by}` },
        { at: nowStamp(), text: `Status: ${status}` },
      ],
    }
    setTasks((prev) => [task, ...prev])
    return task
  }, [])

  const removeTask = useCallback((id: string) => setTasks((p) => p.filter((t) => t.id !== id)), [])

  const setTaskStatus = useCallback((id: string, status: TaskStatus, note?: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status, history: [...t.history, { at: nowStamp(), text: note ?? `Status: ${status}` }] }
          : t,
      ),
    )
  }, [])

  const setTaskResult = useCallback((id: string, result: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, result } : t)))
  }, [])

  const addApproval: Ctx['addApproval'] = useCallback((a) => {
    setApprovals((prev) => [{ ...a, id: newId('A'), createdAt: nowStamp() }, ...prev])
  }, [])

  const decide: Ctx['decide'] = useCallback((id, decision, reason) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, decision, reason, decidedAt: nowStamp() } : a)),
    )
  }, [])

  const addStore: Ctx['addStore'] = useCallback((s) => {
    setStores((prev) => [
      ...prev,
      { id: newId('S'), ...s, open: false, connection: 'Belum terhubung', lastSync: null },
    ])
  }, [])

  // Menghapus toko juga menghapus penjualan dan ulasan milik toko itu agar tidak ada data yatim.
  const removeStore = useCallback((id: string) => {
    setStores((p) => p.filter((s) => s.id !== id))
    setEntries((p) => ({
      ...p,
      sales: p.sales.filter((x) => x.storeId !== id),
      reviews: p.reviews.filter((x) => x.storeId !== id),
    }))
  }, [])

  const toggleStoreOpen = useCallback((id: string) => {
    setStores((prev) => prev.map((s) => (s.id === id ? { ...s, open: !s.open } : s)))
  }, [])

  const addEntry: Ctx['addEntry'] = useCallback((kind, e) => {
    setEntries((p) => ({ ...p, [kind]: [{ ...e, id: newId('E') }, ...p[kind]] }) as Entries)
  }, [])

  const removeEntry: Ctx['removeEntry'] = useCallback((kind, id) => {
    setEntries((p) => ({ ...p, [kind]: (p[kind] as { id: string }[]).filter((x) => x.id !== id) }) as Entries)
  }, [])

  const addAsset: Ctx['addAsset'] = useCallback((a) => {
    setAssets((prev) => [{ ...a, id: newId('AS'), createdAt: nowStamp() }, ...prev])
  }, [])

  const removeAsset = useCallback(
    (id: string) => {
      const a = assets.find((x) => x.id === id)
      if (a?.imagePath && supabase) void supabase.storage.from('marketing-assets').remove([a.imagePath])
      setAssets((p) => p.filter((x) => x.id !== id))
    },
    [assets],
  )

  const addPlan: Ctx['addPlan'] = useCallback((p) => {
    setPlans((prev) => [...prev, { ...p, id: newId('P') }].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)))
  }, [])
  const removePlan = useCallback((id: string) => setPlans((p) => p.filter((x) => x.id !== id)), [])

  const saveMeeting = useCallback((m: MeetingRecord) => {
    setMeetings((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [m, ...prev]))
  }, [])
  const removeMeeting = useCallback((id: string) => setMeetings((p) => p.filter((x) => x.id !== id)), [])

  const setChat = useCallback((employee: string, msgs: ChatMsg[]) => setChats((p) => ({ ...p, [employee]: msgs })), [])
  const retrySave = useCallback(() => void flush(), [flush])

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), [])

  const resetAll = useCallback(() => {
    setTasks([])
    setApprovals([])
    setStores([])
    setAssets([])
    setEntries(EMPTY_ENTRIES)
    setPlans([])
    setMeetings([])
    setChats({})
    setSettings(DEFAULT_SETTINGS)
    const paths = assets.flatMap((a) => (a.imagePath ? [a.imagePath] : []))
    if (paths.length && supabase) void supabase.storage.from('marketing-assets').remove(paths)
  }, [assets])

  const value = useMemo<Ctx>(
    () => ({
      ready,
      sync,
      userId,
      tasks,
      addTask,
      removeTask,
      setTaskStatus,
      setTaskResult,
      approvals,
      addApproval,
      decide,
      stores,
      addStore,
      removeStore,
      toggleStoreOpen,
      entries,
      addEntry,
      removeEntry,
      assets,
      addAsset,
      removeAsset,
      plans,
      addPlan,
      removePlan,
      meetings,
      saveMeeting,
      removeMeeting,
      chats,
      setChat,
      retrySave,
      settings,
      updateSettings,
      toasts,
      toast,
      dismissToast,
      resetAll,
    }),
    [
      ready,
      sync,
      userId,
      tasks,
      addTask,
      removeTask,
      setTaskStatus,
      setTaskResult,
      approvals,
      addApproval,
      decide,
      stores,
      addStore,
      removeStore,
      toggleStoreOpen,
      entries,
      addEntry,
      removeEntry,
      assets,
      addAsset,
      removeAsset,
      plans,
      addPlan,
      removePlan,
      meetings,
      saveMeeting,
      removeMeeting,
      chats,
      setChat,
      retrySave,
      settings,
      updateSettings,
      toasts,
      toast,
      dismissToast,
      resetAll,
    ],
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp harus dipakai di dalam AppStateProvider')
  return c
}
