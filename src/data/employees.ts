import type { Employee, EmployeeId } from '../types'

// Identitas dan deskripsi peran. Status dan statistik dihitung dari tugas nyata (lib/work.ts).
export const EMPLOYEES: Employee[] = [
  {
    id: 'alex',
    name: 'Alex',
    role: 'Research Director',
    short: 'Research',
    hue: 210,
    summary: 'Riset pasar, kompetitor, dan tren kuliner untuk mendukung keputusan CEO.',
    duties: ['Riset kompetitor sekitar toko', 'Pemantauan tren menu', 'Ringkasan peluang pasar'],
  },
  {
    id: 'daniel',
    name: 'Daniel',
    role: 'Data Analyst',
    short: 'Analyst',
    hue: 190,
    summary: 'Mengolah data penjualan, pesanan, dan performa menu menjadi temuan yang bisa ditindaklanjuti.',
    duties: ['Analisis penjualan harian', 'Performa menu', 'Perbandingan antar toko'],
  },
  {
    id: 'sophia',
    name: 'Sophia',
    role: 'Marketing Director',
    short: 'Marketing',
    hue: 330,
    summary: 'Menyusun strategi promosi dan kampanye, lalu mengoordinasikan tim kreatif.',
    duties: ['Rencana kampanye', 'Anggaran promosi', 'Koordinasi tim kreatif'],
  },
  {
    id: 'olivia',
    name: 'Olivia',
    role: 'Menu Specialist & Copywriter',
    short: 'Menu',
    hue: 28,
    summary: 'Menulis deskripsi menu, paket, dan teks promosi yang menggugah selera.',
    duties: ['Deskripsi menu', 'Naskah promosi', 'Rekomendasi paket bundling'],
  },
  {
    id: 'ethan',
    name: 'Ethan',
    role: 'Creative Designer',
    short: 'Design',
    hue: 265,
    summary: 'Membuat poster, banner, dan materi visual sesuai identitas brand.',
    duties: ['Poster dan banner', 'Materi media sosial', 'Pengelolaan aset kreatif'],
  },
  {
    id: 'isabella',
    name: 'Isabella',
    role: 'Content Manager',
    short: 'Content',
    hue: 168,
    summary: 'Mengatur kalender konten dan jadwal unggahan di seluruh kanal.',
    duties: ['Kalender konten', 'Jadwal unggahan', 'Kurasi caption'],
  },
  {
    id: 'william',
    name: 'William',
    role: 'Customer Relations Manager',
    short: 'Customer',
    hue: 44,
    summary: 'Memantau ulasan pelanggan dan menyiapkan draf balasan untuk disetujui.',
    duties: ['Pantau ulasan', 'Draf balasan keluhan', 'Ringkasan sentimen'],
  },
  {
    id: 'james',
    name: 'James',
    role: 'AI Managing Director & Operations Manager',
    short: 'Operations',
    hue: 140,
    summary: 'Mengoordinasikan seluruh karyawan AI, memoderasi rapat, dan memastikan tugas selesai tepat waktu.',
    duties: ['Moderator rapat', 'Pembagian tugas', 'Eskalasi ke CEO'],
  },
]

export const EMP: Record<EmployeeId, Employee> = Object.fromEntries(
  EMPLOYEES.map((e) => [e.id, e]),
) as Record<EmployeeId, Employee>
