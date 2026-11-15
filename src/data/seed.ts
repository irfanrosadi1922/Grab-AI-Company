import type { Approval, Asset, Store, Task } from '../types'

// DATA DEMO: contoh awal agar antarmuka dapat dinilai. Bukan data penjualan nyata.

export const SEED_TASKS: Task[] = [
  {
    id: 'T-101',
    title: 'Riset promo kompetitor radius 3 km',
    description: 'Kumpulkan promo yang sedang berjalan di kompetitor terdekat dan ringkas peluangnya.',
    assignee: 'alex',
    priority: 'High',
    status: 'In Progress',
    deadline: '2026-11-18',
    history: [
      { at: '2026-11-13 09:10', text: 'Tugas dibuat oleh James' },
      { at: '2026-11-13 09:12', text: 'Ditugaskan ke Alex' },
      { at: '2026-11-13 10:00', text: 'Status: In Progress' },
    ],
  },
  {
    id: 'T-102',
    title: 'Analisis menu terlaris 30 hari',
    description: 'Peringkat menu berdasarkan jumlah pesanan dan kontribusi pendapatan.',
    assignee: 'daniel',
    priority: 'Medium',
    status: 'Review',
    deadline: '2026-11-16',
    result: 'Draf analisis siap ditinjau. Angka masih berasal dari data demo.',
    history: [
      { at: '2026-11-12 08:30', text: 'Tugas dibuat oleh CEO' },
      { at: '2026-11-14 16:20', text: 'Status: Review' },
    ],
  },
  {
    id: 'T-103',
    title: 'Kampanye akhir pekan: paket hemat',
    description: 'Susun konsep kampanye paket hemat untuk Sabtu dan Minggu, termasuk anggaran.',
    assignee: 'sophia',
    priority: 'Urgent',
    status: 'Requires Approval',
    deadline: '2026-11-17',
    history: [
      { at: '2026-11-14 11:00', text: 'Tugas dibuat oleh James' },
      { at: '2026-11-14 15:45', text: 'Menunggu persetujuan CEO (anggaran promosi)' },
    ],
  },
  {
    id: 'T-104',
    title: 'Poster promo paket hemat',
    description: 'Poster A4 untuk dipasang di toko dan dibagikan di media sosial.',
    assignee: 'ethan',
    priority: 'High',
    status: 'Assigned',
    deadline: '2026-11-19',
    history: [{ at: '2026-11-14 15:50', text: 'Ditugaskan ke Ethan' }],
  },
  {
    id: 'T-105',
    title: 'Kalender konten minggu depan',
    description: 'Jadwalkan 5 unggahan dengan caption dan waktu terbaik.',
    assignee: 'isabella',
    priority: 'Medium',
    status: 'Pending',
    deadline: '2026-11-20',
    history: [{ at: '2026-11-14 12:00', text: 'Tugas dibuat oleh CEO' }],
  },
  {
    id: 'T-106',
    title: 'Draf balasan ulasan bintang 1-2',
    description: 'Siapkan balasan empatik untuk ulasan negatif minggu ini.',
    assignee: 'william',
    priority: 'High',
    status: 'Requires Approval',
    deadline: '2026-11-16',
    history: [
      { at: '2026-11-14 09:00', text: 'Tugas dibuat oleh James' },
      { at: '2026-11-14 13:30', text: 'Draf selesai, menunggu persetujuan CEO' },
    ],
  },
  {
    id: 'T-107',
    title: 'Deskripsi ulang 12 menu utama',
    description: 'Tulis ulang deskripsi menu agar lebih singkat dan menggugah.',
    assignee: 'olivia',
    priority: 'Low',
    status: 'Completed',
    deadline: '2026-11-13',
    result: '12 deskripsi baru sudah dikirim ke CEO untuk dipakai.',
    history: [
      { at: '2026-11-10 09:00', text: 'Tugas dibuat oleh CEO' },
      { at: '2026-11-13 14:00', text: 'Status: Completed' },
    ],
  },
  {
    id: 'T-108',
    title: 'Sinkronisasi data toko Cabang 2',
    description: 'Tarik data pesanan dari GrabMerchant untuk Cabang 2.',
    assignee: 'james',
    priority: 'Medium',
    status: 'Failed',
    deadline: '2026-11-14',
    result: 'Gagal: integrasi GrabMerchant belum memiliki akses resmi.',
    history: [
      { at: '2026-11-14 08:00', text: 'Tugas dibuat' },
      { at: '2026-11-14 08:05', text: 'Status: Failed (tidak ada akses API)' },
    ],
  },
]

