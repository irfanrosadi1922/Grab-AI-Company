# Grab AI Company

Dashboard SaaS untuk CEO yang mengelola toko GrabMerchant lewat 8 karyawan AI.
Stack: React, Vite, TypeScript, Tailwind CSS, React Router, Recharts, Framer Motion, Lucide. Tanpa Next.js.

## Menjalankan

```bash
npm install
npm run dev        # pengembangan
npm run build      # typecheck + build produksi
```

## Status

Semua data diisi sendiri oleh CEO. Tidak ada data contoh.

**Berfungsi:**
- Login (Supabase Auth) dan sinkronisasi data per akun dengan RLS
- Task Center, Approval Center (buat permintaan, setujui/tolak), Grab Stores (tambah/hapus toko)
- Analytics, Dashboard, dan Reports dihitung dari penjualan, menu, ulasan, dan pemasaran yang Anda catat
- Chat AI dengan karyawan, tinjauan persetujuan, ringkasan notulen, dan teks promosi lewat Edge Function `ai-chat` (Groq)
- Marketing Studio: desain dari template, ekspor SVG/PNG, library aset

**Belum ada:**
- Koneksi GrabMerchant (butuh akses API resmi). Sementara itu penjualan dicatat manual
- Suara dua arah dan transkrip langsung (ElevenLabs belum dibangun)
- Avatar foto realistis (saat ini inisial berwarna)

## Pengaturan

1. Variabel build `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (kunci publishable, aman di browser)
2. Secret Supabase `GROQ_API_KEY` untuk Edge Function `ai-chat`
3. Skema database di `supabase/migrations/`
