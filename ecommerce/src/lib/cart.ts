import { supabase } from './supabase';

/**
 * Hybrid cart helper.
 * - Tamu: satu-satunya sumber data adalah localStorage (`ballqish_cart`).
 * - User login: localStorage tetap menjadi sumber UI, lalu disinkronkan ke
 *   tabel `cart_items` (hanya product_id + varian + quantity; nama/gambar/harga
 *   diambil dari join `products`).
 */

export type CartItem = {
  id: string;
  name?: string;
  price?: number;
  image?: string;
  mode?: string;
  size?: string;
  stitching?: string | null;
  outsole?: string | null;
  insole?: string | null;
  quantity: number;
  [key: string]: unknown;
};

type RemoteRow = {
  id: string;
  product_id: string;
  variant_key: string;
  mode: string;
  size: string;
  stitching: string | null;
  outsole: string | null;
  insole: string | null;
  quantity: number;
  products: { name: string | null; image_url: string | null; price: number | null } | null;
};

const CART_KEY = 'ballqish_cart';

/** Baca cart dari localStorage dengan fallback aman. */
export function readLocalCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Tulis cart ke localStorage. */
export function writeLocalCart(cart: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/** Mode yang disimpan di database (constraint: retail | b2b). */
function dbMode(mode?: string): 'retail' | 'b2b' {
  return mode === 'b2b' ? 'b2b' : 'retail';
}

/** Mode yang dipakai UI/localStorage saat ini (satuan | b2b). */
function localMode(mode?: string): 'satuan' | 'b2b' {
  return mode === 'b2b' ? 'b2b' : 'satuan';
}

/**
 * Kunci identitas varian untuk dedup/upsert.
 * Bukan duplikasi data produk — hanya identitas kombinasi varian.
 */
export function variantKey(item: CartItem): string {
  return [
    item.id,
    dbMode(item.mode),
    item.size || '',
    item.stitching || '',
    item.outsole || '',
    item.insole || '',
  ].join('|');
}

function rowToItem(row: RemoteRow): CartItem {
  const product = row.products;
  return {
    id: row.product_id,
    name: product?.name || '',
    price: Number(product?.price) || 0,
    image: product?.image_url || '',
    mode: localMode(row.mode),
    size: row.size,
    stitching: row.stitching,
    outsole: row.outsole,
    insole: row.insole,
    quantity: Math.max(1, Number(row.quantity) || 1),
  };
}

function itemToRow(item: CartItem, userId: string) {
  return {
    user_id: userId,
    product_id: item.id,
    variant_key: variantKey(item),
    mode: dbMode(item.mode),
    size: item.size || '',
    stitching: item.stitching || null,
    outsole: item.outsole || null,
    insole: item.insole || null,
    quantity: Math.max(1, Number(item.quantity) || 1),
  };
}

export async function getSessionUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.user?.id || null;
}

/** Ambil cart remote milik user login (nama/gambar/harga dari products). */
export async function fetchRemoteCart(): Promise<CartItem[]> {
  const { data, error } = await supabase
    .from('cart_items')
    .select(
      'id, product_id, variant_key, mode, size, stitching, outsole, insole, quantity, products(name, image_url, price)'
    )
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return (data as unknown as RemoteRow[]).map(rowToItem);
}

/**
 * Gabungkan cart lokal + remote.
 * Varian yang sama: quantity = max(lokal, remote), data produk memakai yang
 * paling baru dari database (nama/gambar/harga).
 */
export function mergeCarts(local: CartItem[], remote: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();

  for (const item of local) {
    if (!item?.id) continue;
    merged.set(variantKey(item), {
      ...item,
      quantity: Math.max(1, Number(item.quantity) || 1),
    });
  }

  for (const item of remote) {
    if (!item?.id) continue;
    const key = variantKey(item);
    const existing = merged.get(key);

    if (existing) {
      merged.set(key, {
        ...existing,
        name: item.name || existing.name,
        price: item.price ?? existing.price,
        image: item.image || existing.image,
        quantity: Math.max(existing.quantity, item.quantity),
      });
    } else {
      merged.set(key, item);
    }
  }

  return Array.from(merged.values());
}

/** Upsert seluruh cart lokal ke Supabase (hanya jika user login). */
export async function syncCart(cart: CartItem[]): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId || cart.length === 0) return;

  const rows = cart.filter((item) => item?.id).map((item) => itemToRow(item, userId));
  if (rows.length === 0) return;

  const { error } = await supabase
    .from('cart_items')
    .upsert(rows, { onConflict: 'user_id,variant_key' });

  if (error) console.error('Cart sync failed:', error.message);
}

/** Upsert satu item (dipakai saat tombol +/- ditekan). */
export async function syncCartItem(item: CartItem): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId || !item?.id) return;

  const { error } = await supabase
    .from('cart_items')
    .upsert(itemToRow(item, userId), { onConflict: 'user_id,variant_key' });

  if (error) console.error('Cart item sync failed:', error.message);
}

/** Hapus satu varian dari cart remote (produk di tabel products tidak disentuh). */
export async function removeRemoteCartItem(item: CartItem): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId || !item?.id) return;

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId)
    .eq('variant_key', variantKey(item));

  if (error) console.error('Cart item delete failed:', error.message);
}

/** Kosongkan cart remote setelah checkout berhasil. */
export async function clearRemoteCart(userId?: string): Promise<void> {
  const uid = userId || (await getSessionUserId());
  if (!uid) return;

  const { error } = await supabase.from('cart_items').delete().eq('user_id', uid);
  if (error) console.error('Cart clear failed:', error.message);
}

/**
 * Dipanggil saat halaman dimuat (index / PDP / checkout).
 * Menarik cart remote, menggabungkannya ke localStorage, lalu mendorong hasil
 * gabungan kembali ke Supabase.
 */
export async function mergeRemoteCartIntoLocal(): Promise<{ merged: CartItem[] } | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const remote = await fetchRemoteCart();
  const merged = mergeCarts(readLocalCart(), remote);
  writeLocalCart(merged);
  await syncCart(merged);

  return { merged };
}

/** Sinkronkan isi localStorage saat ini (dipakai listener `cartUpdated`). */
export async function syncLocalCart(): Promise<void> {
  const cart = readLocalCart();
  if (cart.length === 0) return;
  await syncCart(cart);
}
