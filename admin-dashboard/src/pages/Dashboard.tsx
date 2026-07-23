import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  AlertTriangle, 
  ShoppingBag, 
  DollarSign, 
  Flame, 
  TrendingUp, 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Box
} from 'lucide-react';

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Period toggles
  const [revenuePeriod, setRevenuePeriod] = useState<'week' | 'month' | 'year'>('month');
  const [trendComparison, setTrendComparison] = useState<'7days' | '30days'>('7days');
  const [activeTrendTab, setActiveTrendTab] = useState<'orders' | 'items' | 'cancelled' | 'revenue'>('orders');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    const { data: productsData } = await supabase
      .from('products')
      .select('*');

    setOrders(ordersData || []);
    setProducts(productsData || []);
    setLoading(false);
  };

  // 1. Top Executive Stat Calculations
  const stats = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const todayStart = new Date().setHours(0, 0, 0, 0);

    // Status 1: Perlu Diproses (Pending or unfulfilled > 24h or newly placed)
    const urgentOrders = orders.filter(o => {
      const isPending = ['Menunggu Pembayaran', 'Sedang Diverifikasi', 'Perlu Diproses', 'Pesanan Baru'].includes(o.status);
      return isPending;
    });

    // Status 2: Pesanan Baru (Today's orders)
    const newOrders = orders.filter(o => {
      const orderTime = new Date(o.created_at).getTime();
      return orderTime >= todayStart || o.status === 'Pesanan Baru';
    });

    // Status 3: Komplain Pelanggan
    const complaintOrders = orders.filter(o => ['Komplain', 'Retur', 'Terkendala'].includes(o.status));

    // Status 4: Pengiriman Gagal
    const failedShipmentOrders = orders.filter(o => o.status === 'Pengiriman Gagal');

    // Revenue Summary (Filtered by week, month, year)
    let filteredRevenueOrders = orders.filter(o => o.status !== 'Dibatalkan');
    if (revenuePeriod === 'week') {
      filteredRevenueOrders = filteredRevenueOrders.filter(o => (now - new Date(o.created_at).getTime()) <= 7 * oneDay);
    } else if (revenuePeriod === 'month') {
      filteredRevenueOrders = filteredRevenueOrders.filter(o => (now - new Date(o.created_at).getTime()) <= 30 * oneDay);
    } else if (revenuePeriod === 'year') {
      filteredRevenueOrders = filteredRevenueOrders.filter(o => (now - new Date(o.created_at).getTime()) <= 365 * oneDay);
    }
    const totalRevenue = filteredRevenueOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Top 3 Selling Shoe Models
    const modelSalesCount: Record<string, { name: string; count: number; price: number; img: string }> = {};
    orders.forEach(o => {
      if (o.status === 'Dibatalkan') return;
      o.order_items?.forEach((item: any) => {
        const name = item.product_name || 'Sepatu Pantofel';
        if (!modelSalesCount[name]) {
          modelSalesCount[name] = { name, count: 0, price: item.price || 85000, img: item.product_image };
        }
        modelSalesCount[name].count += item.quantity || 1;
      });
    });
    const sortedModels = Object.values(modelSalesCount).sort((a, b) => b.count - a.count);
    const top3Selling = sortedModels.slice(0, 3);

    return {
      urgentCount: urgentOrders.length,
      newOrdersCount: newOrders.length,
      complaintCount: complaintOrders.length,
      failedShipmentCount: failedShipmentOrders.length,
      revenue: totalRevenue,
      top3Selling
    };
  }, [orders, revenuePeriod]);

  // 2. Trend Pembelian Calculations (Jakmall-style)
  const trendMetrics = useMemo(() => {
    const now = Date.now();
    const daysLimit = trendComparison === '7days' ? 7 : 30;
    const limitMs = daysLimit * 24 * 60 * 60 * 1000;

    const currentPeriodOrders = orders.filter(o => (now - new Date(o.created_at).getTime()) <= limitMs);
    const previousPeriodOrders = orders.filter(o => {
      const diff = now - new Date(o.created_at).getTime();
      return diff > limitMs && diff <= (limitMs * 2);
    });

    const totalOrdersCurr = currentPeriodOrders.length;
    const totalOrdersPrev = previousPeriodOrders.length;
    const ordersGrowth = totalOrdersPrev === 0 ? 100 : Math.round(((totalOrdersCurr - totalOrdersPrev) / totalOrdersPrev) * 100);

    const itemsCurr = currentPeriodOrders.reduce((s, o) => s + (o.order_items?.reduce((is: number, i: any) => is + (i.quantity || 1), 0) || 1), 0);
    const itemsPrev = previousPeriodOrders.reduce((s, o) => s + (o.order_items?.reduce((is: number, i: any) => is + (i.quantity || 1), 0) || 1), 0);
    const itemsGrowth = itemsPrev === 0 ? 100 : Math.round(((itemsCurr - itemsPrev) / itemsPrev) * 100);

    const cancelledCurr = currentPeriodOrders.filter(o => o.status === 'Dibatalkan').length;
    const cancelledPrev = previousPeriodOrders.filter(o => o.status === 'Dibatalkan').length;
    const cancelledGrowth = cancelledPrev === 0 ? 0 : Math.round(((cancelledCurr - cancelledPrev) / cancelledPrev) * 100);

    const revCurr = currentPeriodOrders.filter(o => o.status !== 'Dibatalkan').reduce((s, o) => s + (o.total_amount || 0), 0);
    const revPrev = previousPeriodOrders.filter(o => o.status !== 'Dibatalkan').reduce((s, o) => s + (o.total_amount || 0), 0);
    const revGrowth = revPrev === 0 ? 100 : Math.round(((revCurr - revPrev) / revPrev) * 100);

    return {
      orders: { count: totalOrdersCurr, growth: ordersGrowth },
      items: { count: itemsCurr, growth: itemsGrowth },
      cancelled: { count: cancelledCurr, growth: cancelledGrowth },
      revenue: { count: revCurr, growth: revGrowth }
    };
  }, [orders, trendComparison]);

  // Daily Chart Data Generator for Trend Pembelian
  const chartDailyData = useMemo(() => {
    const daysLimit = trendComparison === '7days' ? 7 : 14;
    const result = [];
    const now = new Date();

    for (let i = daysLimit - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = new Date(d.setHours(23, 59, 59, 999)).getTime();

      const dayOrders = orders.filter(o => {
        const t = new Date(o.created_at).getTime();
        return t >= dayStart && t <= dayEnd;
      });

      const orderCount = dayOrders.length;
      const itemsCount = dayOrders.reduce((s, o) => s + (o.order_items?.reduce((is: number, item: any) => is + (item.quantity || 1), 0) || 1), 0);
      const cancelledCount = dayOrders.filter(o => o.status === 'Dibatalkan').length;
      const revTotal = dayOrders.filter(o => o.status !== 'Dibatalkan').reduce((s, o) => s + (o.total_amount || 0), 0);

      result.push({
        date: dateStr,
        orders: orderCount,
        items: itemsCount,
        cancelled: cancelledCount,
        revenue: revTotal
      });
    }

    const maxVal = Math.max(...result.map(r => 
      activeTrendTab === 'orders' ? r.orders :
      activeTrendTab === 'items' ? r.items :
      activeTrendTab === 'cancelled' ? r.cancelled :
      r.revenue
    ), 1);

    return { data: result, maxVal };
  }, [orders, trendComparison, activeTrendTab]);

  if (loading) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto font-body pb-12">
      {/* Executive Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading tracking-tight flex items-center gap-2">
            Ringkasan Analitik Toko <Sparkles className="w-5 h-5 text-amber-500" />
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Pantau metrik omset, performa sepatu terlaris, dan status operasional toko Anda.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchDashboardData}
            className="px-3.5 py-1.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RefreshCw size={13} /> Refresh Data
          </button>
        </div>
      </div>

      {/* 🌟 BARIS 1: 60/40 HERO SECTION (Ringkasan Omset 60% + Top 3 Sepatu Terlaris 40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left (60%): Ringkasan Omset Hero Display */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <DollarSign size={16} className="text-amber-600" /> Ringkasan Omset Toko
              </span>
              <p className="text-[11px] text-gray-400 mt-0.5">Total pendapatan dari transaksi penjualan produk yang sah.</p>
            </div>
            
            {/* Periode Filter Dropdown / Buttons */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-medium text-gray-600">
              <button 
                onClick={() => setRevenuePeriod('week')}
                className={`px-3 py-1 rounded transition-all ${revenuePeriod === 'week' ? 'bg-white text-gray-900 font-medium shadow-xs' : 'hover:text-gray-900'}`}
              >
                Minggu
              </button>
              <button 
                onClick={() => setRevenuePeriod('month')}
                className={`px-3 py-1 rounded transition-all ${revenuePeriod === 'month' ? 'bg-white text-gray-900 font-medium shadow-xs' : 'hover:text-gray-900'}`}
              >
                Bulan
              </button>
              <button 
                onClick={() => setRevenuePeriod('year')}
                className={`px-3 py-1 rounded transition-all ${revenuePeriod === 'year' ? 'bg-white text-gray-900 font-medium shadow-xs' : 'hover:text-gray-900'}`}
              >
                Tahun
              </button>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-xs text-gray-400 font-normal">Total Pendapatan ({revenuePeriod === 'week' ? 'Minggu Ini' : revenuePeriod === 'month' ? 'Bulan Ini' : 'Tahun Ini'})</span>
            <div className="text-3xl font-bold text-primary font-body mt-1 tracking-tight">
              Rp {stats.revenue.toLocaleString('id-ID')}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Metrik omset diperbarui secara langsung</span>
            <span className="text-emerald-600 font-medium flex items-center gap-1">● Akurat</span>
          </div>
        </div>

        {/* Right (40%): Sepatu Terlaris (Top 3 List) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <Flame size={16} className="text-orange-500" /> Sepatu Terlaris (Top 3)
            </span>
            <a href="/products" className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1">
              Lihat Katalog <ChevronRight size={12} />
            </a>
          </div>

          <div className="space-y-2.5">
            {stats.top3Selling.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Belum ada data penjualan.</p>
            ) : (
              stats.top3Selling.map((shoe, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50/70 rounded-lg border border-gray-100">
                  <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-gray-200 text-gray-700' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="w-9 h-9 bg-white rounded border border-gray-200 overflow-hidden flex-shrink-0">
                    <img src={shoe.img} alt={shoe.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-xs truncate">{shoe.name}</p>
                    <p className="text-[11px] text-gray-500 font-body">Rp {shoe.price?.toLocaleString('id-ID')}</p>
                  </div>
                  <span className="text-xs font-medium text-gray-900 font-body bg-white px-2 py-1 rounded border border-gray-200">
                    {shoe.count} pasang
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 🔴 BARIS 2: 4 KARTU OPERASIONAL (Perlu Diproses, Pesanan Baru, Komplain Pelanggan, Pengiriman Gagal) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Perlu Diproses */}
        <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-sm hover:border-rose-300 transition-all">
          <div>
            <span className="text-xs font-medium text-rose-700 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Perlu Diproses
            </span>
            <div className="text-xl font-medium text-gray-900 font-body mt-2">
              {stats.urgentCount} <span className="text-xs font-normal text-gray-500">Pesanan</span>
            </div>
          </div>
          <a 
            href="/orders" 
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors"
          >
            Periksa Pesanan <ChevronRight size={13} />
          </a>
        </div>

        {/* Card 2: Pesanan Baru */}
        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm hover:border-emerald-300 transition-all">
          <div>
            <span className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
              <ShoppingBag size={14} /> Pesanan Baru
            </span>
            <div className="text-xl font-medium text-gray-900 font-body mt-2">
              {stats.newOrdersCount} <span className="text-xs font-normal text-gray-500">Transaksi Masuk</span>
            </div>
          </div>
          <a 
            href="/orders" 
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 transition-colors"
          >
            Proses Pesanan Baru <ChevronRight size={13} />
          </a>
        </div>

        {/* Card 3: Komplain Pelanggan */}
        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm hover:border-amber-300 transition-all">
          <div>
            <span className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
              <Clock size={14} /> Komplain Pelanggan
            </span>
            <div className="text-xl font-medium text-gray-900 font-body mt-2">
              {stats.complaintCount} <span className="text-xs font-normal text-gray-500">Klaim/Retur</span>
            </div>
          </div>
          <a 
            href="/orders" 
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
          >
            Tinjau Komplain <ChevronRight size={13} />
          </a>
        </div>

        {/* Card 4: Pengiriman Gagal */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 transition-all">
          <div>
            <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <Package size={14} className="text-gray-500" /> Pengiriman Gagal
            </span>
            <div className="text-xl font-medium text-gray-900 font-body mt-2">
              {stats.failedShipmentCount} <span className="text-xs font-normal text-gray-500">Paket Kendall</span>
            </div>
          </div>
          <a 
            href="/orders" 
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cek Resi Pengiriman <ChevronRight size={13} />
          </a>
        </div>
      </div>

      {/* 🔥 JAKMALL-STYLE: TREND PEMBELIAN SECTION */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-50 rounded-lg border border-rose-100 flex items-center justify-center text-rose-500">
              <Flame size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 font-heading">Trend Pembelian</h2>
              <p className="text-xs text-gray-500">Pantau pertumbuhan tren transaksi dan pembelian produk toko secara riil.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={trendComparison}
              onChange={(e) => setTrendComparison(e.target.value as any)}
              className="bg-gray-50 border border-gray-300 text-gray-700 text-xs font-medium py-1.5 px-3 rounded-lg outline-none cursor-pointer hover:border-gray-400"
            >
              <option value="7days">vs 7 Hari Terakhir</option>
              <option value="30days">vs 30 Hari Terakhir</option>
            </select>
          </div>
        </div>

        {/* 4 Jakmall Interactive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Pesanan */}
          <button
            onClick={() => setActiveTrendTab('orders')}
            className={`p-4 rounded-xl border text-left transition-all relative ${
              activeTrendTab === 'orders'
                ? 'bg-white border-primary shadow-md ring-1 ring-primary'
                : 'bg-gray-50/50 border-gray-200 hover:border-gray-300 hover:bg-white'
            }`}
          >
            <span className="text-xs text-gray-500 font-medium block">Pesanan</span>
            <div className="text-lg font-medium text-gray-900 font-body mt-1">
              {trendMetrics.orders.count}
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-1">
              <span className={`font-medium ${trendMetrics.orders.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trendMetrics.orders.growth >= 0 ? `+${trendMetrics.orders.growth}%` : `${trendMetrics.orders.growth}%`}
              </span>
              <span className="text-gray-400">vs {trendComparison === '7days' ? '7 Hari' : '30 Hari'}</span>
            </div>
            {activeTrendTab === 'orders' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-b-xl"></div>}
          </button>

          {/* 2. Produk Dibeli */}
          <button
            onClick={() => setActiveTrendTab('items')}
            className={`p-4 rounded-xl border text-left transition-all relative ${
              activeTrendTab === 'items'
                ? 'bg-white border-primary shadow-md ring-1 ring-primary'
                : 'bg-gray-50/50 border-gray-200 hover:border-gray-300 hover:bg-white'
            }`}
          >
            <span className="text-xs text-gray-500 font-medium block">Produk Dibeli</span>
            <div className="text-lg font-medium text-gray-900 font-body mt-1">
              {trendMetrics.items.count} <span className="text-xs font-normal text-gray-500">pcs</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-1">
              <span className={`font-medium ${trendMetrics.items.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trendMetrics.items.growth >= 0 ? `+${trendMetrics.items.growth}%` : `${trendMetrics.items.growth}%`}
              </span>
              <span className="text-gray-400">vs {trendComparison === '7days' ? '7 Hari' : '30 Hari'}</span>
            </div>
            {activeTrendTab === 'items' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-b-xl"></div>}
          </button>

          {/* 3. Pesanan Dibatalkan */}
          <button
            onClick={() => setActiveTrendTab('cancelled')}
            className={`p-4 rounded-xl border text-left transition-all relative ${
              activeTrendTab === 'cancelled'
                ? 'bg-white border-primary shadow-md ring-1 ring-primary'
                : 'bg-gray-50/50 border-gray-200 hover:border-gray-300 hover:bg-white'
            }`}
          >
            <span className="text-xs text-gray-500 font-medium block">Pesanan Dibatalkan</span>
            <div className="text-lg font-medium text-gray-900 font-body mt-1">
              {trendMetrics.cancelled.count}
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-1">
              <span className={`font-medium ${trendMetrics.cancelled.growth <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trendMetrics.cancelled.growth >= 0 ? `+${trendMetrics.cancelled.growth}%` : `${trendMetrics.cancelled.growth}%`}
              </span>
              <span className="text-gray-400">vs {trendComparison === '7days' ? '7 Hari' : '30 Hari'}</span>
            </div>
            {activeTrendTab === 'cancelled' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-b-xl"></div>}
          </button>

          {/* 4. Pembelian (Rupiah) */}
          <button
            onClick={() => setActiveTrendTab('revenue')}
            className={`p-4 rounded-xl border text-left transition-all relative ${
              activeTrendTab === 'revenue'
                ? 'bg-white border-primary shadow-md ring-1 ring-primary'
                : 'bg-gray-50/50 border-gray-200 hover:border-gray-300 hover:bg-white'
            }`}
          >
            <span className="text-xs text-gray-500 font-medium block">Pembelian (Nominal)</span>
            <div className="text-lg font-medium text-primary font-body mt-1">
              Rp {trendMetrics.revenue.count.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-1">
              <span className={`font-medium ${trendMetrics.revenue.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trendMetrics.revenue.growth >= 0 ? `+${trendMetrics.revenue.growth}%` : `${trendMetrics.revenue.growth}%`}
              </span>
              <span className="text-gray-400">vs {trendComparison === '7days' ? '7 Hari' : '30 Hari'}</span>
            </div>
            {activeTrendTab === 'revenue' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-b-xl"></div>}
          </button>
        </div>

        {/* Visual Daily Bar Chart Representation */}
        <div className="bg-gray-50/70 p-5 rounded-xl border border-gray-100 space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-gray-700">
              Grafik Harian: {
                activeTrendTab === 'orders' ? 'Jumlah Pesanan' :
                activeTrendTab === 'items' ? 'Jumlah Produk Dibeli' :
                activeTrendTab === 'cancelled' ? 'Pesanan Dibatalkan' : 'Nominal Pembelian (Rp)'
              }
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-gray-200">
            {chartDailyData.data.map((day, idx) => {
              const val = activeTrendTab === 'orders' ? day.orders :
                          activeTrendTab === 'items' ? day.items :
                          activeTrendTab === 'cancelled' ? day.cancelled : day.revenue;
              const heightPct = Math.max((val / chartDailyData.maxVal) * 100, 8);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  {/* Tooltip on hover */}
                  <span className="text-[10px] font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1.5 py-0.5 rounded border shadow-xs font-body">
                    {activeTrendTab === 'revenue' ? `Rp ${(val/1000).toFixed(0)}k` : val}
                  </span>
                  {/* Bar element */}
                  <div 
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[36px] rounded-t transition-all ${
                      activeTrendTab === 'cancelled' ? 'bg-rose-400 group-hover:bg-rose-600' : 'bg-primary group-hover:bg-primary-hover'
                    }`}
                  ></div>
                  {/* X-axis date label */}
                  <span className="text-[10px] text-gray-500 font-medium truncate w-full text-center">{day.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 📊 BARIS BAWAH: 2 Column Grid (Top Products + Store Status Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (60%): Top Product Performance */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-sm font-heading flex items-center gap-2">
              <Box size={16} className="text-primary" /> Top Performa Produk (Katalog)
            </h3>
            <a href="/products" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              Kelola Produk <ArrowUpRight size={13} />
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">Produk</th>
                  <th className="py-2.5 px-3">Harga</th>
                  <th className="py-2.5 px-3">Stok Sisa</th>
                  <th className="py-2.5 px-3 text-right">Terjual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.slice(0, 5).map(prod => {
                  const stk = prod.stock ?? 45;
                  return (
                    <tr key={prod.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 bg-gray-100 rounded border border-gray-200 overflow-hidden flex-shrink-0">
                            <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1">{prod.name}</p>
                            <span className="text-[10px] text-gray-400">{prod.category === 'Laced' ? 'Upper Tali' : 'Upper Non-Tali'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-normal text-gray-800 font-body">
                        Rp {prod.price?.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 font-body">
                        <span className={`text-xs font-medium ${stk === 0 ? 'text-rose-600' : stk < 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {stk} pcs
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-body font-medium text-gray-900">
                        {prod.sold || 0} pcs
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (40%): Jakmall-Style Store Status Summary Widget */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-sm font-heading flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" /> Ringkasan Kesehatan Toko
              </h3>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-600 font-medium">Tingkat Pesanan Sukses</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  96% Selesai
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-600 font-medium">Pembayaran Terverifikasi</span>
                <span className="font-bold text-gray-900 font-body">
                  {orders.filter(o => o.status === 'Selesai' || o.status === 'Diproses').length} Transaksi
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-600 font-medium">Pesanan Dalam Pengiriman</span>
                <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-body">
                  {orders.filter(o => ['Dikirim', 'Dalam Pengiriman', 'Siap Pickup'].includes(o.status)).length} Paket
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-gray-600 font-medium">Rasio Pembatalan</span>
                <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {orders.filter(o => o.status === 'Dibatalkan').length} Pesanan
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Sistem Operasional Ballqish</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">● Online Realtime</span>
          </div>
        </div>

      </div>
    </div>
  );
}

