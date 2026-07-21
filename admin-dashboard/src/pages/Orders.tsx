import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Package, Phone, User } from 'lucide-react';

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

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

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    o.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-light border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Manajemen Pesanan</h1>
          <p className="text-gray-500">Kelola dan pantau semua pesanan pelanggan Anda.</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari ID Pesanan atau Nama Pelanggan..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Tidak ada pesanan</h3>
            <p className="text-gray-500">Belum ada pesanan yang masuk atau ditemukan.</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">Order #{order.id.slice(0,8)}</span>
                    <span className="text-sm text-gray-500">• {new Date(order.created_at).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5"><User size={14} /> {order.customer_name}</div>
                    <div className="flex items-center gap-1.5"><Phone size={14} /> {order.customer_phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">Status:</span>
                  <select 
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                    className={`text-sm font-bold rounded-lg px-3 py-1.5 border-2 outline-none cursor-pointer transition-colors ${
                      order.status === 'Menunggu Pembayaran' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      order.status === 'Diproses' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      order.status === 'Dikirim' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      order.status === 'Selesai' ? 'bg-green-50 text-green-700 border-green-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                    <option value="Diproses">Diproses</option>
                    <option value="Dikirim">Dikirim</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Dibatalkan">Dibatalkan</option>
                  </select>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Items */}
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Item Pesanan</h4>
                    <div className="space-y-4">
                      {order.order_items?.map((item: any) => (
                        <div key={item.id} className="flex gap-4">
                          <div className="w-16 h-16 rounded-xl bg-gray-50 flex-shrink-0 border border-gray-100 overflow-hidden">
                            <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover mix-blend-multiply" />
                          </div>
                          <div className="flex-1 flex flex-col justify-center">
                            <p className="font-bold text-gray-900 text-sm line-clamp-1">{item.product_name}</p>
                            <p className="text-xs text-gray-500 mb-1">Size {item.size} • {item.outsole_model}</p>
                            <div className="flex justify-between items-center mt-auto">
                              <span className="text-xs font-bold text-gray-500">{item.quantity}x Rp {item.price.toLocaleString('id-ID')}</span>
                              <span className="text-sm font-bold text-gray-900">Rp {(item.quantity * item.price).toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="w-full lg:w-72 bg-gray-50 p-5 rounded-xl border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Ringkasan</h4>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal Item</span>
                        <span className="font-medium text-gray-900">Rp {order.total_amount.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Ongkos Kirim</span>
                        <span className="font-medium text-gray-900">Menyusul (WA)</span>
                      </div>
                      <div className="pt-3 border-t border-gray-200 flex justify-between">
                        <span className="font-bold text-gray-900">Total Harga</span>
                        <span className="font-bold text-primary text-lg">Rp {order.total_amount.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">Informasi Pengiriman</h4>
                      <p className="text-sm text-gray-900 font-medium">{order.customer_address}</p>
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
