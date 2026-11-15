import type { SupabaseClient } from '@supabase/supabase-js'
import type { Approval, Asset, Store, Task } from '../types'
import type { Settings } from '../state/AppState'

export interface Snapshot {
  tasks: Task[]
  approvals: Approval[]
  stores: Store[]
  assets: Asset[]
  settings: Partial<Settings>
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

const toTask = (r: Row): Task => ({
  id: r.id,
  title: r.title,
  description: r.description ?? '',
  assignee: r.assignee,
  priority: r.priority,
  status: r.status,
  deadline: r.deadline,
  result: r.result ?? undefined,
  history: r.history ?? [],
})
const fromTask = (t: Task, userId: string): Row => ({
  id: t.id,
  user_id: userId,
  title: t.title,
  description: t.description,
  assignee: t.assignee,
  priority: t.priority,
  status: t.status,
  deadline: t.deadline,
  result: t.result ?? null,
  history: t.history,
})

const toApproval = (r: Row): Approval => ({
  id: r.id,
  title: r.title,
  requestedBy: r.requested_by,
  category: r.category,
  summary: r.summary ?? '',
  recommendation: r.recommendation ?? '',
  risk: r.risk,
  createdAt: r.created_at_label ?? '',
  decision: r.decision ?? undefined,
  decidedAt: r.decided_at ?? undefined,
  reason: r.reason ?? undefined,
})
const fromApproval = (a: Approval, userId: string): Row => ({
  id: a.id,
  user_id: userId,
  title: a.title,
  requested_by: a.requestedBy,
  category: a.category,
  summary: a.summary,
  recommendation: a.recommendation,
  risk: a.risk,
  created_at_label: a.createdAt,
  decision: a.decision ?? null,
  decided_at: a.decidedAt ?? null,
  reason: a.reason ?? null,
})

const toStore = (r: Row): Store => ({
  id: r.id,
  name: r.name,
  city: r.city,
  merchantId: r.merchant_id ?? '',
  open: !!r.is_open,
  connection: r.connection,
  lastSync: r.last_sync ?? null,
  demoSales: r.demo?.sales ?? 0,
  demoOrders: r.demo?.orders ?? 0,
  demoRating: r.demo?.rating ?? 0,
  demoGrowth: r.demo?.growth ?? 0,
})
const fromStore = (s: Store, userId: string): Row => ({
  id: s.id,
  user_id: userId,
  name: s.name,
  city: s.city,
  merchant_id: s.merchantId,
  is_open: s.open,
  connection: s.connection,
  last_sync: s.lastSync,
  demo: { sales: s.demoSales, orders: s.demoOrders, rating: s.demoRating, growth: s.demoGrowth },
})

const toAsset = (r: Row): Asset => ({
  id: r.id,
  name: r.name,
  format: r.format,
  template: r.template,
  headline: r.headline,
  sub: r.sub ?? '',
  accent: r.accent,
  createdAt: r.created_at_label ?? '',
})
const fromAsset = (a: Asset, userId: string): Row => ({
  id: a.id,
  user_id: userId,
  name: a.name,
  format: a.format,
  template: a.template,
  headline: a.headline,
  sub: a.sub,
  accent: a.accent,
  created_at_label: a.createdAt,
})

/** Mengembalikan null jika akun ini belum pernah menyimpan apa pun (login pertama). */
export async function loadRemote(db: SupabaseClient, userId: string): Promise<Snapshot | null> {
  const q = (table: string) => db.from(table).select('*').eq('user_id', userId).order('created_at', { ascending: false })
  const [t, a, s, as, st] = await Promise.all([
    q('tasks'),
    q('approvals'),
    q('stores'),
    q('assets'),
    db.from('user_settings').select('data').eq('user_id', userId).maybeSingle(),
  ])
  for (const r of [t, a, s, as, st]) if (r.error) throw r.error
  if (!st.data) return null
  return {
    tasks: (t.data ?? []).map(toTask),
    approvals: (a.data ?? []).map(toApproval),
    stores: (s.data ?? []).map(toStore),
    assets: (as.data ?? []).map(toAsset),
    settings: (st.data.data ?? {}) as Partial<Settings>,
  }
}

async function replaceTable(db: SupabaseClient, table: string, userId: string, rows: Row[]) {
  // created_at diisi menurun menurut urutan array agar urutan tampilan tetap sama saat dimuat ulang.
  const base = Date.now()
  const stamped = rows.map((r, i) => ({ ...r, created_at: new Date(base - i * 1000).toISOString() }))
  if (stamped.length) {
    const { error } = await db.from(table).upsert(stamped, { onConflict: 'id' })
    if (error) throw error
  }
  let del = db.from(table).delete().eq('user_id', userId)
  if (rows.length) del = del.not('id', 'in', `(${rows.map((r) => `"${String(r.id).replace(/"/g, '')}"`).join(',')})`)
  const { error } = await del
  if (error) throw error
}

export async function saveRemote(db: SupabaseClient, userId: string, s: Omit<Snapshot, 'settings'> & { settings: Settings }) {
  await replaceTable(db, 'tasks', userId, s.tasks.map((x) => fromTask(x, userId)))
  await replaceTable(db, 'approvals', userId, s.approvals.map((x) => fromApproval(x, userId)))
  await replaceTable(db, 'stores', userId, s.stores.map((x) => fromStore(x, userId)))
  await replaceTable(db, 'assets', userId, s.assets.map((x) => fromAsset(x, userId)))
  const { error } = await db
    .from('user_settings')
    .upsert({ user_id: userId, data: s.settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}
