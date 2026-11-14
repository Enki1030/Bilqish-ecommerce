# AGENT_BATCHES — Ballqish Security & Admin Hardening

**Last updated:** 14 November 2026

**Branch:** `main`

**Source of truth:** `report.md`

**Security reference:** `ECOMMERCE_SECURITY_AUDIT.md`

**Status:** belum dimulai; semua batch `TODO`.

## Cara melanjutkan jika agen limit

1. Baca `report.md` dan `ECOMMERCE_SECURITY_AUDIT.md`.
2. Jalankan `git status` dan `git log --oneline -5`.
3. Cari batch pertama dengan status `TODO` atau `IN PROGRESS`.
4. Jangan mengulang batch `DONE`.
5. Baca bagian `Notes` dan `Blocker` sebelum mengubah kode.
6. Update status dan hasil verifikasi di file ini setelah setiap batch.

## Aturan status

- `TODO` — belum dikerjakan.
- `IN PROGRESS` — sedang dikerjakan.
- `DONE` — selesai, build/lint lulus, sudah dicatat.
- `BLOCKED` — menunggu user/SQL/keputusan.
- `DEFERRED` — sengaja ditunda.

Satu batch = satu commit `agy(batch-N): ...`.

---

## Batch 0 — Recon & Baseline

**Status:** TODO

**Goal:** memahami repo, baseline build, dan temuan awal tanpa mengubah kode.

**Tasks:**
- [ ] Baca `report.md`, `ECOMMERCE_SECURITY_AUDIT.md`, `sql/README.md`, `sql/security-critical-fix.sql`, `sql/admin-products-setup.sql`, `sql/admin-data-phase1.sql`, `sql.md`.
- [ ] Catat branch, `git status`, `git log --oneline -10`.
- [ ] Jalankan baseline build/lint storefront dan admin.
- [ ] Cari tracked `.env` dan secret hardcoded.
- [ ] Catat temuan di bagian Notes.

**Acceptance:**
- [ ] Baseline tercatat.
- [ ] Tidak ada perubahan kode selain file ledger ini.

**Verification:**
- Command:
- Result:

**Notes:**
- `sql/admin-data-phase1.sql` adalah file lokal di folder `sql/` yang gitignored.
- `sql.md` sedang modified lokal; jangan overwrite.

**Commit:** —

---

## Batch 1 — Secret Hygiene & Deploy Hook

**Status:** TODO

**Goal:** menghilangkan secret/tracked env dan hardcoded deploy hook dari client.

**Tasks:**
- [ ] `git rm --cached admin-dashboard/.env` (file lokal tetap ada).
- [ ] Tambah ignore `.env` di root `.gitignore`.
- [ ] Cek apakah env berisi service-role key; jika ya, minta user rotasi.
- [ ] Hapus hardcoded Cloudflare deploy hook dari:
  - `admin-dashboard/src/pages/Products.tsx`
  - `admin-dashboard/src/pages/BlogEditor.tsx`
  - `ecommerce/src/pages/checkout.astro`
- [ ] Jangan mengganti hook dengan env `VITE_*`/`PUBLIC_*`.
- [ ] Jika auto-deploy tetap dibutuhkan, tulis rekomendasi server-side dan tandai `BLOCKED`.

**Acceptance:**
- [ ] `git ls-files` tidak memuat `admin-dashboard/.env`.
- [ ] `git grep 'deploy_hooks'` bersih.
- [ ] Build storefront/admin lulus.
- [ ] Tidak ada secret baru di client bundle.

**Verification:**
- Command:
- Result:

**Notes:**

**Commit:** —

---

## Batch 2 — Admin Authorization & Unsafe Status Logic

**Status:** TODO

**Goal:** admin area fail-closed dan status order tidak berubah otomatis dari localStorage.

