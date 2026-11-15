# Grab AI Company

Dashboard SaaS untuk CEO yang mengelola toko GrabMerchant lewat 8 karyawan AI.
Stack: React, Vite, TypeScript, Tailwind CSS, React Router, Recharts, Framer Motion, Lucide. Tanpa Next.js.

## Menjalankan

```bash
npm install
npm run dev        # pengembangan
npm run build      # typecheck + build produksi
```

## Status jujur

**Sudah berfungsi (disimpan di localStorage browser):**
- Navigasi 10 halaman, sidebar desktop, bottom nav + menu More di mobile, pencarian global, notifikasi
- Task Center: daftar, kanban, buat tugas, ubah status, hasil, riwayat
- Approval Center: setujui (dengan konfirmasi), tolak (alasan wajib), riwayat
- Marketing Studio: desain dari template, simpan ke Aset, unduh SVG/PNG, caption berbasis template
- Grab Stores: daftar, tambah toko, detail; Reports: buat laporan dan unduh CSV
- Meeting Room: agenda, chat, notulen (unduh .txt), log keputusan, penugasan
- Settings: profil, perusahaan, toggle karyawan, izin, notifikasi, reset data

**Masih demo / belum diimplementasikan:**
- Semua angka penjualan, grafik, ulasan, performa menu dan toko (ditandai DEMO)
- Koneksi GrabMerchant: tidak ada, tidak ada koneksi palsu. Butuh akses API resmi
- Respons AI, percakapan dengan karyawan AI, transkrip langsung, suara dua arah
- Avatar: saat ini inisial berwarna. Foto realistis belum ada, perlu aset gambar
- Backend Supabase, autentikasi, dan penyimpanan lintas perangkat

## Langkah berikutnya

1. `npm install && npm run build`, perbaiki error yang muncul
2. Tambah aset avatar yang konsisten
3. Supabase: autentikasi, tabel tugas/persetujuan/toko, RLS
4. Edge Function untuk penyedia model AI (kunci hanya di sisi server)
5. Integrasi GrabMerchant setelah akses resmi diperoleh
