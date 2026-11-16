/** Pusat tiap ruangan pada gambar markas (koordinat viewBox 1920x1080). */
export const HQ_W = 1920
export const HQ_H = 1080
export const HQ_ROOMS = [
  { id: 'executive-office', label: 'Ruang Direktur', cx: 768, cy: 164, span: 14 },
  { id: 'research-room', label: 'Riset Pasar', cx: 992, cy: 276, span: 14 },
  { id: 'analytics-room', label: 'Analitik Data', cx: 1216, cy: 388, span: 14 },
  { id: 'meeting-room', label: 'Ruang Rapat', cx: 1440, cy: 500, span: 14 },
  { id: 'operations-room', label: 'Operasional', cx: 1664, cy: 612, span: 14 },
  { id: 'main-office', label: 'Kantor Utama', cx: 944, cy: 412, span: 56 },
  { id: 'east-corridor', label: 'Koridor Timur', cx: 1504, cy: 692, span: 14 },
  { id: 'reception', label: 'Resepsionis', cx: 448, cy: 324, span: 14 },
  { id: 'marketing-studio', label: 'Studio Marketing', cx: 672, cy: 436, span: 14 },
  { id: 'graphic-design-studio', label: 'Studio Desain', cx: 896, cy: 548, span: 14 },
  { id: 'content-studio', label: 'Studio Konten', cx: 1120, cy: 660, span: 14 },
  { id: 'relaxation-lounge', label: 'Ruang Santai', cx: 1344, cy: 772, span: 14 },
  { id: 'coffee-shop', label: 'Kedai Kopi', cx: 256, cy: 420, span: 14 },
  { id: 'angkringan', label: 'Angkringan', cx: 496, cy: 540, span: 16 },
  { id: 'garden', label: 'Taman', cx: 784, cy: 684, span: 20 },
  { id: 'swimming-pool', label: 'Kolam Renang', cx: 1104, cy: 844, span: 20 },
] as const
