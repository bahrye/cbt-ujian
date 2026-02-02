'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, where, doc, getDoc, onSnapshot, updateDoc 
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Key, Monitor, FileText, LogOut, Menu, 
  ShieldCheck, Search, Users, AlertTriangle,
  Clock, BookOpen, Filter, Loader2, RefreshCw
} from 'lucide-react';

// Definisi Interface untuk memastikan Type Safety pada data Ujian
interface UjianData {
  id: string;
  namaUjian: string;
  mapel: string;
  kelas: string | string[];
  durasi: number;
  status: string;
  token?: string;
  tokenDinamis?: string;
  lastTokenUpdate?: any;
  mulaiAt?: any; // Timestamp dari Firestore
}

export default function HalamanPengawas() {
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();

  // State Data Utama
  const [daftarUjianAktif, setDaftarUjianAktif] = useState<UjianData[]>([]);
  const [monitoringSiswa, setMonitoringSiswa] = useState<any[]>([]);
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  
  // State untuk melacak ujian mana yang sudah di-generate tokennya secara lokal
  const [generatedExams, setGeneratedExams] = useState<{ [key: string]: boolean }>({});

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20}/> },
    { name: 'Token Ujian', icon: <Key size={20}/> },
    { name: 'Monitor Ujian', icon: <Monitor size={20}/> },
    { name: 'Tata Tertib', icon: <FileText size={20}/> },
  ];

  // Fungsi untuk memperbarui waktu lokal setiap detik
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * Fungsi untuk menghasilkan token 6 digit yang unik per ujian.
   */
  const generateUniqueToken = (ujianId: string) => {
    if (!ujianId) return "";
    const now = new Date();
    const interval = Math.floor(now.getTime() / (15 * 60 * 1000));
    const rawString = `${ujianId}-${interval}`;
    const hash = btoa(rawString).replace(/[^A-Z0-9]/gi, '');
    return hash.substring(0, 6).toUpperCase();
  };

  /**
   * Fungsi untuk menentukan status tombol berdasarkan jadwal
   */
  const getExamStatus = (ujian: UjianData) => {
    if (!ujian.mulaiAt) return "Siap";
    
    const startTime = ujian.mulaiAt.toDate();
    const endTime = new Date(startTime.getTime() + ujian.durasi * 60000);
    const now = currentTime;

    if (now < startTime) return "Menunggu Jadwal";
    if (now > endTime) return "Selesai";
    return "Berjalan";
  };

  // --- 1. PROSES OTENTIKASI DAN OTORISASI ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const authDocRef = doc(db, "users_auth", user.uid);
          const authDoc = await getDoc(authDocRef);
          
          if (authDoc.exists() && authDoc.data().role === 'pengawas') {
            const authData = authDoc.data();
            const profileDoc = await getDoc(doc(db, "users", authData.username));
            setUserData(profileDoc.exists() ? profileDoc.data() : { nama: authData.username });
            setAuthorized(true);
          } else {
            router.push('/login');
          }
        } catch (error) {
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // --- 2. PENGAMBILAN DATA REAL-TIME DARI FIRESTORE ---
  useEffect(() => {
    if (!authorized) return;
    
    const qUjian = query(collection(db, "ujian"), where("status", "==", "aktif"));
    const unsubUjian = onSnapshot(qUjian, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as UjianData));
      
      setDaftarUjianAktif(data);
      
      const alreadyGenerated: { [key: string]: boolean } = {};
      data.forEach(u => {
        if (u.tokenDinamis) alreadyGenerated[u.id] = true;
      });
      setGeneratedExams(prev => ({ ...prev, ...alreadyGenerated }));
    });

    const unsubMonitor = onSnapshot(collection(db, "ujian_berjalan"), (snapshot) => {
      setMonitoringSiswa(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubUjian(); unsubMonitor(); };
  }, [authorized]);

  // --- 3. LOGIKA UPDATE TOKEN DINAMIS OTOMATIS KE DATABASE (TIAP 1 MENIT) ---
  useEffect(() => {
    const updateTokensInDatabase = async () => {
      for (const ujian of daftarUjianAktif) {
        // Hanya update jika sudah di-generate dan status masih "Berjalan"
        if (generatedExams[ujian.id] && getExamStatus(ujian) === "Berjalan") {
          const newToken = generateUniqueToken(ujian.id);
          
          if (ujian.tokenDinamis !== newToken) {
            try {
              const ujianRef = doc(db, "ujian", ujian.id);
              await updateDoc(ujianRef, {
                tokenDinamis: newToken,
                lastTokenUpdate: new Date()
              });
            } catch (err) {
              console.error("Gagal memperbarui token:", err);
            }
          }
        }
      }
    };

    const intervalId = setInterval(updateTokensInDatabase, 60000);
    updateTokensInDatabase();
    
    return () => clearInterval(intervalId);
  }, [daftarUjianAktif, generatedExams, currentTime]);

  const handleGenerateToken = async (ujianId: string) => {
    const initialToken = generateUniqueToken(ujianId);
    try {
      const ujianRef = doc(db, "ujian", ujianId);
      await updateDoc(ujianRef, {
        tokenDinamis: initialToken,
        lastTokenUpdate: new Date()
      });
      setGeneratedExams(prev => ({ ...prev, [ujianId]: true }));
    } catch (err) {
      alert("Gagal mengaktifkan token ujian.");
    }
  };

  const daftarKelas = Array.from(new Set(daftarUjianAktif.flatMap(u => 
    Array.isArray(u.kelas) ? u.kelas : [u.kelas]
  )));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
    </div>
  );

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-x-hidden">
      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-40 bg-white border-r transition-all duration-300 transform
        ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarOpen ? 'lg:w-72' : 'lg:w-20'} flex flex-col h-full`}>
        
        <div className="p-6 flex items-center gap-3 border-b mb-4">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shrink-0">
            <ShieldCheck size={24}/>
          </div>
          {(isSidebarOpen || isMobileOpen) && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">CBT PANTAU</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Halaman Pengawas</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <button key={item.name} onClick={() => { setActiveMenu(item.name); setIsMobileOpen(false); }}
              className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all group 
              ${activeMenu === item.name ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
              <div className={activeMenu === item.name ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}>
                {item.icon}
              </div>
              {(isSidebarOpen || isMobileOpen) && <span className="text-sm font-bold">{item.name}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t">
          <button onClick={() => auth.signOut().then(() => router.push('/login'))} 
            className="w-full flex items-center gap-4 p-3.5 text-red-500 hover:bg-red-50 rounded-2xl font-bold text-sm">
            <LogOut size={20}/>{(isSidebarOpen || isMobileOpen) && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-72' : 'lg:ml-20'} p-4 md:p-8`}>
        {/* Header Bar */}
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-3xl border shadow-sm sticky top-4 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileOpen(true)} className="lg:hidden p-2.5 bg-slate-50 text-indigo-600 rounded-xl">
              <Menu size={22}/>
            </button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden lg:block p-2 text-slate-600">
              <Menu size={24}/>
            </button>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">{activeMenu}</h2>
          </div>
          <div className="flex items-center gap-3 pr-4 border-l pl-4">
             <div className="hidden md:block text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Petugas</p>
                <p className="text-xs font-bold text-slate-800">{userData?.nama}</p>
             </div>
             <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center font-bold text-indigo-600 border border-indigo-200 uppercase">
               {userData?.nama?.charAt(0)}
             </div>
          </div>
        </header>

        {/* --- MENU TOKEN UJIAN --- */}
        {activeMenu === 'Token Ujian' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
               <div className="relative z-10">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Pusat Token Ujian</h3>
                <p className="text-indigo-100 text-xs font-medium mt-2 italic">Tombol Generate hanya muncul saat jadwal ujian berlangsung.</p>
               </div>
               <Key size={120} className="absolute -right-4 -bottom-4 text-white/10 rotate-12" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {daftarUjianAktif.length > 0 ? (
                daftarUjianAktif.map(u => {
                  const statusJadwal = getExamStatus(u);
                  return (
                    <div key={u.id} className="bg-white p-6 rounded-3xl border flex flex-col md:flex-row items-center justify-between shadow-sm gap-4 hover:border-indigo-300 transition-all">
                      <div className="text-center md:text-left flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Mata Pelajaran</p>
                        <p className="font-bold text-slate-800 uppercase tracking-tighter text-lg">{u.mapel} - {u.namaUjian}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold uppercase">Kelas: {Array.isArray(u.kelas) ? u.kelas.join(", ") : u.kelas}</span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md font-bold uppercase">Mulai: {u.mulaiAt?.toDate().toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <div className="min-w-[200px] flex justify-center">
                        {statusJadwal === "Menunggu Jadwal" ? (
                          <div className="flex items-center gap-2 text-orange-500 font-black text-xs uppercase tracking-widest bg-orange-50 px-6 py-4 rounded-2xl border border-orange-100">
                            <Clock size={16} /> Menunggu Jadwal
                          </div>
                        ) : statusJadwal === "Selesai" ? (
                          <div className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest bg-slate-50 px-6 py-4 rounded-2xl border border-slate-200">
                            <CheckCircle2 size={16} /> Selesai
                          </div>
                        ) : !generatedExams[u.id] ? (
                          <button 
                            onClick={() => handleGenerateToken(u.id)}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg active:scale-95"
                          >
                            <RefreshCw size={18} className="animate-pulse" /> Generate Token
                          </button>
                        ) : (
                          <div className="text-center bg-slate-50 border-2 border-dashed border-indigo-200 px-10 py-4 rounded-2xl animate-in zoom-in">
                            <p className="text-[10px] font-black text-indigo-400 uppercase mb-1 leading-none">Token Aktif</p>
                            <p className="text-4xl font-black text-indigo-600 tracking-[0.2em] font-mono">
                                {u.tokenDinamis || "......"}
                            </p>
                            <p className="text-[9px] text-indigo-300 font-bold mt-2 uppercase">Sinkron Tiap 15 Menit</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 bg-white rounded-[2.5rem] border border-dashed text-center">
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Tidak ada ujian aktif saat ini</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- MENU DASHBOARD --- */}
        {activeMenu === 'Dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Jadwal Ujian Aktif</h3>
              <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border shadow-sm w-full md:w-auto">
                <Filter size={18} className="text-slate-400 ml-2" />
                <select 
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  className="text-xs font-bold bg-transparent outline-none pr-4 cursor-pointer"
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
                <div key={ujian.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-xl transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                      <BookOpen size={24}/>
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase border ${getExamStatus(ujian) === "Berjalan" ? 'bg-green-100 text-green-600 border-green-200' : 'bg-orange-100 text-orange-600 border-orange-200'}`}>
                      {getExamStatus(ujian)}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-slate-800 uppercase leading-tight mb-2 tracking-tighter">{ujian.namaUjian}</h4>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Clock size={14} className="text-indigo-400"/> {ujian.durasi} Menit</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Users size={14} className="text-indigo-400"/> Kelas: {Array.isArray(ujian.kelas) ? ujian.kelas.join(", ") : ujian.kelas}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- MENU MONITOR UJIAN --- */}
        {activeMenu === 'Monitor Ujian' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] border shadow-sm gap-4">
                <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Total Siswa</p>
                    <p className="text-2xl font-black text-slate-800">{monitoringSiswa.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-red-400 uppercase leading-none mb-1">Pelanggaran</p>
                    <p className="text-2xl font-black text-red-600">{monitoringSiswa.reduce((acc, curr) => acc + (curr.violations || 0), 0)}</p>
                  </div>
                </div>
                <div className="relative w-full md:w-80">
                   <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                    type="text" 
                    placeholder="Cari Nama Siswa..."
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    onChange={(e) => setSearchQuery(e.target.value)}
                   />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {monitoringSiswa
                  .filter(s => s.nama.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((siswa) => (
                  <div key={siswa.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col gap-4 hover:border-indigo-200 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 uppercase">
                          {siswa.nama.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 leading-none truncate w-32">{siswa.nama}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Kelas {siswa.kelas}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${siswa.violations > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                        {siswa.violations || 0} Pelanggaran
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Komponen ikon tambahan jika diperlukan
function CheckCircle2(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
  )
}