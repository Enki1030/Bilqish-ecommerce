import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Package, Phone, User, Calendar, RefreshCw, CheckCircle2, Truck, ArrowUpDown, ChevronDown, RotateCcw } from 'lucide-react';

// Status Types & Definitions
type MainTab = 'all' | 'new' | 'processing' | 'shipping' | 'issues';

interface SubTabOption {
  id: string;
  label: string;
  statuses?: string[];
}

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab State
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('all');
  const [activeSubTab, setActiveSubTab] = useState<string>('all');
  
  // Filter States
  const [searchCategory, setSearchCategory] = useState<'id' | 'product' | 'customer'>('id');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  useEffect(() => {
    fetchOrders();
  }, []);

  // Reset sub-tab when main tab changes
  useEffect(() => {
    setActiveSubTab('all');
  }, [activeMainTab]);

  const getAdminSessionStartTime = () => {
    const stored = localStorage.getItem('ballqish_admin_login_time');
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (!stored) {
      localStorage.setItem('ballqish_admin_login_time', now.toString());
      return now;
    }
    const loginTime = Number(stored);
    if (now - loginTime >= TWENTY_FOUR_HOURS) {
      localStorage.setItem('ballqish_admin_login_time', now.toString());
      return now;
    }
    return loginTime;
  };

  async function fetchOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      const now = Date.now();
      const sessionStartTime = getAdminSessionStartTime();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const isSessionExpired = (now - sessionStartTime) >= TWENTY_FOUR_HOURS;

      // If 24h have passed since Admin's login session started, unhandled 'Pesanan Baru' auto-transition to 'Diproses'
      const updatedData = await Promise.all((data || []).map(async (o: any) => {
        if (isSessionExpired && ['Pesanan Baru', 'Belum Diproses'].includes(o.status)) {
          await supabase.from('orders').update({ status: 'Diproses' }).eq('id', o.id);
          return { ...o, status: 'Diproses' };
        }
        return o;
      }));

      setOrders(updatedData);
    }
    setLoading(false);
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error('Update status error:', error);
      alert(`Gagal mengupdate status pesanan: ${error.message || 'Error tidak diketahui'}`);
    } else {
      fetchOrders();
    }
  }

  // Define Sub-tabs per Main Tab
  const subTabsMap: Record<MainTab, SubTabOption[]> = {
    all: [
      { id: 'all', label: 'Semua Status' },
      { id: 'aktif', label: 'Pesanan Aktif' },
      { id: 'baru', label: 'Pesanan Baru (<24j Login)', statuses: ['Pesanan Baru', 'Belum Diproses'] },
      { id: 'selesai', label: 'Pesanan Selesai', statuses: ['Selesai'] },
      { id: 'dibatalkan', label: 'Pesanan Dibatalkan', statuses: ['Dibatalkan'] },
      { id: 'dikembalikan', label: 'Pesanan Dikembalikan', statuses: ['Dikembalikan'] }
    ],
    new: [
      { id: 'all', label: 'Semua Status' },
      { id: 'belum_diproses', label: 'Belum Diproses', statuses: ['Pesanan Baru', 'Belum Diproses'] }
    ],
    processing: [
      { id: 'all', label: 'Semua Status' },
      { id: 'siap_pickup', label: 'Siap Pickup', statuses: ['Siap Pickup'] },
      { id: 'gagal_pickup', label: 'Gagal Pickup', statuses: ['Gagal Pickup'] }
    ],
    shipping: [
      { id: 'all', label: 'Semua Status' },
      { id: 'diterima_ekspedisi', label: 'Diterima Ekspedisi', statuses: ['Diterima Ekspedisi', 'Dikirim'] },
      { id: 'dalam_pengiriman', label: 'Dalam Pengiriman', statuses: ['Dalam Pengiriman'] },
      { id: 'tiba', label: 'Tiba di Tujuan', statuses: ['Tiba di Tujuan'] }
    ],
    issues: [
      { id: 'all', label: 'Semua Status' },
      { id: 'pengiriman_gagal', label: 'Pengiriman Gagal', statuses: ['Pengiriman Gagal'] },
      { id: 'komplain', label: 'Komplain / Retur', statuses: ['Komplain / Retur', 'Komplain', 'Retur'] }
    ]
  };

  // Counting badges for Main Tabs (Admin Login Session Timer)
  const counts = useMemo(() => {
    const res: Record<MainTab, number> = { all: orders.length, new: 0, processing: 0, shipping: 0, issues: 0 };
    const now = Date.now();
    const sessionStartTime = getAdminSessionStartTime();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const isFreshSession = (now - sessionStartTime) < TWENTY_FOUR_HOURS;

    orders.forEach(o => {
      const st = o.status || 'Diproses';

      if (['Pesanan Baru', 'Belum Diproses'].includes(st) && isFreshSession) res.new++;
      if (['Diproses', 'Siap Pickup', 'Gagal Pickup'].includes(st)) res.processing++;
      if (['Dikirim', 'Diterima Ekspedisi', 'Dalam Pengiriman', 'Tiba di Tujuan'].includes(st)) res.shipping++;
      if (['Pengiriman Gagal', 'Komplain / Retur', 'Komplain', 'Retur', 'Terkendala'].includes(st)) res.issues++;
    });
    return res;
  }, [orders]);

  // Main Filter Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const st = o.status || 'Diproses';

      // 1. Filter by Main Tab
      if (activeMainTab === 'new') {
        if (!['Pesanan Baru', 'Belum Diproses'].includes(st)) return false;
      } else if (activeMainTab === 'processing') {
        if (!['Diproses', 'Siap Pickup', 'Gagal Pickup'].includes(st)) return false;
      } else if (activeMainTab === 'shipping') {
        if (!['Dikirim', 'Diterima Ekspedisi', 'Dalam Pengiriman', 'Tiba di Tujuan'].includes(st)) return false;
      } else if (activeMainTab === 'issues') {
        if (!['Pengiriman Gagal', 'Komplain / Retur', 'Komplain', 'Retur', 'Terkendala'].includes(st)) return false;
      }

      // 2. Filter by Sub Tab
      if (activeSubTab !== 'all') {
        const currentSubTabs = subTabsMap[activeMainTab];
        const selectedSub = currentSubTabs.find(s => s.id === activeSubTab);
        if (selectedSub?.statuses) {
          if (!selectedSub.statuses.includes(st)) return false;
        } else if (activeMainTab === 'all') {
          if (activeSubTab === 'aktif' && ['Selesai', 'Dibatalkan', 'Dikembalikan'].includes(st)) return false;
        }
      }

      // 3. Search Query Filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        if (searchCategory === 'id') {
          if (!o.id.toLowerCase().includes(q)) return false;
        } else if (searchCategory === 'customer') {
          if (!o.customer_name?.toLowerCase().includes(q) && !o.customer_phone?.toLowerCase().includes(q)) return false;
        } else if (searchCategory === 'product') {
          const matchItem = o.order_items?.some((item: any) => item.product_name?.toLowerCase().includes(q));
          if (!matchItem) return false;
        }
      }

      // 4. Date Filter
      if (dateFilter !== 'all') {
        const orderDate = new Date(o.created_at).getTime();
        const now = Date.now();
        if (dateFilter === 'today') {
          const todayStart = new Date().setHours(0, 0, 0, 0);
          if (orderDate < todayStart) return false;
        } else if (dateFilter === '7days') {
          if (now - orderDate > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (dateFilter === '30days') {
          if (now - orderDate > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // 5. Sorting
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'highest') return (b.total_amount || 0) - (a.total_amount || 0);
      if (sortBy === 'lowest') return (a.total_amount || 0) - (b.total_amount || 0);
      return 0;
    });
  }, [orders, activeMainTab, activeSubTab, searchCategory, searchQuery, dateFilter, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setDateFilter('all');
    setSortBy('newest');
    setActiveSubTab('all');
  };

  // Contextual dropdown choices according to user specification with rollback capability
  const getContextualOptions = (currentStatus: string) => {
    const st = currentStatus || 'Diproses';

    if (['Belum Diproses', 'Pesanan Baru'].includes(st)) {
      return [
        { value: 'Belum Diproses', label: 'Belum Diproses' },
        { value: 'Diproses', label: 'Diproses' },
        { value: 'Dibatalkan', label: 'Dibatalkan' }
      ];
    }
    if (st === 'Diproses') {
      return [
        { value: 'Diproses', label: 'Diproses' },
        { value: 'Siap Pickup', label: 'Siap Pickup' },
        { value: 'Dikirim', label: 'Serahkan ke Kurir (Dikirim)' },
        { value: 'Belum Diproses', label: '↩ Kembali ke Belum Diproses' },
        { value: 'Dibatalkan', label: 'Dibatalkan' }
      ];
    }
    if (st === 'Siap Pickup') {
      return [
        { value: 'Siap Pickup', label: 'Siap Pickup' },
        { value: 'Diterima Ekspedisi', label: 'Diterima Ekspedisi' },
        { value: 'Gagal Pickup', label: 'Gagal Pickup' },
        { value: 'Diproses', label: '↩ Kembali ke Diproses' },
        { value: 'Dibatalkan', label: 'Dibatalkan' }
      ];
    }
    if (st === 'Gagal Pickup') {
      return [
        { value: 'Gagal Pickup', label: 'Gagal Pickup' },
        { value: 'Siap Pickup', label: 'Siap Pickup (Coba Ulang)' },
        { value: 'Diproses', label: '↩ Kembali ke Diproses' },
        { value: 'Dibatalkan', label: 'Dibatalkan' }
      ];
    }
    if (['Diterima Ekspedisi', 'Dikirim'].includes(st)) {
      return [
        { value: st, label: st },
        { value: 'Dalam Pengiriman', label: 'Dalam Pengiriman' },
        { value: 'Siap Pickup', label: '↩ Kembali ke Siap Pickup' },
        { value: 'Dibatalkan', label: 'Dibatalkan' }
      ];
    }
    if (st === 'Dalam Pengiriman') {
      return [
        { value: 'Dalam Pengiriman', label: 'Dalam Pengiriman' },
        { value: 'Tiba di Tujuan', label: 'Tiba di Tujuan' },
        { value: 'Pengiriman Gagal', label: 'Pengiriman Gagal' },
        { value: 'Diterima Ekspedisi', label: '↩ Kembali ke Diterima Ekspedisi' },
        { value: 'Dibatalkan', label: 'Dibatalkan' }
      ];
    }
    if (st === 'Tiba di Tujuan') {
      return [
        { value: 'Tiba di Tujuan', label: 'Tiba di Tujuan' },
        { value: 'Selesai', label: 'Pesanan Selesai' },
        { value: 'Komplain / Retur', label: 'Komplain / Retur' },
        { value: 'Dalam Pengiriman', label: '↩ Kembali ke Dalam Pengiriman' }
      ];
    }
    if (st === 'Selesai') {
      return [
        { value: 'Selesai', label: 'Pesanan Selesai' },
        { value: 'Tiba di Tujuan', label: '↩ Kembali ke Tiba di Tujuan' },
        { value: 'Komplain / Retur', label: 'Komplain / Retur' }
      ];
    }
    if (st === 'Pengiriman Gagal') {
      return [
        { value: 'Pengiriman Gagal', label: 'Pengiriman Gagal' },
        { value: 'Dalam Pengiriman', label: 'Dalam Pengiriman (Kirim Ulang)' },
        { value: 'Diterima Ekspedisi', label: '↩ Kembali ke Diterima Ekspedisi' },
        { value: 'Dibatalkan', label: 'Dibatalkan' }
      ];
    }
    if (['Komplain / Retur', 'Komplain', 'Retur'].includes(st)) {
      return [
        { value: st, label: st },
        { value: 'Tiba di Tujuan', label: '↩ Kembali ke Tiba di Tujuan' },
        { value: 'Dikembalikan', label: 'Pesanan Dikembalikan' }
      ];
    }
    if (st === 'Dibatalkan') {
      return [
        { value: 'Dibatalkan', label: 'Dibatalkan' },
        { value: 'Diproses', label: 'Diproses (Pemulihan)' }
      ];
    }
    if (st === 'Dikembalikan') {
      return [
        { value: 'Dikembalikan', label: 'Pesanan Dikembalikan' },
        { value: 'Diproses', label: 'Diproses (Penggantian)' }
      ];
    }

    return [
      { value: st, label: st },
      { value: 'Diproses', label: 'Diproses' },
      { value: 'Dibatalkan', label: 'Dibatalkan' }
    ];
  };

  if (loading) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto font-sans pb-12">
      {/* 1. Header Summary Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#1A1A1A] tracking-tight">Kelola Pesanan</h1>
          <p className="text-[12px] font-normal text-[#71717A] mt-1">Kelola, verifikasi, dan pantau status transaksi toko secara terstruktur.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[12px] text-[#71717A] bg-slate-50 px-4 py-2 rounded-lg border border-[#E2E8F0]">
          <div>Pesanan Otomatis: <span className="font-medium text-[#1A1A1A]">0 / 20</span></div>
          <div className="h-3 w-[1px] bg-slate-300"></div>
          <div>Pesanan COD: <span className="font-medium text-[#1A1A1A]">0 / 5</span></div>
          <div className="h-3 w-[1px] bg-slate-300"></div>
          <div>Aktif Pengiriman: <span className="font-medium text-[#5c1616]">{counts.shipping} Aktif</span></div>
        </div>
      </div>

      {/* 1. Main Navigation Tabs (Semua on Far Left) */}
      <div className="border-b border-[#E2E8F0] mb-4 overflow-x-auto">
        <nav className="flex space-x-8 min-w-max">
          {[
            { id: 'all', label: 'Semua', count: counts.all },
            { id: 'new', label: 'Pesanan Baru', count: counts.new },
            { id: 'processing', label: 'Diproses', count: counts.processing },
            { id: 'shipping', label: 'Pengiriman', count: counts.shipping },
            { id: 'issues', label: 'Terkendala', count: counts.issues },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveMainTab(tab.id as MainTab)}
              className={`pb-3 text-[14px] font-semibold transition-all relative flex items-center gap-2 cursor-pointer ${
                activeMainTab === tab.id
                  ? 'text-[#5c1616] border-b-2 border-[#5c1616]'
                  : 'text-[#71717A] hover:text-[#1A1A1A]'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[12px] px-2 py-0.5 rounded-full font-medium ${
                  activeMainTab === tab.id ? 'bg-[#5c1616] text-white' : 'bg-slate-100 text-[#71717A]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* 2. Sub-Pills Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {subTabsMap[activeMainTab].map(sub => (
          <button
            key={sub.id}
            onClick={() => setActiveSubTab(sub.id)}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
              activeSubTab === sub.id
                ? 'bg-[#5c1616] text-white shadow-xs font-semibold'
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {/* 3. Layered Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Category + Input */}
          <div className="md:col-span-5 flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
            <select
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value as any)}
              className="bg-gray-50 text-xs font-semibold text-gray-700 px-3 border-r border-gray-300 outline-none cursor-pointer"
            >
              <option value="id">Kode Pesanan</option>
              <option value="product">Nama Produk</option>
              <option value="customer">Pelanggan / HP</option>
            </select>
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchCategory === 'id' ? 'Contoh: 8a4b7c10...' :
                  searchCategory === 'product' ? 'Contoh: Oxford Pantofel...' :
                  'Nama pembeli atau No. HP...'
                }
                className="w-full pl-9 pr-3 py-2 text-xs outline-none bg-white"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            </div>
          </div>

          {/* Date Range */}
          <div className="md:col-span-3 relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-xs font-medium text-gray-700 outline-none appearance-none cursor-pointer focus:border-primary"
            >
              <option value="all">📅 Range Tanggal (Semua)</option>
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="30days">30 Hari Terakhir</option>
            </select>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          </div>

          {/* Profit & Sort */}
          <div className="md:col-span-4 relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-xs font-medium text-gray-700 outline-none appearance-none cursor-pointer focus:border-primary"
            >
              <option value="newest">Sortir: Pesanan Terbaru</option>
              <option value="oldest">Sortir: Pesanan Terlama</option>
              <option value="highest">Profit / Total: Nominal Tertinggi</option>
              <option value="lowest">Profit / Total: Nominal Terendah</option>
            </select>
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-xs">
          <span className="text-gray-500">
            Menampilkan <span className="font-bold text-gray-900">{filteredOrders.length}</span> dari {orders.length} pesanan
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={resetFilters}
              className="text-gray-500 hover:text-primary flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <RefreshCw size={12} /> Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* 4. Orders List View */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-sm font-bold text-gray-900 mb-1 font-heading">Tidak Ada Pesanan Ditemukan</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
              Tidak ada transaksi yang cocok dengan tab atau filter pencarian Anda saat ini.
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-primary text-white text-xs font-button rounded hover:bg-primary-hover transition-colors cursor-pointer"
            >
              Reset Semua Filter
            </button>
          </div>
        ) : (
          filteredOrders.map(order => {
            const currentSt = order.status || 'Diproses';
            const availableOptions = getContextualOptions(currentSt);

            return (
              <div key={order.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:border-gray-300 transition-all">
                {/* Top Order Card Bar */}
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-medium text-gray-900 font-body">ID: #{order.id.slice(0, 8).toUpperCase()}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">{new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-gray-400">•</span>
                    <span className="flex items-center gap-1 font-normal text-gray-700"><User size={13} /> {order.customer_name}</span>
                    <span className="text-gray-400">•</span>
                    <span className="flex items-center gap-1 font-normal text-gray-600"><Phone size={13} /> {order.customer_phone}</span>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                      ['Belum Diproses', 'Pesanan Baru'].includes(currentSt) ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      currentSt === 'Diproses' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                      currentSt === 'Siap Pickup' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      ['Dikirim', 'Diterima Ekspedisi', 'Dalam Pengiriman'].includes(currentSt) ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      currentSt === 'Tiba di Tujuan' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                      currentSt === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      currentSt === 'Dikembalikan' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {currentSt}
                    </span>
                  </div>
                </div>

                {/* Order Card Content */}
                <div className="p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* Left: Items list */}
                    <div className="lg:col-span-7 space-y-3">
                      {order.order_items?.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
                          <div className="w-14 h-14 bg-white rounded border border-gray-200 flex-shrink-0 overflow-hidden">
                            <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-xs truncate">{item.product_name}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">Ukuran: {item.size} | Model: {item.outsole_model || 'Standard'}</p>
                            <p className="text-xs font-normal text-gray-700 mt-1">{item.quantity}x <span className="font-body">Rp {item.price?.toLocaleString('id-ID')}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Middle: Address & Summary */}
                    <div className="lg:col-span-3 text-xs border-l lg:border-r border-gray-100 px-0 lg:px-4 space-y-2">
                      <div>
                        <span className="text-gray-400 font-normal">Alamat Pengiriman:</span>
                        <p className="text-gray-800 font-normal line-clamp-2 mt-0.5">{order.customer_address || 'Tidak ada alamat'}</p>
                      </div>
                      <div className="pt-2 border-t border-gray-100">
                        <span className="text-gray-400 font-normal">Total Tagihan:</span>
                        <p className="text-xs font-medium text-primary font-body mt-0.5">Rp {order.total_amount?.toLocaleString('id-ID')}</p>
                      </div>
                    </div>

                    {/* Right: Quick Action Buttons & Status Changer */}
                    <div className="lg:col-span-2 flex flex-col gap-2 justify-center">
                      {/* Contextual Quick Action Button */}
                      {['Belum Diproses', 'Pesanan Baru'].includes(currentSt) && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'Diproses')}
                          className="w-full bg-[#5c1616] hover:bg-[#400f0f] text-white text-[12px] font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <CheckCircle2 size={13} /> Proses Pesanan
                        </button>
                      )}

                      {currentSt === 'Diproses' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'Siap Pickup')}
                          className="w-full bg-[#5c1616] hover:bg-[#400f0f] text-white text-[12px] font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Truck size={13} /> Siap Pickup
                        </button>
                      )}

                      {currentSt === 'Siap Pickup' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'Diterima Ekspedisi')}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Truck size={13} /> Serahkan Ekspedisi
                        </button>
                      )}

                      {currentSt === 'Gagal Pickup' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'Siap Pickup')}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <RefreshCw size={13} /> Coba Pickup Lagi
                        </button>
                      )}

                      {['Diterima Ekspedisi', 'Dikirim'].includes(currentSt) && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'Dalam Pengiriman')}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white text-[12px] font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Truck size={13} /> Dalam Pengiriman
                        </button>
                      )}

                      {currentSt === 'Dalam Pengiriman' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'Tiba di Tujuan')}
                          className="w-full bg-teal-600 hover:bg-teal-700 text-white text-[12px] font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <CheckCircle2 size={13} /> Tiba di Tujuan
                        </button>
                      )}

                      {currentSt === 'Tiba di Tujuan' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'Selesai')}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <CheckCircle2 size={13} /> Konfirmasi Selesai
                        </button>
                      )}

                      {currentSt === 'Pengiriman Gagal' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'Dalam Pengiriman')}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <RefreshCw size={13} /> Kirim Ulang
                        </button>
                      )}

                      {['Komplain / Retur', 'Komplain', 'Retur'].includes(currentSt) && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'Dikembalikan')}
                          className="w-full bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <RotateCcw size={13} /> Proses Pengembalian
                        </button>
                      )}

                      {/* Manual Contextual Status Override Select */}
                      <div className="w-full">
                        <label className="block text-[11px] font-medium text-gray-500 mb-1">
                          Ubah Status
                        </label>
                        <div className="relative">
                          <select
                            value={currentSt}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="w-full appearance-none bg-white border border-gray-300 hover:border-primary text-gray-800 font-medium text-xs py-1.5 pl-2.5 pr-7 rounded-lg cursor-pointer outline-none transition-all focus:ring-1 focus:ring-primary focus:border-primary"
                          >
                            {availableOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

