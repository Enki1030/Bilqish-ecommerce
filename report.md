# Ballqish — Report Perencanaan Security & Admin Hardening

**Tanggal:** 14 November 2026

**Repo:** `Enki1030/Bilqish-ecommerce`

**Branch aktif:** `main`

**Commit desain terakhir:** `248df50` — `Restore split B2B layout on desktop`

**Status:** dokumen perencanaan; belum semua batch dieksekusi.

---

## 0. PROMPT UNTUK ANTIGRAVITY

Copy-paste prompt ini ke AntiGravity. Prompt ini sengaja meminta AntiGravity
membaca `report.md` dan `ECOMMERCE_SECURITY_AUDIT.md` terlebih dahulu.

```text
Anda adalah senior full-stack engineer + application security reviewer
untuk proyek Ballqish.

SEBELUM MENGERJAKAN APA PUN, WAJIB:
1. Baca file `report.md` ini sampai selesai.
2. Baca `ECOMMERCE_SECURITY_AUDIT.md` sampai selesai.
3. Gunakan skill `antislop` yang sudah terpasang di AntiGravity.
   Ikuti aturan anti-slop: jangan membuat kode/generalisasi berlebihan,
   jangan merusak pola repo, jangan menambah dependency tanpa alasan,
   dan jangan mengubah hal yang tidak diminta.
4. Baca `sql/README.md`, `sql/security-critical-fix.sql`,
   `sql/admin-products-setup.sql`, `sql/admin-data-phase1.sql`, dan `sql.md`.
5. Baca dan update `AGENT_BATCHES.md` di root repo.
   File itu sudah disediakan sebagai ledger awal; jika belum ada, buat.
   Update status `IN PROGRESS`, `DONE`, `BLOCKED`, atau `DEFERRED`
   selama bekerja.

Tujuan pekerjaan:
- Security hardening phase 1 untuk storefront + admin dashboard.
- Hapus modul admin Pengrajin & Bahan dari UI admin.
- Perbaiki data admin dan form agar pendataan lebih lengkap.
- Jadikan admin dashboard nyaman dipakai di HP.
- Siapkan SQL proposal; JANGAN jalankan SQL ke Supabase.

Batasan keras:
- Jangan mengubah Supabase, RLS, schema, function, trigger, atau data.
- Jangan memakai service-role key.
- Jangan menjalankan SQL. User akan menjalankan manual.
- Jangan menyentuh Midtrans/payment sekarang.
- Jangan drop tabel `craftsmen`, `raw_materials`, atau logs.
  PDP masih membaca `raw_materials`; drop akan merusak halaman produk.
- Jangan commit `sql/`, `.env`, service key, atau deploy hook.
- Jangan deploy, force push, atau rewrite history.
- Jangan mengubah desain storefront yang sudah ada.
- Pertahankan ID, class, `data-*`, dan hook cart/wishlist/checkout/login.
- Jangan overwrite `sql.md`; file itu snapshot lokal yang sedang modified.
- Jangan menghapus `ECOMMERCE_SECURITY_AUDIT.md`.

Cara kerja:
- Kerjakan batch berurutan dari report.
- Satu batch = satu commit `agy(batch-N): ...`.
- Sebelum batch, baca file terkait dan cek `git status`.
- Setelah batch, jalankan build/lint yang relevan.
- Update `AGENT_BATCHES.md` dengan commit SHA, file berubah, test, blocker,
  dan langkah berikutnya.
- Jika konteks habis, selesaikan/batalkan batch dengan aman, update ledger,
  lalu berhenti. Jangan mulai batch baru.
- Jika perubahan membutuhkan schema/RLS/RPC, tulis proposal di `sql/`,
  tandai `BLOCKED`, dan minta user menjalankan SQL. Jangan mengakali
  dengan hardcoded email, localStorage, atau service-role.
```

---

## 1. Ringkasan Proyek

Ballqish memiliki dua aplikasi dalam satu repo:

| Aplikasi | Teknologi | Output | Supabase |
|---|---|---|---|
| Storefront | Astro 7, Tailwind 4 | Static / Cloudflare Pages | Supabase JS langsung dari browser |
| Admin | Vite, React 19, TypeScript, Tailwind 4 | Static / Cloudflare Pages | Supabase JS langsung dari browser |

