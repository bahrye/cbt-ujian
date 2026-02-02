'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase'; //
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, where, getDocs, doc, getDoc, onSnapshot 
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Key, Monitor, FileText, LogOut, Menu, 
  ShieldCheck, Search, Users, AlertTriangle, CheckCircle2,
  Clock, BookOpen, Filter, Loader2, UserCheck
} from 'lucide-react';

export default function HalamanPengawas() {
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // State Data
  const [daftarUjianAktif, setDaftarUjianAktif] = useState<any[]>([]);
  const [monitoringSiswa, setMonitoringSiswa] = useState<any[]>([]);
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20}/> },
    { name: 'Token Ujian', icon: <Key size={20}/> },
    { name: 'Monitor Ujian', icon: <Monitor size={20}/> },
    { name: 'Tata Tertib', icon: <FileText size={20}/> },
  ];

  // --- 1. AUTHENTICATION & AUTHORIZATION ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // 1. Ambil data autentikasi untuk cek role
          const authDoc = await getDoc(doc(db, "users_auth", user.uid));
          
          if (authDoc.exists()) {
            const authData = authDoc.data(); // Mendefinisikan authData di sini
            
            if (authData.role === 'pengawas') {
              // 2. Ambil profil lengkap dari koleksi 'users' berdasarkan username
              const profileDoc = await getDoc(doc(db, "users", authData.username));
              
              if (profileDoc.exists()) {
                setUserData(profileDoc.data());
                setAuthorized(true);
              } else {
                // Jika profil di 'users' tidak ada, gunakan data dasar
                setUserData({ nama: authData.username || "Pengawas" });
                setAuthorized(true);
              }
            } else {
              router.push('/login');
            }
          } else {
            router.push('/login');
          }
        } catch (error) {
          console.error("Error fetching auth data:", error);
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // --- 2. FETCH UJIAN AKTIF (DASHBOARD & TOKEN) ---
  useEffect(() => {
    if (!authorized) return;
    const q = query(collection(db, "ujian"), where("status", "==", "aktif"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDaftarUjianAktif(data);
    });
    return () => unsubscribe();
  }, [authorized]);

  // --- 3. FETCH MONITORING SISWA REAL-TIME ---
  useEffect(() => {
    if (!authorized) return;
    const q = collection(db, "ujian_berjalan");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMonitoringSiswa(data);
    });
    return () => unsubscribe();
  }, [authorized]);

  const daftarKelas = Array.from(new Set(daftarUjianAktif.flatMap(u => 
    Array.isArray(u.kelas) ? u.kelas : [u.kelas]
  )));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-x-hidden">
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 bg-white border-r transition-all duration-300 
        ${isSidebarOpen ? 'w-72' : 'w-20'} hidden lg:flex flex-col`}>
        <div className="p-6 flex items-center gap-3 border-b mb-4">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg"><ShieldCheck size={24}/></div>
          {isSidebarOpen && <h1 className="text-lg font-black text-slate-800 uppercase tracking-tighter">CBT ADMIN</h1>}
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <button key={item.name} onClick={() => setActiveMenu(item.name)}
              className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all group 
              ${activeMenu === item.name ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
              <div className={activeMenu === item.name ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}>{item.icon}</div>
              {isSidebarOpen && <span className="text-sm font-bold">{item.name}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button onClick={() => auth.signOut()} className="w-full flex items-center gap-4 p-3.5 text-red-500 hover:bg-red-50 rounded-2xl font-bold text-sm">
            <LogOut size={20}/>{isSidebarOpen && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-72' : 'lg:ml-20'} p-4 md:p-8`}>
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-3xl border shadow-sm">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest pl-4">{activeMenu}</h2>
          <div className="flex items-center gap-3 pr-4 border-l pl-4">
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Pengawas</p>
                <p className="text-xs font-bold text-slate-800">{userData?.nama}</p>
             </div>
             <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center font-bold text-indigo-600 border border-indigo-200 uppercase">{userData?.nama?.charAt(0)}</div>
          </div>
        </header>

        {/* --- MENU: DASHBOARD --- */}
        {activeMenu === 'Dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Jadwal Ujian Aktif</h3>
              <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border shadow-sm w-full md:w-auto">
                <Filter size={18} className="text-slate-400 ml-2" />
                <select 
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  className="text-xs font-bold bg-transparent outline-none pr-4"
                >
                  <option value="Semua">Semua Kelas</option>
                  {daftarKelas.map(k => <option key={k} value={k}>Kelas {k}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {daftarUjianAktif
                .filter(u => filterKelas === 'Semua' || (Array.isArray(u.kelas) ? u.kelas.includes(filterKelas) : u.kelas === filterKelas))
                .map((ujian) => (
                <div key={ujian.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><BookOpen size={24}/></div>
                    <span className="bg-green-100 text-green-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">Running</span>
                  </div>
                  <h4 className="text-lg font-black text-slate-800 uppercase leading-tight mb-2">{ujian.namaUjian}</h4>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Clock size={14}/> {ujian.durasi} Menit</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Users size={14}/> Kelas: {Array.isArray(ujian.kelas) ? ujian.kelas.join(", ") : ujian.kelas}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- MENU: TOKEN UJIAN --- */}
        {activeMenu === 'Token Ujian' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
               <div className="relative z-10">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Pusat Token Ujian</h3>
                <p className="text-indigo-100 text-xs font-medium mt-2 italic">Berikan kode di bawah ini kepada siswa yang akan memulai ujian.</p>
               </div>
               <Key size={120} className="absolute -right-4 -bottom-4 text-white/10 rotate-12" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {daftarUjianAktif.map(u => (
                <div key={u.id} className="bg-white p-6 rounded-3xl border flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mata Pelajaran</p>
                    <p className="font-bold text-slate-800">{u.mapel} - {u.namaUjian}</p>
                  </div>
                  <div className="text-center bg-slate-50 border-2 border-dashed border-indigo-200 px-8 py-3 rounded-2xl">
                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Token Aktif</p>
                    <p className="text-3xl font-black text-indigo-600 tracking-[0.2em]">{u.token}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- MENU: MONITOR UJIAN --- */}
        {activeMenu === 'Monitor Ujian' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] border shadow-sm">
                <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Total Siswa</p>
                    <p className="text-xl font-black text-slate-800">{monitoringSiswa.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-red-400 uppercase">Pelanggaran</p>
                    <p className="text-xl font-black text-red-600">{monitoringSiswa.reduce((acc, curr) => acc + (curr.violations || 0), 0)}</p>
                  </div>
                </div>
                <div className="relative w-64">
                   <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                    type="text" 
                    placeholder="Cari Nama Siswa..."
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                    onChange={(e) => setSearchQuery(e.target.value)}
                   />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {monitoringSiswa
                  .filter(s => s.nama.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((siswa) => (
                  <div key={siswa.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 uppercase">{siswa.nama.charAt(0)}</div>
                        <div>
                          <p className="font-black text-slate-800 leading-none">{siswa.nama}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Kelas {siswa.kelas}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${siswa.violations > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                        {siswa.violations || 0} Pelanggaran
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Tanda Tangan</p>
                          {siswa.tandaTangan ? (
                            <img src={siswa.tandaTangan} alt="TTD" className="h-16 w-full object-contain bg-slate-50 rounded-xl border border-dashed border-slate-200" />
                          ) : <div className="h-16 bg-slate-50 rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-300 italic">No Signature</div>}
                       </div>
                       <div className="flex flex-col justify-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Status Sistem</p>
                          <p className="text-xs font-bold text-indigo-600">{siswa.status}</p>
                          <p className="text-[9px] text-slate-400 font-medium mt-1">Mulai: {siswa.mulaiAt?.toDate().toLocaleTimeString()}</p>
                       </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* --- MENU: TATA TERTIB --- */}
        {activeMenu === 'Tata Tertib' && (
          <div className="bg-white p-10 rounded-[3rem] border shadow-sm max-w-3xl">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3 mb-6"><AlertTriangle className="text-orange-500"/> Panduan Pengawas</h3>
            <div className="space-y-4 text-slate-600 font-bold text-sm leading-relaxed">
              <p>1. Pastikan Token hanya dibagikan kepada siswa yang berada di dalam ruangan.</p>
              <p>2. Pantau menu <span className="text-indigo-600">Monitor Ujian</span> secara berkala untuk mendeteksi pelanggaran tab switching.</p>
              <p>3. Jika siswa melakukan pelanggaran lebih dari 3 kali, pengawas berhak menghentikan ujian siswa tersebut.</p>
              <p>4. Verifikasi tanda tangan digital siswa pada daftar monitoring untuk memastikan kehadiran fisik.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}