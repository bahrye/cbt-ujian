'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import Sidebar from './components/Sidebar';
import LembarUjian from './components/LembarUjian';

// DEFINISI TYPE UNTUK MEMPERBAIKI ERROR TS2339
interface UjianData {
  id: string;
  namaMapel: string;
  kelas: string;
  kelompok: string;
  pengawas: string;
  durasi: number;
  mulai: Timestamp;
  selesai: Timestamp;
}

export default function PageSiswa() {
  const [activeTab, setActiveTab] = useState('jadwal');
  const [isExamMode, setIsExamMode] = useState(false);
  const [selectedUjian, setSelectedUjian] = useState<UjianData | null>(null);
  const [daftarJadwal, setDaftarJadwal] = useState<UjianData[]>([]); // Gunakan type UjianData
  const [statusSiswa, setStatusSiswa] = useState<{ [key: string]: string }>({});
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenAsli, setTokenAsli] = useState('');
  const [konfirmasiJujur, setKonfirmasiJujur] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const loadDataSiswa = async () => {
      try {
        const d = await getDoc(doc(db, "users", user.uid));
        if (d.exists()) {
          const dataSiswa = d.data();
          setUserData(dataSiswa);
          
          // Load jadwal dan filter berdasarkan kelas
          const unsubJadwal = onSnapshot(collection(db, "ujian"), (snap) => {
            const data = snap.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data() 
            })) as UjianData[]; // Casting ke UjianData
            
            const filtered = data.filter(u => u.kelas === dataSiswa.kelas);
            setDaftarJadwal(filtered);
            setIsLoading(false);
          });
          return unsubJadwal;
        }
        setIsLoading(false);
      } catch (e) {
        console.error(e);
        setIsLoading(false);
      }
    };

    const unsubStatus = onSnapshot(collection(db, "ujian_berjalan"), (snap) => {
      const map: any = {};
      snap.docs.forEach(d => {
        if (d.id.startsWith(user.uid)) map[d.data().ujianId] = d.data().status;
      });
      setStatusSiswa(map);
    });

    const unsubToken = onSnapshot(doc(db, "settings", "ujian_aktif"), (d) => {
      if (d.exists()) setTokenAsli(d.data().token);
    });

    loadDataSiswa();
    return () => { unsubStatus(); unsubToken(); };
  }, []);

  const handleStartProcess = async () => {
    if (!selectedUjian) return;
    if (tokenInput.toUpperCase() !== tokenAsli) return alert("Token Salah!");
    if (!konfirmasiJujur) return alert("Wajib menyetujui konfirmasi kejujuran!");

    const user = auth.currentUser;
    await setDoc(doc(db, "ujian_berjalan", `${user?.uid}_${selectedUjian.id}`), {
      uid: user?.uid,
      ujianId: selectedUjian.id,
      nama: userData?.nama || user?.email,
      status: 'Mengerjakan',
      mulaiAt: new Date(),
      violations: 0
    }, { merge: true });

    setIsExamMode(true);
    setShowModal(false);
  };

  if (isExamMode && selectedUjian) return <LembarUjian ujian={selectedUjian} onFinish={() => setIsExamMode(false)} />;

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userData={userData} />
      
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        {activeTab === 'jadwal' && (
          <div className="max-w-5xl mx-auto">
            <header className="mb-10 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-black text-slate-800">Jadwal Ujian</h1>
                <p className="text-slate-500 mt-1 italic">Khusus Kelas {userData?.kelas || '...'}</p>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NISN</p>
                <p className="font-bold text-slate-700">{userData?.nisn || '-'}</p>
              </div>
            </header>

            {isLoading ? (
              <div className="p-20 text-center text-slate-400">Memuat Jadwal...</div>
            ) : daftarJadwal.length === 0 ? (
              <div className="bg-white border-2 border-dashed p-20 rounded-[3rem] text-center text-slate-400 font-medium">
                Tidak ada jadwal untuk kelas Anda.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {daftarJadwal.map((u) => {
                  const sekarang = new Date();
                  const mulai = u.mulai.toDate();
                  const selesai = u.selesai.toDate();
                  const status = statusSiswa[u.id] || 'Belum Mengerjakan';

                  return (
                    <div key={u.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-50 hover:border-blue-200 transition-all group">
                      <div className="flex justify-between items-start mb-6">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase">{u.kelompok}</span>
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${status === 'Selesai' ? 'bg-green-100 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                          {status}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 mb-4">{u.namaMapel}</h3>
                      <div className="space-y-3 text-sm text-slate-500 mb-8 font-medium">
                        <p>📅 {mulai.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        <p>⏰ {mulai.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {selesai.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                        <p>👤 Pengawas: {u.pengawas}</p>
                      </div>
                      <div className="pt-4 border-t border-slate-50">
                        {status === 'Selesai' ? (
                          <button disabled className="w-full py-3 bg-slate-50 text-slate-400 rounded-2xl font-bold">Selesai</button>
                        ) : (sekarang < mulai) ? (
                          <button disabled className="w-full py-3 bg-blue-50 text-blue-300 rounded-2xl font-bold">Belum Mulai</button>
                        ) : (sekarang > selesai) ? (
                          <button disabled className="w-full py-3 bg-red-50 text-red-300 rounded-2xl font-bold">Waktu Habis</button>
                        ) : (
                          <button onClick={() => { setSelectedUjian(u); setShowModal(true); }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                            {status === 'Mengerjakan' ? 'Lanjut Mengerjakan' : 'Mulai Sekarang'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Konfirmasi */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-slate-100">
              <h2 className="text-2xl font-black text-slate-800 mb-2">Konfirmasi Token</h2>
              <p className="text-slate-500 text-sm mb-8">Ujian: <span className="text-blue-600 font-bold">{selectedUjian?.namaMapel}</span></p>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Token</label>
                  <input type="text" placeholder="......" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-4xl font-mono uppercase focus:border-blue-500 outline-none transition-all" onChange={(e) => setTokenInput(e.target.value)} maxLength={6} />
                </div>
                <div className="p-5 bg-orange-50/50 rounded-2xl border border-orange-100 flex gap-4 cursor-pointer" onClick={() => setKonfirmasiJujur(!konfirmasiJujur)}>
                  <input type="checkbox" checked={konfirmasiJujur} readOnly className="w-6 h-6 accent-orange-600 flex-shrink-0" />
                  <span className="text-xs text-orange-900 leading-relaxed font-medium">Saya menyatakan mengerjakan ujian ini dengan jujur.</span>
                </div>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-400 font-bold">Batal</button>
                  <button onClick={handleStartProcess} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl hover:bg-blue-700">Masuk</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}