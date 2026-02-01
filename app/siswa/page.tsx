'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot, 
  collection, query, orderBy, where 
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, FileText, BarChart3, LogOut, Menu, 
  X, ShieldCheck, ChevronRight, Loader2, ClipboardCheck, Clock
} from 'lucide-react';

export default function HalamanSiswa() {
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();

  // State untuk Ujian
  const [isVerified, setIsVerified] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenAsli, setTokenAsli] = useState('');
  const [daftarSoal, setDaftarSoal] = useState<any[]>([]);
  const [violations, setViolations] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [jawabanSiswa, setJawabanSiswa] = useState<{ [key: string]: string }>({});

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20}/> },
    { name: 'Tata Tertib', icon: <FileText size={20}/> },
    { name: 'Hasil Ujian', icon: <BarChart3 size={20}/> },
  ];

  // --- AUTH CHECK ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        try {
          // 1. Ambil data role dari users_auth menggunakan UID (Sama dengan logika Admin)
          const authDoc = await getDoc(doc(db, "users_auth", user.uid));
          
          if (authDoc.exists()) {
            const authData = authDoc.data();
            
            // 2. Pastikan role-nya adalah siswa
            if (authData.role === 'siswa') {
              // 3. Ambil detail profil siswa dari koleksi 'users' menggunakan username
              const profileDoc = await getDoc(doc(db, "users", authData.username));
              if (profileDoc.exists()) {
                setUserData(profileDoc.data());
                setAuthorized(true);
              } else {
                router.push('/login');
              }
            } else {
              // Jika role bukan siswa (misal admin nyasar ke hal siswa), lempar balik
              router.push('/login');
            }
          } else {
            router.push('/login');
          }
        } catch (error) {
          console.error("Auth Error:", error);
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // --- TOKEN SNAPSHOT ---
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "ujian_aktif"), (docSnap) => {
      if (docSnap.exists()) setTokenAsli(docSnap.data().token);
    });
    return () => unsub();
  }, []);

  const handleMenuClick = (name: string) => {
    setActiveMenu(name);
    setIsMobileOpen(false);
  };

  if (!authorized) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-x-hidden">
      
      {/* --- OVERLAY MOBILE --- */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsMobileOpen(false)}/>
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-40 bg-white border-r transition-all duration-300 transform
        ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarOpen ? 'lg:w-72' : 'lg:w-20'} flex flex-col h-full`}>
        
        <div className="p-6 flex items-center justify-between border-b mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shrink-0">
              <ShieldCheck size={24}/>
            </div>
            {(isSidebarOpen || isMobileOpen) && (
              <div>
                <h1 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">CBT SISWA</h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{userData?.kelas || 'Tanpa Kelas'}</p>
              </div>
            )}
          </div>
          <button onClick={() => setIsMobileOpen(false)} className="lg:hidden p-2 text-slate-400"><X size={20}/></button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => handleMenuClick(item.name)}
              className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all group ${
                activeMenu === item.name ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <div className={`${activeMenu === item.name ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`}>{item.icon}</div>
              {(isSidebarOpen || isMobileOpen) && <span className="text-sm font-bold">{item.name}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t">
          <button onClick={() => auth.signOut().then(() => router.push('/login'))} className="w-full flex items-center gap-4 p-3.5 text-red-500 hover:bg-red-50 rounded-2xl font-bold text-sm">
            <LogOut size={20}/>
            {(isSidebarOpen || isMobileOpen) && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className={`flex-1 transition-all duration-300 min-h-screen ${isSidebarOpen ? 'lg:ml-72' : 'lg:ml-20'} p-4 md:p-8`}>
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-3xl border shadow-sm sticky top-4 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileOpen(true)} className="lg:hidden p-2.5 bg-slate-50 text-blue-600 rounded-xl"><Menu size={22}/></button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden lg:block p-2 text-slate-600"><Menu size={24}/></button>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">{activeMenu}</h2>
          </div>
          
          <div className="flex items-center gap-3 pl-4 border-l">
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Siswa</p>
              <p className="text-xs font-bold text-slate-800">{userData?.nama || 'User'}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center font-bold text-blue-600">
              {userData?.nama?.charAt(0) || 'S'}
            </div>
          </div>
        </header>

        {/* --- DYNAMIC CONTENT --- */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
          {activeMenu === 'Dashboard' && (
            <div className="space-y-6">
               <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Jadwal Ujian Aktif</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Placeholder Jadwal Berdasarkan Kelas Siswa */}
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Mata Pelajaran</p>
                        <h4 className="text-lg font-black text-slate-800">Matematika Wajib</h4>
                        <div className="flex items-center gap-2 text-slate-500 text-xs mt-1 font-bold">
                          <Clock size={14}/> 08:00 - 09:30
                        </div>
                      </div>
                      <button 
                        onClick={() => {/* Logika buka modal token */}}
                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                      >
                        Ikuti Ujian
                      </button>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeMenu === 'Tata Tertib' && (
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Tata Tertib Peserta</h3>
              <ul className="space-y-3 text-sm text-slate-600 font-medium list-disc pl-5">
                <li>Siswa wajib login menggunakan akun yang sudah diberikan.</li>
                <li>Dilarang membuka tab baru atau pindah aplikasi selama ujian berlangsung.</li>
                <li>Setiap pelanggaran (pindah tab) akan dicatat oleh sistem secara otomatis.</li>
                <li>Pastikan koneksi internet stabil sebelum menekan tombol "Kirim Jawaban".</li>
              </ul>
            </div>
          )}

          {activeMenu === 'Hasil Ujian' && (
            <div className="bg-white p-12 rounded-[2.5rem] border border-dashed text-center">
              <BarChart3 size={48} className="mx-auto text-slate-300 mb-4"/>
              <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Belum Ada Hasil</h3>
              <p className="text-sm text-slate-400 italic">Nilai akan muncul setelah jadwal ujian berakhir.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}