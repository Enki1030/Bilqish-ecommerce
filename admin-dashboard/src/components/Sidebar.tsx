import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="w-64 bg-white border-r border-[#E2E8F0] h-screen flex flex-col sticky top-0 font-sans">
      {/* Sidebar Header / Logo */}
      <div className="h-16 flex items-center px-6 border-b border-[#E2E8F0]">
        <h1 className="text-[18px] font-bold text-[#0F172A] tracking-wider uppercase">
          Ball<span className="text-slate-400 font-normal">qish</span>
        </h1>
      </div>
      
      {/* Navigation Links */}
      <div className="flex-1 py-6 px-4 space-y-1.5">
        <NavLink 
          to="/dashboard"
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-all ${
            isActive ? 'bg-[#0F172A] text-white shadow-xs' : 'text-[#333333] hover:bg-slate-100 hover:text-[#1A1A1A]'
          }`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>
        
        <NavLink 
          to="/products"
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-all ${
            isActive ? 'bg-[#0F172A] text-white shadow-xs' : 'text-[#333333] hover:bg-slate-100 hover:text-[#1A1A1A]'
          }`}
        >
          <Package size={18} />
          <span>Produk & Stok</span>
        </NavLink>
        
        <NavLink 
          to="/orders"
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-all ${
            isActive ? 'bg-[#0F172A] text-white shadow-xs' : 'text-[#333333] hover:bg-slate-100 hover:text-[#1A1A1A]'
          }`}
        >
          <ShoppingCart size={18} />
          <span>Pesanan</span>
        </NavLink>
      </div>

      {/* Logout Footer */}
      <div className="p-4 border-t border-[#E2E8F0]">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-[14px] font-medium text-[#71717A] hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <LogOut size={18} />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}

