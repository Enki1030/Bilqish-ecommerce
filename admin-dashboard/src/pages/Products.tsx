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

/**
 * Konversi otomatis semua format gambar (JPG, PNG, JPEG, BMP) ke WebP ultra-ringan sebelum diunggah ke Supabase.
 * Mengabaikan file SVG agar ketajaman vektor tidak berubah.
 */
async function convertToWebP(file: File, quality = 0.85): Promise<File> {
  if (file.type === 'image/svg+xml' || file.type === 'image/webp') {
    return file; // Skip SVG & WebP yang sudah teroptimasi
  }

  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const convertedName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
              const webpFile = new File([blob], convertedName, {
                type: 'image/webp',
                lastModified: Date.now(),
              });
              resolve(webpFile);
            } else {
              resolve(file);
            }
          },
          'image/webp',
          quality
        );
      } else {
        resolve(file);
      }
    };

    img.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [category, setCategory] = useState('Slip-on');
  const [modelNumber, setModelNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [isCustomNameEdited, setIsCustomNameEdited] = useState(false);
  const [price, setPrice] = useState('85000');
  const [initialStock, setInitialStock] = useState('50');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['39', '40', '41', '42', '43']);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<'all' | 'name' | 'code'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'available' | 'low' | 'out'>('all');
  const [priceRange, setPriceRange] = useState<'all' | '0-50k' | '50k-100k' | '100k-150k' | '150k-200k' | '200k+'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_high' | 'price_low' | 'sold_high' | 'sold_low' | 'stock_low'>('newest');

  const availableSizes = ['39', '40', '41', '42', '43'];
  const isAllSizesSelected = selectedSizes.length === availableSizes.length;

  useEffect(() => {
    fetchProducts();
  }, []);

  // Sync display name automatically if admin has not custom-edited it (for new mode)
  useEffect(() => {
    if (!editingProduct && !isCustomNameEdited) {
      const prefix = category === 'Laced' ? 'T' : 'G';
      setDisplayName(modelNumber ? `${prefix}${modelNumber} Hitam` : '');
    }
  }, [category, modelNumber, isCustomNameEdited, editingProduct]);

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
      // Map fallback stock/sold if missing from SQL schema
      const mapped = (data || []).map((p: any) => {
        let stk = p.stock;
        if (stk === undefined || stk === null) {
          const stockMatch = (p.description || '').match(/<!--STOCK:(\d+)-->/);
          if (stockMatch && stockMatch[1]) {
            stk = parseInt(stockMatch[1]);
          } else {
            stk = 50;
          }
        }
        return {
          ...p,
          stock: stk,
          sold: p.sold !== undefined && p.sold !== null ? p.sold : 0
        };
      });
      setProducts(mapped);
    }
    setIsLoading(false);
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setCategory('Slip-on');
    setModelNumber('');
    setDisplayName('');
    setDescription('Sepatu Pantofel Ballqish kualitas tinggi, terbuat dari bahan sintetis premium lentur, nyaman dipakai seharian.');
    setIsCustomNameEdited(false);
    setPrice('85000');
    setInitialStock('50');
    setImageFile(null);
    setImagePreview('');
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setSelectedSizes([...availableSizes]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setCategory(product.category || 'Slip-on');
    setModelNumber(product.model ? product.model.replace(/[^0-9]/g, '') : '');
    setDisplayName(product.name || '');
    
    // Extract clean description and embedded metadata if present
    const rawDesc = product.description || '';
    const cleanDesc = rawDesc.replace(/<!--(GALLERY|STOCK):[\s\S]*?-->/g, '').trim();
    setDescription(cleanDesc);

    // Extract stock from product object or embedded description tag
    let stockVal = product.stock;
    const stockMatch = rawDesc.match(/<!--STOCK:(\d+)-->/);
    if (stockMatch && stockMatch[1]) {
      stockVal = parseInt(stockMatch[1]);
    }

    setIsCustomNameEdited(true);
    setPrice((product.price || 85000).toString());
    setInitialStock((stockVal || 50).toString());
    setSelectedSizes(product.sizes && product.sizes.length > 0 ? product.sizes : [...availableSizes]);
    setImagePreview(product.image_url || '');
    setImageFile(null);

    // Extract promo gallery URLs from column OR embedded tag
    let existingGallery: string[] = [];
    if (product.gallery_urls && Array.isArray(product.gallery_urls)) {
      existingGallery = product.gallery_urls;
    } else if (rawDesc) {
      const match = rawDesc.match(/<!--GALLERY:(.*?)-->/);
      if (match && match[1]) {
        try {
          existingGallery = JSON.parse(match[1]);
        } catch (e) {
          console.error(e);
        }
      }
    }

    setGalleryPreviews(existingGallery);
    setGalleryFiles([]);
    setIsModalOpen(true);
  };

  // Filtered & Sorted Products Calculation
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Search Query (Filtered by Search Category: All / Name / Code)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchModel = p.model?.toLowerCase().includes(q);
        if (searchCategory === 'name' && !matchName) return false;
        if (searchCategory === 'code' && !matchModel) return false;
        if (searchCategory === 'all' && !matchName && !matchModel) return false;
      }

      // 2. Stock Filter
      const stk = p.stock ?? 0;
      if (stockFilter === 'available' && stk <= 5) return false;
      if (stockFilter === 'low' && (stk > 5 || stk === 0)) return false;
      if (stockFilter === 'out' && stk !== 0) return false;

      // 3. 5-Tier Price Range Filter
      const prc = p.price ?? 0;
      if (priceRange === '0-50k' && prc > 50000) return false;
      if (priceRange === '50k-100k' && (prc < 50000 || prc > 100000)) return false;
      if (priceRange === '100k-150k' && (prc < 100000 || prc > 150000)) return false;
      if (priceRange === '150k-200k' && (prc < 150000 || prc > 200000)) return false;
      if (priceRange === '200k+' && prc < 200000) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_high') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'price_low') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'sold_high') return (b.sold || 0) - (a.sold || 0);
      if (sortBy === 'sold_low') return (a.sold || 0) - (b.sold || 0);
      if (sortBy === 'stock_low') return (a.stock || 0) - (b.stock || 0);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [products, searchQuery, searchCategory, stockFilter, priceRange, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSearchCategory('all');
    setStockFilter('all');
    setPriceRange('all');
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

  const handleThumbnailSelect = async (file: File) => {
    const webpFile = await convertToWebP(file);
    setImageFile(webpFile);
    setImagePreview(URL.createObjectURL(webpFile));
  };

  const handleGalleryAdd = async (filesList: FileList | null) => {
    if (!filesList) return;
    const rawFiles = Array.from(filesList);
    const convertedFiles = await Promise.all(rawFiles.map(f => convertToWebP(f)));
    const combined = [...galleryFiles, ...convertedFiles].slice(0, 6);
    setGalleryFiles(combined);
    const previews = combined.map(f => URL.createObjectURL(f));
    setGalleryPreviews(previews);
  };

  const replaceGalleryImage = async (index: number, file: File) => {
    const webpFile = await convertToWebP(file);
    const updatedFiles = [...galleryFiles];
    updatedFiles[index] = webpFile;
    setGalleryFiles(updatedFiles);

    const updatedPreviews = [...galleryPreviews];
    updatedPreviews[index] = URL.createObjectURL(webpFile);
    setGalleryPreviews(updatedPreviews);
  };

  const removeGalleryImage = (index: number) => {
    const updatedFiles = galleryFiles.filter((_, i) => i !== index);
    const updatedPreviews = galleryPreviews.filter((_, i) => i !== index);
    setGalleryFiles(updatedFiles);
    setGalleryPreviews(updatedPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelNumber) {
      alert('Kode Model harus diisi!');
      return;
    }
    if (!editingProduct && !imageFile) {
      alert('Foto Thumbnail Utama harus diisi untuk produk baru!');
      return;
    }
    if (selectedSizes.length === 0) {
      alert('Pilih minimal 1 ukuran!');
      return;
    }

    setIsSubmitting(true);
    
    const prefix = category === 'Laced' ? 'T' : 'G';
    const modelCode = `${prefix}${modelNumber}`;
    const finalName = displayName.trim() || `${modelCode} Hitam`;
    
    let finalImageUrl = editingProduct ? editingProduct.image_url : '';

    // Upload Thumbnail (Otomatis terkonversi ke WebP)
    if (imageFile) {
      const webpThumbnail = await convertToWebP(imageFile);
      const fileName = `${modelCode}-thumb-${Date.now()}.webp`;
      const filePath = `products/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-image')
        .upload(filePath, webpThumbnail, {
          contentType: 'image/webp',
          upsert: true
        });
        
      if (uploadError) {
        alert('Gagal mengupload thumbnail WebP: ' + uploadError.message);
        setIsSubmitting(false);
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from('product-image')
        .getPublicUrl(filePath);
        
      finalImageUrl = urlData.publicUrl;
    }

    // Upload Promo / Mockup Gallery Photos (Otomatis terkonversi ke WebP)
    const finalGalleryUrls: string[] = [];
    
    // Maintain existing remote URLs in galleryPreviews
    galleryPreviews.forEach(url => {
      if (url.startsWith('http')) {
        finalGalleryUrls.push(url);
      }
    });

    for (let i = 0; i < galleryFiles.length; i++) {
      const file = galleryFiles[i];
      if (file) {
        const webpFile = await convertToWebP(file);
        const fileName = `${modelCode}-promo-${i + 1}-${Date.now()}.webp`;
        const filePath = `products/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('product-image')
          .upload(filePath, webpFile, {
            contentType: 'image/webp',
            upsert: true,
          });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from('product-image')
            .getPublicUrl(filePath);
          finalGalleryUrls.push(urlData.publicUrl);
        }
      }
    }

    // Dual persistence: Embed stock & gallery URLs tags in description so they persist even if SQL columns are missing
    const stockVal = parseInt(initialStock) || 50;
    const cleanDesc = description.replace(/<!--(GALLERY|STOCK):[\s\S]*?-->/g, '').trim();
    const stockTag = `\n<!--STOCK:${stockVal}-->`;
    const galleryTag = finalGalleryUrls.length > 0 ? `\n<!--GALLERY:${JSON.stringify(finalGalleryUrls)}-->` : '';
    const finalDescription = `${cleanDesc}${stockTag}${galleryTag}`;

    // Build clean payload with columns that exist in Supabase table
    const payload: any = {
      name: finalName,
      description: finalDescription,
      price: parseInt(price) || 0,
      category,
      model: modelCode,
      sizes: selectedSizes,
      image_url: finalImageUrl,
      gallery_urls: finalGalleryUrls,
    };

    let error = null;
    if (editingProduct) {
      const res = await supabase.from('products').update(payload).eq('id', editingProduct.id);
      error = res.error;
    } else {
      const res = await supabase.from('products').insert([payload]);
      error = res.error;
    }

    // If gallery_urls column is missing from Supabase schema, retry without gallery_urls
    if (error && error.message && error.message.toLowerCase().includes("gallery_urls")) {
      delete payload.gallery_urls;
      if (editingProduct) {
        const res = await supabase.from('products').update(payload).eq('id', editingProduct.id);
        error = res.error;
      } else {
        const res = await supabase.from('products').insert([payload]);
        error = res.error;
      }
    }
    
    setIsSubmitting(false);
    
    if (error) {
      alert('Gagal menyimpan produk: ' + error.message);
    } else {
      setIsModalOpen(false);
      setEditingProduct(null);
      fetchProducts();
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto font-sans pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#1A1A1A] tracking-tight">Manajemen Produk</h1>
          <p className="text-[12px] font-normal text-[#71717A] mt-1">Kelola katalog sepatu, stok pasti, dan performa penjualan produk Anda.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-[#5c1616] hover:bg-[#400f0f] text-white px-5 py-2.5 rounded-lg text-[14px] font-medium flex items-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer"
        >
          <Plus size={16} />
          <span>Tambah Produk Baru</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-auto">
            <span className="text-[14px] font-semibold text-[#333333] block mb-1.5 sm:hidden">Kategori Cari</span>
            <select
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value as any)}
              className="w-full sm:w-44 bg-slate-50 border border-[#E2E8F0] rounded-lg px-3 py-2 text-[14px] font-medium text-[#1A1A1A] outline-none focus:border-[#5c1616] cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <option value="all">Semua Kategori</option>
              <option value="name">Cari Nama Produk</option>
              <option value="code">Cari Kode Produk</option>
            </select>
          </div>
          <div className="relative flex-1 w-full">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama atau kode sepatu (contoh: G21, Pantofel)..." 
              className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-[14px] font-normal text-[#1A1A1A] outline-none focus:border-[#5c1616]"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" size={15} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#333333]">Stok:</span>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="bg-slate-50 border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[14px] font-medium text-[#1A1A1A] outline-none focus:border-[#5c1616] cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <option value="all">Semua Stok</option>
                <option value="available">Tersedia (&gt;5 pcs)</option>
                <option value="low">Sisa Menipis (≤5 pcs)</option>
                <option value="out">Habis (0 pcs)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#333333]">Harga:</span>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as any)}
                className="bg-slate-50 border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[14px] font-medium text-[#1A1A1A] outline-none focus:border-[#5c1616] cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <option value="all">Semua Rentang Harga</option>
                <option value="0-50k">Rp 0 - Rp 50.000</option>
                <option value="50k-100k">Rp 50.000 - Rp 100.000</option>
                <option value="100k-150k">Rp 100.000 - Rp 150.000</option>
                <option value="150k-200k">Rp 150.000 - Rp 200.000</option>
                <option value="200k+">&gt; Rp 200.000</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#333333]">Urutkan:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[14px] font-medium text-[#1A1A1A] outline-none focus:border-[#5c1616] cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <option value="newest">Terbaru (Default)</option>
                <option value="sold_high">Penjualan Terbanyak</option>
                <option value="price_high">Harga Tertinggi</option>
                <option value="price_low">Harga Terendah</option>
                <option value="stock_low">Stok Menipis</option>
              </select>
            </div>
          </div>
          {(searchQuery || searchCategory !== 'all' || stockFilter !== 'all' || priceRange !== 'all' || sortBy !== 'newest') && (
            <button
              onClick={resetFilters}
              className="text-[12px] font-medium text-[#71717A] hover:text-[#5c1616] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} /> Reset Filter
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-8 py-3.5 border-b border-[#E2E8F0] bg-slate-50/50 flex justify-between items-center text-[12px] text-[#71717A]">
          <span>Menampilkan <strong className="text-[#1A1A1A] font-medium">{filteredProducts.length}</strong> dari {products.length} produk</span>
        </div>
        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 text-[#5c1616] animate-spin" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#71717A]">
              <Box className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-[14px] font-semibold text-[#1A1A1A]">Tidak ada produk ditemukan</p>
              <p className="text-[12px] text-[#71717A] mt-1">Coba sesuaikan kata kunci atau reset filter Anda.</p>
              <button onClick={resetFilters} className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#1A1A1A] text-[12px] font-medium rounded transition-colors cursor-pointer">Reset Filter</button>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[#333333] text-[14px] font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-8 py-3.5">Produk</th>
                  <th className="px-8 py-3.5">Harga</th>
                  <th className="px-8 py-3.5">Stok</th>
                  <th className="px-8 py-3.5">Penjualan</th>
                  <th className="px-8 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredProducts.map(product => {
                  const stk = product.stock ?? 0;
                  const isLow = stk > 0 && stk < 5;
                  const isOut = stk === 0;
                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden border border-[#E2E8F0] flex-shrink-0">
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-[14px] font-medium text-[#1A1A1A] line-clamp-1">{product.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[12px] font-normal text-[#71717A] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {product.model || product.name.split(' ')[0]}
                              </span>
                              <span className="text-[12px] font-normal text-[#71717A]">
                                {product.category === 'Laced' ? 'Upper Tali' : 'Upper Non-Tali'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-[14px] font-medium text-[#1A1A1A]">
                        Rp {product.price?.toLocaleString('id-ID')}
                      </td>
                      <td className="px-8 py-4">
                        <span className={`text-[14px] font-semibold ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-[#16A34A]'}`}>
                          {stk} pcs
                        </span>
                      </td>
                      <td className="px-8 py-4 text-[14px] font-normal text-[#71717A]">
                        {product.sold || 0} pcs
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenEdit(product)} className="p-2 text-[#71717A] hover:text-[#5c1616] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" title="Edit Produk"><Edit size={16} /></button>
                          <button onClick={() => handleDelete(product.id, product.name)} className="p-2 text-[#71717A] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Hapus Produk"><Trash2 size={16} /></button>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50/50">
              <h2 className="text-[20px] font-bold text-[#1A1A1A]">{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>
              <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="text-[#71717A] hover:text-[#1A1A1A] hover:bg-slate-200 p-2 rounded-xl transition-colors disabled:opacity-50 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="addProductForm" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[14px] font-semibold text-[#333333] mb-2">Kategori Sepatu</label>
                    <select 
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        if (!editingProduct) setModelNumber('');
                      }}
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-[14px] font-medium text-[#1A1A1A] focus:border-[#5c1616] outline-none transition-colors cursor-pointer"
                    >
                      <option value="Slip-on">Upper Non-Tali (G)</option>
                      <option value="Laced">Upper Tali (T)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[14px] font-semibold text-[#333333] mb-2">Kode Model</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-0 inset-y-0 flex items-center justify-center pl-4 w-10 border-r border-[#E2E8F0] bg-slate-50 rounded-l-lg font-bold text-[#333333]">
                        {category === 'Laced' ? 'T' : 'G'}
                      </div>
                      <input 
                        type="text" 
                        maxLength={2}
                        placeholder="Contoh: 21" 
                        value={modelNumber}
                        onChange={(e) => setModelNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full border border-[#E2E8F0] rounded-lg pl-14 pr-4 py-2.5 text-[14px] font-medium text-[#1A1A1A] focus:border-[#5c1616] outline-none transition-colors" 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[14px] font-semibold text-[#333333]">Nama Tampilan Produk</label>
                  </div>
                  
                  {editingProduct && (
                    <div className="bg-slate-100 border border-[#E2E8F0] rounded-lg px-3 py-1.5 mb-2 text-[12px] text-[#71717A]">
                      Nama sebelumnya: <span className="font-semibold text-[#1A1A1A]">{editingProduct.name}</span>
                    </div>
                  )}

                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setIsCustomNameEdited(true);
                    }}
                    placeholder="Contoh: G21 Pantofel Hitam Premium" 
                    className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-[14px] font-medium text-[#1A1A1A] focus:border-[#5c1616] outline-none transition-colors" 
                  />
                  <p className="text-[12px] font-normal text-[#71717A] mt-1.5">
                    Nama ini akan menjadi nama resmi produk yang dilihat oleh pembeli. Anda dapat mengubahnya sesuai keinginan.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[14px] font-semibold text-[#333333] mb-2">Harga (Rp)</label>
                    {editingProduct && (
                      <div className="bg-slate-100 border border-[#E2E8F0] rounded-lg px-3.5 py-1.5 mb-2 text-[12px] text-[#71717A]">
                        Harga sebelumnya: <span className="font-semibold text-[#1A1A1A]">Rp {editingProduct.price?.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <input 
                      type="text" 
                      value={price}
                      onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-[14px] font-medium text-[#1A1A1A] focus:border-[#5c1616] outline-none transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] font-semibold text-[#333333] mb-2">Stok (pcs)</label>
                    <input 
                      type="text" 
                      value={initialStock}
                      onChange={(e) => setInitialStock(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-[14px] font-medium text-[#1A1A1A] focus:border-[#5c1616] outline-none transition-colors" 
                      placeholder="Contoh: 50"
                    />
                  </div>
                </div>

                {/* Deskripsi Produk with Previous Description Hint */}
                <div>
                  <label className="block text-[14px] font-semibold text-[#333333] mb-2">Deskripsi Produk</label>
                  {editingProduct && editingProduct.description && (
                    <div className="bg-slate-100 border border-[#E2E8F0] rounded-lg px-3 py-1.5 mb-2 text-[12px] text-[#71717A]">
                      Deskripsi sebelumnya: <span className="font-semibold text-[#1A1A1A]">{editingProduct.description}</span>
                    </div>
                  )}
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tuliskan deskripsi produk, keunggulan bahan, sol, atau kenyamanan sepatu..."
                    className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-[14px] font-medium text-[#1A1A1A] focus:border-[#5c1616] outline-none transition-colors resize-y min-h-[80px]"
                  />
                  <p className="text-[12px] font-normal text-[#71717A] mt-1.5">
                    Deskripsi ini akan muncul di halaman detail produk e-commerce untuk menginformasikan spesifikasi dan keunggulan sepatu kepada pembeli.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-[14px] font-semibold text-[#333333]">Ukuran Tersedia</label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={isAllSizesSelected}
                          onChange={handleSelectAllSizes}
                          className="peer appearance-none w-4 h-4 border border-[#E2E8F0] rounded focus:ring-1 focus:ring-[#5c1616] checked:bg-[#5c1616] checked:border-[#5c1616] cursor-pointer transition-colors" 
                        />
                        <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
                      </div>
                      <span className="text-[12px] font-semibold text-[#71717A] group-hover:text-[#1A1A1A]">Select All</span>
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
                            className="peer appearance-none w-4 h-4 border border-[#E2E8F0] rounded focus:ring-1 focus:ring-[#5c1616] checked:bg-[#5c1616] checked:border-[#5c1616] cursor-pointer transition-colors" 
                          />
                          <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
                        </div>
                        <span className="text-[14px] font-medium text-[#333333] group-hover:text-[#1A1A1A]">{size}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-semibold text-[#333333] mb-2">Foto Thumbnail Utama (Katalog)</label>
                  
                  {imagePreview ? (
                    <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-[#E2E8F0] rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-white rounded-lg border border-[#E2E8F0] overflow-hidden flex-shrink-0">
                          <img src={imagePreview} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <span className="text-[14px] font-medium text-[#1A1A1A] block">Foto Thumbnail Utama</span>
                          <span className="text-[12px] text-[#16A34A] font-semibold">Tersimpan di katalog</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-[#1A1A1A] text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer">
                          <RefreshCw size={13} />
                          <span>Ganti</span>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleThumbnailSelect(e.target.files[0]);
                              }
                            }}
                            className="hidden" 
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview('');
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative border-2 border-dashed border-[#E2E8F0] hover:border-[#5c1616] rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group overflow-hidden">
                      <div className="text-center py-4">
                        <UploadCloud className="w-8 h-8 text-[#71717A] mx-auto mb-2" />
                        <p className="text-[14px] font-medium text-[#1A1A1A]">Klik untuk upload foto thumbnail utama</p>
                        <p className="text-[12px] text-[#71717A] mt-1">Otomatis terkonversi ke WebP (JPG, PNG, JPEG, dll)</p>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleThumbnailSelect(e.target.files[0]);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                      />
                    </div>
                  )}

                  <p className="text-[12px] font-normal text-[#71717A] mt-1.5">
                    Foto ini akan digunakan sebagai foto thumbnail utama yang akan muncul di bagian katalog awal.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[14px] font-semibold text-[#333333]">Foto Pendukung (Mockup / Promosi)</label>
                    <span className="text-[12px] text-[#71717A] font-medium">{galleryFiles.length || galleryPreviews.length} / 6 Foto</span>
                  </div>

                  {galleryPreviews.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {galleryPreviews.map((src, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 border border-[#E2E8F0] rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white rounded-lg border border-[#E2E8F0] overflow-hidden flex-shrink-0">
                              <img src={src} alt={`Promosi ${idx+1}`} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <span className="text-[13px] font-medium text-[#1A1A1A] block">Foto Promosi #{idx+1}</span>
                              <span className="text-[11px] text-[#71717A]">Mockup tampilan produk</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-[#1A1A1A] text-[12px] font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer">
                              <RefreshCw size={12} />
                              <span>Ganti</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    replaceGalleryImage(idx, e.target.files[0]);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => removeGalleryImage(idx)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[12px] font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Trash2 size={12} />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {galleryFiles.length < 6 && (
                    <label className="h-20 border-2 border-dashed border-[#E2E8F0] hover:border-[#5c1616] rounded-xl flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                      <Plus size={18} className="text-[#71717A]" />
                      <span className="text-[12px] font-medium text-[#1A1A1A]">Tambah Foto Promosi Baru (Maks. 6)</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleGalleryAdd(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  )}

                  <p className="text-[12px] font-normal text-[#71717A] mt-1.5 leading-relaxed">
                    Foto pendukung untuk mockup / foto promosi (maksimal 6 foto). Foto-foto ini akan tampil saat produk diklik untuk memberikan opsi sudut tampilan yang memikat pelanggan.
                  </p>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-[#E2E8F0] flex justify-end gap-3 bg-slate-50/50">
              <button 
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-lg text-[14px] font-medium text-[#71717A] hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="submit"
                form="addProductForm"
                disabled={isSubmitting}
                className="bg-[#5c1616] hover:bg-[#400f0f] text-white px-6 py-2.5 rounded-lg text-[14px] font-semibold transition-colors shadow-xs active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>{editingProduct ? 'Simpan Perubahan' : 'Simpan Produk'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
