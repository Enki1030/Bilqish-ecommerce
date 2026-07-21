import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Check, Loader2, UploadCloud } from 'lucide-react';
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['39', '40', '41', '42', '43']);

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
      setProducts(data || []);
    }
    setIsLoading(false);
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
      image_url: finalImageUrl
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
      setSelectedSizes([...availableSizes]);
      
      // Refresh data
      fetchProducts();
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Produk</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-5 py-2.5 rounded-none font-button text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-primary-hover transition-all shadow-sm active:scale-95"
        >
          <Plus size={18} />
          <span>Tambah Produk Baru</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Daftar Produk Toko</h2>
          <input 
            type="text" 
            placeholder="Cari nama produk..." 
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-colors w-64"
          />
        </div>
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <p>Belum ada produk di database.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-white text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Foto</th>
                  <th className="px-6 py-4">Nama Produk (Model)</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Harga</th>
                  <th className="px-6 py-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden border border-gray-100">
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover mix-blend-multiply" />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{product.name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium border border-gray-200">
                        {product.category === 'Laced' ? 'Upper Tali' : 'Upper Non-Tali'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">Rp {product.price.toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-400 hover:text-primary hover:bg-primary-light rounded-lg transition-colors"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(product.id, product.name)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary-light rounded-lg transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Floating Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Tambah Produk Baru</h2>
              <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 hover:bg-gray-200 p-2 rounded-xl transition-colors disabled:opacity-50">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="addProductForm" onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kategori Sepatu</label>
                    <select 
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setModelNumber('');
                      }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-colors"
                    >
                      <option value="Slip-on">Upper Non-Tali (G)</option>
                      <option value="Laced">Upper Tali (T)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kode Model</label>
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
                        className="w-full border border-gray-200 rounded-xl pl-14 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-colors font-medium" 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Tampilan (Otomatis)</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={modelNumber ? `${category === 'Laced' ? 'T' : 'G'}${modelNumber} Hitam` : ''} 
                    placeholder="Kode Model Hitam" 
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-500 outline-none cursor-not-allowed font-medium" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Harga (Rp)</label>
                  <input 
                    type="text" 
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-colors font-medium" 
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">Ukuran Tersedia</label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={isAllSizesSelected}
                          onChange={handleSelectAllSizes}
                          className="peer appearance-none w-5 h-5 border border-gray-300 rounded focus:ring-2 focus:ring-red-100 checked:bg-red-600 checked:border-red-600 cursor-pointer transition-colors" 
                        />
                        <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
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
                            className="peer appearance-none w-5 h-5 border border-gray-300 rounded-none focus:ring-2 focus:ring-primary-light checked:bg-primary checked:border-primary cursor-pointer transition-colors" 
                          />
                          <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{size}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Foto Produk</label>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group overflow-hidden">
                    {imagePreview ? (
                      <div className="relative w-full flex justify-center">
                        <img src={imagePreview} alt="Preview" className="h-32 object-contain mix-blend-multiply" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                          <span className="text-white text-sm font-medium">Ganti Gambar</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600">Klik untuk upload gambar</p>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG (Maks. 2MB)</p>
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
              <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50">Batal</button>
              <button 
                form="addProductForm"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
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
