'use client'

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userData: any;
}

export default function Sidebar({ activeTab, setActiveTab, userData }: SidebarProps) {
  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col min-h-screen sticky top-0 shadow-xl">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-2xl font-black text-blue-400 tracking-tight">CBT ONLINE</h2>
        <div className="mt-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
          <p className="text-[10px] uppercase font-bold text-slate-500">Peserta Login</p>
          <p className="text-sm font-bold truncate text-blue-100">{userData?.nama || 'Memuat...'}</p>
          <p className="text-[10px] text-slate-400">Kelas: {userData?.kelas || '-'}</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 mt-4">
        <button 
          onClick={() => setActiveTab('jadwal')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-medium ${activeTab === 'jadwal' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
        >
          <span className="text-lg">📅</span> Jadwal Ujian
        </button>
        <button 
          onClick={() => setActiveTab('tata-tertib')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-medium ${activeTab === 'tata-tertib' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
        >
          <span className="text-lg">📜</span> Tata Tertib
        </button>
      </nav>

      <div className="p-6 border-t border-slate-800 text-center">
        <p className="text-[10px] text-slate-500 font-medium">Created by Syamsul Bahri</p>
      </div>
    </div>
  );
}