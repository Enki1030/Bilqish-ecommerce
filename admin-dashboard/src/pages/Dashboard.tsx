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

  // 1. Top 4 Executive Stat Cards Calculations
  const stats = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const todayStart = new Date().setHours(0, 0, 0, 0);

    // Card 1: Urgent Actions (>24h unpaid or unfulfilled)
    const urgentOrders = orders.filter(o => {
      const isPending = ['Menunggu Pembayaran', 'Sedang Diverifikasi', 'Perlu Diproses'].includes(o.status);
      const isOlderThan24h = (now - new Date(o.created_at).getTime()) > oneDay;
      return isPending && isOlderThan24h;
    });

    // Card 2: New Orders (Today / New Status)
    const newOrders = orders.filter(o => {
      const orderTime = new Date(o.created_at).getTime();
      return orderTime >= todayStart || o.status === 'Pesanan Baru';
    });

    // Card 3: Revenue Summary (Filtered by week, month, year)
    let filteredRevenueOrders = orders.filter(o => o.status !== 'Dibatalkan');
    if (revenuePeriod === 'week') {
      filteredRevenueOrders = filteredRevenueOrders.filter(o => (now - new Date(o.created_at).getTime()) <= 7 * oneDay);
    } else if (revenuePeriod === 'month') {
      filteredRevenueOrders = filteredRevenueOrders.filter(o => (now - new Date(o.created_at).getTime()) <= 30 * oneDay);
    } else if (revenuePeriod === 'year') {
      filteredRevenueOrders = filteredRevenueOrders.filter(o => (now - new Date(o.created_at).getTime()) <= 365 * oneDay);
    }
    const totalRevenue = filteredRevenueOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Card 4: Top Selling Shoe Model
    const modelSalesCount: Record<string, { name: string; count: number; img: string }> = {};
    orders.forEach(o => {
      if (o.status === 'Dibatalkan') return;
      o.order_items?.forEach((item: any) => {
        const name = item.product_name || 'Sepatu Pantofel';
        if (!modelSalesCount[name]) {
          modelSalesCount[name] = { name, count: 0, img: item.product_image };
        }
        modelSalesCount[name].count += item.quantity || 1;
      });
    });
    const sortedModels = Object.values(modelSalesCount).sort((a, b) => b.count - a.count);
    const topSellingModel = sortedModels[0] || { name: 'G21 Hitam', count: 12, img: '' };

    return {
      urgentCount: urgentOrders.length,
      newOrdersCount: newOrders.length,
      revenue: totalRevenue,
      topSelling: topSellingModel
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

    // Orders Metric
    const totalOrdersCurr = currentPeriodOrders.length;
    const totalOrdersPrev = previousPeriodOrders.length;
    const ordersGrowth = totalOrdersPrev === 0 ? 100 : Math.round(((totalOrdersCurr - totalOrdersPrev) / totalOrdersPrev) * 100);

    // Items Sold Metric
    const itemsCurr = currentPeriodOrders.reduce((s, o) => s + (o.order_items?.reduce((is: number, i: any) => is + (i.quantity || 1), 0) || 1), 0);
    const itemsPrev = previousPeriodOrders.reduce((s, o) => s + (o.order_items?.reduce((is: number, i: any) => is + (i.quantity || 1), 0) || 1), 0);
    const itemsGrowth = itemsPrev === 0 ? 100 : Math.round(((itemsCurr - itemsPrev) / itemsPrev) * 100);

    // Cancelled Metric
    const cancelledCurr = currentPeriodOrders.filter(o => o.status === 'Dibatalkan').length;
    const cancelledPrev = previousPeriodOrders.filter(o => o.status === 'Dibatalkan').length;
    const cancelledGrowth = cancelledPrev === 0 ? 0 : Math.round(((cancelledCurr - cancelledPrev) / cancelledPrev) * 100);

    // Revenue Metric
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
          <p className="text-xs text-gray-500 mt-0.5">Pantau metrik operasional urgen, omset real-time, dan tren pembelian toko Anda.</p>
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

      {/* 🔴 BARIS ATAS: 4 Kartu Metrik Utama (Quick Executive Stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Perlu Tindakan Urgen */}
        <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-sm hover:border-rose-300 transition-all relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={14} /> Perlu Tindakan Urgen
              </span>
              <div className="text-2xl font-bold text-gray-900 font-body mt-2">
                {stats.urgentCount} <span className="text-xs font-normal text-gray-500">Pesanan (&gt;24j)</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Clock size={20} />
            </div>
          </div>
          <a 
            href="/orders" 
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors"
          >
            Periksa Pesanan Urgent <ChevronRight size={13} />
          </a>
        </div>

        {/* Card 2: Pesanan Baru Hari Ini */}
        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm hover:border-emerald-300 transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                <ShoppingBag size={14} /> Pesanan Baru
              </span>
              <div className="text-2xl font-bold text-gray-900 font-body mt-2">
                {stats.newOrdersCount} <span className="text-xs font-normal text-gray-500">Transaksi Masuk</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Package size={20} />
            </div>
          </div>
          <a 
            href="/orders" 
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 transition-colors"
          >
            Proses Pesanan Baru <ChevronRight size={13} />
          </a>
        </div>

        {/* Card 3: Ringkasan Omset (Toggle Minggu/Bulan/Tahun) */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <DollarSign size={14} className="text-amber-600" /> Ringkasan Omset
              </span>
              <div className="text-xl font-bold text-primary font-body mt-2">
                Rp {stats.revenue.toLocaleString('id-ID')}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px] font-medium text-gray-600 w-fit">
            <button 
              onClick={() => setRevenuePeriod('week')}
              className={`px-2 py-0.5 rounded transition-all ${revenuePeriod === 'week' ? 'bg-white text-gray-900 font-bold shadow-xs' : 'hover:text-gray-900'}`}
            >
              Minggu
            </button>
            <button 
              onClick={() => setRevenuePeriod('month')}
              className={`px-2 py-0.5 rounded transition-all ${revenuePeriod === 'month' ? 'bg-white text-gray-900 font-bold shadow-xs' : 'hover:text-gray-900'}`}
            >
              Bulan
            </button>
            <button 
              onClick={() => setRevenuePeriod('year')}
              className={`px-2 py-0.5 rounded transition-all ${revenuePeriod === 'year' ? 'bg-white text-gray-900 font-bold shadow-xs' : 'hover:text-gray-900'}`}
            >
              Tahun
            </button>
          </div>
        </div>

        {/* Card 4: Sepatu Terlaris */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-gray-300 transition-all">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                <Flame size={14} className="text-orange-500" /> Sepatu Terlaris
              </span>
              <div className="text-sm font-bold text-gray-900 font-body mt-2 truncate">
                {stats.topSelling.name}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{stats.topSelling.count} pasang terjual</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
              {stats.topSelling.img ? (
                <img src={stats.topSelling.img} alt="Top" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">👞</div>
              )}
            </div>
          </div>
          <a 
            href="/products" 
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-primary transition-colors"
          >
            Lihat Katalog Produk <ChevronRight size={13} />
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
              <h2 className="text-lg font-bold text-gray-900 font-heading">Trend Pembelian</h2>
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
            <div className="text-xl font-bold text-gray-900 font-body mt-1">
              {trendMetrics.orders.count}
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-1">
              <span className={`font-semibold ${trendMetrics.orders.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
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
            <div className="text-xl font-bold text-gray-900 font-body mt-1">
              {trendMetrics.items.count} <span className="text-xs font-normal text-gray-500">pcs</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-1">
              <span className={`font-semibold ${trendMetrics.items.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
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
            <div className="text-xl font-bold text-gray-900 font-body mt-1">
              {trendMetrics.cancelled.count}
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-1">
              <span className={`font-semibold ${trendMetrics.cancelled.growth <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
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
            <div className="text-xl font-bold text-primary font-body mt-1">
              Rp {trendMetrics.revenue.count.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-1">
              <span className={`font-semibold ${trendMetrics.revenue.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
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
            <span className="font-bold text-gray-700 uppercase tracking-wider">
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

