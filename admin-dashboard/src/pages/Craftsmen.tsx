import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Wrench, 
  History, 
  Plus, 
  Phone, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Edit, 
  MessageSquare,
  Calendar,
  MapPin,
  Trash2
} from 'lucide-react';

interface Craftsman {
  id: string;
  name: string;
  phone: string;
  material_type: string;
  address?: string;
  check_interval_days: number;
  last_checked_at: string;
  created_at?: string;
}

interface RawMaterial {
  id: string;
  craftsman_id: string;
  name: string;
  category: string;
  status: 'Tersedia' | 'Terbatas' | 'Habis';
  delay_days: number;
  notes?: string;
  linked_models?: string[];
  last_checked_at: string;
  created_at?: string;
  craftsmen?: Craftsman;
}

interface MaterialLog {
  id: string;
  material_id: string;
  craftsman_id: string;
  craftsman_name: string;
  material_name: string;
  status: string;
  notes?: string;
  checked_at: string;
}

export default function Craftsmen() {
  const [activeTab, setActiveTab] = useState<'craftsmen' | 'materials' | 'history'>('craftsmen');
  const [craftsmen, setCraftsmen] = useState<Craftsman[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [logs, setLogs] = useState<MaterialLog[]>([]);

  // Modals
  const [showCraftsmanModal, setShowCraftsmanModal] = useState(false);
  const [editingCraftsman, setEditingCraftsman] = useState<Craftsman | null>(null);
  
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);

  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedMaterialForLog, setSelectedMaterialForLog] = useState<RawMaterial | null>(null);

  // Form States - Craftsman
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cType, setCType] = useState('Sol Rubber');
  const [cAddress, setCAddress] = useState('');
  const [cInterval, setCInterval] = useState(7);

  // Form States - Material
  const [mName, setMName] = useState('');
  const [mCraftsmanId, setMCraftsmanId] = useState('');
  const [mCategory, setMCategory] = useState('Outsole');
  const [mStatus, setMStatus] = useState<'Tersedia' | 'Terbatas' | 'Habis'>('Tersedia');
  const [mDelay, setMDelay] = useState(0);
  const [mNotes, setMNotes] = useState('');

  // Form States - Check Log
  const [logStatus, setLogStatus] = useState<'Tersedia' | 'Terbatas' | 'Habis'>('Tersedia');
  const [logDelay, setLogDelay] = useState(0);
  const [logNotes, setLogNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // 1. Fetch Craftsmen
      const { data: cData } = await supabase
        .from('craftsmen')
        .select('*')
        .order('name', { ascending: true });

      // 2. Fetch Raw Materials
      const { data: mData } = await supabase
        .from('raw_materials')
        .select('*, craftsmen(*)')
        .order('name', { ascending: true });

      // 3. Fetch History Logs
      const { data: lData } = await supabase
        .from('craftsmen_material_logs')
        .select('*')
        .order('checked_at', { ascending: false });

      setCraftsmen(cData || []);
      setMaterials(mData || []);
      setLogs(lData || []);
    } catch (err) {
      console.error('Error fetching craftsmen data:', err);
      setCraftsmen([]);
      setMaterials([]);
      setLogs([]);
    }
  }

  // Format WhatsApp Link with Pre-filled Check Message
  const getWaLink = (phone: string, craftsmanName: string, materialName?: string) => {
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
    const msg = encodeURIComponent(`Halo Pak/Bu ${craftsmanName}, mau konfirmasi ketersediaan stok pasokan bahan ${materialName || 'sepatu'} untuk produksi toko kami. Apakah stoknya saat ini masih aman/tersedia? Terima kasih!`);
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  };

  // Automatically update last_checked_at in Supabase when clicking WA contact button
  const handleWaClick = async (craftsmanId: string, phone: string, name: string, materialType?: string) => {
    const nowIso = new Date().toISOString();
    
    // Update in background on Supabase
    supabase.from('craftsmen').update({ last_checked_at: nowIso }).eq('id', craftsmanId).then();

    // Update local state immediately for instant UI response
    setCraftsmen(prev => prev.map(c => c.id === craftsmanId ? { ...c, last_checked_at: nowIso } : c));

    // Open WhatsApp URL in new tab
    const url = getWaLink(phone, name, materialType);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Handle Delete Craftsman
  async function handleDeleteCraftsman(id: string, name: string) {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus pengrajin "${name}"? Data bahan baku terkait juga akan terhapus.`)) return;

    try {
      const { error } = await supabase.from('craftsmen').delete().eq('id', id);
      if (error) {
        console.error('Delete craftsman error:', error);
        alert('Gagal menghapus pengrajin: ' + error.message);
        return;
      }
      setCraftsmen(prev => prev.filter(c => c.id !== id));
      setMaterials(prev => prev.filter(m => m.craftsman_id !== id));
    } catch (e) {
      console.error('Delete error:', e);
    }
  }

  // Handle Delete Raw Material
  async function handleDeleteMaterial(id: string, name: string) {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus bahan baku "${name}"?`)) return;

    try {
      const { error } = await supabase.from('raw_materials').delete().eq('id', id);
      if (error) {
        console.error('Delete raw material error:', error);
        alert('Gagal menghapus bahan baku: ' + error.message);
        return;
      }
      setMaterials(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error('Delete error:', e);
    }
  }

  // Craftsmen needing contact alert (Interval exceeded)
  const urgentCraftsmen = useMemo(() => {
    const now = Date.now();
    return craftsmen.filter(c => {
      const lastCheck = new Date(c.last_checked_at || c.created_at || now).getTime();
      const diffDays = Math.floor((now - lastCheck) / (1000 * 60 * 60 * 24));
      return diffDays >= c.check_interval_days;
    });
  }, [craftsmen]);

  // Handle Craftsman Save
  async function handleSaveCraftsman(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: cName,
      phone: cPhone,
      material_type: cType,
      address: cAddress,
      check_interval_days: Number(cInterval),
      last_checked_at: editingCraftsman ? editingCraftsman.last_checked_at : new Date().toISOString()
    };

    if (editingCraftsman) {
      await supabase.from('craftsmen').update(payload).eq('id', editingCraftsman.id);
      setCraftsmen(prev => prev.map(c => c.id === editingCraftsman.id ? { ...c, ...payload } : c));
    } else {
      const { data } = await supabase.from('craftsmen').insert(payload).select().single();
      const newCraftsman = data || { id: 'c_' + Date.now(), ...payload };
      setCraftsmen(prev => [newCraftsman, ...prev]);
    }

    setShowCraftsmanModal(false);
    resetCraftsmanForm();
  }

  function resetCraftsmanForm() {
    setCName('');
    setCPhone('');
    setCType('Sol Rubber');
    setCAddress('');
    setCInterval(7);
    setEditingCraftsman(null);
  }

  // Handle Raw Material Save
  async function handleSaveMaterial(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: mName,
      craftsman_id: mCraftsmanId,
      category: mCategory,
      status: mStatus,
      delay_days: Number(mDelay),
      notes: mNotes,
      last_checked_at: new Date().toISOString()
    };

    if (editingMaterial) {
      await supabase.from('raw_materials').update(payload).eq('id', editingMaterial.id);
      setMaterials(prev => prev.map(m => m.id === editingMaterial.id ? { ...m, ...payload } : m));
    } else {
      const { data } = await supabase.from('raw_materials').insert(payload).select().single();
      const newMat = data || { id: 'm_' + Date.now(), ...payload };
      setMaterials(prev => [newMat, ...prev]);
    }

    setShowMaterialModal(false);
    resetMaterialForm();
  }

  function resetMaterialForm() {
    setMName('');
    setMCraftsmanId('');
    setMCategory('Outsole');
    setMStatus('Tersedia');
    setMDelay(0);
    setMNotes('');
    setEditingMaterial(null);
  }

  // Handle Check Confirmation Log Submission
  async function handleSaveCheckLog(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMaterialForLog) return;

    const matchedCraftsman = craftsmen.find(c => c.id === selectedMaterialForLog.craftsman_id);
    const cName = matchedCraftsman ? matchedCraftsman.name : 'Pengrajin';

    const updatedMat = {
      status: logStatus,
      delay_days: Number(logDelay),
      notes: logNotes,
      last_checked_at: new Date().toISOString()
    };

    // 1. Update raw material status
    await supabase.from('raw_materials').update(updatedMat).eq('id', selectedMaterialForLog.id);

    // 2. Update craftsman last_checked_at
    if (selectedMaterialForLog.craftsman_id) {
      await supabase.from('craftsmen').update({ last_checked_at: new Date().toISOString() }).eq('id', selectedMaterialForLog.craftsman_id);
    }

    // 3. Create log entry
    const logPayload = {
      material_id: selectedMaterialForLog.id,
      craftsman_id: selectedMaterialForLog.craftsman_id,
      craftsman_name: cName,
      material_name: selectedMaterialForLog.name,
      status: logStatus,
      notes: logNotes,
      checked_at: new Date().toISOString()
    };

    const { data: logData } = await supabase.from('craftsmen_material_logs').insert(logPayload).select().single();
    const newLog = logData || { id: 'l_' + Date.now(), ...logPayload };

    // Local state updates
    setMaterials(prev => prev.map(m => m.id === selectedMaterialForLog.id ? { ...m, ...updatedMat } : m));
    setCraftsmen(prev => prev.map(c => c.id === selectedMaterialForLog.craftsman_id ? { ...c, last_checked_at: new Date().toISOString() } : c));
    setLogs(prev => [newLog, ...prev]);

    setShowLogModal(false);
    setSelectedMaterialForLog(null);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
            <Wrench className="text-[#5c1616]" size={26} /> Manajemen Pengrajin & Bahan Baku
          </h1>
          <p className="text-sm text-[#71717A] mt-1">
            Kelola data tukang/pemasok, monitoring ketersediaan bahan, interval reminder WA, dan riwayat historis stok.
          </p>
        </div>

        {/* Action Button depending on tab */}
        <div className="flex items-center gap-2">
          {activeTab === 'craftsmen' && (
            <button 
              onClick={() => { resetCraftsmanForm(); setShowCraftsmanModal(true); }}
              className="bg-[#5c1616] hover:bg-[#4a1212] text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Plus size={16} /> Tambah Pengrajin
            </button>
          )}
          {activeTab === 'materials' && (
            <button 
              onClick={() => { resetMaterialForm(); setShowMaterialModal(true); }}
              className="bg-[#5c1616] hover:bg-[#4a1212] text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Plus size={16} /> Tambah Bahan Baku
            </button>
          )}
        </div>
      </div>

      {/* 🔴 ALERT BANNER: REMINDER PENGRAJIN PERLU DIHUBUNGI */}
      {urgentCraftsmen.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                {urgentCraftsmen.length} Pengrajin Jatuh Tempo Perlu Dihubungi Hari Ini!
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Berdasarkan interval reminder yang Anda atur, beberapa pengrajin perlu dicek ketersediaan pasokan bahannya.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {urgentCraftsmen.slice(0, 3).map(c => (
              <a
                key={c.id}
                href={getWaLink(c.phone, c.name, c.material_type)}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <MessageSquare size={13} /> {c.name.split(' ')[0]}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="border-b border-[#E2E8F0] flex items-center gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('craftsmen')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'craftsmen' ? 'border-[#5c1616] text-[#5c1616] font-bold' : 'border-transparent text-[#71717A] hover:text-[#1A1A1A]'
          }`}
        >
          <Users size={16} /> Daftar Pengrajin ({craftsmen.length})
        </button>
        <button
          onClick={() => setActiveTab('materials')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'materials' ? 'border-[#5c1616] text-[#5c1616] font-bold' : 'border-transparent text-[#71717A] hover:text-[#1A1A1A]'
          }`}
        >
          <Wrench size={16} /> Bahan Baku ({materials.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'history' ? 'border-[#5c1616] text-[#5c1616] font-bold' : 'border-transparent text-[#71717A] hover:text-[#1A1A1A]'
          }`}
        >
          <History size={16} /> Riwayat Log & Performa ({logs.length})
        </button>
      </div>

      {/* TAB 1: DAFTAR PENGRAJIN */}
      {activeTab === 'craftsmen' && (
        <div className="space-y-4">
          {craftsmen.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-[#E2E8F0] shadow-xs text-center space-y-3">
              <div className="w-12 h-12 bg-rose-50 text-[#5c1616] rounded-full flex items-center justify-center mx-auto">
                <Users size={24} />
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A]">Belum Ada Data Pengrajin</h3>
              <p className="text-xs text-[#71717A] max-w-sm mx-auto">
                Silakan klik tombol **"Tambah Pengrajin"** di kanan atas untuk memasukkan data tukang/pemasok bahan baku pertama Anda.
              </p>
              <button
                onClick={() => { resetCraftsmanForm(); setShowCraftsmanModal(true); }}
                className="mt-2 inline-flex items-center gap-2 bg-[#5c1616] hover:bg-[#4a1212] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                <Plus size={16} /> Tambah Pengrajin Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {craftsmen.map((c) => {
                const lastCheckDate = new Date(c.last_checked_at || c.created_at || Date.now());
                const diffDays = Math.floor((Date.now() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24));
                const isDue = diffDays >= c.check_interval_days;

                return (
                  <div 
                    key={c.id} 
                    className="bg-white p-4.5 rounded-[18px] border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between text-left font-sans space-y-4"
                  >
                    <div>
                      {/* HEADER SECTION */}
                      <div className="flex justify-between items-start">
                        <div>
                          {/* Nama Pengrajin (Compact 15px Bold Title) */}
                          <h3 className="text-[15px] font-bold text-[#1A1A1A] leading-snug">
                            {c.name}
                          </h3>
                          {/* Sub-judul Jenis Bahan (Compact 12px Regular) */}
                          <p className="text-[12px] font-normal text-slate-400 mt-0.5">
                            {c.material_type}
                          </p>
                        </div>

                        {/* Status Badge Pill Top Right (Compact 11px) */}
                        <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                          isDue 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : 'bg-[#E6F9F0] text-[#00B060] border-[#B3F2D4]'
                        }`}>
                          {isDue ? 'Perlu Cek' : 'Aman'}
                        </span>
                      </div>

                      {/* CONTACT SECTION */}
                      <div className="mt-3.5 space-y-1">
                        {/* Nomor Telepon (Compact 13px) */}
                        <div className="text-[13px] font-bold text-[#1A1A1A] flex items-center gap-1.5">
                          <Phone size={13} className="text-slate-400 shrink-0" />
                          <span>{c.phone}</span>
                        </div>

                        {/* Alamat (Compact 11px) */}
                        {c.address && (
                          <div className="text-[11px] font-normal text-slate-400 flex items-start gap-1.5 line-clamp-2 leading-relaxed mt-0.5">
                            <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                            <span>{c.address}</span>
                          </div>
                        )}
                      </div>

                      {/* MONITORING SECTION (2 Columns Grid Layout) */}
                      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 text-left">
                        <div>
                          <span className="text-[13px] font-bold text-[#1A1A1A] block font-sans">Setiap {c.check_interval_days} hr</span>
                          <span className="text-[10px] font-normal text-slate-400 mt-0.5 block font-sans">Interval Cek</span>
                        </div>
                        <div>
                          <span className="text-[13px] font-bold text-[#1A1A1A] block font-sans">{diffDays === 0 ? 'Hari Ini' : `${diffDays} hr lalu`}</span>
                          <span className="text-[10px] font-normal text-slate-400 mt-0.5 block font-sans">Cek Terakhir</span>
                        </div>
                      </div>
                    </div>

                    {/* ACTION SECTION (WA Pill Button, Edit Icon & Trash Icon) */}
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={() => handleWaClick(c.id, c.phone, c.name, c.material_type)}
                        className="flex-1 bg-[#10D061] hover:bg-[#0ebf57] text-white font-semibold text-[12px] py-2.5 px-3 rounded-[12px] flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        title="Hubungi Pengrajin via WA & Otomatis Update Tanggal Cek Terakhir"
                      >
                        <MessageSquare size={14} /> Hubungi via WA
                      </button>
                      <button
                        onClick={() => {
                          setEditingCraftsman(c);
                          setCName(c.name);
                          setCPhone(c.phone);
                          setCType(c.material_type);
                          setCAddress(c.address || '');
                          setCInterval(c.check_interval_days);
                          setShowCraftsmanModal(true);
                        }}
                        className="w-9 h-9 rounded-[12px] border border-slate-200 text-slate-500 hover:text-[#5c1616] hover:border-[#5c1616] flex items-center justify-center bg-white shadow-2xs transition-colors cursor-pointer shrink-0"
                        title="Edit Pengrajin"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteCraftsman(c.id, c.name)}
                        className="w-9 h-9 rounded-[12px] border border-rose-200 text-rose-500 hover:text-rose-700 hover:bg-rose-50 flex items-center justify-center bg-white shadow-2xs transition-colors cursor-pointer shrink-0"
                        title="Hapus Pengrajin"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BAHAN BAKU & KETERHUBUNGAN VARIAN */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          {materials.length === 0 ? (
            <div className="bg-white p-12 rounded-[18px] border border-slate-100 shadow-xs text-center space-y-3">
              <div className="w-12 h-12 bg-rose-50 text-[#5c1616] rounded-full flex items-center justify-center mx-auto">
                <Wrench size={24} />
              </div>
              <h3 className="text-base font-bold text-[#1A1A1A]">Belum Ada Data Bahan Baku</h3>
              <p className="text-xs text-[#71717A] max-w-sm mx-auto">
                Silakan klik tombol **"Tambah Bahan Baku"** di kanan atas untuk mendaftarkan pasokan bahan baku dari pengrajin.
              </p>
              <button
                onClick={() => { resetMaterialForm(); setShowMaterialModal(true); }}
                className="mt-2 inline-flex items-center gap-2 bg-[#5c1616] hover:bg-[#4a1212] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                <Plus size={16} /> Tambah Bahan Baku Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map((m) => {
                const matchedCraftsman = craftsmen.find(c => c.id === m.craftsman_id);
                const cName = matchedCraftsman ? matchedCraftsman.name : (m.craftsmen?.name || 'Pengrajin Terkait');

                return (
                  <div 
                    key={m.id} 
                    className="bg-white p-4.5 rounded-[18px] border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between text-left font-sans space-y-4"
                  >
                    <div>
                      {/* HEADER SECTION */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-[15px] font-bold text-[#1A1A1A] leading-snug">
                            {m.name}
                          </h3>
                          <p className="text-[12px] font-normal text-slate-400 mt-0.5">
                            Pemasok: {cName}
                          </p>
                        </div>

                        <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                          m.status === 'Tersedia' ? 'bg-[#E6F9F0] text-[#00B060] border-[#B3F2D4]' :
                          m.status === 'Terbatas' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {m.status} {m.delay_days > 0 ? `(+${m.delay_days}h PO)` : ''}
                        </span>
                      </div>

                      {/* CONTACT / CATEGORY SECTION */}
                      <div className="mt-3.5 space-y-1">
                        <div className="text-[13px] font-bold text-[#1A1A1A] flex items-center gap-1.5">
                          <Users size={13} className="text-slate-400 shrink-0" />
                          <span>{m.category}</span>
                        </div>
                        {m.notes && (
                          <div className="text-[11px] font-normal text-slate-400 leading-relaxed mt-0.5">
                            Catatan: {m.notes}
                          </div>
                        )}
                      </div>

                      {/* MONITORING SECTION (2 Columns Grid) */}
                      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 text-left">
                        <div>
                          <span className="text-[13px] font-bold text-[#1A1A1A] block font-sans">+{m.delay_days} Hari</span>
                          <span className="text-[10px] font-normal text-slate-400 mt-0.5 block font-sans">Estimasi PO</span>
                        </div>
                        <div>
                          <span className="text-[13px] font-bold text-[#1A1A1A] block font-sans">
                            {new Date(m.last_checked_at || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-[10px] font-normal text-slate-400 mt-0.5 block font-sans">Cek Terakhir</span>
                        </div>
                      </div>
                    </div>

                    {/* ACTION SECTION */}
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedMaterialForLog(m);
                          setLogStatus(m.status);
                          setLogDelay(m.delay_days);
                          setLogNotes(m.notes || '');
                          setShowLogModal(true);
                        }}
                        className="flex-1 bg-[#10D061] hover:bg-[#0ebf57] text-white font-semibold text-[12px] py-2.5 px-3 rounded-[12px] flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        title="Input Hasil Konfirmasi Stok WA"
                      >
                        <CheckCircle2 size={14} /> Input Cek WA
                      </button>
                      <button
                        onClick={() => {
                          setEditingMaterial(m);
                          setMName(m.name);
                          setMCraftsmanId(m.craftsman_id);
                          setMCategory(m.category);
                          setMStatus(m.status);
                          setMDelay(m.delay_days);
                          setMNotes(m.notes || '');
                          setShowMaterialModal(true);
                        }}
                        className="w-9 h-9 rounded-[12px] border border-slate-200 text-slate-500 hover:text-[#5c1616] hover:border-[#5c1616] flex items-center justify-center bg-white shadow-2xs transition-colors cursor-pointer shrink-0"
                        title="Edit Bahan Baku"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteMaterial(m.id, m.name)}
                        className="w-9 h-9 rounded-[12px] border border-rose-200 text-rose-500 hover:text-rose-700 hover:bg-rose-50 flex items-center justify-center bg-white shadow-2xs transition-colors cursor-pointer shrink-0"
                        title="Hapus Bahan Baku"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RIWAYAT LOG & PERFORMA SUPPLIER */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A]">Jejak Historis Konfirmasi Stok</h2>
              <p className="text-xs text-[#71717A] mt-0.5">Catatan waktu riil hasil pemeriksaan ketersediaan bahan oleh Admin.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-[#71717A] uppercase tracking-wider border-b border-[#E2E8F0]">
                  <th className="py-3 px-4">Tanggal Cek</th>
                  <th className="py-3 px-4">Pengrajin / Supplier</th>
                  <th className="py-3 px-4">Bahan Baku</th>
                  <th className="py-3 px-4">Status Ketersediaan</th>
                  <th className="py-3 px-4">Catatan & Hasil Telepon/WA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">Belum ada riwayat pencatatan log.</td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(l.checked_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#1A1A1A]">{l.craftsman_name}</td>
                      <td className="py-3.5 px-4 text-[#333333] font-medium">{l.material_name}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          l.status === 'Tersedia' ? 'bg-emerald-100 text-emerald-800' :
                          l.status === 'Terbatas' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#71717A] max-w-md">{l.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: INPUT HASIL CHECK WA / TELEPON */}
      {showLogModal && selectedMaterialForLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#1A1A1A]">Pencatatan Konfirmasi Stok Manual</h3>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveCheckLog} className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Bahan Baku:</span>
                <p className="text-sm font-bold text-[#1A1A1A]">{selectedMaterialForLog.name}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1A1A] block mb-1">Status Ketersediaan Saat Ini:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Tersedia', 'Terbatas', 'Habis'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setLogStatus(st)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        logStatus === st 
                          ? st === 'Tersedia' ? 'bg-emerald-600 text-white shadow-xs' : st === 'Terbatas' ? 'bg-amber-500 text-white shadow-xs' : 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {logStatus !== 'Tersedia' && (
                <div>
                  <label className="text-xs font-semibold text-[#1A1A1A] block mb-1">Estimasi Waktu Indent/PO (Hari):</label>
                  <input
                    type="number"
                    min={0}
                    value={logDelay}
                    onChange={(e) => setLogDelay(Number(e.target.value))}
                    className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#5c1616]"
                    placeholder="Contoh: 2"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Status ini akan menampilkan pesan estimasi PO di detail produk E-Commerce.</p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#1A1A1A] block mb-1">Catatan Hasil Telepon / WA:</label>
                <textarea
                  rows={3}
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#5c1616]"
                  placeholder="Contoh: Pak Herman info sol rubber terbatas sisa 15 pasang, restok hari Jumat."
                />
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 py-2.5 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#5c1616] hover:bg-[#4a1212] text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Simpan Hasil Cek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT PENGRAJIN */}
      {showCraftsmanModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#1A1A1A]">
                {editingCraftsman ? 'Edit Data Pengrajin' : 'Tambah Pengrajin Baru'}
              </h3>
              <button onClick={() => setShowCraftsmanModal(false)} className="text-slate-400 text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveCraftsman} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#1A1A1A] block mb-1">Nama Pengrajin / Workshop:</label>
                <input
                  type="text"
                  required
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#5c1616]"
                  placeholder="Contoh: Pak Herman (Bengkel Sol)"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1A1A] block mb-1">No. Kontak WhatsApp:</label>
                <input
                  type="text"
                  required
                  value={cPhone}
                  onChange={(e) => setCPhone(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#5c1616]"
                  placeholder="Contoh: 081234567890"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1A1A] block mb-1">Jenis Bahan yang Dipasok:</label>
                <input
                  type="text"
                  required
                  value={cType}
                  onChange={(e) => setCType(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#5c1616]"
                  placeholder="Contoh: Sol Rubber, Upper Kulit"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1A1A] block mb-1">Interval Reminder Cek Stok (Hari):</label>
                <select
                  value={cInterval}
                  onChange={(e) => setCInterval(Number(e.target.value))}
                  className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#5c1616]"
                >
                  <option value={3}>Setiap 3 Hari (Sangat Sering)</option>
                  <option value={7}>Setiap 7 Hari (Mingguan)</option>
                  <option value={14}>Setiap 14 Hari (2 Minggu)</option>
                  <option value={30}>Setiap 30 Hari (Bulanan)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1A1A] block mb-1">Alamat Bengkel / Workshop:</label>
                <textarea
                  rows={2}
                  value={cAddress}
                  onChange={(e) => setCAddress(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#5c1616]"
                  placeholder="Alamat lengkap bengkel..."
                />
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCraftsmanModal(false)}
                  className="flex-1 py-2.5 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#5c1616] hover:bg-[#4a1212] text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Simpan Pengrajin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT BAHAN BAKU */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#1A1A1A]">
                {editingMaterial ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
              </h3>
              <button onClick={() => setShowMaterialModal(false)} className="text-slate-400 text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#1A1A1A] block mb-1">Nama Bahan Baku:</label>
                <input
                  type="text"
                  required
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#5c1616]"
                  placeholder="Contoh: Sol Rubber Model 1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1A1A] block mb-1">Pengrajin Pemasok Terkait:</label>
                <select
                  required
                  value={mCraftsmanId}
                  onChange={(e) => setMCraftsmanId(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#5c1616]"
                >
                  <option value="">-- Pilih Pengrajin --</option>
                  {craftsmen.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.material_type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1A1A] block mb-1">Kategori Bahan:</label>
                <select
                  value={mCategory}
                  onChange={(e) => setMCategory(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#5c1616]"
                >
                  <option value="Outsole">Outsole / Sol</option>
                  <option value="Upper">Upper / Atasan</option>
                  <option value="Leather">Kulit Lembaran</option>
                  <option value="Lining">Lining / Dalaman</option>
                  <option value="Laces">Tali & Aksesoris</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1A1A] block mb-1">Status Ketersediaan AWAL:</label>
                <select
                  value={mStatus}
                  onChange={(e) => setMStatus(e.target.value as any)}
                  className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#5c1616]"
                >
                  <option value="Tersedia">Tersedia (Aman)</option>
                  <option value="Terbatas">Terbatas (Hampir Habis)</option>
                  <option value="Habis">Habis (Perlu Restok)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1A1A] block mb-1">Catatan Tambahan:</label>
                <textarea
                  rows={2}
                  value={mNotes}
                  onChange={(e) => setMNotes(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg p-2.5 text-xs outline-none focus:border-[#5c1616]"
                  placeholder="Keterangan pasokan..."
                />
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="flex-1 py-2.5 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#5c1616] hover:bg-[#4a1212] text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Simpan Bahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
