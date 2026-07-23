import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, AlertTriangle, ShoppingBag, Box, CheckCircle2, ChevronRight, Filter, ShieldAlert, RefreshCw } from 'lucide-react';

type NotificationCategory = 'all' | 'urgent' | 'new_orders' | 'inventory';

interface NotificationItem {
  id: string;
  type: 'urgent' | 'new_order' | 'low_stock' | 'system';
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  link: string;
  actionText: string;
  data?: any;
}

export default function Notifications() {
  const [activeTab, setActiveTab] = useState<NotificationCategory>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotificationsData();
  }, []);

  async function fetchNotificationsData() {
    setLoading(true);
    
    // Fetch orders & products to generate live actionable notifications
    const { data: orders } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    const { data: products } = await supabase
      .from('products')
      .select('*')
      .order('stock', { ascending: true });

    const items: NotificationItem[] = [];

    // 1. Urgent Action Needed (> 24 hours unpaid or unprocessed)
    const now = new Date();
    const urgentOrders = (orders || []).filter(o => {
      const created = new Date(o.created_at);
      const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 3600);
      return hoursDiff > 24 && ['Pesanan Baru', 'Menunggu Pembayaran', 'Belum Diproses'].includes(o.status);
    });

    urgentOrders.forEach(ord => {
      items.push({
        id: `urgent-${ord.id}`,
        type: 'urgent',
        title: `Pesanan #${ord.id.slice(0, 8)} Belum Diproses (>24 Jam)`,
        description: `Pesanan atas nama ${ord.customer_name || 'Pelanggan'} senilai Rp ${ord.total_amount?.toLocaleString('id-ID')} belum ditindaklanjuti lebih dari 24 jam.`,
        time: new Date(ord.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        isRead: false,
        link: '/orders',
        actionText: 'Tindak Lanjuti Pesanan',
        data: ord
      });
    });

    // 2. New Orders (Recent orders)
    const newOrders = (orders || []).filter(o => ['Pesanan Baru', 'Sedang Diverifikasi', 'Belum Diproses'].includes(o.status)).slice(0, 5);
    newOrders.forEach(ord => {
      items.push({
        id: `new-${ord.id}`,
        type: 'new_order',
        title: `Pesanan Baru Masuk #${ord.id.slice(0, 8)}`,
        description: `${ord.customer_name || 'Pelanggan'} telah membuat pesanan baru (${ord.order_items?.length || 1} produk).`,
        time: new Date(ord.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        isRead: false,
        link: '/orders',
        actionText: 'Proses Pesanan',
        data: ord
      });
    });

    // 3. Low Stock / Inventory Alerts
    const lowStockProducts = (products || []).filter(p => (p.stock ?? 0) <= 5);
    lowStockProducts.forEach(prod => {
      const isOut = prod.stock === 0;
      items.push({
        id: `stock-${prod.id}`,
        type: 'low_stock',
        title: isOut ? `STOK HABIS: ${prod.name}` : `Stok Menipis: ${prod.name} (Sisa ${prod.stock} pcs)`,
        description: isOut 
          ? `Produk ${prod.name} telah habis (0 pasang tersisa). Segera tambahkan stok produk ini.`
          : `Stok tersisa tinggal ${prod.stock} pasang. Segera lakukan update stok sebelum kehabisan.`,
        time: 'Peringatan Sistem',
        isRead: false,
        link: '/products',
        actionText: 'Update Stok Produk',
        data: prod
      });
    });

    setNotifications(items);
    setLoading(false);
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const filteredNotifications = notifications.filter(item => {
    if (activeTab === 'urgent') return item.type === 'urgent';
    if (activeTab === 'new_orders') return item.type === 'new_order';
    if (activeTab === 'inventory') return item.type === 'low_stock';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto font-sans pb-12">
      {/* 1. Header (24px Bold #1A1A1A, 24px bottom margin to content) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-bold text-[#1A1A1A] tracking-tight">Pusat Notifikasi Toko</h1>
            {unreadCount > 0 && (
              <span className="bg-[#5c1616] text-white text-[12px] font-semibold px-2.5 py-0.5 rounded-full">
                {unreadCount} Baru
              </span>
            )}
          </div>
          <p className="text-[12px] font-normal text-[#71717A] mt-1">Daftar pengingat pesanan urgen, transaksi baru masuk, dan peringatan stok produk.</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchNotificationsData}
            className="px-3.5 py-2 bg-white border border-[#E2E8F0] hover:border-slate-300 text-[#1A1A1A] text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button 
            onClick={markAllAsRead}
            className="px-4 py-2 bg-[#5c1616] hover:bg-[#400f0f] text-white text-[12px] font-medium rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            Tandai Semua Dibaca
          </button>
        </div>
      </div>

      {/* 2. Filter Tabs (Minimalist Rounded-lg Buttons) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E8F0] pb-4">
        {[
          { id: 'all', label: 'Semua Notifikasi', count: notifications.length },
          { id: 'urgent', label: '🔴 Perlu Tindakan Urgen', count: notifications.filter(n => n.type === 'urgent').length },
          { id: 'new_orders', label: '🟢 Pesanan Baru', count: notifications.filter(n => n.type === 'new_order').length },
          { id: 'inventory', label: '⚠️ Stok & Barang', count: notifications.filter(n => n.type === 'low_stock').length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as NotificationCategory)}
            className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#5c1616] text-white shadow-xs font-semibold'
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 3. Notification List */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#71717A] text-[14px]">Memuat notifikasi toko...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-[#71717A]">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-[#16A34A]" />
            <p className="text-[14px] font-semibold text-[#1A1A1A]">Tidak Ada Notifikasi</p>
            <p className="text-[12px] text-[#71717A] mt-1">Semua pesanan dan stok barang dalam kondisi aman.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {filteredNotifications.map(item => (
              <div 
                key={item.id}
                className={`p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                  item.type === 'urgent' ? 'bg-rose-50/40 hover:bg-rose-50/70' :
                  item.type === 'low_stock' ? 'bg-amber-50/30 hover:bg-amber-50/60' :
                  'hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.type === 'urgent' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                    item.type === 'new_order' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                    'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}>
                    {item.type === 'urgent' && <AlertTriangle size={20} />}
                    {item.type === 'new_order' && <ShoppingBag size={20} />}
                    {item.type === 'low_stock' && <Box size={20} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-[#1A1A1A]">{item.title}</h3>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#5c1616]"></span>
                      )}
                    </div>
                    <p className="text-[12px] font-normal text-[#71717A] mt-1 leading-relaxed max-w-3xl">
                      {item.description}
                    </p>
                    <span className="text-[11px] text-[#71717A] mt-1.5 block">
                      {item.time}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0">
                  {item.type === 'low_stock' && (
                    <a
                      href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo Vendor Ballqish, saya ingin mendiskusikan pemesanan stok tambahan untuk produk: ${item.data?.name || 'Sepatu Ballqish'}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Hubungi Vendor</span>
                    </a>
                  )}

                  <a 
                    href={item.link}
                    className={`px-4 py-2 rounded-lg text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                      item.type === 'urgent' ? 'bg-rose-600 hover:bg-rose-700 text-white' :
                      item.type === 'new_order' ? 'bg-[#5c1616] hover:bg-[#400f0f] text-white' :
                      'bg-slate-900 hover:bg-black text-white'
                    }`}
                  >
                    <span>{item.actionText}</span>
                    <ChevronRight size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
