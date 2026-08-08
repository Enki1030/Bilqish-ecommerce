import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Edit3, Trash2, Eye, ExternalLink, 
  FileText, CheckCircle2, Clock, Globe, ArrowUpDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  author_name: string;
  status: 'Draft' | 'Published';
  read_time_minutes: number;
  views_count: number;
  cover_image: string;
  published_at: string;
  created_at: string;
}

export default function BlogList() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setArticles(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus artikel "${title}"?`)) return;
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (!error) {
      setArticles(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleToggleStatus = async (article: Article) => {
    const newStatus = article.status === 'Published' ? 'Draft' : 'Published';
    const { error } = await supabase
      .from('articles')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', article.id);

    if (!error) {
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: newStatus } : a));
    }
  };

  const filteredArticles = articles.filter(a => {
    const matchesSearch = !search || 
      a.title.toLowerCase().includes(search.toLowerCase()) || 
      a.slug.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'Semua' || a.category === selectedCategory;
    const matchesStatus = selectedStatus === 'Semua' || a.status === selectedStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const categories = ['Semua', 'Tips & Perawatan', 'Kisah Pengrajin', 'Gaya & Tren', 'Behind the Scenes'];

  return (
    <div className="space-y-6">
      
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manajemen Blog & Artikel</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Kelola konten edukasi, SEO, dan cerita pengrajin Ballqish</p>
        </div>
        <button
          onClick={() => navigate('/blog/new')}
          className="inline-flex items-center gap-2 bg-[#5c1616] hover:bg-[#400f0f] text-white px-4 py-2.5 rounded-xl font-medium text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
        >
          <Plus size={16} />
          <span>Tulis Artikel Baru</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Artikel</span>
          <p className="text-xl font-bold text-gray-900">{articles.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Terbit (Published)</span>
          <p className="text-xl font-bold text-emerald-700">{articles.filter(a => a.status === 'Published').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Draf (Draft)</span>
          <p className="text-xl font-bold text-amber-700">{articles.filter(a => a.status === 'Draft').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">Total Pembaca</span>
          <p className="text-xl font-bold text-[#5c1616]">
            {articles.reduce((sum, a) => sum + (a.views_count || 0), 0).toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari judul artikel..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#5c1616]"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-[#5c1616] bg-white cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
          {['Semua', 'Published', 'Draft'].map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                selectedStatus === status 
                  ? 'bg-[#5c1616] text-white shadow-2xs' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Article Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400 space-y-2">
            <div className="w-6 h-6 border-2 border-[#5c1616] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs">Memuat artikel...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FileText size={40} className="mx-auto text-gray-300" />
            <h3 className="text-sm font-semibold text-gray-800">Belum ada artikel ditemukan</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Mulai tulis artikel edukasi pertama Anda untuk meningkatkan SEO dan kepercayaan pelanggan.
            </p>
            <button
              onClick={() => navigate('/blog/new')}
              className="bg-[#5c1616] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#400f0f] transition-colors cursor-pointer"
            >
              + Buat Artikel Sekarang
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5">Artikel</th>
                  <th className="px-5 py-3.5">Kategori</th>
                  <th className="px-5 py-3.5">Penulis</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Pembaca</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {filteredArticles.map(article => (
                  <tr key={article.id} className="hover:bg-gray-50/70 transition-colors">
                    
                    {/* Cover + Title */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3.5 min-w-[280px]">
                        <img 
                          src={article.cover_image || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=200&q=80'} 
                          alt="" 
                          className="w-14 h-14 object-cover rounded-lg border border-gray-200 bg-gray-100 flex-shrink-0"
                        />
                        <div className="space-y-1">
                          <p className="font-bold text-gray-900 line-clamp-1 hover:text-[#5c1616] cursor-pointer" onClick={() => navigate(`/blog/edit/${article.id}`)}>
                            {article.title}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono line-clamp-1">/{article.slug}</p>
                          <span className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                            <Clock size={11} /> {article.read_time_minutes || 3} mnt baca
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4">
                      <span className="inline-block bg-rose-50 text-[#5c1616] font-semibold text-[11px] px-2.5 py-0.5 rounded-full border border-rose-200">
                        {article.category}
                      </span>
                    </td>

                    {/* Author */}
                    <td className="px-5 py-4 font-medium text-gray-700">
                      {article.author_name || 'Tim Ballqish'}
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggleStatus(article)}
                        title="Klik untuk ubah status"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                          article.status === 'Published'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${article.status === 'Published' ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                        {article.status}
                      </button>
                    </td>

                    {/* Views Count */}
                    <td className="px-5 py-4 text-gray-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Eye size={14} className="text-gray-400" />
                        <span>{article.views_count || 0}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {article.status === 'Published' && (
                          <a
                            href={`https://ballqish-ecommerce.pages.dev/blog/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Lihat di Toko"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                        <button
                          onClick={() => navigate(`/blog/edit/${article.id}`)}
                          className="p-1.5 text-gray-500 hover:text-[#5c1616] rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Edit Artikel"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(article.id, article.title)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus Artikel"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
