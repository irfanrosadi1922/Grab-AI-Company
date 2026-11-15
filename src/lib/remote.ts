import type { SupabaseClient } from '@supabase/supabase-js'
import type { Approval, Asset, ChatMsg, Entries, MeetingRecord, PlanItem, Store, Task } from '../types'
import type { Settings } from '../state/AppState'

export interface Snapshot {
  tasks: Task[]
  approvals: Approval[]
  stores: Store[]
  assets: Asset[]
  entries: Entries
  plans: PlanItem[]
  meetings: MeetingRecord[]
  /** Riwayat chat per karyawan (kunci: id karyawan). */
  chats: Record<string, ChatMsg[]>
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
  publicUrl: r.public_url ?? '',
  peekText: r.peek_text ?? '',
  peekAt: r.peek_at ?? '',
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
  public_url: s.publicUrl,
  peek_text: s.peekText,
  peek_at: s.peekAt,
})

const toAsset = (r: Row): Asset => ({
  id: r.id,
  name: r.name,
  format: r.format,
  template: r.template,
  headline: r.headline,
  sub: r.sub ?? '',
  accent: r.accent,
  cta: r.cta ?? '',
  imagePath: r.image_path ?? undefined,
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
  cta: a.cta,
  image_path: a.imagePath ?? null,
  created_at_label: a.createdAt,
})

