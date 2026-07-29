import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Package, 
  AlertCircle, 
  Download, 
  Users, 
  Award, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  RefreshCw,
  PieChart,
  BarChart3
} from 'lucide-react';

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  estimatedCOGS: number;
  estimatedGrossProfit: number;
  profitMarginPercent: number;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [craftsmen, setCraftsmen] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<'all' | '7days' | '30days' | 'this_month'>('30days');

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  async function fetchAnalyticsData() {
    setLoading(true);
    try {
      // 1. Fetch Orders with Items
      const { data: oData } = await supabase
        .from('orders')
        .select(`
          id,
          total_price,
          status,
          created_at,
          order_items (
            id,
            product_id,
            product_name,
            quantity,
            price_per_unit
          )
        `)
        .order('created_at', { ascending: false });

      // 2. Fetch Products
      const { data: pData } = await supabase
        .from('products')
        .select('*');

      // 3. Fetch Raw Materials
      const { data: mData } = await supabase
        .from('raw_materials')
        .select('*');

      // 4. Fetch Craftsmen
      const { data: cData } = await supabase
        .from('craftsmen')
        .select('*');

      setOrders(oData || []);
      setProducts(pData || []);
      setMaterials(mData || []);
      setCraftsmen(cData || []);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter Orders based on selected Date Range
  const filteredOrders = useMemo(() => {
    if (dateRange === 'all') return orders;

    const now = new Date();
    let cutoff = new Date();

    if (dateRange === '7days') {
      cutoff.setDate(now.getDate() - 7);
    } else if (dateRange === '30days') {
      cutoff.setDate(now.getDate() - 30);
    } else if (dateRange === 'this_month') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return orders.filter(o => new Date(o.created_at) >= cutoff);
  }, [orders, dateRange]);

  // Executive Summary Financial KPI Calculation
  const summaryKPI = useMemo<AnalyticsData>(() => {
    const validOrders = filteredOrders.filter(o => o.status !== 'Dibatalkan');
    const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
    const totalOrders = validOrders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Estimate COGS at ~55% of Retail Price (giving ~45% Gross Profit Margin)
    const estimatedCOGS = Math.round(totalRevenue * 0.55);
    const estimatedGrossProfit = totalRevenue - estimatedCOGS;
    const profitMarginPercent = totalRevenue > 0 ? Math.round((estimatedGrossProfit / totalRevenue) * 100) : 0;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      estimatedCOGS,
      estimatedGrossProfit,
      profitMarginPercent
    };
  }, [filteredOrders]);

  // Product Profitability Analysis
  const productProfitability = useMemo(() => {
    const productStatsMap: Record<string, { name: string; qtySold: number; revenue: number; price: number }> = {};

    filteredOrders.forEach(o => {
      if (o.status === 'Dibatalkan') return;
      (o.order_items || []).forEach((item: any) => {
        const pId = item.product_id || item.product_name;
        if (!productStatsMap[pId]) {
          productStatsMap[pId] = {
            name: item.product_name || 'Sepatu Pantofel Bilqish',
            qtySold: 0,
            revenue: 0,
            price: Number(item.price_per_unit) || 0
          };
        }
        const qty = Number(item.quantity) || 1;
        const rev = Number(item.price_per_unit || 0) * qty;
        productStatsMap[pId].qtySold += qty;
        productStatsMap[pId].revenue += rev;
        if (!productStatsMap[pId].price) productStatsMap[pId].price = Number(item.price_per_unit) || 0;
      });
    });

    return Object.values(productStatsMap)
      .map(p => {
        const estUnitCOGS = Math.round(p.price * 0.55);
        const estUnitProfit = p.price - estUnitCOGS;
        const totalProfit = p.qtySold * estUnitProfit;
        const marginPercent = p.price > 0 ? Math.round((estUnitProfit / p.price) * 100) : 0;

        return {
          ...p,
          estUnitCOGS,
          estUnitProfit,
          totalProfit,
          marginPercent
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  // Raw Material Inventory Burn Rate & Reorder Warning
  const materialBurnRate = useMemo(() => {
    let upperG = 0;
    let upperT = 0;
    let sol1 = 0;
    let sol2 = 0;

    materials.forEach(m => {
      const stock = Number(m.stock_quantity) || 0;
      const sub = (m.sub_type || m.name || '').toUpperCase();
      const comp = m.material_component || (sub.includes('UPPER') ? 'Upper' : 'Sol');

      if (comp === 'Upper' || sub.includes('BERTALI') || sub.includes('NON-TALI') || sub.includes('SLIP')) {
        if (sub.includes('NON-TALI') || sub.includes('SLIP') || sub.includes(' G')) {
          upperG += stock;
        } else {
          upperT += stock;
        }
      } else {
        if (sub.includes('MODEL 2') || sub.includes(' 2')) {
          sol2 += stock;
        } else {
          sol1 += stock;
        }
      }
    });

    // Average daily sales velocity (estimated from last 30 days)
    const daysInPeriod = dateRange === '7days' ? 7 : (dateRange === '30days' ? 30 : 30);
    const totalShoesSoldInPeriod = filteredOrders.reduce((sum, o) => {
      if (o.status === 'Dibatalkan') return sum;
      return sum + (o.order_items || []).reduce((iSum: number, i: any) => iSum + (Number(i.quantity) || 1), 0);
    }, 0);

    const avgDailySalesVelocity = Math.max(0.5, totalShoesSoldInPeriod / daysInPeriod);

    const getDaysRemaining = (stock: number) => Math.round(stock / avgDailySalesVelocity);

    return [
      { name: 'Upper G (Non-Tali)', category: 'Upper', stock: upperG, safety: 20, daysLeft: getDaysRemaining(upperG) },
      { name: 'Upper T (Bertali)', category: 'Upper', stock: upperT, safety: 20, daysLeft: getDaysRemaining(upperT) },
      { name: 'Sol Outsole Model 1', category: 'Sol', stock: sol1, safety: 20, daysLeft: getDaysRemaining(sol1) },
      { name: 'Sol Outsole Model 2', category: 'Sol', stock: sol2, safety: 20, daysLeft: getDaysRemaining(sol2) }
    ];
  }, [materials, filteredOrders, dateRange]);

  // Vendor Performance Matrix
  const vendorRanking = useMemo(() => {
    return craftsmen.map(c => {
      // Find materials supplied by this craftsman
      const cMats = materials.filter(m => m.craftsman_id === c.id);
      const avgDelay = cMats.length > 0 
        ? Math.round(cMats.reduce((sum, m) => sum + (Number(m.delay_days) || 0), 0) / cMats.length)
        : 2;

      // On-time rating score calculation
      const onTimeRate = Math.max(70, Math.min(100, 100 - (avgDelay * 5)));
      const ratingStars = onTimeRate >= 95 ? '⭐⭐⭐⭐⭐ (Unggul)' : (onTimeRate >= 85 ? '⭐⭐⭐⭐ (Baik)' : '⭐⭐⭐ (Cukup)');

      return {
        id: c.id,
        name: c.name,
        materialType: c.material_type,
        materialsCount: cMats.length,
        avgDelayDays: avgDelay,
        onTimeRate,
        ratingStars
      };
    }).sort((a, b) => b.onTimeRate - a.onTimeRate);
  }, [craftsmen, materials]);

  // CSV Exporter Functions
  function exportSalesReportCSV() {
    if (filteredOrders.length === 0) {
      alert('Tidak ada data penjualan untuk diekspor.');
      return;
    }

    const headers = ['ID Order', 'Tanggal', 'Status', 'Total Harga (Rp)', 'Jumlah Produk'];
    const rows = filteredOrders.map(o => [
      `"${o.id}"`,
      `"${new Date(o.created_at).toLocaleDateString('id-ID')}"`,
      `"${o.status}"`,
      o.total_price || 0,
      (o.order_items || []).length
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, `Laporan_Penjualan_Bilqish_${new Date().toISOString().slice(0,10)}.csv`);
  }

  function exportProductProfitabilityCSV() {
    if (productProfitability.length === 0) {
      alert('Tidak ada data performa produk untuk diekspor.');
      return;
    }

    const headers = ['Nama Produk', 'Terjual (Pasang)', 'Harga Jual (Rp)', 'Est. HPP (Rp)', 'Est. Laba/Unit (Rp)', 'Total Omzet (Rp)', 'Total Laba (Rp)', 'Margin %'];
    const rows = productProfitability.map(p => [
      `"${p.name}"`,
      p.qtySold,
      p.price,
      p.estUnitCOGS,
      p.estUnitProfit,
      p.revenue,
      p.totalProfit,
      `"${p.marginPercent}%"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, `Laporan_Performa_Produk_Bilqish_${new Date().toISOString().slice(0,10)}.csv`);
  }

  function downloadCSV(csvString: string, filename: string) {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans text-center py-20">
        <div className="w-10 h-10 border-4 border-[#5c1616] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-gray-500 font-medium">Memuat Data Analisis Bisnis & Laporan Eksekutif...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-bold text-[#111111] leading-tight tracking-tight flex items-center gap-2.5">
            <BarChart3 className="text-[#5c1616]" size={30} /> Analisis Bisnis & Keputusan Eksekutif
          </h1>
          <p className="text-[15px] text-gray-600 mt-1">
            Intelijen omzet, profitabilitas produk, peringatan pasokan pengrajin, dan laporan ekspor Excel.
          </p>
        </div>

        {/* Date Filter Controls & Export Engine */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex p-1 bg-gray-100/90 rounded-xl gap-1 border border-gray-200/80">
            {[
              { label: '7 Hari', val: '7days' },
              { label: '30 Hari', val: '30days' },
              { label: 'Bulan Ini', val: 'this_month' },
              { label: 'Semua', val: 'all' }
            ].map(f => (
              <button
                key={f.val}
                type="button"
                onClick={() => setDateRange(f.val as any)}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                  dateRange === f.val
                    ? 'bg-white text-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.1)] font-semibold'
                    : 'text-gray-600 hover:text-[#111111]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={exportSalesReportCSV}
            className="bg-[#5c1616] hover:bg-[#4a1212] text-white text-[13px] font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-[0_2px_6px_rgba(92,22,22,0.2)] transition-all cursor-pointer"
          >
            <Download size={15} /> Ekspor Laporan (.CSV)
          </button>
        </div>
      </div>

      {/* SECTION 1: EXECUTIVE FINANCIAL KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Revenue */}
        <div className="bg-white p-5 rounded-[18px] border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-2">
          <div className="flex justify-between items-center text-gray-500 text-[13px] font-medium">
            <span>Total Omzet Penjualan</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-[26px] font-bold text-[#111111] leading-none">
            {formatIDR(summaryKPI.totalRevenue)}
          </div>
          <div className="text-[12px] text-emerald-600 font-semibold flex items-center gap-1">
            <ArrowUpRight size={14} /> Berdasarkan {summaryKPI.totalOrders} Transaksi Berhasil
          </div>
        </div>

        {/* KPI 2: Estimated Gross Profit */}
        <div className="bg-white p-5 rounded-[18px] border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-2">
          <div className="flex justify-between items-center text-gray-500 text-[13px] font-medium">
            <span>Estimasi Laba Kotor</span>
            <div className="p-2 bg-rose-50 text-[#5c1616] rounded-lg">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-[26px] font-bold text-[#5c1616] leading-none">
            {formatIDR(summaryKPI.estimatedGrossProfit)}
          </div>
          <div className="text-[12px] text-gray-500 font-medium">
            Margin Laba Kotor: <strong className="text-[#111111] font-semibold">{summaryKPI.profitMarginPercent}%</strong>
          </div>
        </div>

        {/* KPI 3: Average Order Value (AOV) */}
        <div className="bg-white p-5 rounded-[18px] border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-2">
          <div className="flex justify-between items-center text-gray-500 text-[13px] font-medium">
            <span>Rata-Rata Belanja (AOV)</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="text-[26px] font-bold text-[#111111] leading-none">
            {formatIDR(summaryKPI.avgOrderValue)}
          </div>
          <div className="text-[12px] text-gray-500 font-medium">
            Rata-rata pengeluaran per transaksi pembeli
          </div>
        </div>

        {/* KPI 4: Total Orders Count */}
        <div className="bg-white p-5 rounded-[18px] border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-2">
          <div className="flex justify-between items-center text-gray-500 text-[13px] font-medium">
            <span>Volume Pesanan</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Package size={18} />
            </div>
          </div>
          <div className="text-[26px] font-bold text-[#111111] leading-none">
            {summaryKPI.totalOrders} <span className="text-[16px] font-medium text-gray-500">Order</span>
          </div>
          <div className="text-[12px] text-gray-500 font-medium">
            Status pesanan aktif dan terkonfirmasi
          </div>
        </div>

      </div>

      {/* SECTION 2: PRODUCT PROFITABILITY & MARGIN MATRIX */}
      <div className="bg-white p-6 md:p-8 rounded-[18px] border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-[20px] font-semibold text-[#111111] flex items-center gap-2">
              <PieChart size={20} className="text-[#5c1616]" /> Matriks Profitabilitas & Produk Terlaris
            </h2>
            <p className="text-[14px] text-gray-600 mt-0.5">
              Analisis keuntungan produk paling menguntungkan (*High Margin*) untuk strategi produksi owner.
            </p>
          </div>

          <button
            onClick={exportProductProfitabilityCSV}
            className="text-[13px] font-semibold text-[#5c1616] hover:text-[#4a1212] flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} /> Unduh CSV Performa Produk
          </button>
        </div>

        {productProfitability.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            Belum ada transaksi penjualan pada periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-gray-200 text-[13px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="pb-3">Produk Sepatu</th>
                  <th className="pb-3 text-center">Terjual</th>
                  <th className="pb-3 text-right">Harga Jual</th>
                  <th className="pb-3 text-right">Est. HPP Pokok</th>
                  <th className="pb-3 text-right">Total Omzet</th>
                  <th className="pb-3 text-right">Total Laba</th>
                  <th className="pb-3 text-center">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {productProfitability.map((p, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 font-bold text-[#111111]">{p.name}</td>
                    <td className="py-3.5 text-center text-gray-700">{p.qtySold} pasang</td>
                    <td className="py-3.5 text-right text-gray-700">{formatIDR(p.price)}</td>
                    <td className="py-3.5 text-right text-gray-400">{formatIDR(p.estUnitCOGS)}</td>
                    <td className="py-3.5 text-right text-[#111111] font-semibold">{formatIDR(p.revenue)}</td>
                    <td className="py-3.5 text-right text-[#5c1616] font-bold">{formatIDR(p.totalProfit)}</td>
                    <td className="py-3.5 text-center">
                      <span className="bg-emerald-50 text-emerald-700 font-bold text-[12px] px-2.5 py-1 rounded-full border border-emerald-200">
                        {p.marginPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TWO COLUMN GRID: INVENTORY BURN RATE & VENDOR RANKING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* SECTION 3: INVENTORY REORDER & BURN RATE WARNING */}
        <div className="bg-white p-6 md:p-8 rounded-[18px] border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-[20px] font-semibold text-[#111111] flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-600" /> Intelijen Stok & Peringatan Reorder
            </h2>
            <p className="text-[14px] text-gray-600 mt-0.5">
              Prediksi ketahanan stok bahan baku berdasarkan kecepatan penjualan harian (*Daily Sales Velocity*).
            </p>
          </div>

          <div className="space-y-4">
            {materialBurnRate.map((mat, idx) => {
              const isWarning = mat.stock <= mat.safety;
              return (
                <div 
                  key={idx} 
                  className={`p-4 rounded-[16px] border flex items-center justify-between transition-all ${
                    isWarning ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-gray-50/60 border-gray-200 text-[#111111]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-[15px] flex items-center gap-2">
                      {mat.name}
                      {isWarning && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Perlu Restock
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-gray-600">
                      Stok Gudang: <strong className="text-[#111111]">{mat.stock} Pasang</strong> | Batas Aman: {mat.safety} Pasang
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[20px] font-bold text-[#111111]">
                      ~{mat.daysLeft} <span className="text-[13px] font-normal text-gray-500">Hari</span>
                    </div>
                    <div className="text-[12px] text-gray-500">Estimasi Ketahanan</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: VENDOR PERFORMANCE RANKING */}
        <div className="bg-white p-6 md:p-8 rounded-[18px] border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-[20px] font-semibold text-[#111111] flex items-center gap-2">
              <Award size={20} className="text-[#5c1616]" /> Peringkat Performa Pengrajin (Vendor)
            </h2>
            <p className="text-[14px] text-gray-600 mt-0.5">
              Evaluasi ketepatan waktu (*On-Time Fulfillment Rate*) dan durasi *delay* pasokan pengrajin.
            </p>
          </div>

          {vendorRanking.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">
              Belum ada data pengrajin terdaftar.
            </div>
          ) : (
            <div className="space-y-3.5">
              {vendorRanking.map((v, idx) => (
                <div key={v.id} className="p-4 bg-gray-50/60 rounded-[16px] border border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#5c1616] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-[15px] text-[#111111]">{v.name}</div>
                      <div className="text-[13px] text-gray-600">{v.materialType} • {v.materialsCount} Komponen Pasokan</div>
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <div className="text-[14px] font-bold text-emerald-600">
                      {v.onTimeRate}% Ketepatan Waktu
                    </div>
                    <div className="text-[12px] text-gray-500">
                      Rata-rata Delay: <strong className="text-[#111111]">{v.avgDelayDays} Hari</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