Tidak ada backend Node/API sendiri. Ini berarti:

- Anon key memang publik; bukan service key.
- RLS adalah benteng utama.
- Business logic yang sensitif tidak boleh hanya mengandalkan client.
- Untuk validasi harga order, stok, dan pembayaran, dibutuhkan RPC/Edge Function
  atau backend server-side.
- Fase Midtrans akan menjadi pekerjaan keamanan terpisah setelah integrasi
  pembayaran ada.

---

## 2. Yang Sudah Selesai

Storefront:

- Editorial Luxury ivory/oxblood.
- Navbar responsif dan drawer mobile.
- Cart/wishlist hybrid localStorage + Supabase.
- Prune produk yang dihapus dari cart/wishlist.
- B2B section, opsi insole/outsole.
- Empty catalog `Belum ada produk`.
- Login/register mode.
- Logout confirmation dengan `window.showConfirm`.
- Pesan error GPS mobile/desktop.
- B2B desktop kembali ke split layout: oxblood + foto kiri + teks kanan;
  mobile tetap full-bleed image.

Admin:

- CRUD produk, upload gambar, gallery, B2B, sole options.
- Order status management.
- Blog editor TipTap.
- Notifications.
- Dashboard analytics dan export.
- Modul Pengrajin & Bahan masih ada dan akan dihapus dari UI.

SQL yang sudah disiapkan tetapi belum tentu dijalankan di Supabase:

- `sql/admin-products-setup.sql`
- `sql/security-critical-fix.sql`
- `sql/fix-delete-product-fk.sql`
- `sql/admin-data-phase1.sql` (baru, proposal field data)

Jangan menganggap SQL sudah aktif hanya karena file-nya ada.

---

## 3. Cara Push agar Perubahan Terlihat di Dev/Live

### 3.1 Push ke GitHub

Dari root repo:

```bash
git status
git add report.md AGENT_BATCHES.md
git commit -m "Add security and admin hardening report"
git push origin main
```

Commit desain B2B sudah ada di `248df50`. Report dan ledger batch
ditambahkan setelahnya.

Cek status:

```bash
git status
git log --oneline -3
git branch -vv
```

### 3.2 Cloudflare Pages

Repo ini tidak memiliki file konfigurasi deploy khusus di dalam repo. Artinya,
deploy kemungkinan memakai integrasi Git Cloudflare Pages.

Jika project Cloudflare Pages terhubung ke GitHub:

- Push ke branch `main` akan memicu build/deploy production.
- Push ke branch lain / pull request biasanya menghasilkan preview deployment.

Konfigurasi storefront yang benar:

| Setting | Nilai |
|---|---|
| Root directory | `ecommerce` |
| Build command | `npm run build` |
| Build output | `dist` |
| Branch production | `main` |
| Node version | minimal 22.12 |

Konfigurasi admin dashboard:

| Setting | Nilai |
|---|---|
| Root directory | `admin-dashboard` |
| Build command | `npm run build` |
| Build output | `dist` |
| Branch production | `main` |

Jika push tidak memicu deploy:

1. Buka Cloudflare Dashboard → Workers & Pages.
2. Pilih project storefront/admin.
3. Cek Settings → Builds & deployments.
4. Pastikan branch, root, build command, dan output benar.
5. Klik Retry deployment / Create deployment.

Alternatif manual dari folder aplikasi:

```bash
cd ecommerce
npm run build
npx wrangler pages deploy dist --project-name <nama-project-storefront>
```

```bash
cd admin-dashboard
npm run build
npx wrangler pages deploy dist --project-name <nama-project-admin>
```

Jangan menebak nama project. Lihat nama project di dashboard Cloudflare.

Jika memakai custom domain dan perubahan belum terlihat:

- Tunggu deployment selesai.
- Purge cache Cloudflare untuk domain tersebut.
- Cek apakah browser masih memakai cache; coba hard refresh/incognito.

Environment variables yang harus ada di Cloudflare:

Storefront:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

Admin:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Jangan menaruh service-role key di environment frontend.

### 3.3 Dev lokal

Storefront:

```bash
cd ecommerce
npx astro dev --background
```

