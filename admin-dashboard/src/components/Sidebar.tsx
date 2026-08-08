import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, LogOut, Wrench, X, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Drawer */}
      <div className={`fixed md:sticky top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-[#E2E8F0] h-screen flex flex-col font-sans transition-transform duration-300 ease-in-out ${
        isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Sidebar Header / Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#E2E8F0]">
          <h1 className="text-[18px] font-bold text-[#5c1616] tracking-wider uppercase">
            Ball<span className="text-gray-400 font-normal">qish</span>
          </h1>

          {/* Close button on mobile */}
          <button 
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Navigation Links */}
        <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          <NavLink 
            to="/dashboard"
            onClick={handleNavClick}
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-all ${
              isActive ? 'bg-[#5c1616] text-white shadow-xs' : 'text-[#333333] hover:bg-[#fdf5f5] hover:text-[#5c1616]'
            }`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink 
            to="/products"
            onClick={handleNavClick}
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-all ${
              isActive ? 'bg-[#5c1616] text-white shadow-xs' : 'text-[#333333] hover:bg-[#fdf5f5] hover:text-[#5c1616]'
            }`}
          >
            <Package size={18} />
            <span>Produk & Stok</span>
          </NavLink>
          
          <NavLink 
            to="/orders"
            onClick={handleNavClick}
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-all ${
              isActive ? 'bg-[#5c1616] text-white shadow-xs' : 'text-[#333333] hover:bg-[#fdf5f5] hover:text-[#5c1616]'
            }`}
          >
            <ShoppingCart size={18} />
            <span>Pesanan</span>
          </NavLink>

          <NavLink 
            to="/craftsmen"
            onClick={handleNavClick}
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-all ${
              isActive ? 'bg-[#5c1616] text-white shadow-xs' : 'text-[#333333] hover:bg-[#fdf5f5] hover:text-[#5c1616]'
            }`}
          >
            <Wrench size={18} />
            <span>Pengrajin & Bahan</span>
          </NavLink>

          <NavLink 
            to="/blog"
            onClick={handleNavClick}
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-all ${
              isActive ? 'bg-[#5c1616] text-white shadow-xs' : 'text-[#333333] hover:bg-[#fdf5f5] hover:text-[#5c1616]'
            }`}
          >
            <FileText size={18} />
            <span>Blog & Artikel</span>
          </NavLink>
        </div>

        {/* Logout Footer */}
        <div className="p-4 border-t border-[#E2E8F0]">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-[14px] font-medium text-[#71717A] hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <LogOut size={18} />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </>
  );
}

