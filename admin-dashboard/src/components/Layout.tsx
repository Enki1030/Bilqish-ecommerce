import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

export default function Layout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 font-sans">
      {/* Mobile Top App Bar (Visible on < md screens) */}
      <header className="md:hidden bg-white border-b border-[#E2E8F0] px-4 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 -ml-1 text-[#1A1A1A] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Buka Menu"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base font-bold text-[#5c1616] tracking-wider uppercase">
            Ball<span className="text-gray-400 font-normal">qish</span>
          </h1>
        </div>

        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          Admin Online
        </span>
      </header>

      {/* Sidebar Drawer */}
      <Sidebar isMobileOpen={isMobileOpen} onCloseMobile={() => setIsMobileOpen(false)} />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto w-full max-w-full">
        <Outlet />
      </main>
    </div>
  );
}
