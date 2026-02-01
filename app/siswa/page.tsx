'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Sidebar from './components/Sidebar';
import LembarUjian from './components/LembarUjian';

export default function PageSiswa() {
  const [activeTab, setActiveTab] = useState('jadwal');
  const [isExamMode, setIsExamMode] = useState(false);
  const [selectedUjian, setSelectedUjian] = useState<any>(null);
  const [daftarJadwal, setDaftarJadwal] = useState<any[]>([]);
  const [statusSiswa, setStatusSiswa] = useState<any>({});
  const [userData, setUserData] = useState<any>(null);
  
  // State Modal Konfirmasi
  const [showModal, setShowModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenAsli, setTokenAsli] = useState('');
  const [konfirmasiJujur, setKonfirmasiJujur] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Ambil profil siswa untuk filter kelas
    const unsubUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) setUserData(docSnap.data());
    });

    // Load data jadwal
    const unsubJadwal = onSnapshot(collection(db, "ujian"), (snap) => {
      setDaftarJadwal(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Load status pengerjaan
    const unsubStatus = onSnapshot(collection(db, "ujian_berjalan"), (snap) => {
      const map: any = {};
      snap.docs.forEach(d => {
        if (d.id.startsWith(user.uid)) {
          map[d.data().ujianId] = d.data().status;
        }
      });
      setStatusSiswa(map);
    });

    const unsubToken = onSnapshot(doc(db, "settings", "ujian_aktif"), (d) => {
      if (d.exists()) setTokenAsli(d.data().token);
    });

    return () => { unsubUser(); unsubJadwal(); unsubStatus(); unsubToken(); };
  }, []);

  // Filter jadwal berdasarkan kelas siswa
  const jadwalTersedia = daftarJadwal.filter(u => u.kelas === userData?.kelas);

  const handleStartProcess = async () => {
    if (tokenInput.toUpperCase() !== tokenAsli) return alert("Token Salah!");
    if (!konfirmasiJujur) return alert("Silakan centang konfirmasi kejujuran!");

    const user = auth.currentUser;
    const docId = `${user?.uid}_${selectedUjian.id}`;

    await setDoc(doc(db, "ujian_berjalan", docId), {
      uid: user?.uid,
      ujianId: selectedUjian.id,
      nama: userData?.nama || user?.email?.split('@')[0],
      status: 'Mengerjakan',
      mulaiAt: new Date(),
      violations: 0
    }, { merge: true });

    setIsExamMode(true);
    setShowModal(false);
  };

  return (
    <div className="flex bg-[#f8fafc] min-h-screen font-sans text-slate-900">
      {/* Sidebar tetap ada bahkan saat ujian (seperti Admin Layout) */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userName={userData?.nama || auth.currentUser?.email || "Siswa"} 
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar / Header Profesional */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm font-medium">Siswa</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-semibold capitalize">
              {isExamMode ? `Ujian: ${selectedUjian?.namaMapel}` : activeTab.replace('-', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800 leading-none">{userData?.nama}</p>
              <p className="text-[10px] text-slate-500 font-medium">Kelas {userData?.kelas || '-'}</p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {isExamMode ? (
            <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
               <LembarUjian ujian={selectedUjian} onFinish={() => setIsExamMode(false)} />
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-6">
              {activeTab === 'jadwal' && (
                <>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Daftar Ujian Tersedia</h1>
                      <p className="text-slate-500 text-sm">Pilih mata pelajaran untuk memulai ujian sesuai jadwal.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {jadwalTersedia.length > 0 ? (
                      jadwalTersedia.map((u) => {
                        const sekarang = new Date();
                        const mulai = u.mulai?.toDate();
                        const selesai = u.selesai?.toDate();
                        const status = statusSiswa[u.id] || 'Belum Mengerjakan';

                        return (
                          <div key={u.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between hover:border-indigo-300 transition-colors shadow-sm">
                            <div className="flex items-center gap-5 w-full md:w-auto">
                              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                                <span className="text-xl font-bold">{u.namaMapel?.charAt(0)}</span>
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-800 text-lg">{u.namaMapel}</h3>
                                <div className="flex flex-wrap gap-4 mt-1 text-xs text-slate-500 font-medium">
                                  <span className="flex items-center gap-1">🕒 {u.durasi} Menit</span>
                                  <span className="flex items-center gap-1">👤 {u.pengawas}</span>
                                  <span className="flex items-center gap-1">📅 {mulai?.toLocaleString('id-ID', { dateStyle: 'medium' })}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-none border-slate-100">
                              <div className="hidden lg:block text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status Anda</p>
                                <span className={`text-xs font-bold ${status === 'Selesai' ? 'text-slate-400' : 'text-indigo-600'}`}>
                                  {status}
                                </span>
                              </div>

                              {status === 'Selesai' ? (
                                <button disabled className="w-full md:w-32 py-2.5 rounded-lg bg-slate-100 text-slate-400 font-bold text-sm">Selesai</button>
                              ) : sekarang < mulai ? (
                                <button disabled className="w-full md:w-32 py-2.5 rounded-lg bg-amber-50 text-amber-600 font-bold text-sm">Belum Mulai</button>
                              ) : sekarang > selesai ? (
                                <button disabled className="w-full md:w-32 py-2.5 rounded-lg bg-red-50 text-red-500 font-bold text-sm">Waktu Habis</button>
                              ) : (
                                <button 
                                  onClick={() => { setSelectedUjian(u); setShowModal(true); }}
                                  className="w-full md:w-32 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-100"
                                >
                                  {status === 'Mengerjakan' ? 'Lanjut' : 'Mulai'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl py-20 text-center">
                        <p className="text-slate-400 font-medium">Tidak ada jadwal ujian untuk kelas {userData?.kelas || '-'}.</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'tata-tertib' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-8">
                  <h2 className="text-xl font-bold text-slate-900 mb-6">Tata Tertib Pelaksanaan Ujian</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {[
                      { icon: "🚫", title: "Integritas", desc: "Dilarang membuka tab baru atau aplikasi lain selama ujian berlangsung." },
                      { icon: "⏰", title: "Ketepatan Waktu", desc: "Pastikan Anda memulai ujian sesuai dengan jadwal yang telah ditentukan." },
                      { icon: "📡", title: "Koneksi", desc: "Gunakan jaringan internet yang stabil untuk mencegah kegagalan pengiriman." },
                      { icon: "📝", title: "Kejujuran", desc: "Segala bentuk kecurangan akan terekam secara otomatis oleh sistem." }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-4 p-4 rounded-xl border border-slate-50 bg-slate-50/50">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed mt-1">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal Konfirmasi dengan Gaya Profesional */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-indigo-600 p-6 text-white text-center">
              <h2 className="text-xl font-bold">Verifikasi Peserta</h2>
              <p className="text-indigo-100 text-xs mt-1">Mata Pelajaran: {selectedUjian?.namaMapel}</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Token Ujian</label>
                <input 
                  type="text" 
                  placeholder="INPUT TOKEN"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-2xl font-mono uppercase focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  onChange={(e) => setTokenInput(e.target.value)}
                />
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 accent-amber-600 rounded" onChange={(e) => setKonfirmasiJujur(e.target.checked)} />
                  <span className="text-xs text-amber-800 font-medium">Saya berjanji akan mengerjakan ujian ini secara mandiri tanpa bantuan pihak manapun.</span>
                </label>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all">Batal</button>
                <button onClick={handleStartProcess} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all">Mulai</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}