Perintah manajemen:

```bash
npx astro dev status
npx astro dev logs
npx astro dev stop
```

Admin:

```bash
cd admin-dashboard
npm run dev -- --host 0.0.0.0
```

---

## 4. Field Data Baru yang Diusulkan

File SQL: `sql/admin-data-phase1.sql`

Sifat file: **additive**, tidak menghapus tabel/kolom/data. Jalankan manual di
Supabase SQL Editor. File ini belum dijalankan.

### 4.1 Produk

| Field | Tipe | Default | Alasan |
|---|---|---|---|
| `cost_price` | numeric(12,2) | 0 | HPP, laba kotor, margin |
| `stock` | integer | 0 | stok nyata, mengganti hack komentar HTML |
| `min_stock` | integer | 0 | alert stok kritis |
| `weight_grams` | integer | null | estimasi ongkir |
| `status` | text | `active` | active/draft/archived |
| `color` | text | null | data varian/filter |
| `material` | text | null | data bahan |
| `seo_title` | text | null | SEO produk |
| `seo_description` | text | null | SEO produk |
| `updated_at` | timestamptz | now() | audit perubahan |

Catatan stok:

- Admin saat ini menyimpan stok di komentar `<!--STOCK:...-->` pada
  `description` karena kolom `stock` belum ada.
- SQL akan menambahkan kolom `stock` dan melakukan backfill dari komentar lama.
- Setelah stok terverifikasi, admin harus berhenti menulis komentar baru.
- Jangan hapus komentar lama sebelum stok dicek.

### 4.2 Pesanan

| Field | Tipe | Default | Alasan |
|---|---|---|---|
| `customer_email` | text | null | kontak pelanggan |
| `payment_status` | text | `unpaid` | status pembayaran manual |
| `payment_method` | text | null | transfer/COD/manual |
| `paid_at` | timestamptz | null | waktu bayar |
| `shipping_courier` | text | null | kurir |
| `shipping_service` | text | null | layanan kurir |
| `shipping_cost` | numeric(12,2) | 0 | ongkir |
| `tracking_number` | text | null | nomor resi |
| `shipped_at` | timestamptz | null | waktu kirim |
| `delivered_at` | timestamptz | null | waktu terima |
| `discount_amount` | numeric(12,2) | 0 | diskon |
| `tax_amount` | numeric(12,2) | 0 | pajak |
| `notes` | text | null | catatan admin |
| `shipping_latitude` | double precision | null | lokasi kirim |
| `shipping_longitude` | double precision | null | lokasi kirim |
| `updated_at` | timestamptz | now() | audit perubahan |

Catatan pembayaran:

- `payment_status` di fase ini hanya untuk pencatatan manual.
- Jangan menandai `paid` dari browser.
- Setelah Midtrans dipasang, status pembayaran harus berasal dari webhook
  server-side yang diverifikasi.
- Kolom khusus Midtrans (mis. `midtrans_order_id`) sengaja belum ditambahkan;
  tunggu desain integrasi pembayaran.

### 4.3 Item Pesanan

| Field | Tipe | Alasan |
|---|---|---|
| `insole_model` | text | snapshot pilihan insole B2B |
| `unit_cost` | numeric(12,2) | snapshot HPP untuk laporan historis |
| `sku` | text | snapshot kode/model produk |

### 4.4 Pelanggan

Belum perlu tabel `customers` baru pada fase ini. Data pelanggan bisa
diturunkan dari `orders`:

- nama
- telepon
- email
- jumlah order
- total belanja
- last order
- kota/alamat utama

Jika nanti perlu tabel pelanggan permanen, buat proposal SQL terpisah.

### 4.5 Artikel

Kolom artikel sudah cukup lengkap di schema:

- `tags`
- `meta_title`
- `meta_description`
- `published_at`
- `views_count`

Yang perlu diperbaiki adalah admin editor agar field tersebut benar-benar
bisa diisi dan ditampilkan. Tidak perlu SQL baru untuk artikel.

---

## 5. Modul Pengrajin & Bahan

### 5.1 Yang dihapus dari admin

