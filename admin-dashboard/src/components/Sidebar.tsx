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
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-primary font-heading tracking-widest uppercase">Ball<span className="text-gray-400">qish</span></h1>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-1">
        <NavLink 
          to="/dashboard"
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 font-button rounded-none font-medium transition-colors ${isActive ? 'bg-primary-light text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink 
          to="/products"
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 font-button rounded-none font-medium transition-colors ${isActive ? 'bg-primary-light text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          <Package size={20} />
          <span>Produk & Stok</span>
        </NavLink>
        <NavLink 
          to="/orders"
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 font-button rounded-none font-medium transition-colors ${isActive ? 'bg-primary-light text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          <ShoppingCart size={20} />
          <span>Pesanan</span>
        </NavLink>
      </div>

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full font-button rounded-none font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:bg-primary-light hover:text-primary transition-colors"
        >
          <LogOut size={20} />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}
