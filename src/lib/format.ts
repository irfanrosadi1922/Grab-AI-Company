export const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')

let currency = 'IDR'
export const setCurrency = (c: string) => {
  currency = c === 'MYR' || c === 'SGD' ? c : 'IDR'
}

/** Format uang sesuai mata uang di Pengaturan (nama fungsi dipertahankan agar pemanggil tidak berubah). */
export const rupiah = (n: number) => {
  if (currency === 'IDR') return 'Rp ' + Math.round(n).toLocaleString('id-ID')
  const sym = currency === 'MYR' ? 'RM' : 'S$'
  return sym + ' ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const rupiahShort = (n: number) => {
  const a = Math.abs(n)
  if (currency === 'IDR') {
    if (a >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace('.', ',') + ' M'
    if (a >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace('.', ',') + ' jt'
    if (a >= 1_000) return 'Rp ' + Math.round(n / 1_000) + ' rb'
    return 'Rp ' + n
  }
  const sym = currency === 'MYR' ? 'RM' : 'S$'
  if (a >= 1_000_000) return sym + ' ' + (n / 1_000_000).toFixed(1) + 'M'
  if (a >= 1_000) return sym + ' ' + (n / 1_000).toFixed(1) + 'k'
  return sym + ' ' + (Math.round(n * 100) / 100)
}

const p2 = (n: number) => String(n).padStart(2, '0')

export const nowStamp = () => {
  const d = new Date()
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}

/** Tanggal lokal YYYY-MM-DD (bukan UTC, agar "hari ini" sesuai jam perangkat). */
export const isoDay = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const todayStr = () => isoDay(new Date())

/** n hari terakhir berakhir hari ini, urut naik. */
export const lastDays = (n: number): string[] => {
  const out: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    out.push(isoDay(d))
  }
  return out
}

export const dayLabel = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

/** ID pendek yang tidak bentrok antar perangkat. */
export const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`

/** "1.500.000" atau "Rp 1,5jt" tidak didukung: hanya angka bulat. Kembalikan null jika kosong. */
export const parseInteger = (s: string): number | null => {
  const digits = s.replace(/[^\d]/g, '')
  if (!digits) return null
  const n = Number(digits)
  return Number.isSafeInteger(n) ? n : null
}

export const downloadBlob = (name: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
