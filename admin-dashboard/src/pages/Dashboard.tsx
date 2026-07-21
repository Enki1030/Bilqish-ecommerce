import { BellRing, PackageSearch, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button className="bg-primary text-white px-5 py-2.5 rounded-none font-button text-sm tracking-widest uppercase flex items-center gap-2 hover:bg-primary-hover transition-all shadow-sm" onClick={() => alert("Mengirim pesan WhatsApp ke Tukang Sepatu...")}>
          <BellRing size={18} />
          <span>Ingatkan Tukang</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="bg-primary-light p-4 rounded-none text-primary">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Penjualan</p>
            <div className="text-2xl font-bold font-body text-gray-900 mt-1">Rp 12.450.000</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="bg-primary-light p-4 rounded-none text-primary">
            <PackageSearch size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Pesanan Aktif</p>
            <div className="text-2xl font-bold font-body text-gray-900 mt-1">14 Pesanan</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Table Penjualan */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900">Pesanan Terbaru</h2>
            <button className="text-sm text-primary font-medium hover:underline">Lihat Semua</button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-white text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">ID Pesanan</th>
                  <th className="px-6 py-4">Produk</th>
                  <th className="px-6 py-4">Harga</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">#ORD-092</td>
                  <td className="px-6 py-4">G21 Hitam (40)</td>
                  <td className="px-6 py-4 font-medium">Rp 85.000</td>
                  <td className="px-6 py-4"><span className="bg-primary-light text-primary px-3 py-1 rounded-none text-xs font-medium">Sedang Diproses</span></td>
                </tr>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">#ORD-091</td>
                  <td className="px-6 py-4">T02 Hitam (42)</td>
                  <td className="px-6 py-4 font-medium">Rp 85.000</td>
                  <td className="px-6 py-4"><span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-medium">Selesai</span></td>
                </tr>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">#ORD-090</td>
                  <td className="px-6 py-4">G80 Hitam (39)</td>
                  <td className="px-6 py-4 font-medium">Rp 85.000</td>
                  <td className="px-6 py-4"><span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-medium">Selesai</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Stock Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900">Update Stok Cepat</h2>
            <p className="text-sm text-gray-500 mt-1">Ubah ketersediaan stok produk</p>
          </div>
          <div className="p-6">
            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); alert("Stok berhasil diupdate ke sistem! (Simulasi)"); }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Produk</label>
                <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-colors">
                  <option>G21 Hitam</option>
                  <option>G80 Hitam</option>
                  <option>T02 Hitam</option>
                  <option>G70 Hitam</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ukuran</label>
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-colors">
                    <option>39</option>
                    <option>40</option>
                    <option>41</option>
                    <option>42</option>
                    <option>43</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jml Tambahan</label>
                  <input type="number" min="1" defaultValue="5" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-colors" />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-gray-900 text-white font-button uppercase tracking-widest text-sm rounded-none py-3 hover:bg-gray-800 transition-all shadow-sm">
                  Simpan Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