**Tasks:**
- [ ] Tambah guard `supabase.rpc('is_admin')` di `admin-dashboard/src/App.tsx`.
- [ ] Tampilkan loading saat cek admin.
- [ ] Tampilkan halaman Akses Ditolak + logout jika bukan admin.
- [ ] Jika RPC `is_admin` belum ada, fail-closed dan tampilkan instruksi SQL.
- [ ] Jangan memakai hardcoded email allowlist.
- [ ] Hapus auto-transition status order berbasis `ballqish_admin_login_time` di `Dashboard.tsx` dan `Orders.tsx`.
- [ ] Status order hanya berubah lewat aksi manual admin.

**Acceptance:**
- [ ] Non-admin tidak bisa membuka area admin meski punya session.
- [ ] Tidak ada update status order otomatis saat load.
- [ ] Build/lint lulus.

**Verification:**
- Command:
- Result:

**Notes:**
- `is_admin()` berasal dari `sql/admin-products-setup.sql`; user harus memastikan SQL sudah dijalankan.

**Commit:** —

---

## Batch 3 — XSS & HTML Sanitization

**Status:** TODO

**Goal:** konten artikel dan semua data dinamis aman saat dirender.

**Tasks:**
- [ ] Sanitasi `set:html={article.content}` di `ecommerce/src/pages/blog/[slug].astro`.
- [ ] Allowlist tag/atribut yang dibutuhkan artikel.
- [ ] Blokir script, iframe, event handler, `javascript:`.
- [ ] Audit semua `innerHTML` di storefront.
- [ ] Escape data alamat/checkout/AddressModal.
- [ ] Validasi URL gambar/link.
- [ ] Pertahankan tampilan dan fitur TipTap.

**Acceptance:**
- [ ] `<script>` dan `onerror` pada artikel tidak mengeksekusi script.
- [ ] Semua data dinamis di `innerHTML` ter-escape/disanitasi.
- [ ] Blog tetap tampil normal.
- [ ] Build storefront lulus.

**Verification:**
- Command:
- Result:

**Notes:**

**Commit:** —

---

## Batch 4 — Security SQL Proposal

**Status:** TODO

**Goal:** menyiapkan perbaikan server-side tanpa menjalankan SQL.

**Tasks:**
- [ ] Tulis proposal RPC `create_order` di `sql/security-phase1.sql`.
- [ ] RPC membaca harga dari `products`, bukan client.
- [ ] Validasi quantity, stok, ukuran, total.
- [ ] Insert order + order_items atomik.
- [ ] Proposal view/RPC agregat untuk menggantikan public `order_items`.
- [ ] Proposal constraint/index/status order.
- [ ] Jangan jalankan SQL.
- [ ] Tandai `BLOCKED` sampai user approve.

**Acceptance:**
- [ ] File SQL proposal bisa dibaca user.
- [ ] Tidak ada schema/RLS aktual yang berubah.
- [ ] Storefront tetap memakai alur lama.

**Verification:**
- Command:
- Result:

**Notes:**
- `order_items` public-read masih dibutuhkan PDP untuk hitung stok; jangan revoke sebelum view/RPC pengganti siap.

**Commit:** —

---

## Batch 5 — Hapus Modul Supplier dari Admin

**Status:** TODO

**Goal:** menghapus modul Pengrajin & Bahan dari UI admin tanpa merusak Supabase/PDP.

**Tasks:**
- [ ] Hapus route `/craftsmen` dan import `Craftsmen` dari `App.tsx`.
- [ ] Hapus menu “Pengrajin & Bahan” dari `Sidebar.tsx`.
- [ ] Hapus `admin-dashboard/src/pages/Craftsmen.tsx` setelah tidak direferensikan.
- [ ] Hapus sheet supplier/raw material dari export `Dashboard.tsx`.
- [ ] Hapus/ubah link vendor di `Notifications.tsx`.
- [ ] Cari semua referensi `craftsmen|raw_materials|pengrajin|supplier`.
- [ ] Jangan drop tabel Supabase.
- [ ] Jangan merusak PDP yang membaca `raw_materials`.

**Acceptance:**
- [ ] Admin tidak lagi menampilkan modul supplier.
- [ ] Tidak ada route/menu/link mati.
- [ ] Build/lint lulus.
- [ ] PDP tetap berjalan.

