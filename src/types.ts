export type EmployeeId =
  | 'alex'
  | 'daniel'
  | 'sophia'
  | 'olivia'
  | 'ethan'
  | 'isabella'
  | 'william'
  | 'james'

// Status dihitung dari tugas yang sebenarnya, bukan diisi manual.
export type WorkState = 'Bekerja' | 'Siaga' | 'Nonaktif'

export interface Employee {
  id: EmployeeId
  name: string
  role: string
  short: string
  hue: number
  summary: string
  duties: string[]
}

export type TaskStatus =
  | 'Pending'
  | 'Assigned'
  | 'In Progress'
  | 'Review'
  | 'Completed'
  | 'Failed'
  | 'Requires Approval'

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent'

export interface TaskEvent {
  at: string
  text: string
}

export interface Task {
  id: string
  title: string
  description: string
  assignee: EmployeeId
  priority: Priority
  status: TaskStatus
  deadline: string // YYYY-MM-DD
  result?: string
  history: TaskEvent[]
}

export interface Approval {
  id: string
  title: string
  requestedBy: EmployeeId
  category: string
  summary: string
  recommendation: string
  risk: 'Rendah' | 'Sedang' | 'Tinggi'
  createdAt: string
  decision?: 'Approved' | 'Rejected'
  decidedAt?: string
  reason?: string
}

export type ConnectionState = 'Belum terhubung' | 'Menunggu akses resmi' | 'Terhubung'

export interface Store {
  id: string
  name: string
  city: string
  merchantId: string
  open: boolean
  connection: ConnectionState
  lastSync: string | null
}

export interface Asset {
  id: string
  name: string
  format: string
  template: string
  headline: string
  sub: string
  accent: string
  cta: string
  /** Jalur file gambar AI di Supabase Storage (bucket marketing-assets). Kosong jika desain tanpa gambar AI. */
  imagePath?: string
  createdAt: string
}

export interface PlanItem {
  id: string
  date: string
  title: string
  channel: string
  kind: 'Konten' | 'Kampanye'
}

export interface ChatMsg {
  from: 'ceo' | 'ai' | 'sys'
  text: string
}

export interface MeetingRecord {
  id: string
  type: string
  typeLabel: string
  startedAt: string
  secs: number
  participants: string[]
  extraAgenda: string[]
  checked: Record<string, boolean>
  minutes: string
  decisions: { at: string; text: string }[]
  chat: { who: string; text: string }[]
}

/* Data yang diisi sendiri oleh CEO (belum ada integrasi GrabMerchant) */
export interface SaleEntry {
  id: string
  date: string // YYYY-MM-DD
  storeId: string
  amount: number // Rupiah
  orders: number
}

export interface MenuItem {
  id: string
  name: string
  orders: number
  revenue: number
}

export interface Review {
  id: string
  storeId: string
  rating: number // 1-5
  text: string
  date: string
}

export interface MarketingEntry {
  id: string
  channel: string
  spend: number
  orders: number
}

export interface Entries {
  sales: SaleEntry[]
  menu: MenuItem[]
  reviews: Review[]
  marketing: MarketingEntry[]
}
export type EntryKind = keyof Entries
export type EntryOf<K extends EntryKind> = Entries[K][number]
