export const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')

export const rupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID')

export const rupiahShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace('.', ',') + ' M'
  if (Math.abs(n) >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace('.', ',') + ' jt'
  if (Math.abs(n) >= 1_000) return 'Rp ' + Math.round(n / 1_000) + ' rb'
  return 'Rp ' + n
}

export const nowStamp = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
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