**Verification:**
- Command:
- Result:

**Notes:**
- Tabel `craftsmen`, `raw_materials`, `craftsmen_material_logs` tetap ada.
- Drop table hanya boleh dilakukan setelah fitur PDP dipensiunkan dan user setuju.

**Commit:** —

---

## Batch 6 — Data & Form Admin

**Status:** TODO

**Goal:** pendataan produk/pesanan lebih lengkap dan dashboard tidak memakai estimasi sebagai fakta.

**Tasks:**
- [ ] Audit gap field yang sudah ada vs dibutuhkan.
- [ ] Gunakan `sql/admin-data-phase1.sql` untuk field baru.
- [ ] Perbaiki validasi form produk: harga/stok non-negatif, field wajib, ukuran minimal satu.
- [ ] Hentikan penulisan stok baru ke komentar HTML `<!--STOCK:...-->`.
- [ ] Baca stok lama untuk kompatibilitas sampai migrasi diverifikasi.
- [ ] Expose tags/meta/SEO artikel yang sudah ada.
- [ ] Tampilkan data pelanggan/alamat/item order dengan aman.
- [ ] Hapus estimasi HPP 55% atau beri label estimasi.
- [ ] Jangan menambah field baru ke kolom yang belum ada.
- [ ] Tandai bagian yang menunggu SQL sebagai `BLOCKED`.

**Acceptance:**
- [ ] Form lebih ketat dan tidak menerima data sampah.
- [ ] Tidak ada penulisan field ke kolom yang tidak ada.
- [ ] Dashboard tidak menampilkan estimasi sebagai fakta.
- [ ] Build/lint lulus.

**Verification:**
- Command:
- Result:

**Notes:**
- `sql/admin-data-phase1.sql` belum dijalankan.
- Field pembayaran hanya untuk pencatatan manual; jangan menandai PAID dari client.

**Commit:** —

---

## Batch 7 — Admin Mobile

**Status:** TODO

**Goal:** admin bisa dipakai input/check dari HP tanpa horizontal scroll.

**Tasks:**
- [ ] Test 360×800, 390×844, 430×932, 768×1024, 1366×900.
- [ ] Form produk modal full-screen/bottom-sheet di mobile.
- [ ] Sticky header/footer modal dan body scroll.
- [ ] Grid 2 kolom jadi 1 kolom di layar kecil.
- [ ] Tabel lebar jadi card/horizontal scroll.
- [ ] Filter order stack.
- [ ] Blog editor dan toolbar mobile.
- [ ] Sidebar menutup setelah navigasi.
- [ ] Touch target minimal 44px.
- [ ] Uji CRUD nyata dengan data uji.

**Acceptance:**
- [ ] Tidak ada horizontal overflow di 360/390/430/768.
- [ ] Form utama bisa diselesaikan di HP.
- [ ] Build/lint lulus.

**Verification:**
- Command:
- Result:

**Notes:**
- Screenshot disimpan di luar repo.

**Commit:** —

---

## Batch 8 — Final Verification & Handoff

**Status:** TODO

**Goal:** memastikan semua batch aman dan siap dilanjutkan.

**Tasks:**
- [ ] `cd ecommerce && npx astro build`.
- [ ] `cd admin-dashboard && npm run build && npm run lint`.
- [ ] Scan secret dan tracked env.
- [ ] Pastikan `sql/` tidak tracked.
- [ ] Pastikan route supplier hilang.
- [ ] Pastikan admin guard aktif.
- [ ] Pastikan tidak ada auto-update status order.
- [ ] Cek mobile screenshots.
- [ ] Update ledger dengan commit, test, blocker.
- [ ] Jangan deploy.

**Acceptance:**
- [ ] Semua build/lint lulus.
- [ ] Tidak ada secret.
- [ ] Blocker dan SQL yang perlu dijalankan user tercatat.

**Verification:**
- Command:
- Result:

**Notes:**

**Commit:** —
