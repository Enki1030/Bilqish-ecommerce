import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Package, Phone, User, Calendar, Filter, RefreshCw, CheckCircle2, Truck, AlertTriangle, ArrowUpDown, ChevronDown } from 'lucide-react';

// Status Types & Definitions
type MainTab = 'new' | 'unpaid' | 'processing' | 'shipping' | 'issues' | 'all';

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

  async function fetchOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert('Gagal mengupdate status pesanan.');
    } else {
      fetchOrders();
    }
  }

  // Define Sub-tabs per Main Tab
  const subTabsMap: Record<MainTab, SubTabOption[]> = {
    new: [
      { id: 'all', label: 'Semua Status' },
      { id: 'perlu_diproses', label: 'Perlu Diproses', statuses: ['Pesanan Baru', 'Perlu Diproses'] },
      { id: 'belum_diproses', label: 'Belum Diproses', statuses: ['Belum Diproses', 'Draft'] }
    ],
    unpaid: [
      { id: 'all', label: 'Semua Status' },
      { id: 'menunggu', label: 'Menunggu Pembayaran', statuses: ['Menunggu Pembayaran'] },
      { id: 'verifikasi', label: 'Sedang Diverifikasi', statuses: ['Sedang Diverifikasi'] }
    ],
    processing: [
      { id: 'all', label: 'Semua Status' },
      { id: 'sedang_diproses', label: 'Sedang Diproses', statuses: ['Diproses', 'Sedang Diproses'] },
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
      { id: 'komplain', label: 'Komplain / Retur', statuses: ['Komplain', 'Retur', 'Terkendala'] }
    ],
    all: [
      { id: 'all', label: 'Pesanan Terbuat & Baru' },
      { id: 'aktif', label: 'Pesanan Aktif' },
      { id: 'selesai', label: 'Pesanan Selesai', statuses: ['Selesai'] },
      { id: 'dibatalkan', label: 'Pesanan Dibatalkan', statuses: ['Dibatalkan'] }
    ]
  };

  // Counting badges for Main Tabs
  const counts = useMemo(() => {
    const res: Record<MainTab, number> = { new: 0, unpaid: 0, processing: 0, shipping: 0, issues: 0, all: orders.length };
    orders.forEach(o => {
      const st = o.status || '';
      if (['Pesanan Baru', 'Perlu Diproses', 'Belum Diproses'].includes(st)) res.new++;
      if (['Menunggu Pembayaran', 'Sedang Diverifikasi'].includes(st)) res.unpaid++;
      if (['Diproses', 'Sedang Diproses', 'Siap Pickup', 'Gagal Pickup'].includes(st)) res.processing++;
      if (['Dikirim', 'Diterima Ekspedisi', 'Dalam Pengiriman', 'Tiba di Tujuan'].includes(st)) res.shipping++;
      if (['Pengiriman Gagal', 'Komplain', 'Retur', 'Terkendala'].includes(st)) res.issues++;
    });
    return res;
  }, [orders]);

  // Main Filter Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const st = o.status || '';

      // 1. Filter by Main Tab
      if (activeMainTab === 'new') {
        if (!['Pesanan Baru', 'Perlu Diproses', 'Belum Diproses', 'Draft'].includes(st) && (activeMainTab as string) !== 'all') {
          // If no specific match, show if created recently without completion
        }
      } else if (activeMainTab === 'unpaid') {
        if (!['Menunggu Pembayaran', 'Sedang Diverifikasi'].includes(st)) return false;
      } else if (activeMainTab === 'processing') {
        if (!['Diproses', 'Sedang Diproses', 'Siap Pickup', 'Gagal Pickup'].includes(st)) return false;
      } else if (activeMainTab === 'shipping') {
        if (!['Dikirim', 'Diterima Ekspedisi', 'Dalam Pengiriman', 'Tiba di Tujuan'].includes(st)) return false;
      } else if (activeMainTab === 'issues') {
        if (!['Pengiriman Gagal', 'Komplain', 'Retur', 'Terkendala'].includes(st)) return false;
      }

      // 2. Filter by Sub Tab
      if (activeSubTab !== 'all') {
        const currentSubTabs = subTabsMap[activeMainTab];
        const selectedSub = currentSubTabs.find(s => s.id === activeSubTab);
        if (selectedSub?.statuses) {
          if (!selectedSub.statuses.includes(st)) return false;
        } else if (activeMainTab === 'all') {
          if (activeSubTab === 'aktif' && ['Selesai', 'Dibatalkan'].includes(st)) return false;
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

  if (loading) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto font-sans">
      {/* 1. Header Summary Stats (24px Bold #1A1A1A, 24px bottom margin to content) */}
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
          <div>Kurir Instan: <span className="font-medium text-[#5c1616]">{counts.shipping} Aktif</span></div>
        </div>
      </div>

      {/* 1. Main Navigation Tabs */}
      <div className="border-b border-[#E2E8F0] mb-4 overflow-x-auto">
        <nav className="flex space-x-8 min-w-max">
          {[
            { id: 'new', label: 'Pesanan Baru', count: counts.new },
            { id: 'unpaid', label: 'Belum Dibayar', count: counts.unpaid },
            { id: 'processing', label: 'Diproses', count: counts.processing },
            { id: 'shipping', label: 'Pengiriman', count: counts.shipping },
            { id: 'issues', label: 'Terkendala', count: counts.issues },
            { id: 'all', label: 'Semua', count: counts.all },
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

      {/* 2. Sub-Pills Filters (Subtle rounded-lg Buttons to match design system) */}
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

      {/* 3. Layered Filter Bar (Text, Date, Profit/Sort) */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Filter 1: Search Category + Search Text Input */}
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

          {/* Filter 2: Date Range */}
          <div className="md:col-span-3 relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-xs font-medium text-gray-700 outline-none appearance-none cursor-pointer focus:border-primary"
            >
              <option value="all">📅 Masukkan Range Tanggal (Semua)</option>
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="30days">30 Hari Terakhir</option>
            </select>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          </div>

          {/* Filter 3: Profit & Sort Order */}
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

        {/* Action Controls & Filter Summary */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-xs">
          <span className="text-gray-500">
            Menampilkan <span className="font-bold text-gray-900">{filteredOrders.length}</span> dari {orders.length} pesanan
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={resetFilters}
              className="text-gray-500 hover:text-primary flex items-center gap-1 font-medium transition-colors"
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
              className="px-4 py-2 bg-primary text-white text-xs font-button rounded hover:bg-primary-hover transition-colors"
            >
              Reset Semua Filter
            </button>
          </div>
        ) : (
          filteredOrders.map(order => (
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
                    order.status === 'Menunggu Pembayaran' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    order.status === 'Sedang Diverifikasi' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    ['Diproses', 'Sedang Diproses'].includes(order.status) ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                    ['Dikirim', 'Dalam Pengiriman', 'Siap Pickup'].includes(order.status) ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                    order.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {order.status || 'Menunggu Pembayaran'}
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
                    {/* Quick Action Button contextually */}
                    {order.status === 'Menunggu Pembayaran' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'Diproses')}
                        className="w-full bg-[#16A34A] hover:bg-emerald-700 text-white text-[12px] font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 size={13} /> Verifikasi Bayar
                      </button>
                    )}

                    {['Diproses', 'Sedang Diproses', 'Pesanan Baru'].includes(order.status) && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'Dikirim')}
                        className="w-full bg-[#5c1616] hover:bg-[#400f0f] text-white text-[12px] font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Truck size={13} /> Proses & Kirim
                      </button>
                    )}

                    {['Dikirim', 'Dalam Pengiriman', 'Siap Pickup'].includes(order.status) && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'Selesai')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 size={13} /> Tandai Selesai
                      </button>
                    )}

                    {/* Manual Status Override Select */}
                    <div className="w-full">
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">
                        Ubah Status
                      </label>
                      <div className="relative">
                        <select
                          value={order.status || 'Menunggu Pembayaran'}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className="w-full appearance-none bg-white border border-gray-300 hover:border-primary text-gray-800 font-medium text-xs py-1.5 pl-2.5 pr-7 rounded-lg cursor-pointer outline-none transition-all focus:ring-1 focus:ring-primary focus:border-primary"
                        >
                          <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                          <option value="Sedang Diverifikasi">Sedang Diverifikasi</option>
                          <option value="Diproses">Diproses</option>
                          <option value="Siap Pickup">Siap Pickup</option>
                          <option value="Dikirim">Dikirim</option>
                          <option value="Dalam Pengiriman">Dalam Pengiriman</option>
                          <option value="Tiba di Tujuan">Tiba di Tujuan</option>
                          <option value="Selesai">Selesai</option>
                          <option value="Komplain">Komplain / Retur</option>
                          <option value="Pengiriman Gagal">Pengiriman Gagal</option>
                          <option value="Dibatalkan">Dibatalkan</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

