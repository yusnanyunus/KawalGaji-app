# KawalGaji

## Menjalankan lokal

1. Jalankan `npm install`.
2. Buat project Supabase dan siapkan tabel aplikasi (`users`, `category`, `payment_method`, `task_list`) sesuai kolom yang dipakai aplikasi. Setelah tabel tersedia, jalankan `supabase/security.sql` di SQL Editor.
3. Salin `.env.example` menjadi `.env.local`, lalu isi `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dan `JWT_SECRET`.
4. Gunakan secret acak minimal 32 karakter untuk `JWT_SECRET`. Jangan commit `.env.local` atau membagikan service role key.
5. Isi `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (minimal 12 karakter), dan `SEED_ADMIN_FULLNAME` hanya di `.env.local`, lalu jalankan `npm run seed` untuk membuat atau memperbarui admin pertama.
6. Jalankan `npm run dev`, lalu buka http://localhost:3000.

## Netlify

1. Siapkan tabel aplikasi di Supabase, lalu jalankan `supabase/security.sql`. Jalankan seed admin secara lokal dari komputer tepercaya yang terhubung ke Supabase; jangan isi variabel seed di Netlify.
2. Atur `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dan `JWT_SECRET` di Netlify UI. Beri secret cakupan Functions/runtime (dan Edge Functions untuk middleware), tandai sebagai secret, dan jangan menaruhnya di `netlify.toml`, source code, atau variabel `NEXT_PUBLIC_*`. Gunakan secret acak minimal 32 byte untuk JWT.
3. Hubungkan repo sebagai aplikasi Next.js dengan root `kawalgaji`, lalu deploy ulang setiap kali environment variables berubah. Netlify mendukung App Router dan middleware Next.js melalui adapter/runtime-nya.
4. Pastikan `.env.local` tidak ikut dikomit. `.env.example` hanya berisi placeholder.

Client Supabase dibuat saat permintaan memerlukan akses database, bukan saat `next build`. `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` tidak digunakan oleh aplikasi ini.

Jalankan migrasi SQL hanya setelah tabel aplikasi tersedia. Verifikasi login admin sebelum mengundang pengguna lain. Role `admin` dapat mengelola pengguna dan menghapus permanen data; role `user` hanya dapat memakai fitur keuangan bersama.
