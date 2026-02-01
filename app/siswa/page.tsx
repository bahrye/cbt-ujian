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
  X, ShieldCheck, ChevronRight, Loader2, ClipboardCheck, 
  Clock, BookOpen, School, AlertCircle
} from 'lucide-react';

export default function HalamanSiswa() {
  // --- STATE MANAGEMENT ---
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();

  // State Jadwal Ujian
  const [daftarUjian, setDaftarUjian] = useState<any[]>([]);
  const [loadingUjian, setLoadingUjian] = useState(true);

  // State Pelaksanaan Ujian (Verifikasi & Timer)
  const [isVerified, setIsVerified] = useState(false);
  const [selectedUjian, setSelectedUjian] = useState<any>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [daftarSoal, setDaftarSoal] = useState<any[]>([]);
  const [violations, setViolations] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [jawabanSiswa, setJawabanSiswa] = useState<{ [key: string]: string }>({});

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20}/> },
    { name: 'Tata Tertib', icon: <FileText size={20}/> },
    { name: 'Hasil Ujian', icon: <BarChart3 size={20}/> },
  ];

  // --- 1. AUTHENTICATION CHECK ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        try {
          // Ambil role dari users_auth berdasarkan UID
          const authDoc = await getDoc(doc(db, "users_auth", user.uid));
          if (authDoc.exists()) {
            const authData = authDoc.data();
            if (authData.role === 'siswa') {
              // Ambil profil lengkap dari koleksi users berdasarkan username
              const profileDoc = await getDoc(doc(db, "users", authData.username));
              if (profileDoc.exists()) {
                setUserData(profileDoc.data());
                setAuthorized(true);
              } else { router.push('/login'); }
            } else { router.push('/login'); }
          } else { router.push('/login'); }
        } catch (error) { router.push('/login'); }
      } else { router.push('/login'); }
    });
    return () => unsubscribe();
  }, [router]);

  // --- 2. FETCH JADWAL UJIAN BERDASARKAN KELAS ---
  useEffect(() => {
    if (authorized && userData?.kelas) {
      const fetchJadwal = async () => {
        setLoadingUjian(true);
        try {
          const q = query(collection(db, "ujian"), orderBy("tanggal", "asc"));
          const snap = await getDocs(q);
          const allUjian = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          // Filter ujian yang sesuai dengan kelas siswa
          const filtered = allUjian.filter((u: any) => u.kelas === userData.kelas);
          setDaftarUjian(filtered);
        } catch (error) {
          console.error("Gagal mengambil jadwal:", error);
        } finally {
          setLoadingUjian(false);
        }
      };
      fetchJadwal();
    }
  }, [authorized, userData]);

  // --- 3. LOGIKA ANTI-CONTEK ---
  useEffect(() => {
    if (!isVerified) return;

    const handleViolation = async () => {
      setViolations((v) => {
        const newCount = v + 1;
        const user = auth.currentUser;
        if (user) {
          updateDoc(doc(db, "ujian_berjalan", user.uid), {
            violations: newCount,
            lastViolation: new Date()
          });
        }
        return newCount;
      });
      alert("PERINGATAN! Jangan meninggalkan halaman ujian. Pelanggaran dicatat!");
    };

    const handleVisibility = () => { if (document.hidden) handleViolation(); };
    window.addEventListener("blur", handleViolation);
    document.addEventListener("visibilitychange", handleVisibility);

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      window.removeEventListener("blur", handleViolation);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(timer);
    };
  }, [isVerified]);

  // --- HANDLERS ---
  const handleMenuClick = (name: string) => {
    setActiveMenu(name);
    setIsMobileOpen(false);
  };

  const handleStartUjian = async (ujian: any) => {
    const input = prompt("Masukkan 6 Digit Token Ujian:");
    if (input?.toUpperCase() === ujian.token.toUpperCase()) {
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, "ujian_berjalan", user.uid), {
          nama: userData.nama,
          kelas: userData.kelas,
          email: user.email,
          violations: 0,
          status: 'Mengerjakan',
          mulaiAt: new Date(),
          mapel: ujian.namaMapel
        });
        
        // Fetch soal (Sesuai ID Mapel/Ujian)
        const q = query(collection(db, "bank_soal"), where("mapel", "==", ujian.namaMapel));
        const snap = await getDocs(q);
        setDaftarSoal(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        setSelectedUjian(ujian);
        setIsVerified(true);
      }
    } else if (input) {
      alert("Token Salah!");
    }
  };

  if (!authorized) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  // --- TAMPILAN LEMBAR UJIAN (FULL SCREEN) ---
  if (isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20 font-sans">
        <div className="sticky top-0 z-50 bg-white border-b p-4 flex justify-between items-center px-4 md:px-20 shadow-sm">
          <div>
            <h1 className="font-black text-blue-800 uppercase tracking-tighter">{selectedUjian?.namaMapel}</h1>
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Pelanggaran: {violations}</p>
          </div>
          <div className="bg-red-50 text-red-600 px-6 py-2 rounded-2xl font-mono font-black border border-red-100">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>
        <div className="max-w-3xl mx-auto mt-8 p-4">
          {daftarSoal.map((s, i) => (
            <div key={s.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm mb-6 border border-slate-100">
              <p className="text-lg font-bold mb-6 text-slate-800"><span className="text-blue-600 mr-2">{i+1}.</span>{s.pertanyaan}</p>
              <div className="grid grid-cols-1 gap-3">
                {s.opsi?.map((o: string, idx: number) => (
                  <label key={idx} className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${jawabanSiswa[s.id] === o ? 'border-blue-600 bg-blue-50' : 'border-slate-50 hover:border-slate-200'}`}>
                    <input type="radio" className="w-5 h-5 mr-4 accent-blue-600" onChange={() => setJawabanSiswa({...jawabanSiswa, [s.id]: o})} checked={jawabanSiswa[s.id] === o} />
                    <span className="font-bold text-slate-700">{o}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => window.location.reload()} className="w-full bg-green-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-green-100 uppercase tracking-widest">Kirim Jawaban</button>
        </div>
      </div>
    );
  }

  // --- TAMPILAN UTAMA (DASHBOARD) ---
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-x-hidden">
      {isMobileOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsMobileOpen(false)}/>}

      <aside className={`fixed inset-y-0 left-0 z-40 bg-white border-r transition-all duration-300 transform
        ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarOpen ? 'lg:w-72' : 'lg:w-20'} flex flex-col h-full`}>
        <div className="p-6 flex items-center justify-between border-b mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shrink-0"><ShieldCheck size={24}/></div>
            {(isSidebarOpen || isMobileOpen) && (
              <div>
                <h1 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">CBT SISWA</h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{userData?.kelas}</p>
              </div>
            )}
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <button key={item.name} onClick={() => handleMenuClick(item.name)}
              className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all group ${activeMenu === item.name ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}>
              <div className={`${activeMenu === item.name ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`}>{item.icon}</div>
              {(isSidebarOpen || isMobileOpen) && <span className="text-sm font-bold tracking-tight">{item.name}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button onClick={() => auth.signOut().then(() => router.push('/login'))} className="w-full flex items-center gap-4 p-3.5 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-bold text-sm">
            <LogOut size={20}/>{(isSidebarOpen || isMobileOpen) && <span>Keluar Sistem</span>}
          </button>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 min-h-screen ${isSidebarOpen ? 'lg:ml-72' : 'lg:ml-20'} p-4 md:p-8`}>
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-3xl border shadow-sm sticky top-4 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileOpen(true)} className="lg:hidden p-2.5 bg-slate-50 text-blue-600 rounded-xl"><Menu size={22}/></button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden lg:block p-2 text-slate-600"><Menu size={24}/></button>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">{activeMenu}</h2>
          </div>
          <div className="flex items-center gap-3 pl-4 border-l text-right">
             <div className="hidden md:block">
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Siswa Aktif</p>
                <p className="text-xs font-bold text-slate-800">{userData?.nama}</p>
             </div>
             <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center font-bold text-blue-600 border border-blue-200 uppercase">{userData?.nama?.charAt(0)}</div>
          </div>
        </header>

        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
          {activeMenu === 'Dashboard' && (
            <div className="space-y-8">
              <div className="bg-blue-600 rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
                <div className="relative z-10 max-w-lg">
                  <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase leading-tight">Selamat Datang, {userData?.nama?.split(' ')[0]}!</h2>
                  <p className="mt-2 text-blue-100 text-xs md:text-sm font-medium">Anda terdaftar di kelas <span className="underline font-bold">{userData?.kelas}</span>. Pastikan membaca tata tertib sebelum memulai ujian.</p>
                </div>
                <School size={180} className="absolute -right-10 -bottom-10 text-blue-500/20 rotate-12 hidden sm:block" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loadingUjian ? (
                  <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600 w-10 h-10"/></div>
                ) : daftarUjian.length === 0 ? (
                  <div className="col-span-full bg-white p-16 rounded-[3rem] border border-dashed border-slate-300 text-center space-y-4">
                    <ClipboardCheck size={48} className="mx-auto text-slate-200"/>
                    <h3 className="text-slate-400 font-black uppercase tracking-widest">Belum Ada Jadwal Ujian</h3>
                  </div>
                ) : (
                  daftarUjian.map((u) => (
                    <div key={u.id} className="bg-white p-8 rounded-[3rem] border shadow-sm hover:shadow-xl transition-all group border-l-[12px] border-l-blue-600">
                      <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform"><BookOpen size={28}/></div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode</span>
                          <p className="text-xs font-bold text-blue-600 uppercase">Pilihan Ganda</p>
                        </div>
                      </div>
                      <h4 className="text-xl font-black text-slate-800 tracking-tighter mb-4 uppercase">{u.namaMapel}</h4>
                      <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-3 text-slate-500 text-xs font-bold"><Clock size={16} className="text-blue-500"/> {u.jamMulai} - {u.jamSelesai} WIB</div>
                        <div className="flex items-center gap-3 text-slate-500 text-xs font-bold"><FileText size={16} className="text-blue-500"/> {u.jumlahSoal} Butir Pertanyaan</div>
                      </div>
                      <button onClick={() => handleStartUjian(u)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-100">
                        Masuk Ruang Ujian <ChevronRight size={18}/>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeMenu === 'Tata Tertib' && (
            <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3 mb-6"><AlertCircle className="text-blue-600"/> Tata Tertib Ujian</h3>
              <div className="space-y-4 text-slate-600 font-bold text-sm leading-relaxed">
                <p>1. Siswa dilarang keras membuka tab baru atau aplikasi lain selama ujian.</p>
                <p>2. Sistem akan otomatis mencatat setiap kali siswa meninggalkan jendela browser.</p>
                <p>3. Jawaban hanya dapat dikirim satu kali (Final).</p>
                <p>4. Pastikan baterai perangkat mencukupi dan koneksi internet stabil.</p>
              </div>
            </div>
          )}

          {activeMenu === 'Hasil Ujian' && (
            <div className="bg-white p-20 rounded-[3rem] border border-dashed text-center space-y-4">
              <BarChart3 size={60} className="mx-auto text-slate-200"/>
              <h3 className="text-slate-400 font-black uppercase tracking-widest">Data Hasil Belum Tersedia</h3>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}