import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Upload, Image as ImageIcon, Sparkles, 
  Eye, Check, Link as LinkIcon, Bold, Italic, Underline as UnderlineIcon, 
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus, Undo, Redo
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import UnderlineExtension from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { supabase } from '../lib/supabase';

// Convert any image to lightweight WebP
async function convertToWebP(file: File, quality = 0.85): Promise<File> {
  if (file.type === 'image/svg+xml' || file.type === 'image/webp') {
    return file;
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

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  // Form States
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [category, setCategory] = useState('Tips & Perawatan');
  const [authorName, setAuthorName] = useState('Tim Pengrajin Ballqish');
  const [status, setStatus] = useState<'Draft' | 'Published'>('Published');
  const [readTimeMinutes, setReadTimeMinutes] = useState(3);
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);

  // TipTap Editor Setup
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-6 my-3 space-y-1'
          }
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-6 my-3 space-y-1'
          }
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-[#5c1616] pl-4 py-2 my-4 italic bg-[#faf9f6] text-gray-700 rounded-r-lg'
          }
        }
      }),
      UnderlineExtension,
      ImageExtension.configure({
        HTMLAttributes: {
          class: 'rounded-xl shadow-md my-4 max-h-[450px] w-full object-cover'
        }
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#5c1616] underline font-semibold cursor-pointer'
        }
      }),
      Placeholder.configure({
        placeholder: 'Mulai ketik artikel Anda di sini... Sorot teks untuk memunculkan menu format atau drag & drop gambar ke sini.'
      })
    ],
    content: '<p></p>',
    onUpdate: ({ editor }) => {
      // Calculate reading time based on word count
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const readTime = Math.max(1, Math.ceil(words / 180));
      setReadTimeMinutes(readTime);
    }
  });

  useEffect(() => {
    fetchProducts();
    if (id) {
      fetchArticle(id);
    }
  }, [id]);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('id, name, price, image');
    if (data) setProducts(data);
  };

  const fetchArticle = async (articleId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (!error && data) {
      setTitle(data.title || '');
      setSlug(data.slug || '');
      setExcerpt(data.excerpt || '');
      setCoverImage(data.cover_image || '');
      setCategory(data.category || 'Tips & Perawatan');
      setAuthorName(data.author_name || 'Tim Pengrajin Ballqish');
      setStatus(data.status || 'Published');
      setReadTimeMinutes(data.read_time_minutes || 3);
      setFeaturedProductIds(data.featured_product_ids || []);
      
      if (editor) {
        editor.commands.setContent(data.content || '');
      }
    }
    setLoading(false);
  };

  // Auto-slugifier
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!id) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generatedSlug);
    }
  };

  // Upload Image to Supabase Storage ('product-image') as WebP
  const handleUploadImage = async (file: File): Promise<string | null> => {
    try {
      const webpFile = await convertToWebP(file);
      const fileName = `blog-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webp`;
      const filePath = `blog/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-image')
        .upload(filePath, webpFile, { 
          contentType: 'image/webp',
          cacheControl: '3600', 
          upsert: true 
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-image')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      alert(`Gagal upload gambar: ${err.message}`);
      return null;
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const url = await handleUploadImage(file);
    if (url) setCoverImage(url);
    setUploadingCover(false);
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const url = await handleUploadImage(file);
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  // Drag and Drop Images onto Editor Canvas
  const handleEditorDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const url = await handleUploadImage(file);
        if (url && editor) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      }
    }
  };

  // Save Article
  const handleSave = async (publishStatus: 'Draft' | 'Published') => {
    if (!title.trim()) {
      alert('Mohon isi judul artikel');
      return;
    }
    if (!slug.trim()) {
      alert('Mohon tentukan URL Slug artikel');
      return;
    }
    if (!editor) return;

    setSaving(true);
    const contentHtml = editor.getHTML();

    const payload: any = {
      title,
      slug,
      excerpt,
      content: contentHtml,
      cover_image: coverImage,
      category,
      author_name: authorName,
      status: publishStatus,
      read_time_minutes: readTimeMinutes,
      featured_product_ids: featuredProductIds,
      updated_at: new Date().toISOString()
    };

    if (!id) {
      payload.published_at = new Date().toISOString();
      const { data, error } = await supabase.from('articles').insert([payload]).select().single();
      if (error) {
        alert(`Gagal menyimpan artikel: ${error.message}`);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('articles').update(payload).eq('id', id);
      if (error) {
        alert(`Gagal memperbarui artikel: ${error.message}`);
        setSaving(false);
        return;
      }
    }

    // Trigger Cloudflare Pages auto-build in background so E-Commerce static catalog updates
    fetch('https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/984ad6b4-c842-44cb-a50e-855dbfb7d6d4', { method: 'POST' }).catch(console.error);

    setSaving(false);
    alert(publishStatus === 'Published' ? 'Artikel berhasil diterbitkan!' : 'Draf artikel berhasil disimpan!');
    navigate('/blog');
  };

  const toggleProductSelect = (pId: string) => {
    setFeaturedProductIds(prev => 
      prev.includes(pId) ? prev.filter(x => x !== pId) : [...prev, pId]
    );
  };

  const categories = ['Tips & Perawatan', 'Kisah Pengrajin', 'Gaya & Tren', 'Behind the Scenes'];

  if (loading) {
    return (
      <div className="text-center py-24 text-gray-400 space-y-2">
        <div className="w-8 h-8 border-2 border-[#5c1616] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs">Memuat editor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs sticky top-4 z-30">
        <button
          type="button"
          onClick={() => navigate('/blog')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Daftar</span>
        </button>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => handleSave('Draft')}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Simpan Draf
          </button>
          <button
            type="button"
            onClick={() => handleSave('Published')}
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-[#5c1616] hover:bg-[#400f0f] text-white px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save size={15} />
            <span>{saving ? 'Menyimpan...' : 'Terbitkan Artikel'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT / MAIN COLUMN: Notion-Style Document Canvas */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-white p-6 sm:p-10 rounded-2xl border border-gray-200 shadow-xs space-y-6">
            
            {/* Title Input (Medium/Notion Style) */}
            <div>
              <input
                type="text"
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Judul Artikel..."
                className="w-full text-2xl sm:text-3xl font-bold font-heading text-gray-900 placeholder-gray-300 focus:outline-none border-b border-transparent focus:border-gray-200 pb-2"
              />
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 font-mono">
                <span>Slug URL:</span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-xs text-gray-700 focus:outline-none"
                  placeholder="judul-artikel-anda"
                />
              </div>
            </div>

            {/* Excerpt / Summary Textarea */}
            <div>
              <label className="block text-[11px] font-heading font-bold text-gray-700 uppercase tracking-wide mb-1">
                Ringkasan Artikel (Excerpt & Meta SEO)
              </label>
              <textarea
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                rows={2}
                placeholder="Tulis ringkasan singkat 1-2 kalimat untuk preview di Google dan kartu blog..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-[#5c1616]"
              />
            </div>

            {/* TIPTAP WYSIWYG TOOLBAR */}
            {editor && (
              <div className="border border-gray-200 rounded-xl p-1.5 bg-gray-50/90 flex flex-wrap items-center gap-1 sticky top-20 z-20 shadow-2xs">
                
                {/* Heading Options */}
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                    editor.isActive('heading', { level: 2 }) ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Heading 2 (H2)"
                >
                  H2
                </button>
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                    editor.isActive('heading', { level: 3 }) ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Heading 3 (H3)"
                >
                  H3
                </button>

                <span className="h-4 w-px bg-gray-300 mx-1" />

                {/* Formats */}
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    editor.isActive('bold') ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Tebal (Ctrl+B)"
                >
                  <Bold size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    editor.isActive('italic') ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Miring (Ctrl+I)"
                >
                  <Italic size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    editor.isActive('underline') ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Garis Bawah (Ctrl+U)"
                >
                  <UnderlineIcon size={15} />
                </button>

                <span className="h-4 w-px bg-gray-300 mx-1" />

                {/* Lists & Quote */}
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    editor.isActive('bulletList') ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Daftar Bullet (•)"
                >
                  <List size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    editor.isActive('orderedList') ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Daftar Nomor (1.)"
                >
                  <ListOrdered size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    editor.isActive('blockquote') ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'
                  }`}
                  title="Kutipan / Blockquote"
                >
                  <Quote size={15} />
                </button>

                <span className="h-4 w-px bg-gray-300 mx-1" />

                {/* Insert Image Button */}
                <button
                  type="button"
                  onClick={() => inlineImageInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-gray-700 hover:bg-gray-200 cursor-pointer"
                  title="Sisipkan Foto"
                >
                  <ImageIcon size={15} className="text-[#5c1616]" />
                  <span>+ Foto</span>
                </button>
                <input
                  type="file"
                  ref={inlineImageInputRef}
                  onChange={handleInlineImageUpload}
                  accept="image/*"
                  className="hidden"
                />

                <span className="h-4 w-px bg-gray-300 mx-1" />

                {/* Undo / Redo */}
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => editor.chain().focus().undo().run()}
                  className="p-1.5 rounded text-gray-700 hover:bg-gray-200 cursor-pointer"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo size={15} />
                </button>
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => editor.chain().focus().redo().run()}
                  className="p-1.5 rounded text-gray-700 hover:bg-gray-200 cursor-pointer"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo size={15} />
                </button>
              </div>
            )}

            {/* FLOATING BUBBLE MENU (Appears when text is highlighted) */}
            {editor && (
              <BubbleMenu editor={editor}>
                <div className="flex items-center gap-0.5 bg-gray-900 text-white p-1 rounded-xl shadow-2xl border border-gray-700 text-xs">
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded hover:bg-gray-800 cursor-pointer ${
                      editor.isActive('bold') ? 'text-amber-300 font-bold' : 'text-white'
                    }`}
                  >
                    <Bold size={14} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded hover:bg-gray-800 cursor-pointer ${
                      editor.isActive('italic') ? 'text-amber-300 font-bold' : 'text-white'
                    }`}
                  >
                    <Italic size={14} />
                  </button>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`p-1.5 rounded hover:bg-gray-800 cursor-pointer ${
                      editor.isActive('underline') ? 'text-amber-300 font-bold' : 'text-white'
                    }`}
                  >
                    <UnderlineIcon size={14} />
                  </button>
                  <span className="h-3 w-px bg-gray-700 mx-1" />
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`px-2 py-1 rounded hover:bg-gray-800 font-bold cursor-pointer ${
                      editor.isActive('heading', { level: 2 }) ? 'text-amber-300' : 'text-white'
                    }`}
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`px-2 py-1 rounded hover:bg-gray-800 font-bold cursor-pointer ${
                      editor.isActive('heading', { level: 3 }) ? 'text-amber-300' : 'text-white'
                    }`}
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`p-1.5 rounded hover:bg-gray-800 cursor-pointer ${
                      editor.isActive('blockquote') ? 'text-amber-300' : 'text-white'
                    }`}
                  >
                    <Quote size={14} />
                  </button>
                </div>
              </BubbleMenu>
            )}

            {/* EDITOR CANVAS */}
            <div 
              onDrop={handleEditorDrop} 
              onDragOver={e => e.preventDefault()}
              className="min-h-[400px] border border-dashed border-gray-200 rounded-xl p-4 sm:p-6 focus-within:border-[#5c1616] transition-colors bg-white cursor-text tiptap-article-wrapper"
            >
              <EditorContent editor={editor} className="prose max-w-none focus:outline-none min-h-[360px]" />
            </div>

            <p className="text-[11px] text-gray-400 italic">
              💡 Tip: Sorot teks dengan mouse untuk format cepat, atau tarik foto langsung dari laptop Anda ke dalam lembar editor (otomatis terkonversi WebP).
            </p>

          </div>

        </div>

        {/* RIGHT COLUMN: Settings, Cover, & Product Promotion */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Cover Image Upload Box */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <label className="block text-xs font-heading font-bold text-gray-800 uppercase tracking-wide">
              Gambar Cover Utama (WebP)
            </label>
            
            {coverImage ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 h-44 bg-gray-100 group">
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  Ganti
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-[#5c1616] rounded-xl p-6 text-center cursor-pointer bg-gray-50/50 hover:bg-rose-50/30 transition-colors"
              >
                <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                <p className="text-xs font-semibold text-gray-700">
                  {uploadingCover ? 'Mengunggah & Mengonversi...' : 'Upload Foto Cover'}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Otomatis dioptimasi menjadi WebP</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleCoverUpload} 
              accept="image/*" 
              className="hidden" 
            />

            <input
              type="url"
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              placeholder="Atau tempel URL gambar..."
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            />
          </div>

          {/* Publishing Meta Settings */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-xs font-heading font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
              Pengaturan Publikasi
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wide mb-1">Kategori</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#5c1616] bg-white cursor-pointer"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wide mb-1">Nama Penulis</label>
              <input
                type="text"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#5c1616]"
                placeholder="Contoh: Master Pengrajin Ballqish"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wide mb-1">Estimasi Waktu Baca</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={readTimeMinutes}
                  onChange={e => setReadTimeMinutes(parseInt(e.target.value) || 1)}
                  className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#5c1616]"
                />
                <span className="text-xs text-gray-500">Menit</span>
              </div>
            </div>
          </div>

          {/* Content-to-Commerce: Featured Products */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <span className="text-[10px] font-bold text-[#5c1616] uppercase tracking-wider">Content to Commerce</span>
                <h3 className="text-xs font-heading font-bold text-gray-900">Promosikan Sepatu di Artikel</h3>
              </div>
              <Sparkles size={16} className="text-[#5c1616]" />
            </div>

            <p className="text-[11px] text-gray-500">
              Pilih sepatu yang ingin ditampilkan di akhir artikel agar pembaca bisa langsung membelinya:
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pt-1">
              {products.map(prod => {
                const isSelected = featuredProductIds.includes(prod.id);
                return (
                  <div
                    key={prod.id}
                    onClick={() => toggleProductSelect(prod.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected ? 'border-[#5c1616] bg-rose-50/50' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-gray-300 text-[#5c1616] focus:ring-[#5c1616] w-4 h-4 cursor-pointer"
                    />
                    <img src={prod.image} alt={prod.name} className="w-9 h-9 object-contain bg-gray-50 rounded" />
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-semibold text-gray-900 truncate">{prod.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold">Rp {prod.price?.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Editor ProseMirror Styling */}
      <style>{`
        .tiptap-article-wrapper .ProseMirror:focus {
          outline: none;
        }
        .tiptap-article-wrapper .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.3;
        }
        .tiptap-article-wrapper .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin-top: 1.25rem;
          margin-bottom: 0.35rem;
          line-height: 1.3;
        }
        .tiptap-article-wrapper .ProseMirror p {
          color: #374151;
          line-height: 1.75;
          margin-bottom: 1rem;
          font-size: 0.95rem;
        }
        .tiptap-article-wrapper .ProseMirror ul {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
          margin: 1rem 0 !important;
          color: #374151;
        }
        .tiptap-article-wrapper .ProseMirror ol {
          list-style-type: decimal !important;
          padding-left: 1.5rem !important;
          margin: 1rem 0 !important;
          color: #374151;
        }
        .tiptap-article-wrapper .ProseMirror li {
          margin-bottom: 0.35rem;
        }
        .tiptap-article-wrapper .ProseMirror blockquote {
          border-left: 4px solid #5c1616 !important;
          padding-left: 1rem !important;
          font-style: italic !important;
          color: #4b5563 !important;
          background-color: #faf9f6 !important;
          padding-top: 0.5rem !important;
          padding-bottom: 0.5rem !important;
          margin: 1.25rem 0 !important;
          border-radius: 0 0.5rem 0.5rem 0 !important;
        }
        .tiptap-article-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
