'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
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

    // Ambil data profil siswa untuk filter kelas
    const unsubUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) setUserData(docSnap.data());
    });

    // Load data jadwal ujian secara real-time
    const unsubJadwal = onSnapshot(collection(db, "ujian"), (snap) => {
      setDaftarJadwal(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Load status pengerjaan siswa
    const unsubStatus = onSnapshot(collection(db, "ujian_berjalan"), (snap) => {
      const map: any = {};
      snap.docs.forEach(d => {
        if (d.id.startsWith(user.uid)) {
          map[d.data().ujianId] = d.data().status;
        }
      });
      setStatusSiswa(map);
    });

    // Ambil token aktif dari pengaturan
    const unsubToken = onSnapshot(doc(db, "settings", "ujian_aktif"), (d) => {
      if (d.exists()) setTokenAsli(d.data().token);
    });

    return () => { unsubUser(); unsubJadwal(); unsubStatus(); unsubToken(); };
  }, []);

  // Filter jadwal: Hanya tampilkan jika kelas pada ujian sesuai dengan kelas siswa
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
    }, { merge: true }); //

    setIsExamMode(true);
    setShowModal(false);
  };

  return (
    <div className="flex bg-[#f8fafc] min-h-screen font-sans text-slate-900">
      {/* Sidebar terintegrasi, tetap muncul untuk navigasi utama */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsExamMode(false); // Reset mode ujian jika berpindah menu
        }} 
        userName={userData?.nama || auth.currentUser?.email || "Siswa"} 
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header/Topbar Profesional */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm font-medium">Panel Siswa</span>
            <span className="text-slate-300">/</span>
            <span className="text-indigo-600 font-semibold capitalize">
              {isExamMode ? `Sedang Ujian: ${selectedUjian?.namaMapel}` : activeTab.replace('-', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                  Kelas {userData?.kelas || '-'}
                </p>
             </div>
          </div>
        </header>

        {/* Area Konten Utama */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {isExamMode ? (
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
               <LembarUjian ujian={selectedUjian} onFinish={() => setIsExamMode(false)} />
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-6">
              {activeTab === 'jadwal' && (
                <>
                  <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Jadwal Pelaksanaan Ujian</h1>
                    <p className="text-slate-500 text-sm mt-1">Silakan pilih ujian aktif sesuai dengan jadwal yang telah ditentukan.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {jadwalTersedia.length > 0 ? (
                      jadwalTersedia.map((u) => {
                        const sekarang = new Date();
                        const mulai = u.mulai?.toDate();
                        const selesai = u.selesai?.toDate();
                        const status = statusSiswa[u.id] || 'Belum Mengerjakan';

                        return (
                          <div key={u.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between hover:shadow-md transition-all group">
                            <div className="flex items-center gap-5 w-full md:w-auto">
                              <div className="w-14 h-14 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-2xl flex items-center justify-center transition-colors shrink-0">
                                <span className="text-2xl font-bold">{u.namaMapel?.charAt(0)}</span>
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-800 text-lg leading-tight">{u.namaMapel}</h3>
                                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-slate-500">
                                  <span className="flex items-center gap-1.5">⏱ {u.durasi} Menit</span>
                                  <span className="flex items-center gap-1.5">📅 {mulai?.toLocaleString('id-ID', { dateStyle: 'medium' })}</span>
                                  <span className="flex items-center gap-1.5">👤 {u.pengawas}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 w-full md:w-auto mt-5 md:mt-0 pt-5 md:pt-0 border-t md:border-none border-slate-100">
                              <div className="text-left md:text-right hidden sm:block">
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Status</p>
                                <span className={`text-xs font-bold ${status === 'Selesai' ? 'text-slate-400' : 'text-indigo-600'}`}>
                                  {status}
                                </span>
                              </div>

                              {status === 'Selesai' ? (
                                <button disabled className="w-full md:w-36 py-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-sm cursor-not-allowed">Selesai</button>
                              ) : sekarang < mulai ? (
                                <button disabled className="w-full md:w-36 py-3 rounded-xl bg-amber-50 text-amber-600 font-bold text-sm">Belum Mulai</button>
                              ) : sekarang > selesai ? (
                                <button disabled className="w-full md:w-36 py-3 rounded-xl bg-red-50 text-red-500 font-bold text-sm">Waktu Habis</button>
                              ) : (
                                <button 
                                  onClick={() => { setSelectedUjian(u); setShowModal(true); }}
                                  className="w-full md:w-36 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-100"
                                >
                                  {status === 'Mengerjakan' ? 'Lanjut Ujian' : 'Mulai Ujian'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-24 text-center">
                        <div className="text-4xl mb-4">📂</div>
                        <p className="text-slate-400 font-medium">Belum ada jadwal ujian tersedia untuk kelas Anda.</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'tata-tertib' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-4xl">
                  <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                    <span className="p-2 bg-indigo-50 rounded-lg text-indigo-600 text-xl">📜</span>
                    Tata Tertib Peserta Ujian
                  </h2>
                  <div className="space-y-6">
                    {[
                      { t: "Integritas Tinggi", d: "Sistem akan mendeteksi secara otomatis jika peserta membuka tab atau aplikasi lain." },
                      { t: "Waktu Pengerjaan", d: "Ujian hanya dapat diakses selama rentang waktu yang telah ditentukan oleh Admin/Guru." },
                      { t: "Koneksi Stabil", d: "Pastikan perangkat terhubung dengan internet yang stabil untuk kelancaran pengiriman jawaban." },
                      { t: "Satu Perangkat", d: "Gunakan satu perangkat utama. Perpindahan akun di tengah ujian dapat menyebabkan akun terblokir." }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="bg-slate-100 text-slate-500 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0">{i+1}</div>
                        <div>
                          <h4 className="font-bold text-slate-800">{item.t}</h4>
                          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{item.d}</p>
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

      {/* Modal Konfirmasi Profesional */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in duration-200">
            <div className="bg-indigo-600 p-8 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🔑</div>
              <h2 className="text-xl font-bold tracking-tight">Konfirmasi Memulai</h2>
              <p className="text-indigo-100 text-xs mt-1 opacity-80 uppercase tracking-widest">{selectedUjian?.namaMapel}</p>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-3 text-center">Masukan Token Ujian</label>
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="------"
                  className="w-full py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-3xl font-mono uppercase focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-200"
                  onChange={(e) => setTokenInput(e.target.value)}
                />
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-5 h-5 accent-amber-600 rounded-md shadow-sm" onChange={(e) => setKonfirmasiJujur(e.target.checked)} />
                  <span className="text-[11px] text-amber-800 font-medium leading-normal italic">
                    "Saya sadar bahwa kejujuran adalah hal utama. Saya bersedia menerima sanksi jika terbukti melakukan kecurangan dalam ujian ini."
                  </span>
                </label>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition-all">Batalkan</button>
                <button onClick={handleStartProcess} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95">Mulai Ujian</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}