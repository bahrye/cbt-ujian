'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase'; //
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  doc, getDoc, getDocs, setDoc, 
  collection, query, orderBy, where 
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, FileText, BarChart3, LogOut, Menu, 
  ShieldCheck, ChevronRight, Loader2, ClipboardCheck, 
  Clock, BookOpen, School, AlertCircle, Calendar, User, Timer
} from 'lucide-react';

export default function HalamanSiswa() {
  // --- STATE MANAGEMENT ---
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();

  // State Data Ujian & Master
  const [daftarUjian, setDaftarUjian] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUjian, setLoadingUjian] = useState(true);

  // State Pelaksanaan Ujian (Lembar Soal)
  const [isVerified, setIsVerified] = useState(false);
  const [selectedUjian, setSelectedUjian] = useState<any>(null);
  const [daftarSoal, setDaftarSoal] = useState<any[]>([]);
  const [violations, setViolations] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [jawabanSiswa, setJawabanSiswa] = useState<{ [key: string]: string }>({});

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20}/> },
    { name: 'Tata Tertib', icon: <FileText size={20}/> },
    { name: 'Hasil Ujian', icon: <BarChart3 size={20}/> },
  ];

  // --- 1. REAL-TIME CLOCK FOR VALIDATION ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000); // Update tiap 10 detik
    return () => clearInterval(timer);
  }, []);

  // --- 2. AUTHENTICATION & PROFILE CHECK ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        try {
          const authDoc = await getDoc(doc(db, "users_auth", user.uid));
          if (authDoc.exists()) {
            const authData = authDoc.data();
            if (authData.role === 'siswa') {
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

  // --- 3. FETCH DATA (UJIAN & USERS FOR MAPPING) ---
  useEffect(() => {
    if (authorized && userData?.kelas) {
      const fetchData = async () => {
        setLoadingUjian(true);
        try {
          // Ambil data users untuk mapping nama pengawas
          const usersSnap = await getDocs(collection(db, "users"));
          setAllUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

          // Ambil semua ujian aktif (Memerlukan Index Firestore)
          const q = query(
            collection(db, "ujian"), 
            where("status", "==", "aktif"),
            orderBy("createdAt", "desc")
          );
          const snap = await getDocs(q);
          const allUjian = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
          
          // Filter Berdasarkan Kelas (Mendukung String atau Array)
          const kelasSiswa = userData.kelas.toString().trim().toUpperCase();
          const filtered = allUjian.filter((ujian: any) => {
            if (!ujian.kelas) return false;
            // Jika format string di database
            if (typeof ujian.kelas === 'string') {
                return ujian.kelas.trim().toUpperCase() === kelasSiswa;
            }
            // Jika format array di database
            return Array.isArray(ujian.kelas) && 
                   ujian.kelas.some((k: string) => k.trim().toUpperCase() === kelasSiswa);
          });

          setDaftarUjian(filtered);
        } catch (error) {
          console.error("Gagal mengambil data:", error);
        } finally {
          setLoadingUjian(false);
        }
      };
      fetchData();
    }
  }, [authorized, userData]);

  // --- 4. LOGIKA MULAI UJIAN ---
  const handleStartUjian = async (ujian: any) => {
    const mulai = new Date(ujian.tglMulai);
    const selesai = new Date(ujian.tglSelesai);
    
    if (currentTime < mulai) return alert("Ujian belum dimulai!");
    if (currentTime > selesai) return alert("Waktu ujian telah berakhir!");

    const inputToken = prompt(`Masukkan Token untuk ujian: ${ujian.namaUjian}`);
    
    if (inputToken?.trim().toUpperCase() === ujian.token?.trim().toUpperCase()) {
      const user = auth.currentUser;
      if (user) {
        setLoadingUjian(true);
        try {
          const soalIds = ujian.soalTerpilih || [];
          if (soalIds.length === 0) {
            alert("Ujian ini belum memiliki butir soal. Hubungi Admin.");
            return;
          }

          const fetchedSoal = await Promise.all(
            soalIds.map(async (id: string) => {
              const sDoc = await getDoc(doc(db, "bank_soal", id));
              return sDoc.exists() ? { id: sDoc.id, ...sDoc.data() } : null;
            })
          );

          await setDoc(doc(db, "ujian_berjalan", user.uid), {
            nama: userData.nama,
            kelas: userData.kelas,
            status: 'Mengerjakan',
            mulaiAt: new Date(),
            ujianId: ujian.id,
            namaUjian: ujian.namaUjian
          });

          setDaftarSoal(fetchedSoal.filter(s => s !== null));
          setSelectedUjian(ujian);
          setTimeLeft(ujian.durasi * 60);
          setIsVerified(true);
        } catch (err) {
          alert("Gagal memuat soal.");
        } finally {
          setLoadingUjian(false);
        }
      }
    } else if (inputToken) {
      alert("Token tidak valid!");
    }
  };

  // --- UI RENDER LOGIC ---
  if (!authorized) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  // VIEW: LEMBAR SOAL (SAAT UJIAN BERJALAN)
  if (isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20 font-sans">
        <header className="sticky top-0 z-50 bg-white border-b p-4 flex justify-between items-center px-6 md:px-20 shadow-sm">
          <div>
            <h1 className="font-black text-blue-800 uppercase tracking-tighter">{selectedUjian?.namaUjian}</h1>
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Pelanggaran: {violations}</p>
          </div>
          <div className="bg-red-50 text-red-600 px-6 py-2 rounded-2xl font-mono font-black border border-red-100 flex items-center gap-2">
            <Clock size={18}/> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </header>

        <div className="max-w-3xl mx-auto mt-8 p-4">
          {daftarSoal.map((s, i) => (
            <div key={s.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm mb-6 border border-slate-100">
              <div className="flex gap-4 mb-6">
                <span className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black shrink-0">{i+1}</span>
                <div className="text-lg font-bold text-slate-800 pt-1 prose-sm" dangerouslySetInnerHTML={{ __html: s.pertanyaan }} />
              </div>
              <div className="grid grid-cols-1 gap-3">
                {s.opsi?.map((o: string, idx: number) => (
                  <label key={idx} className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all ${jawabanSiswa[s.id] === o ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-slate-50 hover:border-slate-200 bg-white'}`}>
                    <input type="radio" className="w-5 h-5 mr-4 accent-blue-600" onChange={() => setJawabanSiswa({...jawabanSiswa, [s.id]: o})} checked={jawabanSiswa[s.id] === o} />
                    <span className="font-bold text-slate-700">{o}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => { if(confirm("Kirim jawaban sekarang?")) window.location.reload(); }} className="w-full bg-green-600 text-white py-6 rounded-[2.5rem] font-black text-lg shadow-xl shadow-green-100 uppercase tracking-widest hover:bg-green-700 transition-all">Kirim Jawaban Final</button>
        </div>
      </div>
    );
  }

  // VIEW: DASHBOARD UTAMA
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-x-hidden">
      {isMobileOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsMobileOpen(false)}/>}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 bg-white border-r transition-all duration-300 transform
        ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarOpen ? 'lg:w-72' : 'lg:w-20'} flex flex-col h-full`}>
        <div className="p-6 flex items-center justify-between border-b mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shrink-0"><ShieldCheck size={24}/></div>
            {(isSidebarOpen || isMobileOpen) && (
              <div>
                <h1 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">CBT SISWA</h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Kelas {userData?.kelas}</p>
              </div>
            )}
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <button key={item.name} onClick={() => setActiveMenu(item.name)}
              className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all group ${activeMenu === item.name ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}>
              <div className={`${activeMenu === item.name ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`}>{item.icon}</div>
              {(isSidebarOpen || isMobileOpen) && <span className="text-sm font-bold tracking-tight">{item.name}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button onClick={() => auth.signOut().then(() => router.push('/login'))} className="w-full flex items-center gap-4 p-3.5 text-red-500 hover:bg-red-50 rounded-2xl font-bold text-sm">
            <LogOut size={20}/>{(isSidebarOpen || isMobileOpen) && <span>Keluar</span>}
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
          <div className="flex items-center gap-3 pl-4 border-l">
             <div className="hidden md:block text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Status Siswa</p>
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
                  <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase leading-tight">Halo, {userData?.nama?.split(' ')[0]}!</h2>
                  <p className="mt-2 text-blue-100 text-xs md:text-sm font-medium">Ujian yang tersedia untuk kelas <span className="underline font-bold">{userData?.kelas}</span> akan tampil di bawah ini.</p>
                </div>
                <School size={180} className="absolute -right-10 -bottom-10 text-blue-500/20 rotate-12 hidden sm:block" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loadingUjian ? (
                  <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600 w-10 h-10"/></div>
                ) : daftarUjian.length === 0 ? (
                  <div className="col-span-full bg-white p-20 rounded-[3rem] border border-dashed border-slate-300 text-center space-y-4">
                    <ClipboardCheck size={60} className="mx-auto text-slate-100"/>
                    <h3 className="text-slate-400 font-black uppercase tracking-widest">Tidak Ada Ujian Aktif</h3>
                    <p className="text-xs text-slate-400 italic">Jadwal ujian kelas {userData?.kelas} belum tersedia.</p>
                  </div>
                ) : (
                  daftarUjian.map((u) => {
                    const mulai = new Date(u.tglMulai);
                    const selesai = new Date(u.tglSelesai);
                    const isBelumMulai = currentTime < mulai;
                    const isSudahSelesai = currentTime > selesai;
                    const isAktif = !isBelumMulai && !isSudahSelesai;

                    const namaPengawas = u.pengawasIds?.map((id: string) => {
                        const p = allUsers.find(user => user.id === id);
                        return p ? p.nama : "Anonim";
                    }).join(", ") || "Belum ditentukan";

                    return (
                        <div key={u.id} className={`bg-white p-8 rounded-[3rem] border shadow-sm hover:shadow-xl transition-all group border-l-[12px] ${isAktif ? 'border-l-blue-600' : 'border-l-slate-300 opacity-80'}`}>
                          <div className="flex justify-between items-start mb-6">
                            <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${isAktif ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                              <BookOpen size={28}/>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pelajaran</span>
                              <p className="text-xs font-bold text-blue-600 uppercase">{u.mapel}</p>
                            </div>
                          </div>
                          
                          <h4 className="text-xl font-black text-slate-800 tracking-tighter mb-4 uppercase">{u.namaUjian}</h4>
                          
                          <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-3 text-slate-500 text-xs font-bold">
                                <Calendar size={16} className="text-blue-500"/> 
                                <span>{mulai.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                <span className="text-slate-300">s/d</span>
                                <span>{selesai.toLocaleString('id-ID', { timeStyle: 'short' })}</span>
                            </div>
                            
                            <div className="flex items-center gap-3 text-slate-500 text-xs font-bold">
                                <User size={16} className="text-purple-500"/>
                                <span className="truncate">Pengawas: {namaPengawas}</span>
                            </div>

                            <div className="flex items-center gap-3 text-slate-500 text-xs font-bold">
                                <Clock size={16} className="text-orange-500"/> Durasi: {u.durasi} Menit
                            </div>
                            <div className="flex items-center gap-3 text-slate-500 text-xs font-bold">
                                <FileText size={16} className="text-green-500"/> {u.soalTerpilih?.length || 0} Butir Soal
                            </div>
                          </div>

                          {isBelumMulai ? (
                            <div className="w-full bg-slate-100 text-slate-400 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-dashed border-slate-300">
                                <Timer size={18}/> Belum Dimulai
                            </div>
                          ) : isSudahSelesai ? (
                            <div className="w-full bg-red-50 text-red-400 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-red-100">
                                Ujian Selesai
                            </div>
                          ) : (
                            <button onClick={() => handleStartUjian(u)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-100 group-hover:shadow-blue-200">
                                Mulai Kerjakan <ChevronRight size={18}/>
                            </button>
                          )}
                        </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeMenu === 'Tata Tertib' && (
            <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3 mb-6"><AlertCircle className="text-blue-600"/> Peraturan Peserta</h3>
              <div className="space-y-4 text-slate-600 font-bold text-sm">
                <p>• Dilarang meninggalkan halaman ujian selama waktu berjalan.</p>
                <p>• Pelanggaran akan dicatat secara otomatis oleh sistem.</p>
                <p>• Token hanya dapat digunakan satu kali per perangkat.</p>
                <p>• Pastikan tombol "Kirim Jawaban" ditekan sebelum waktu habis.</p>
              </div>
            </div>
          )}

          {activeMenu === 'Hasil Ujian' && (
            <div className="bg-white p-20 rounded-[3rem] border border-dashed text-center space-y-4">
              <BarChart3 size={60} className="mx-auto text-slate-100"/>
              <h3 className="text-slate-400 font-black uppercase tracking-widest">Riwayat Belum Tersedia</h3>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}