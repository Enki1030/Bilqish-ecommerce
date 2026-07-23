import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, X, Check, Loader2, UploadCloud, Search, Filter, RefreshCw, ArrowUpDown, Tag, Box } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  model: string;
  sizes: string[];
  image_url: string;
  stock?: number;
  sold?: number;
  created_at?: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [category, setCategory] = useState('Slip-on');
  const [modelNumber, setModelNumber] = useState('');
  const [price, setPrice] = useState('85000');
  const [initialStock, setInitialStock] = useState('50');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['39', '40', '41', '42', '43']);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'available' | 'low' | 'out'>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_high' | 'price_low' | 'sold_high' | 'sold_low' | 'stock_low'>('newest');

  const availableSizes = ['39', '40', '41', '42', '43'];
  const isAllSizesSelected = selectedSizes.length === availableSizes.length;

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching products:', error);
      alert('Gagal mengambil data produk dari Supabase.');
    } else {
      // Map fallback stock/sold if missing
      const mapped = (data || []).map((p: any) => ({
        ...p,
        stock: p.stock !== undefined && p.stock !== null ? p.stock : 45,
        sold: p.sold !== undefined && p.sold !== null ? p.sold : 0
      }));
      setProducts(mapped);
    }
    setIsLoading(false);
  };

  // Filtered & Sorted Products Calculation
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Search Query (Name or Model)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchModel = p.model?.toLowerCase().includes(q);
        if (!matchName && !matchModel) return false;
      }

      // 2. Stock Filter
      const stk = p.stock ?? 0;
      if (stockFilter === 'available' && stk <= 5) return false;
      if (stockFilter === 'low' && (stk > 5 || stk === 0)) return false;
      if (stockFilter === 'out' && stk !== 0) return false;

      // 3. Price Filter
      const prc = p.price ?? 0;
      if (minPrice !== '' && prc < parseInt(minPrice)) return false;
      if (maxPrice !== '' && prc > parseInt(maxPrice)) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_high') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'price_low') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'sold_high') return (b.sold || 0) - (a.sold || 0);
      if (sortBy === 'sold_low') return (a.sold || 0) - (b.sold || 0);
      if (sortBy === 'stock_low') return (a.stock || 0) - (b.stock || 0);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [products, searchQuery, stockFilter, minPrice, maxPrice, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setStockFilter('all');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
  };

  const handleSelectAllSizes = () => {
    if (isAllSizesSelected) {
      setSelectedSizes([]);
    } else {
      setSelectedSizes([...availableSizes]);
    }
  };

  const toggleSize = (size: string) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter(s => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus produk ${name}?`)) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        alert('Gagal menghapus produk: ' + error.message);
      } else {
        fetchProducts();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelNumber || !imageFile) {
      alert('Kode Model dan Gambar harus diisi!');
      return;
    }
    if (selectedSizes.length === 0) {
      alert('Pilih minimal 1 ukuran!');
      return;
    }

    setIsSubmitting(true);
    
    const prefix = category === 'Laced' ? 'T' : 'G';
    const modelCode = `${prefix}${modelNumber}`;
    const name = `${modelCode} Hitam`;
    
    // 1. Upload Gambar ke Supabase Storage
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${modelCode}-${Math.random()}.${fileExt}`;
    const filePath = `products/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('product-image')
      .upload(filePath, imageFile);
      
    if (uploadError) {
      alert('Gagal mengupload gambar: ' + uploadError.message);
      setIsSubmitting(false);
      return;
    }
    
    // 2. Dapatkan Public URL
    const { data: urlData } = supabase.storage
      .from('product-image')
      .getPublicUrl(filePath);
      
    const finalImageUrl = urlData.publicUrl;

    // 3. Simpan data ke Database
    const newProduct = {
      name,
      description: `Sepatu Ballqish model ${modelCode} warna hitam.`,
      price: parseInt(price) || 0,
      category,
      model: modelCode,
      sizes: selectedSizes,
      image_url: finalImageUrl,
      stock: parseInt(initialStock) || 50,
      sold: 0
    };

    const { error } = await supabase.from('products').insert([newProduct]);
    
    setIsSubmitting(false);
    
    if (error) {
      alert('Gagal menyimpan produk: ' + error.message);
    } else {
      setIsModalOpen(false);
      // Reset form
      setModelNumber('');
      setImageFile(null);
      setImagePreview('');
      setCategory('Slip-on');
      setPrice('85000');
      setInitialStock('50');
      setSelectedSizes([...availableSizes]);
      
      // Refresh data
      fetchProducts();
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto font-body pb-12">
      {/* Top Title & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading tracking-tight">Manajemen Produk</h1>
          <p className="text-xs text-gray-500 mt-0.5">Kelola katalog sepatu, stok pasti, dan performa penjualan produk Anda.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-5 py-2.5 rounded-none font-button text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary-hover transition-all shadow-sm active:scale-95"
        >
          <Plus size={16} />
          <span>Tambah Produk Baru</span>
        </button>
      </div>

      {/* Main Grid: Jakmall-style Left Filter Box + Right Product Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar Filter Panel (Jakmall Filter Layout) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Filter size={16} className="text-primary" /> Filter Produk
              </h3>
              <button
                onClick={resetFilters}
                className="text-[11px] text-gray-400 hover:text-primary transition-colors flex items-center gap-1 font-medium"
              >
                <RefreshCw size={11} /> Reset
              </button>
            </div>

            {/* Filter 1: Search Name / Code */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Pencarian</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nama atau Kode (G21)..." 
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-primary"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              </div>
            </div>

            {/* Filter 2: Stock Buttons */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Ketersediaan Stok</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'available', label: 'Tersedia (>5)' },
                  { id: 'low', label: 'Sisa ≤ 5' },
                  { id: 'out', label: 'Habis (0)' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setStockFilter(item.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      stockFilter === item.id
                        ? 'bg-primary text-white font-bold shadow-sm'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter 3: Price Range */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Rentang Harga (Rp)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Terendah"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:border-primary"
                />
                <span className="text-gray-400 text-xs">-</span>
                <input
                  type="number"
                  placeholder="Tertinggi"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Filter 4: Sort By */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Urutkan Berdasarkan</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 outline-none focus:border-primary cursor-pointer"
              >
                <option value="newest">Terakhir Ditambahkan</option>
                <option value="sold_high">Penjualan: Terbanyak</option>
                <option value="sold_low">Penjualan: Tersedikit</option>
                <option value="price_high">Harga: Tertinggi</option>
                <option value="price_low">Harga: Terendah</option>
                <option value="stock_low">Stok: Paling Menipis</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Main Table (Jakmall Product List Style) */}
        <div className="lg:col-span-9">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Table Header Controls */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center text-xs text-gray-500">
              <span>Menampilkan <strong className="text-gray-900 font-body">{filteredProducts.length}</strong> dari {products.length} produk</span>
            </div>

            {/* Table Body */}
            <div className="overflow-x-auto min-h-[400px]">
              {isLoading ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <Box className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="text-sm font-bold text-gray-700">Tidak ada produk ditemukan</p>
                  <p className="text-xs text-gray-400 mt-1">Coba sesuaikan kata kunci atau reset filter Anda.</p>
                  <button onClick={resetFilters} className="mt-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded transition-colors">Reset Filter</button>
                </div>
              ) : (
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Produk</th>
                      <th className="px-5 py-3.5">Harga</th>
                      <th className="px-5 py-3.5">Stok (Akurat)</th>
                      <th className="px-5 py-3.5">Penjualan</th>
                      <th className="px-5 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map(product => {
                      const stk = product.stock ?? 0;
                      const isLow = stk > 0 && stk <= 5;
                      const isOut = stk === 0;

                      return (
                        <tr key={product.id} className="hover:bg-gray-50/80 transition-colors">
                          {/* Produk Column */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-xs line-clamp-1">{product.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {product.model || product.name.split(' ')[0]}
                                  </span>
                                  <span className="text-[11px] text-gray-400">
                                    {product.category === 'Laced' ? 'Upper Tali' : 'Upper Non-Tali'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Harga Column */}
                          <td className="px-5 py-4 font-bold text-gray-900 font-body text-xs">
                            Rp {product.price?.toLocaleString('id-ID')}
                          </td>

                          {/* Stok (Exact Numerical Count with Color Badge) */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded text-xs font-bold font-body ${
                                isOut ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                isLow ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {isOut ? 'Habis (0 pcs)' : isLow ? `Sisa ${stk} pcs` : `Tersedia (${stk} pcs)`}
                              </span>
                            </div>
                          </td>

                          {/* Penjualan Column */}
                          <td className="px-5 py-4 font-body font-bold text-gray-700 text-xs">
                            {product.sold || 0} pcs
                          </td>

                          {/* Aksi Column */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded transition-colors"
                                title="Edit Produk"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(product.id, product.name)} 
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Hapus Produk"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Floating Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900 font-heading">Tambah Produk Baru</h2>
              <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 hover:bg-gray-200 p-2 rounded-xl transition-colors disabled:opacity-50">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="addProductForm" onSubmit={handleSubmit} className="space-y-6 text-xs">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Kategori Sepatu</label>
                    <select 
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setModelNumber('');
                      }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-colors"
                    >
                      <option value="Slip-on">Upper Non-Tali (G)</option>
                      <option value="Laced">Upper Tali (T)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Kode Model</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-0 inset-y-0 flex items-center justify-center pl-4 w-10 border-r border-gray-200 bg-gray-50 rounded-l-xl font-bold text-gray-600">
                        {category === 'Laced' ? 'T' : 'G'}
                      </div>
                      <input 
                        type="text" 
                        maxLength={2}
                        placeholder="Contoh: 21" 
                        value={modelNumber}
                        onChange={(e) => setModelNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full border border-gray-200 rounded-xl pl-14 pr-4 py-2.5 text-xs focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-colors font-medium" 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Nama Tampilan (Otomatis)</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={modelNumber ? `${category === 'Laced' ? 'T' : 'G'}${modelNumber} Hitam` : ''} 
                    placeholder="Kode Model Hitam" 
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs bg-gray-50 text-gray-500 outline-none cursor-not-allowed font-medium" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Harga (Rp)</label>
                    <input 
                      type="text" 
                      value={price}
                      onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-colors font-medium" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Stok Awal (pcs)</label>
                    <input 
                      type="text" 
                      value={initialStock}
                      onChange={(e) => setInitialStock(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-colors font-medium" 
                      placeholder="Contoh: 50"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs font-bold text-gray-700">Ukuran Tersedia</label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={isAllSizesSelected}
                          onChange={handleSelectAllSizes}
                          className="peer appearance-none w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-red-100 checked:bg-red-600 checked:border-red-600 cursor-pointer transition-colors" 
                        />
                        <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
                      </div>
                      <span className="text-xs font-bold text-gray-500 group-hover:text-gray-900">Select All</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {availableSizes.map(size => (
                      <label key={size} className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            checked={selectedSizes.includes(size)}
                            onChange={() => toggleSize(size)}
                            className="peer appearance-none w-4 h-4 border border-gray-300 rounded-none focus:ring-2 focus:ring-primary-light checked:bg-primary checked:border-primary cursor-pointer transition-colors" 
                          />
                          <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
                        </div>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">{size}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Foto Produk</label>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group overflow-hidden">
                    {imagePreview ? (
                      <div className="relative w-full flex justify-center">
                        <img src={imagePreview} alt="Preview" className="h-32 object-contain mix-blend-multiply" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                          <span className="text-white text-xs font-medium">Ganti Gambar</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs font-medium text-gray-600">Klik untuk upload gambar</p>
                        <p className="text-[11px] text-gray-400 mt-1">JPG, PNG (Maks. 2MB)</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setImageFile(file);
                          setImagePreview(URL.createObjectURL(file));
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50">Batal</button>
              <button 
                form="addProductForm"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-medium bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Produk'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

