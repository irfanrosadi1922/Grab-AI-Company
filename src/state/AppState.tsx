import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Approval, Asset, EmployeeId, Store, Task, TaskStatus } from '../types'
import { SEED_APPROVALS, SEED_ASSETS, SEED_STORES, SEED_TASKS } from '../data/seed'
import { nowStamp } from '../lib/format'

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
}

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
  employeeEnabled: {
    alex: true,
    daniel: true,
    sophia: true,
    olivia: true,
    ethan: true,
    isabella: true,
    william: true,
    james: true,
  },
}

export type ToastTone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  msg: string
  tone: ToastTone
}

interface Ctx {
  tasks: Task[]
  addTask: (t: Omit<Task, 'id' | 'history' | 'status'> & { status?: TaskStatus }, by?: string) => Task
  setTaskStatus: (id: string, status: TaskStatus, note?: string) => void
  setTaskResult: (id: string, result: string) => void
  approvals: Approval[]
  decide: (id: string, decision: 'Approved' | 'Rejected', reason?: string) => void
  stores: Store[]
  addStore: (s: Pick<Store, 'name' | 'city' | 'merchantId'>) => void
  toggleStoreOpen: (id: string) => void
  assets: Asset[]
  addAsset: (a: Omit<Asset, 'id' | 'createdAt'>) => void
  removeAsset: (id: string) => void
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  toasts: ToastItem[]
  toast: (msg: string, tone?: ToastTone) => void
  dismissToast: (id: number) => void
  resetDemo: () => void
}

const AppCtx = createContext<Ctx | null>(null)
const KEY = 'grab-ai-company:v1'

interface Persisted {
  tasks: Task[]
  approvals: Approval[]
  stores: Store[]
  assets: Asset[]
  settings: Settings
}

function load(): Persisted {
  const fallback: Persisted = {
    tasks: SEED_TASKS,
    approvals: SEED_APPROVALS,
    stores: SEED_STORES,
    assets: SEED_ASSETS,
    settings: DEFAULT_SETTINGS,
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw) as Partial<Persisted>
    return {
      tasks: p.tasks ?? fallback.tasks,
      approvals: p.approvals ?? fallback.approvals,
      stores: p.stores ?? fallback.stores,
      assets: p.assets ?? fallback.assets,
      settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
    }
  } catch {
    return fallback
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const initial = useRef(load()).current
  const [tasks, setTasks] = useState<Task[]>(initial.tasks)
  const [approvals, setApprovals] = useState<Approval[]>(initial.approvals)
  const [stores, setStores] = useState<Store[]>(initial.stores)
  const [assets, setAssets] = useState<Asset[]>(initial.assets)
  const [settings, setSettings] = useState<Settings>(initial.settings)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastId = useRef(0)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ tasks, approvals, stores, assets, settings }))
    } catch {
      /* penyimpanan penuh atau diblokir: aplikasi tetap berjalan */
    }
  }, [tasks, approvals, stores, assets, settings])

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
      id: 'T-' + Math.floor(1000 + Math.random() * 9000),
      history: [
        { at: nowStamp(), text: `Tugas dibuat oleh ${by}` },
        { at: nowStamp(), text: `Status: ${status}` },
      ],
    }
    setTasks((prev) => [task, ...prev])
    return task
  }, [])

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

  const decide: Ctx['decide'] = useCallback((id, decision, reason) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, decision, reason, decidedAt: nowStamp() } : a)),
    )
  }, [])

  const addStore: Ctx['addStore'] = useCallback((s) => {
    setStores((prev) => [
      ...prev,
      {
        id: 'S-' + (prev.length + 1) + Math.floor(Math.random() * 90 + 10),
        ...s,
        open: false,
        connection: 'Belum terhubung',
        lastSync: null,
        demoSales: 0,
        demoOrders: 0,
        demoRating: 0,
        demoGrowth: 0,
      },
    ])
  }, [])

  const toggleStoreOpen = useCallback((id: string) => {
    setStores((prev) => prev.map((s) => (s.id === id ? { ...s, open: !s.open } : s)))
  }, [])

  const addAsset: Ctx['addAsset'] = useCallback((a) => {
    setAssets((prev) => [
      { ...a, id: 'AS-' + Math.floor(1000 + Math.random() * 9000), createdAt: nowStamp() },
      ...prev,
    ])
  }, [])

  const removeAsset = useCallback((id: string) => setAssets((p) => p.filter((a) => a.id !== id)), [])

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), [])

  const resetDemo = useCallback(() => {
    setTasks(SEED_TASKS)
    setApprovals(SEED_APPROVALS)
    setStores(SEED_STORES)
    setAssets(SEED_ASSETS)
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      tasks,
      addTask,
      setTaskStatus,
      setTaskResult,
      approvals,
      decide,
      stores,
      addStore,
      toggleStoreOpen,
      assets,
      addAsset,
      removeAsset,
      settings,
      updateSettings,
      toasts,
      toast,
      dismissToast,
      resetDemo,
    }),
    [
      tasks,
      addTask,
      setTaskStatus,
      setTaskResult,
      approvals,
      decide,
      stores,
      addStore,
      toggleStoreOpen,
      assets,
      addAsset,
      removeAsset,
      settings,
      updateSettings,
      toasts,
      toast,
      dismissToast,
      resetDemo,
    ],
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp harus dipakai di dalam AppStateProvider')
  return c
}
