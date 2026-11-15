export type EmployeeId =
  | 'alex'
  | 'daniel'
  | 'sophia'
  | 'olivia'
  | 'ethan'
  | 'isabella'
  | 'william'
  | 'james'

export type WorkState = 'Bekerja' | 'Siaga' | 'Dalam rapat' | 'Nonaktif'

export interface Employee {
  id: EmployeeId
  name: string
  role: string
  short: string
  hue: number
  summary: string
  duties: string[]
  state: WorkState
  metrics: { label: string; value: string }[]
  memory: string[]
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
  demoSales: number
  demoOrders: number
  demoRating: number
  demoGrowth: number
}

export interface Asset {
  id: string
  name: string
  format: string
  template: string
  headline: string
  sub: string
  accent: string
  createdAt: string
}
