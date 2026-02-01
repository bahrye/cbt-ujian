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
  
  // State Modal Konfirmasi
  const [showModal, setShowModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenAsli, setTokenAsli] = useState('');
  const [konfirmasiJujur, setKonfirmasiJujur] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Load data jadwal & status secara real-time
    const unsubJadwal = onSnapshot(collection(db, "ujian"), (snap) => {
      setDaftarJadwal(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

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

    return () => { unsubJadwal(); unsubStatus(); unsubToken(); };
  }, []);

  const handleStartProcess = async () => {
    if (tokenInput.toUpperCase() !== tokenAsli) return alert("Token Salah!");
    if (!konfirmasiJujur) return alert("Silakan centang konfirmasi kejujuran!");

    const user = auth.currentUser;
    const docId = `${user?.uid}_${selectedUjian.id}`;

    await setDoc(doc(db, "ujian_berjalan", docId), {
      uid: user?.uid,
      ujianId: selectedUjian.id,
      nama: user?.email?.split('@')[0],
      status: 'Mengerjakan',
      mulaiAt: new Date(),
      violations: 0
    }, { merge: true });

    setIsExamMode(true);
    setShowModal(false);
  };

  if (isExamMode) return <LembarUjian ujian={selectedUjian} onFinish={() => setIsExamMode(false)} />;

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userName={auth.currentUser?.email || "Siswa"} />
      
      <main className="flex-1 p-8">
        {activeTab === 'jadwal' && (
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Jadwal Ujian Aktif</h1>
            <div className="space-y-4">
              {daftarJadwal.map((u) => {
                const sekarang = new Date();
                const mulai = u.mulai?.toDate();
                const selesai = u.selesai?.toDate();
                const status = statusSiswa[u.id] || 'Belum Mengerjakan';

                return (
                  <div key={u.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-blue-700">{u.namaMapel}</h3>
                      <div className="grid grid-cols-2 gap-x-10 text-sm text-gray-500 mt-2">
                        <p>📍 Kelas: {u.kelas}</p>
                        <p>👥 Kelompok: {u.kelompok}</p>
                        <p>⏰ Mulai: {mulai?.toLocaleString()}</p>
                        <p>⏳ Durasi: {u.durasi} Menit</p>
                        <p>👤 Pengawas: {u.pengawas}</p>
                      </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end gap-2">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${status === 'Selesai' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-600'}`}>
                        {status}
                      </span>
                      
                      {status === 'Selesai' ? (
                        <button disabled className="bg-gray-200 text-gray-400 px-6 py-2 rounded-xl font-bold">Selesai</button>
                      ) : sekarang < mulai ? (
                        <button disabled className="bg-blue-100 text-blue-300 px-6 py-2 rounded-xl font-bold">Belum Mulai</button>
                      ) : sekarang > selesai ? (
                        <button disabled className="bg-red-100 text-red-400 px-6 py-2 rounded-xl font-bold">Waktu Habis</button>
                      ) : (
                        <button 
                          onClick={() => { setSelectedUjian(u); setShowModal(true); }}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-md"
                        >
                          {status === 'Mengerjakan' ? 'Lanjut Mengerjakan' : 'Mulai Sekarang'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Konfirmasi & Token */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Konfirmasi Ujian</h2>
              <p className="text-slate-500 text-sm mb-6">Mata Pelajaran: <span className="text-blue-600 font-bold">{selectedUjian?.namaMapel}</span></p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Token Ujian</label>
                  <input 
                    type="text" 
                    placeholder="Masukkan 6 Digit Token"
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-3xl font-mono uppercase focus:border-blue-500 outline-none transition-all"
                    onChange={(e) => setTokenInput(e.target.value)}
                  />
                </div>

                <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                  <p className="text-[10px] text-yellow-700 font-bold uppercase mb-2 text-center">Tanda Tangan Digital (Pernyataan)</p>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 w-5 h-5 accent-yellow-600" onChange={(e) => setKonfirmasiJujur(e.target.checked)} />
                    <span className="text-xs text-yellow-800 leading-tight">Saya menyatakan akan mengerjakan ujian ini dengan jujur dan mematuhi segala tata tertib yang berlaku.</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition-all">Batal</button>
                  <button onClick={handleStartProcess} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all">Konfirmasi & Mulai</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tata-tertib' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h1 className="text-2xl font-bold mb-4">Tata Tertib Ujian</h1>
            <ul className="list-decimal ml-5 space-y-2 text-slate-600">
              <li>Dilarang membuka tab baru atau aplikasi lain selama ujian.</li>
              <li>Siswa wajib masuk ke ruang ujian 5 menit sebelum waktu mulai.</li>
              <li>Segala bentuk kecurangan akan dicatat otomatis oleh sistem.</li>
              <li>Pastikan koneksi internet stabil sebelum menekan tombol "Kirim Jawaban".</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}