/** Mengembalikan null jika akun ini belum pernah menyimpan apa pun (login pertama). */
export async function loadRemote(db: SupabaseClient, userId: string): Promise<Snapshot | null> {
  const q = (table: string) => db.from(table).select('*').eq('user_id', userId).order('created_at', { ascending: false })
  const [t, a, s, as, sa, me, re, ma, st, pl, mt, ct] = await Promise.all([
    q('tasks'),
    q('approvals'),
    q('stores'),
    q('assets'),
    q('sales_entries'),
    q('menu_items'),
    q('reviews'),
    q('marketing_entries'),
    db.from('user_settings').select('data').eq('user_id', userId).maybeSingle(),
    q('plan_items'),
    q('meetings'),
    q('chat_threads'),
  ])
  for (const r of [t, a, s, as, sa, me, re, ma, st, pl, mt, ct]) if (r.error) throw r.error
  if (!st.data) return null
  return {
    tasks: (t.data ?? []).map(toTask),
    approvals: (a.data ?? []).map(toApproval),
    stores: (s.data ?? []).map(toStore),
    assets: (as.data ?? []).map(toAsset),
    entries: {
      sales: (sa.data ?? []).map((r: Row) => ({
        id: r.id,
        date: r.entry_date,
        storeId: r.store_id,
        amount: Number(r.amount),
        orders: Number(r.orders),
      })),
      menu: (me.data ?? []).map((r: Row) => ({ id: r.id, name: r.name, orders: Number(r.orders), revenue: Number(r.revenue) })),
      reviews: (re.data ?? []).map((r: Row) => ({ id: r.id, storeId: r.store_id, rating: Number(r.rating), text: r.body ?? '', date: r.review_date })),
      marketing: (ma.data ?? []).map((r: Row) => ({ id: r.id, channel: r.channel, spend: Number(r.spend), orders: Number(r.orders) })),
    },
    plans: (pl.data ?? [])
      .map((r: Row): PlanItem => ({ id: r.id, date: r.plan_date, title: r.title, channel: r.channel, kind: r.kind }))
      .sort((x: PlanItem, y: PlanItem) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0)),
    meetings: (mt.data ?? []).map(
      (r: Row): MeetingRecord => ({
        id: r.id,
        type: r.type,
        typeLabel: r.type_label,
        startedAt: r.started_at ?? '',
        secs: Number(r.duration_secs) || 0,
        participants: r.participants ?? [],
        extraAgenda: r.agenda?.extra ?? [],
        checked: r.agenda?.checked ?? {},
        minutes: r.minutes ?? '',
        decisions: r.decisions ?? [],
        chat: r.chat ?? [],
      }),
    ),
    chats: Object.fromEntries((ct.data ?? []).map((r: Row) => [r.employee, (r.messages ?? []) as ChatMsg[]])),
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

type SaveSnapshot = Omit<Snapshot, 'settings'> & { settings: Settings }

interface TableSpec {
  key: string
  table: string
  rows: (s: SaveSnapshot, userId: string) => Row[]
}

const SPECS: TableSpec[] = [
  { key: 'tasks', table: 'tasks', rows: (s, u) => s.tasks.map((x) => fromTask(x, u)) },
  { key: 'approvals', table: 'approvals', rows: (s, u) => s.approvals.map((x) => fromApproval(x, u)) },
  { key: 'stores', table: 'stores', rows: (s, u) => s.stores.map((x) => fromStore(x, u)) },
  { key: 'assets', table: 'assets', rows: (s, u) => s.assets.map((x) => fromAsset(x, u)) },
  {
    key: 'sales',
    table: 'sales_entries',
    rows: (s, u) => s.entries.sales.map((x) => ({ id: x.id, user_id: u, entry_date: x.date, store_id: x.storeId, amount: x.amount, orders: x.orders })),
  },
  {
    key: 'menu',
    table: 'menu_items',
    rows: (s, u) => s.entries.menu.map((x) => ({ id: x.id, user_id: u, name: x.name, orders: x.orders, revenue: x.revenue })),
  },
  {
    key: 'reviews',
    table: 'reviews',
    rows: (s, u) => s.entries.reviews.map((x) => ({ id: x.id, user_id: u, store_id: x.storeId, rating: x.rating, body: x.text, review_date: x.date })),
  },
  {
    key: 'marketing',
    table: 'marketing_entries',
    rows: (s, u) => s.entries.marketing.map((x) => ({ id: x.id, user_id: u, channel: x.channel, spend: x.spend, orders: x.orders })),
  },
  {
    key: 'plans',
    table: 'plan_items',
    rows: (s, u) => s.plans.map((x) => ({ id: x.id, user_id: u, plan_date: x.date, title: x.title, channel: x.channel, kind: x.kind })),
  },
  {
    key: 'meetings',
    table: 'meetings',
    rows: (s, u) =>
      s.meetings.map((x) => ({
        id: x.id,
        user_id: u,
        type: x.type,
        type_label: x.typeLabel,
        started_at: x.startedAt,
        duration_secs: Math.round(x.secs),
        participants: x.participants,
        agenda: { extra: x.extraAgenda, checked: x.checked },
        minutes: x.minutes,
        decisions: x.decisions,
        chat: x.chat,
      })),
  },
  {
    key: 'chats',
    table: 'chat_threads',
    rows: (s, u) =>
      Object.entries(s.chats)
        .filter(([, m]) => m.length > 0)
        .map(([employee, messages]) => ({ id: `${u}:${employee}`, user_id: u, employee, messages })),
  },
]

/** Isi sidik jari data yang baru dimuat dari server, agar penyimpanan berikutnya hanya menulis bagian yang berubah. */
export function fingerprints(userId: string, s: SaveSnapshot): Map<string, string> {
  const m = new Map<string, string>()
  for (const sp of SPECS) m.set(sp.key, JSON.stringify(sp.rows(s, userId)))
  m.set('settings', JSON.stringify(s.settings))
  return m
}

/**
 * Menyimpan hanya tabel yang berubah sejak penyimpanan terakhir yang berhasil.
 * `saved` diperbarui per tabel setelah berhasil, jadi kegagalan di tengah jalan bisa diulang tanpa menulis ulang yang sudah tersimpan.
 */
export async function saveRemote(db: SupabaseClient, userId: string, s: SaveSnapshot, saved: Map<string, string>) {
  for (const sp of SPECS) {
    const rows = sp.rows(s, userId)
    const fp = JSON.stringify(rows)
    if (saved.get(sp.key) === fp) continue
    await replaceTable(db, sp.table, userId, rows)
    saved.set(sp.key, fp)
  }
  const fp = JSON.stringify(s.settings)
  if (saved.get('settings') !== fp) {
    const { error } = await db
      .from('user_settings')
      .upsert({ user_id: userId, data: s.settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw error
    saved.set('settings', fp)
  }
}
