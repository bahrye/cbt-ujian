'use client'

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName: string;
}

export default function Sidebar({ activeTab, setActiveTab, userName }: SidebarProps) {
  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col min-h-screen sticky top-0">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-2xl font-bold text-blue-400">CBT ONLINE</h2>
        <p className="text-xs text-slate-400 mt-1">Halo, {userName}</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <button 
          onClick={() => setActiveTab('jadwal')}
          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'jadwal' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}
        >
          <span>📅</span> Jadwal Ujian
        </button>
        <button 
          onClick={() => setActiveTab('tata-tertib')}
          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'tata-tertib' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}
        >
          <span>📜</span> Tata Tertib
        </button>
        <button 
          onClick={() => setActiveTab('hasil')}
          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeTab === 'hasil' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}
        >
          <span>📊</span> Hasil Ujian
        </button>
      </nav>

      <div className="p-4 border-t border-slate-800 text-[10px] text-center text-slate-500">
        Created by Syamsul Bahri
      </div>
    </div>
  );
}