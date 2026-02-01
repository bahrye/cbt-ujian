'use client'
import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName: string;
}

export default function Sidebar({ activeTab, setActiveTab, userName }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false); // State untuk burger menu

  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
      await signOut(auth);
      window.location.href = "/login";
    }
  };

  return (
    <>
      {/* Tombol Burger (Hanya muncul di Mobile) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[110] p-2 bg-slate-900 text-white rounded-md"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Overlay untuk menutup sidebar saat klik di luar (Mobile) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[100] lg:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`
        w-64 bg-slate-900 text-white flex flex-col h-screen sticky top-0 z-[105]
        fixed lg:relative transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-blue-400">CBT ONLINE</h2>
          <p className="text-xs text-slate-400 mt-1">Halo, {userName}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => { setActiveTab('jadwal'); setIsOpen(false); }}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'jadwal' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}
          >
            <span>📅</span> Jadwal Ujian
          </button>
          <button 
            onClick={() => { setActiveTab('tata-tertib'); setIsOpen(false); }}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'tata-tertib' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}
          >
            <span>📜</span> Tata Tertib
          </button>
          
          {/* Tombol Keluar */}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all mt-10"
          >
            <span>🚪</span> Keluar Aplikasi
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 text-[10px] text-center text-slate-500">
          Created by Syamsul Bahri
        </div>
      </div>
    </>
  );
}