- Route `/craftsmen`.
- Import dan halaman `Craftsmen.tsx`.
- Menu “Pengrajin & Bahan” di sidebar.
- Sheet supplier/raw material di export Dashboard.
- Link “Halo Vendor Ballqish” di Notifications jika mengarah ke supplier.
- Semua referensi UI yang sudah tidak dipakai.

### 5.2 Yang TIDAK boleh langsung dihapus dari Supabase

Tabel berikut **jangan di-drop** pada fase ini:

- `craftsmen`
- `raw_materials`
- `craftsmen_material_logs`

Alasan:

- PDP `ecommerce/src/pages/product/[id].astro` masih membaca `raw_materials`
  untuk:
  - kalkulasi lead time produksi;
  - notice “Info Pasokan” saat bahan berstatus Terbatas/Habis.
- Men-drop `raw_materials` akan membuat fitur PDP rusak.
- RLS `raw_materials` juga masih public-read untuk kebutuhan PDP.

Jadi “hapus modul admin pengrajin dan bahan” berarti:

- hapus UI/admin module;
- pertahankan tabel dan data;
- pertahankan read path PDP;
- jangan drop data tanpa backup dan tanpa menghapus fitur PDP terlebih dahulu.

Jika user benar-benar ingin menghapus tabel dari Supabase:

1. Backup data.
2. Hapus fitur PDP yang membaca `raw_materials`.
3. Hapus SQL/RLS terkait.
4. Baru drop tabel dengan file SQL terpisah dan eksplisit.
5. Jangan lakukan ini tanpa persetujuan user.

---

## 6. Temuan Keamanan

### P0 — sebelum produksi

- Checkout membuat `orders` dan `order_items` langsung dari browser.
- `total_amount` dan `price` berasal dari client/localStorage.
- RLS hanya memeriksa `auth.uid() = user_id`.
- Client bisa memanipulasi harga/total.
- Admin dashboard hanya mengecek session, belum `is_admin()`.
- Cloudflare deploy hook hardcoded di client.
- `admin-dashboard/.env` masih tracked Git.

### P1 — hardening

- Auto-transition status order berbasis localStorage.
- `order_items` public-read membocorkan data item pesanan.
- Blog `set:html` tanpa sanitasi.
- Beberapa `innerHTML` belum konsisten escape.
- `raw_materials` public-read; masih dibutuhkan PDP.
- Belum ada CSP/security headers.
- Upload gambar perlu validasi MIME/size yang lebih ketat.

### Fase 2 — setelah Midtrans

- Webhook signature verification.
- Idempotency.
- Payment state machine.
- Stock reservation atomik.
- Refund/chargeback/reconciliation.
- Callback browser tidak boleh menandai PAID.
- Rate limiting/fraud.

Jangan implementasi fase 2 sekarang.

---

## 7. Batch Plan untuk AntiGravity

AntiGravity wajib membaca dan memperbarui `AGENT_BATCHES.md` serta mencatat
status tiap batch.

### Batch 0 — Recon & Baseline
- Baca report + audit + SQL.
- Buat ledger.
- Jalankan baseline build/lint.
- Catat secret/tracked env.

### Batch 1 — Secret Hygiene
- Untrack `admin-dashboard/.env`.
- Tambah `.gitignore`.
- Hapus hardcoded deploy hook.
- Jangan mengganti dengan env frontend.
- Build.

### Batch 2 — Admin Authorization & Unsafe Logic
- Guard `is_admin()` di App.
- Fail-closed jika RPC belum ada.
- Hapus auto status transition localStorage.
- Build/lint.

### Batch 3 — XSS & HTML Sanitization
- Sanitasi artikel `set:html`.
- Audit semua `innerHTML`.
- Escape data alamat/checkout.
- Validasi URL.
- Build.

### Batch 4 — Security SQL Proposal
- Tulis RPC `create_order` server-side.
- View/RPC agregat untuk menggantikan public `order_items`.
- Constraint/index.
- Jangan jalankan SQL.
- Tandai BLOCKED sampai user approve.

### Batch 5 — Hapus Modul Supplier dari Admin
- Hapus route/page/sidebar/export sheets.
- Jangan drop tabel Supabase.
- Jangan rusak PDP.
- Build/lint.

