'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import Sidebar from './components/Sidebar';
import LembarUjian from './components/LembarUjian';

export default function PageSiswa() {
  const [activeTab, setActiveTab] = useState('jadwal');
  const [isExamMode, setIsExamMode] = useState(false);
  const [selectedUjian, setSelectedUjian] = useState<any>(null);
  const [daftarJadwal, setDaftarJadwal] = useState<any[]>([]);
  const [statusSiswa, setStatusSiswa] = useState<any>({});
  const [userData, setUserData] = useState<any>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenAsli, setTokenAsli] = useState('');
  const [konfirmasiJujur, setKonfirmasiJujur] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Ambil Profil Siswa (Ganti dengan koleksi profil Anda)
    getDoc(doc(db, "users", user.uid)).then(d => {
      if(d.exists()) setUserData(d.data());
    });

    // 2. Load Jadwal Berdasarkan Kelas Siswa
    const unsubJadwal = onSnapshot(collection(db, "ujian"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filter Kelas dilakukan secara client-side agar tetap real-time
      setDaftarJadwal(data);
    });

    // 3. Status Pengerjaan Real-time
    const unsubStatus = onSnapshot(collection(db, "ujian_berjalan"), (snap) => {
      const map: any = {};
      snap.docs.forEach(d => {
        if (d.id.startsWith(user.uid)) map[d.data().ujianId] = d.data().status;
      });
      setStatusSiswa(map);
    });

    // 4. Token Aktif
    const unsubToken = onSnapshot(doc(db, "settings", "ujian_aktif"), (d) => {
      if (d.exists()) setTokenAsli(d.data().token);
    });

    return () => { unsubJadwal(); unsubStatus(); unsubToken(); };
  }, []);

  // Filter jadwal sesuai kelas login
  const jadwalTerfilter = daftarJadwal.filter(u => u.kelas === userData?.kelas);

  const handleStartProcess = async () => {
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

  if (isExamMode) return <LembarUjian ujian={selectedUjian} onFinish={() => setIsExamMode(false)} />;

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userData={userData} />
      
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        {activeTab === 'jadwal' && (
          <div className="max-w-5xl mx-auto">
            <header className="mb-10">
              <h1 className="text-3xl font-black text-slate-800">Daftar Ujian Aktif</h1>
              <p className="text-slate-500">Menampilkan jadwal khusus untuk <span className="font-bold text-blue-600">Kelas {userData?.kelas || '...'}</span></p>
            </header>

            {jadwalTerfilter.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 p-20 rounded-3xl text-center">
                <p className="text-slate-400 font-medium">Belum ada jadwal ujian untuk kelas Anda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {jadwalTerfilter.map((u) => {
                  const sekarang = new Date();
                  const mulai = u.mulai?.toDate();
                  const selesai = u.selesai?.toDate();
                  const status = statusSiswa[u.id] || 'Belum Mengerjakan';

                  return (
                    <div key={u.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider">{u.kelompok}</div>
                        <div className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${status === 'Selesai' ? 'bg-green-100 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                          {status}
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-slate-800 mb-4 group-hover:text-blue-600 transition-colors">{u.namaMapel}</h3>
                      
                      <div className="space-y-2 text-sm text-slate-500 mb-8">
                        <div className="flex items-center gap-3"><span>🗓️</span> {mulai?.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                        <div className="flex items-center gap-3"><span>⏰</span> {mulai?.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {selesai?.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                        <div className="flex items-center gap-3"><span>👨‍🏫</span> Pengawas: {u.pengawas}</div>
                      </div>

                      <div className="pt-4 border-t border-slate-50">
                        {status === 'Selesai' ? (
                          <button disabled className="w-full py-3 bg-slate-100 text-slate-400 rounded-2xl font-bold cursor-not-allowed">Ujian Selesai</button>
                        ) : sekarang < mulai ? (
                          <button disabled className="w-full py-3 bg-blue-50 text-blue-300 rounded-2xl font-bold cursor-not-allowed">Belum Dimulai</button>
                        ) : sekarang > selesai ? (
                          <button disabled className="w-full py-3 bg-red-50 text-red-300 rounded-2xl font-bold cursor-not-allowed">Waktu Habis</button>
                        ) : (
                          <button 
                            onClick={() => { setSelectedUjian(u); setShowModal(true); }}
                            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                          >
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-slate-100 animate-in fade-in zoom-in duration-300">
              <h2 className="text-2xl font-black text-slate-800 mb-2">Konfirmasi Masuk</h2>
              <p className="text-slate-500 text-sm mb-8">Anda akan mengerjakan: <span className="text-blue-600 font-bold">{selectedUjian?.namaMapel}</span></p>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Input Token Pengawas</label>
                  <input 
                    type="text" 
                    placeholder="......"
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-4xl font-mono uppercase focus:border-blue-500 outline-none transition-all placeholder:text-slate-200"
                    onChange={(e) => setTokenInput(e.target.value)}
                    maxLength={6}
                  />
                </div>

                <div className="p-5 bg-orange-50/50 rounded-2xl border border-orange-100">
                  <label className="flex items-start gap-4 cursor-pointer">
                    <input type="checkbox" className="mt-1 w-6 h-6 accent-orange-600 flex-shrink-0" onChange={(e) => setKonfirmasiJujur(e.target.checked)} />
                    <span className="text-xs text-orange-900 leading-relaxed font-medium">Saya mengonfirmasi bahwa saya akan mengerjakan ujian ini secara mandiri, jujur, dan tanpa bantuan pihak lain.</span>
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition-all">Batal</button>
                  <button onClick={handleStartProcess} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all">Masuk Ujian</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}