export const SEED_APPROVALS: Approval[] = [
  {
    id: 'A-201',
    title: 'Anggaran promosi paket hemat akhir pekan',
    requestedBy: 'sophia',
    category: 'Anggaran',
    summary: 'Pengeluaran iklan dan diskon untuk dua hari.',
    recommendation:
      'Setujui dengan batas anggaran. Mulai kecil dan evaluasi hasil Sabtu sebelum menambah untuk Minggu.',
    risk: 'Sedang',
    createdAt: '2026-11-14 15:45',
  },
  {
    id: 'A-202',
    title: 'Balasan publik untuk 4 ulasan negatif',
    requestedBy: 'william',
    category: 'Komunikasi pelanggan',
    summary: 'Draf balasan akan tampil publik atas nama toko.',
    recommendation:
      'Setujui setelah membaca draf. Nada empatik dan tidak menyebut kompensasi yang belum disepakati.',
    risk: 'Rendah',
    createdAt: '2026-11-14 13:30',
  },
  {
    id: 'A-203',
    title: 'Ubah harga 5 menu',
    requestedBy: 'daniel',
    category: 'Harga',
    summary: 'Kenaikan 3-5% pada menu dengan margin terendah.',
    recommendation:
      'Tunda sampai ada data penjualan nyata dari GrabMerchant. Angka saat ini masih demo.',
    risk: 'Tinggi',
    createdAt: '2026-11-13 17:10',
  },
  {
    id: 'A-190',
    title: 'Publikasi poster promo Jumat',
    requestedBy: 'ethan',
    category: 'Materi promosi',
    summary: 'Poster untuk promo Jumat berkah.',
    recommendation: 'Setujui.',
    risk: 'Rendah',
    createdAt: '2026-11-11 10:00',
    decision: 'Approved',
    decidedAt: '2026-11-11 11:20',
  },
]

export const SEED_STORES: Store[] = [
  {
    id: 'S-1',
    name: 'Warung Utama',
    city: 'Kuala Lumpur',
    merchantId: '',
    open: true,
    connection: 'Belum terhubung',
    lastSync: null,
    demoSales: 21400000,
    demoOrders: 612,
    demoRating: 4.6,
    demoGrowth: 12.4,
  },
  {
    id: 'S-2',
    name: 'Cabang 2',
    city: 'Petaling Jaya',
    merchantId: '',
    open: true,
    connection: 'Menunggu akses resmi',
    lastSync: null,
    demoSales: 15900000,
    demoOrders: 455,
    demoRating: 4.4,
    demoGrowth: 7.1,
  },
  {
    id: 'S-3',
    name: 'Cabang 3',
    city: 'Subang Jaya',
    merchantId: '',
    open: false,
    connection: 'Belum terhubung',
    lastSync: null,
    demoSales: 11450000,
    demoOrders: 331,
    demoRating: 4.2,
    demoGrowth: -2.3,
  },
]

export const SEED_ASSETS: Asset[] = []

export const MENU_DEMO = [
  { name: 'Nasi ayam bakar', orders: 412, revenue: 9888000, trend: 8 },
  { name: 'Mie goreng spesial', orders: 365, revenue: 7300000, trend: 3 },
  { name: 'Ayam geprek', orders: 340, revenue: 7480000, trend: 14 },
  { name: 'Nasi lemak komplit', orders: 288, revenue: 6048000, trend: -4 },
  { name: 'Es teh tarik', orders: 270, revenue: 2160000, trend: 6 },
  { name: 'Soto ayam', orders: 198, revenue: 3564000, trend: -9 },
]

export const REVIEWS_DEMO = [
  { who: 'Pelanggan A', rating: 5, text: 'Porsi pas, pengantaran cepat.', store: 'Warung Utama' },
  { who: 'Pelanggan B', rating: 2, text: 'Pesanan datang dingin.', store: 'Cabang 3' },
  { who: 'Pelanggan C', rating: 4, text: 'Rasa enak, kemasan bisa lebih rapi.', store: 'Cabang 2' },
  { who: 'Pelanggan D', rating: 5, text: 'Ayam gepreknya juara.', store: 'Warung Utama' },
]

export const MARKETING_DEMO = [
  { channel: 'Promo di aplikasi', spend: 1800000, orders: 240, roas: 4.1 },
  { channel: 'Instagram', spend: 1200000, orders: 118, roas: 2.6 },
  { channel: 'Poster di toko', spend: 300000, orders: 64, roas: 5.3 },
]

// Deret waktu deterministik untuk grafik DEMO (tanpa angka acak).
export function demoSeries(days: number) {
  const out: { label: string; sales: number; orders: number }[] = []
  const start = new Date('2026-11-15T00:00:00')
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(start)
    d.setDate(start.getDate() - i)
    const wave = Math.sin((days - i) / 2.3) * 0.18 + Math.sin((days - i) / 6) * 0.1
    const weekend = d.getDay() === 0 || d.getDay() === 6 ? 0.16 : 0
    const sales = Math.round(1_450_000 * (1 + wave + weekend + (days - i) * 0.004))
    out.push({
      label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      sales,
      orders: Math.round(sales / 33_500),
    })
  }
  return out
}