### Batch 6 — Data & Form Admin
- Jalankan audit gap.
- Implementasi field yang sudah ada.
- Gunakan `sql/admin-data-phase1.sql` untuk field baru.
- Hentikan penulisan stok ke komentar HTML.
- Dashboard jangan memakai HPP estimasi 55% sebagai fakta.
- Build/lint.

### Batch 7 — Admin Mobile
- Test 360/390/430/768.
- Form produk full-screen/mobile-friendly.
- Tabel jadi card/scroll.
- Filter stack.
- Blog editor mobile.
- CRUD test dengan data uji.
- Build/lint.

### Batch 8 — Verification & Handoff
- Build/lint semua app.
- Secret scan.
- Cek `sql/` tidak tracked.
- Cek supplier route hilang.
- Cek admin guard.
- Update ledger.
- Jangan deploy.

---

## 8. Batasan yang Tidak Boleh Dilanggar

- Jangan drop/alter tabel Supabase.
- Jangan ubah RLS production.
- Jangan jalankan SQL.
- Jangan gunakan service-role.
- Jangan sentuh Midtrans.
- Jangan hapus data supplier.
- Jangan ubah desain storefront.
- Jangan ubah ID/class/hook cart/wishlist/checkout/address/login.
- Jangan commit `sql/`, `.env`, deploy hook, atau secret.
- Jangan deploy/force push.
- Jangan overwrite `sql.md`.
- Jangan hapus `ECOMMERCE_SECURITY_AUDIT.md`.

---

## 9. Verifikasi

Storefront:

```bash
cd ecommerce
npx astro build
```

Admin:

```bash
cd admin-dashboard
npm run build
npm run lint
```

Cek secret:

```bash
git grep -nE 'service_role|SERVICE_ROLE|deploy_hooks|api\.cloudflare\.com|sk_live|server_key' || true
git ls-files | grep -E '(^|/)\.env($|\.)' || true
git ls-files | grep '^sql/' || true
```

Target mobile admin:

- 360×800
- 390×844
- 430×932
- 768×1024
- 1366×900 regression desktop

---

## 10. Keputusan yang Masih Perlu Dikonfirmasi User

1. Apakah tabel `craftsmen`, `raw_materials`, dan logs benar-benar ingin
   dihapus dari Supabase, atau hanya modul adminnya yang dihapus?
   Rekomendasi: **hanya UI admin** sampai fitur PDP yang memakai
   `raw_materials` dipensiunkan.
2. Apakah `payment_status`/field pembayaran ingin dipakai manual sekarang,
   atau ditunda sampai Midtrans?
   Rekomendasi: boleh ditambahkan untuk pencatatan manual, tetapi jangan
   menandai PAID dari client.
3. Apakah admin mobile cukup responsive web, atau perlu PWA/native app?
   Rekomendasi: responsive web dulu.

---

## 11. File Terkait

- `report.md`
- `AGENT_BATCHES.md`
- `ecommerce/src/pages/index.astro`
- `ecommerce/src/pages/checkout.astro`
- `ecommerce/src/pages/blog/[slug].astro`
- `ecommerce/src/components/AddressModal.astro`
- `admin-dashboard/src/App.tsx`
- `admin-dashboard/src/components/Sidebar.tsx`
- `admin-dashboard/src/pages/Dashboard.tsx`
- `admin-dashboard/src/pages/Products.tsx`
- `admin-dashboard/src/pages/Orders.tsx`
- `admin-dashboard/src/pages/BlogEditor.tsx`
- `admin-dashboard/src/pages/Notifications.tsx`
- `admin-dashboard/src/pages/Craftsmen.tsx`
- `sql/admin-data-phase1.sql`
- `sql/security-critical-fix.sql`
- `sql/admin-products-setup.sql`
- `ECOMMERCE_SECURITY_AUDIT.md`

---

## 12. Catatan Push

Commit desain B2B sudah dibuat. Setelah report siap:

```bash
git status
git add report.md AGENT_BATCHES.md
git commit -m "Add security and admin hardening report"
git push origin main
```

Jika Cloudflare Pages terhubung ke GitHub, push ke `main` akan memicu deploy.
Jika tidak, deploy manual dari dashboard Cloudflare atau `wrangler pages deploy`.
