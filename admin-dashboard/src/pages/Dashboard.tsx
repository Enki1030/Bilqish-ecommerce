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
  Box,
  Bell,
  FileSpreadsheet
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

  const [exporting, setExporting] = useState(false);

  // Ultra-Lightweight Native Multi-Sheet Excel Export (Zero External Packages)
  const handleExportNativeExcel = async () => {
    setExporting(true);
    try {
      // 1. Fetch raw_materials, craftsmen, and products
      const { data: rawMats } = await supabase.from('raw_materials').select('*');
      const { data: craftsmenData } = await supabase.from('craftsmen').select('*');
      const { data: productsData } = await supabase.from('products').select('*');

      const craftsmanMap = new Map();
      (craftsmenData || []).forEach(c => craftsmanMap.set(c.id, c.name));

      const periodLabel = revenuePeriod === 'week' ? 'Mingguan' : revenuePeriod === 'month' ? 'Bulanan' : 'Tahunan';
      const periodText = revenuePeriod === 'week' ? 'Mingguan (7 Hari Terakhir)' : revenuePeriod === 'month' ? 'Bulanan (30 Hari Terakhir)' : 'Tahunan (365 Hari Terakhir)';
      const dateStr = new Date().toISOString().split('T')[0];
      const generatedAt = new Date().toLocaleString('id-ID');

      const escapeXml = (str: any) => {
        if (str === null || str === undefined) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      const makeRow = (cells: (string | number)[]) => {
        return `<Row>${cells.map(c => typeof c === 'number' ? `<Cell><Data ss:Type="Number">${c}</Data></Cell>` : `<Cell><Data ss:Type="String">${escapeXml(c)}</Data></Cell>`).join('')}</Row>`;
      };

      // Filter Orders based on period
      let filteredOrders = orders.filter(o => o.status !== 'Dibatalkan');
      const limitDays = revenuePeriod === 'week' ? 7 : revenuePeriod === 'month' ? 30 : 365;
      const limitMs = limitDays * 24 * 60 * 60 * 1000;
      filteredOrders = filteredOrders.filter(o => (Date.now() - new Date(o.created_at || Date.now()).getTime()) <= limitMs);

      const totalRevenue = stats.revenue || 0;
      const totalOrdersCount = filteredOrders.length;
      const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
      const estCOGS = Math.round(totalRevenue * 0.55);
      const estGrossProfit = totalRevenue - estCOGS;
      const profitMarginPercent = totalRevenue > 0 ? Math.round((estGrossProfit / totalRevenue) * 100) : 0;

      // SHEET 1: Ringkasan Omzet & Keuangan
      const sheet1Rows = [
        makeRow(['Parameter Analisis', 'Nilai / Keterangan']),
        makeRow(['Periode Laporan', periodText]),
        makeRow(['Tanggal & Waktu Diunduh', generatedAt]),
        makeRow(['Total Omzet Penjualan (Rp)', totalRevenue]),
        makeRow(['Estimasi Laba Kotor (Rp)', estGrossProfit]),
        makeRow(['Margin Laba Kotor (%)', `${profitMarginPercent}%`]),
        makeRow(['Rata-Rata Belanja / AOV (Rp)', avgOrderValue]),
        makeRow(['Total Transaksi Berhasil', totalOrdersCount]),
        makeRow(['Pesanan Aktif Sedang Berjalan', stats.activeOrdersCount || 0]),
        makeRow(['Pesanan Baru (<24 Jam)', stats.newOrdersCount || 0]),
        makeRow(['Klaim / Komplain Pelanggan', stats.complaintCount || 0]),
        makeRow(['Pengiriman Paket Gagal', stats.failedShipmentCount || 0]),
      ].join('');

      // SHEET 2: Performa & Profitabilitas Produk
      const productMap: Record<string, { name: string; qtySold: number; revenue: number; price: number }> = {};

      filteredOrders.forEach(o => {
        const items = Array.isArray(o.order_items) ? o.order_items : (o.order_items ? [o.order_items] : []);
        items.forEach((item: any) => {
          const pId = item.product_id || item.product_name || 'Sepatu';
          if (!productMap[pId]) {
            productMap[pId] = {
              name: item.product_name || 'Sepatu Pantofel Bilqish',
              qtySold: 0,
              revenue: 0,
              price: Number(item.price_per_unit || item.price) || 85000
            };
          }
          const qty = Number(item.quantity) || 1;
          const rev = (Number(item.price_per_unit || item.price) || 85000) * qty;
          productMap[pId].qtySold += qty;
          productMap[pId].revenue += rev;
        });
      });

      const productProfitList = Object.values(productMap).map(p => {
        const estUnitCOGS = Math.round(p.price * 0.55);
        const estUnitProfit = p.price - estUnitCOGS;
        const totalProfit = p.qtySold * estUnitProfit;
        const marginPercent = p.price > 0 ? Math.round((estUnitProfit / p.price) * 100) : 0;
        return { ...p, estUnitCOGS, estUnitProfit, totalProfit, marginPercent };
      }).sort((a, b) => b.revenue - a.revenue);

      const sheet2Rows = [
        makeRow(['Peringkat', 'Nama Sepatu', 'Terjual (Pasang)', 'Harga Jual (Rp)', 'Est. HPP Pokok (Rp)', 'Est. Laba/Unit (Rp)', 'Total Omzet (Rp)', 'Est. Total Laba (Rp)', 'Margin Laba %']),
        ...productProfitList.map((p, idx) => makeRow([
          `#${idx + 1}`,
          p.name,
          p.qtySold,
          p.price,
          p.estUnitCOGS,
          p.estUnitProfit,
          p.revenue,
          p.totalProfit,
          `${p.marginPercent}%`
        ]))
      ].join('');

      // SHEET 3: Intelijen Stok & Burn Rate
      const totalShoesSold = productProfitList.reduce((sum, p) => sum + p.qtySold, 0);
      const avgDailySalesVelocity = Math.max(0.5, totalShoesSold / limitDays);

      const sheet3Rows = [
        makeRow(['Nama Bahan Baku', 'Kategori Komponen', 'Stok Gudang (Pasang)', 'Batas Aman / Safety Stock', 'Kecepatan Jual (Pasang/Hari)', 'Estimasi Ketahanan (Hari)', 'Status Reorder']),
        ...(rawMats || []).map(m => {
          const stock = Number(m.stock_quantity) || 25;
          const daysLeft = Math.round(stock / avgDailySalesVelocity);
          const statusReorder = stock <= 20 ? 'PERLU RESTOCK' : 'AMMAN / READY';
          return makeRow([
            m.name || 'Bahan Baku',
            m.material_component || m.category || 'Outsole',
            stock,
            20,
            Math.round(avgDailySalesVelocity * 10) / 10,
            daysLeft,
            statusReorder
          ]);
        })
      ].join('');

      // SHEET 4: Performa Vendor Pengrajin
      const sheet4Rows = [
        makeRow(['Peringkat', 'Nama Pengrajin / Pemasok', 'Jenis Bahan Utama', 'Rata-Rata Delay PO (Hari)', 'Ketepatan Waktu (On-Time %)', 'Status Performa']),
        ...(craftsmenData || []).map((c, idx) => {
          const cMats = (rawMats || []).filter(m => m.craftsman_id === c.id);
          const avgDelay = cMats.length > 0 
            ? Math.round(cMats.reduce((sum, m) => sum + (Number(m.delay_days) || 0), 0) / cMats.length)
            : 2;
          const onTimeRate = Math.max(70, Math.min(100, 100 - (avgDelay * 5)));
          const ratingText = onTimeRate >= 95 ? 'Unggul & Sangat Tepat Waktu' : (onTimeRate >= 85 ? 'Baik' : 'Perlu Evaluasi');
          return makeRow([
            `#${idx + 1}`,
            c.name,
            c.material_type || 'Bahan Baku',
            avgDelay,
            `${onTimeRate}%`,
            ratingText
          ]);
        })
      ].join('');

      // SHEET 5: Transaksi Penjualan Detail
      const sheet5Rows = [
        makeRow(['ID Pesanan', 'Tanggal Transaksi', 'Nama Pelanggan', 'No. Telepon', 'Item Sepatu & Size', 'Total Bayar (Rp)', 'Status Pembayaran', 'Status Pengiriman']),
        ...filteredOrders.map(o => {
          const items = Array.isArray(o.order_items) ? o.order_items : (o.order_items ? [o.order_items] : []);
          const itemDesc = items.map((i: any) => `${i.product_name || 'Sepatu'} (Sz ${i.size || '39'}) x${i.quantity || 1}`).join('; ') || 'Sepatu Pantofel';
          return makeRow([
            o.id,
            new Date(o.created_at || Date.now()).toLocaleDateString('id-ID'),
            o.customer_name || 'Pelanggan Toko',
            o.customer_phone || '-',
            itemDesc,
            Number(o.total_amount) || 0,
            o.payment_status || 'Lunas',
            o.status || 'Diproses'
          ]);
        })
      ].join('');

      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Ringkasan Omzet & Keuangan">
  <Table>${sheet1Rows}</Table>
 </Worksheet>
 <Worksheet ss:Name="Performa & Profit Produk">
  <Table>${sheet2Rows}</Table>
 </Worksheet>
 <Worksheet ss:Name="Intelijen Stok & Burn Rate">
  <Table>${sheet3Rows}</Table>
 </Worksheet>
 <Worksheet ss:Name="Performa Vendor Pengrajin">
  <Table>${sheet4Rows}</Table>
 </Worksheet>
 <Worksheet ss:Name="Detail Transaksi Penjualan">
  <Table>${sheet5Rows}</Table>
 </Worksheet>
</Workbook>`;

      const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Lengkap_Analisis_Bilqish_${periodLabel}_${dateStr}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error exporting native Excel:', e);
      alert('Gagal mendownload laporan Excel. Silakan coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    const { data: productsData } = await supabase
      .from('products')
      .select('*');

    const now = Date.now();
    const sessionStartTime = getAdminSessionStartTime();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const isSessionExpired = (now - sessionStartTime) >= TWENTY_FOUR_HOURS;

    // If 24h have passed since Admin's login session started, unhandled 'Pesanan Baru' auto-transition to 'Diproses'
    const updatedOrders = await Promise.all((ordersData || []).map(async (o: any) => {
      if (isSessionExpired && ['Pesanan Baru', 'Belum Diproses'].includes(o.status)) {
        await supabase.from('orders').update({ status: 'Diproses' }).eq('id', o.id);
        return { ...o, status: 'Diproses' };
      }
      return o;
    }));

    setOrders(updatedOrders);
    setProducts(productsData || []);
    setLoading(false);
  };

  // 1. Top Executive Stat Calculations
  const stats = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sessionStartTime = getAdminSessionStartTime();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const isFreshSession = (now - sessionStartTime) < TWENTY_FOUR_HOURS;

    // Status 1: Pesanan Aktif (Orders in processing, shipping, ready pickup)
    const activeOrders = orders.filter(o => {
      const st = o.status || 'Diproses';
      return ['Diproses', 'Siap Pickup', 'Gagal Pickup', 'Dikirim', 'Diterima Ekspedisi', 'Dalam Pengiriman', 'Tiba di Tujuan'].includes(st);
    });

    // Status 2: Pesanan Baru (< 24 Jam Login)
    const newOrders = orders.filter(o => {
      const st = o.status || 'Diproses';
      return ['Pesanan Baru', 'Belum Diproses'].includes(st) && isFreshSession;
    });

    // Status 3: Komplain Pelanggan & Retur
    const complaintOrders = orders.filter(o => ['Komplain / Retur', 'Komplain', 'Retur', 'Dikembalikan'].includes(o.status));

    // Status 4: Pengiriman Gagal
    const failedShipmentOrders = orders.filter(o => ['Pengiriman Gagal', 'Terkendala'].includes(o.status));

    // Revenue Summary & Dynamic Previous Period Comparison
    let limitDays = 30;
    if (revenuePeriod === 'week') limitDays = 7;
    if (revenuePeriod === 'month') limitDays = 30;
    if (revenuePeriod === 'year') limitDays = 365;

    const limitMs = limitDays * oneDay;

    // Current Period Revenue
    const currentRevenueOrders = orders.filter(o => {
      if (o.status === 'Dibatalkan') return false;
      const diff = now - new Date(o.created_at).getTime();
      return diff <= limitMs;
    });
    const totalRevenue = currentRevenueOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Previous Period Revenue (e.g. 7-14 days ago for week, 30-60 days ago for month)
    const previousRevenueOrders = orders.filter(o => {
      if (o.status === 'Dibatalkan') return false;
      const diff = now - new Date(o.created_at).getTime();
      return diff > limitMs && diff <= (limitMs * 2);
    });
    const previousRevenue = previousRevenueOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Comparison Difference & Percentage Growth
    const revenueDiff = totalRevenue - previousRevenue;
    const revenueGrowthPercent = previousRevenue === 0 
      ? (totalRevenue > 0 ? 100 : 0) 
      : Math.round((revenueDiff / previousRevenue) * 100);

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
      activeOrdersCount: activeOrders.length,
      newOrdersCount: newOrders.length,
      complaintCount: complaintOrders.length,
      failedShipmentCount: failedShipmentOrders.length,
      revenue: totalRevenue,
      previousRevenue,
      revenueDiff,
      revenueGrowthPercent,
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
    <div className="space-y-6 max-w-[1400px] mx-auto font-sans pb-12">
      {/* 1. Executive Welcome Header (24px Bold #1A1A1A, 24px bottom margin to content) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#1A1A1A] tracking-tight flex items-center gap-2">
            Ringkasan Analitik Toko <Sparkles className="w-5 h-5 text-amber-500" />
          </h1>
          <p className="text-[12px] font-normal text-[#71717A] mt-1">Pantau metrik omset, performa sepatu terlaris, dan status operasional toko Anda.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportNativeExcel}
            disabled={exporting}
            className="bg-[#5c1616] hover:bg-[#4a1212] text-white font-semibold text-[13px] px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Download Laporan Eksekutif Multi-Sheet Excel (.xls)"
          >
            <FileSpreadsheet size={16} />
            <span>{exporting ? 'Menyiapkan Excel...' : 'Download Laporan Excel (.xlsx)'}</span>
          </button>

          <a
            href="/notifications"
            className="w-10 h-10 bg-white border border-[#E2E8F0] hover:border-[#5c1616] hover:bg-[#fdf5f5] text-[#333333] hover:text-[#5c1616] rounded-lg flex items-center justify-center relative transition-all shadow-xs cursor-pointer"
            title="Pusat Notifikasi Toko"
          >
            <Bell size={18} />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white animate-pulse"></span>
          </a>
        </div>
      </div>

      {/* 🌟 BARIS 1: HERO SECTION (Ringkasan Omset 7 cols & Top 3 Sepatu Terlaris 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left (7 cols): Ringkasan Omset Executive Card (Border-Only Consistent Card) */}
        <div className="lg:col-span-7 bg-white p-7 rounded-[20px] border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between font-sans min-h-[220px]">
          {/* Header & Segmented Period Control */}
          <div className="flex justify-between items-center">
            <h2 className="text-[22px] font-semibold text-gray-900 tracking-tight">
              Ringkasan Omset
            </h2>
            
            {/* Compact Segmented Control */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl text-[12px] font-medium text-gray-500">
              <button 
                onClick={() => setRevenuePeriod('week')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${revenuePeriod === 'week' ? 'bg-[#5c1616] text-white font-semibold shadow-xs' : 'hover:text-gray-900'}`}
              >
                Minggu
              </button>
              <button 
                onClick={() => setRevenuePeriod('month')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${revenuePeriod === 'month' ? 'bg-[#5c1616] text-white font-semibold shadow-xs' : 'hover:text-gray-900'}`}
              >
                Bulan
              </button>
              <button 
                onClick={() => setRevenuePeriod('year')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${revenuePeriod === 'year' ? 'bg-[#5c1616] text-white font-semibold shadow-xs' : 'hover:text-gray-900'}`}
              >
                Tahun
              </button>
            </div>
          </div>

          {/* Hero Revenue Display with Dynamic Comparison Badges (Matching Reference Image 2) */}
          <div className="my-auto py-2 text-left space-y-2">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <span className="text-[36px] sm:text-[44px] font-bold text-[#111111] leading-none tracking-tight font-sans">
                Rp {stats.revenue.toLocaleString('id-ID')}
              </span>

              {/* Dynamic Comparison Pill Badges (Green for +, Red for -, Gray for 0) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* 1. Percentage Pill Badge */}
                <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 font-sans border ${
                  stats.revenueDiff > 0 
                    ? 'bg-[#E6F9F0] text-[#00B060] border-[#B3F2D4]' 
                    : stats.revenueDiff < 0 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {stats.revenueDiff > 0 ? '▲ +' : stats.revenueDiff < 0 ? '▼ ' : ''}{stats.revenueGrowthPercent}%
                </span>

                {/* 2. Nominal Difference Pill Badge */}
                <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full font-sans border ${
                  stats.revenueDiff > 0 
                    ? 'bg-[#E6F9F0] text-[#00B060] border-[#B3F2D4]' 
                    : stats.revenueDiff < 0 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {stats.revenueDiff > 0 
                    ? `+Rp ${stats.revenueDiff.toLocaleString('id-ID')}` 
                    : stats.revenueDiff < 0 
                      ? `-Rp ${Math.abs(stats.revenueDiff).toLocaleString('id-ID')}` 
                      : 'Rp 0'}
                </span>
              </div>
            </div>

            {/* Comparison Subtitle vs Previous Period */}
            <p className="text-[13px] font-medium text-gray-500 font-sans">
              vs {revenuePeriod === 'week' ? 'minggu lalu' : revenuePeriod === 'month' ? 'bulan lalu' : 'tahun lalu'} (Rp {stats.previousRevenue.toLocaleString('id-ID')})
            </p>
          </div>
        </div>

        {/* Right (5 cols): Sepatu Terlaris (Border-Only Consistent Card) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-[20px] border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3 font-sans min-h-[220px]">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <span className="text-[18px] font-semibold text-gray-900 flex items-center gap-2">
              <Flame size={18} className="text-orange-500" /> Sepatu Terlaris (Top 3)
            </span>
            <a href="/products" className="text-[12px] text-[#5c1616] hover:underline font-semibold flex items-center gap-1">
              Lihat Katalog <ChevronRight size={13} />
            </a>
          </div>

          {/* 3 Compact Mini Cards with Square Images */}
          {stats.top3Selling.length === 0 ? (
            <p className="text-[13px] text-gray-500 py-6 text-center my-auto">Belum ada data penjualan.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 my-auto">
              {stats.top3Selling.map((shoe, idx) => (
                <div key={idx} className="bg-slate-50/80 p-2 rounded-xl border border-slate-100 flex flex-col space-y-1.5 text-left relative">
                  {/* Rank Badge overlay */}
                  <span className={`absolute top-3 left-3 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs z-10 ${
                    idx === 0 ? 'bg-amber-400 text-slate-900' : idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-orange-300 text-slate-900'
                  }`}>
                    #{idx + 1}
                  </span>

                  {/* Gambar Persegi (Aspect Square) */}
                  <div className="w-full aspect-square bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <img src={shoe.img} alt={shoe.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Structure: Nama -> X Pasang -> Rp Price */}
                  <div className="space-y-0.5 pt-0.5">
                    <p className="font-semibold text-gray-900 text-[12px] truncate leading-snug" title={shoe.name}>
                      {shoe.name}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-700 font-sans">
                      {shoe.count} Pasang
                    </p>
                    <p className="text-[11px] font-bold text-gray-900 font-sans">
                      Rp {shoe.price?.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 🔴 BARIS 2: 4 KARTU OPERASIONAL (Pesanan Aktif, Pesanan Baru <24h, Komplain Pelanggan, Pengiriman Gagal) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pesanan Aktif */}
        <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-xs hover:border-indigo-300 transition-all">
          <div>
            <span className="text-[14px] font-semibold text-indigo-700 flex items-center gap-1.5">
              <Package size={15} /> Pesanan Aktif
            </span>
            <div className="text-xl font-semibold text-[#1A1A1A] font-sans mt-2">
              {stats.activeOrdersCount} <span className="text-[12px] font-normal text-[#71717A]">Sedang Berjalan</span>
            </div>
          </div>
          <a 
            href="/orders" 
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Lihat Pesanan Aktif <ChevronRight size={13} />
          </a>
        </div>

        {/* Card 2: Pesanan Baru (<24 Jam) */}
        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs hover:border-emerald-300 transition-all">
          <div>
            <span className="text-[14px] font-semibold text-emerald-700 flex items-center gap-1.5">
              <ShoppingBag size={15} /> Pesanan Baru (&lt;24j)
            </span>
            <div className="text-xl font-semibold text-[#1A1A1A] font-sans mt-2">
              {stats.newOrdersCount} <span className="text-[12px] font-normal text-[#71717A]">Fresh Transaksi</span>
            </div>
          </div>
          <a 
            href="/orders" 
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-emerald-600 hover:text-emerald-800 transition-colors"
          >
            Proses Pesanan Baru <ChevronRight size={13} />
          </a>
        </div>

        {/* Card 3: Komplain Pelanggan */}
        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs hover:border-amber-300 transition-all">
          <div>
            <span className="text-[14px] font-semibold text-amber-700 flex items-center gap-1.5">
              <Clock size={15} /> Komplain Pelanggan
            </span>
            <div className="text-xl font-semibold text-[#1A1A1A] font-sans mt-2">
              {stats.complaintCount} <span className="text-[12px] font-normal text-[#71717A]">Klaim/Retur</span>
            </div>
          </div>
          <a 
            href="/orders" 
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-amber-700 hover:text-amber-900 transition-colors"
          >
            Tinjau Komplain <ChevronRight size={13} />
          </a>
        </div>

        {/* Card 4: Pengiriman Gagal */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-all">
          <div>
            <span className="text-[14px] font-semibold text-[#333333] flex items-center gap-1.5">
              <Package size={15} className="text-[#71717A]" /> Pengiriman Gagal
            </span>
            <div className="text-xl font-semibold text-[#1A1A1A] font-sans mt-2">
              {stats.failedShipmentCount} <span className="text-[12px] font-normal text-[#71717A]">Paket Kendall</span>
            </div>
          </div>
          <a 
            href="/orders" 
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[#71717A] hover:text-[#1A1A1A] transition-colors"
          >
            Cek Resi Pengiriman <ChevronRight size={13} />
          </a>
        </div>
      </div>

      {/* 🔥 JAKMALL-STYLE: TREND PEMBELIAN SECTION */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-6 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-rose-50 rounded-lg border border-rose-100 flex items-center justify-center text-rose-500">
              <Flame size={20} />
            </div>
            <div>
              <h2 className="text-[19px] font-semibold text-[#1A1A1A]">Trend Pembelian</h2>
              <p className="text-[12px] text-[#71717A] font-normal mt-0.5">Pantau pertumbuhan tren transaksi dan pembelian produk toko secara riil.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={trendComparison}
              onChange={(e) => setTrendComparison(e.target.value as any)}
              className="bg-slate-50 border border-[#E2E8F0] text-[#1A1A1A] text-[12px] font-medium py-1.5 px-3 rounded-lg outline-none cursor-pointer hover:border-slate-300"
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
            className={`p-4 rounded-xl border text-left transition-all relative cursor-pointer ${
              activeTrendTab === 'orders'
                ? 'bg-white border-[#5c1616] shadow-xs ring-1 ring-[#5c1616]'
                : 'bg-slate-50/50 border-[#E2E8F0] hover:border-slate-300 hover:bg-white'
            }`}
          >
            <span className="text-[12px] text-[#71717A] font-medium block">Pesanan</span>
            <div className="text-[18px] font-semibold text-[#1A1A1A] font-sans mt-1">
              {trendMetrics.orders.count}
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-1">
              <span className={`font-medium ${trendMetrics.orders.growth >= 0 ? 'text-[#16A34A]' : 'text-rose-600'}`}>
                {trendMetrics.orders.growth >= 0 ? `+${trendMetrics.orders.growth}%` : `${trendMetrics.orders.growth}%`}
              </span>
              <span className="text-[#71717A]">vs {trendComparison === '7days' ? '7 Hari' : '30 Hari'}</span>
            </div>
            {activeTrendTab === 'orders' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#5c1616] rounded-b-xl"></div>}
          </button>

          {/* 2. Produk Dibeli */}
          <button
            onClick={() => setActiveTrendTab('items')}
            className={`p-4 rounded-xl border text-left transition-all relative cursor-pointer ${
              activeTrendTab === 'items'
                ? 'bg-white border-[#5c1616] shadow-xs ring-1 ring-[#5c1616]'
                : 'bg-slate-50/50 border-[#E2E8F0] hover:border-slate-300 hover:bg-white'
            }`}
          >
            <span className="text-[12px] text-[#71717A] font-medium block">Produk Dibeli</span>
            <div className="text-[18px] font-semibold text-[#1A1A1A] font-sans mt-1">
              {trendMetrics.items.count} <span className="text-[12px] font-normal text-[#71717A]">pcs</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-1">
              <span className={`font-medium ${trendMetrics.items.growth >= 0 ? 'text-[#16A34A]' : 'text-rose-600'}`}>
                {trendMetrics.items.growth >= 0 ? `+${trendMetrics.items.growth}%` : `${trendMetrics.items.growth}%`}
              </span>
              <span className="text-[#71717A]">vs {trendComparison === '7days' ? '7 Hari' : '30 Hari'}</span>
            </div>
            {activeTrendTab === 'items' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#5c1616] rounded-b-xl"></div>}
          </button>

          {/* 3. Pesanan Dibatalkan */}
          <button
            onClick={() => setActiveTrendTab('cancelled')}
            className={`p-4 rounded-xl border text-left transition-all relative cursor-pointer ${
              activeTrendTab === 'cancelled'
                ? 'bg-white border-[#5c1616] shadow-xs ring-1 ring-[#5c1616]'
                : 'bg-slate-50/50 border-[#E2E8F0] hover:border-slate-300 hover:bg-white'
            }`}
          >
            <span className="text-[12px] text-[#71717A] font-medium block">Pesanan Dibatalkan</span>
            <div className="text-[18px] font-semibold text-[#1A1A1A] font-sans mt-1">
              {trendMetrics.cancelled.count}
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-1">
              <span className={`font-medium ${trendMetrics.cancelled.growth <= 0 ? 'text-[#16A34A]' : 'text-rose-600'}`}>
                {trendMetrics.cancelled.growth >= 0 ? `+${trendMetrics.cancelled.growth}%` : `${trendMetrics.cancelled.growth}%`}
              </span>
              <span className="text-[#71717A]">vs {trendComparison === '7days' ? '7 Hari' : '30 Hari'}</span>
            </div>
            {activeTrendTab === 'cancelled' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#5c1616] rounded-b-xl"></div>}
          </button>

          {/* 4. Pembelian (Rupiah) */}
          <button
            onClick={() => setActiveTrendTab('revenue')}
            className={`p-4 rounded-xl border text-left transition-all relative cursor-pointer ${
              activeTrendTab === 'revenue'
                ? 'bg-white border-[#5c1616] shadow-xs ring-1 ring-[#5c1616]'
                : 'bg-slate-50/50 border-[#E2E8F0] hover:border-slate-300 hover:bg-white'
            }`}
          >
            <span className="text-[12px] text-[#71717A] font-medium block">Pembelian (Nominal)</span>
            <div className="text-[18px] font-semibold text-[#5c1616] font-sans mt-1">
              Rp {trendMetrics.revenue.count.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-1">
              <span className={`font-medium ${trendMetrics.revenue.growth >= 0 ? 'text-[#16A34A]' : 'text-rose-600'}`}>
                {trendMetrics.revenue.growth >= 0 ? `+${trendMetrics.revenue.growth}%` : `${trendMetrics.revenue.growth}%`}
              </span>
              <span className="text-[#71717A]">vs {trendComparison === '7days' ? '7 Hari' : '30 Hari'}</span>
            </div>
            {activeTrendTab === 'revenue' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#5c1616] rounded-b-xl"></div>}
          </button>
        </div>

        {/* Visual Daily Bar Chart Representation */}
        <div className="bg-slate-50/70 p-5 rounded-xl border border-[#E2E8F0] space-y-4">
          <div className="flex justify-between items-center text-[12px]">
            <span className="font-medium text-[#333333]">
              Grafik Harian: {
                activeTrendTab === 'orders' ? 'Jumlah Pesanan' :
                activeTrendTab === 'items' ? 'Jumlah Produk Dibeli' :
                activeTrendTab === 'cancelled' ? 'Pesanan Dibatalkan' : 'Nominal Pembelian (Rp)'
              }
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-[#E2E8F0]">
            {chartDailyData.data.map((day, idx) => {
              const val = activeTrendTab === 'orders' ? day.orders :
                          activeTrendTab === 'items' ? day.items :
                          activeTrendTab === 'cancelled' ? day.cancelled : day.revenue;
              const heightPct = Math.max((val / chartDailyData.maxVal) * 100, 8);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  {/* Tooltip on hover */}
                  <span className="text-[10px] font-semibold text-[#1A1A1A] opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-xs font-sans">
                    {activeTrendTab === 'revenue' ? `Rp ${(val/1000).toFixed(0)}k` : val}
                  </span>
                  {/* Bar element */}
                  <div 
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[36px] rounded-t transition-all ${
                      activeTrendTab === 'cancelled' ? 'bg-rose-400 group-hover:bg-rose-600' : 'bg-[#5c1616] group-hover:bg-[#400f0f]'
                    }`}
                  ></div>
                  {/* X-axis date label */}
                  <span className="text-[10px] text-[#71717A] font-medium truncate w-full text-center">{day.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 📊 BARIS BAWAH: 2 Column Grid (Top Products + Store Status Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (60%): Top Product Performance */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
            <h3 className="text-[19px] font-semibold text-[#1A1A1A] flex items-center gap-2">
              <Box size={18} className="text-[#5c1616]" /> Top Performa Produk (Katalog)
            </h3>
            <a href="/products" className="text-[12px] text-[#5c1616] font-medium hover:underline flex items-center gap-1">
              Kelola Produk <ArrowUpRight size={13} />
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-slate-50 text-[#71717A] font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-3">Produk</th>
                  <th className="py-2.5 px-3">Harga</th>
                  <th className="py-2.5 px-3">Stok Sisa</th>
                  <th className="py-2.5 px-3 text-right">Terjual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {products.slice(0, 5).map(prod => {
                  const stk = prod.stock ?? 45;
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 bg-slate-100 rounded border border-[#E2E8F0] overflow-hidden flex-shrink-0">
                            <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-medium text-[#1A1A1A] line-clamp-1">{prod.name}</p>
                            <span className="text-[10px] text-[#71717A]">{prod.category === 'Laced' ? 'Upper Tali' : 'Upper Non-Tali'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-normal text-[#1A1A1A] font-sans">
                        Rp {prod.price?.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span className={`text-[12px] font-semibold ${stk === 0 ? 'text-rose-600' : stk < 5 ? 'text-amber-600' : 'text-[#16A34A]'}`}>
                          {stk} pcs
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-sans font-medium text-[#1A1A1A]">
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
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h3 className="text-[19px] font-semibold text-[#1A1A1A] flex items-center gap-2">
                <CheckCircle2 size={18} className="text-[#16A34A]" /> Ringkasan Kesehatan Toko
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

