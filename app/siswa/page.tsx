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
  const [userData, setUserData] = useState<any>(null); // Data profil siswa (termasuk kelas)
  
  // State Modal Konfirmasi
  const [showModal, setShowModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenAsli, setTokenAsli] = useState('');
  const [konfirmasiJujur, setKonfirmasiJujur] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Ambil data profil siswa untuk filter kelas
    const unsubUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    });

    // 2. Load data jadwal ujian secara real-time
    const unsubJadwal = onSnapshot(collection(db, "ujian"), (snap) => {
      setDaftarJadwal(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Load status pengerjaan siswa
    const unsubStatus = onSnapshot(collection(db, "ujian_berjalan"), (snap) => {
      const map: any = {};
      snap.docs.forEach(d => {
        if (d.id.startsWith(user.uid)) {
          map[d.data().ujianId] = d.data().status;
        }
      });
      setStatusSiswa(map);
    });

    // 4. Ambil token aktif dari pengaturan
    const unsubToken = onSnapshot(doc(db, "settings", "ujian_aktif"), (d) => {
      if (d.exists()) setTokenAsli(d.data().token);
    });

    return () => { 
      unsubUser(); 
      unsubJadwal(); 
      unsubStatus(); 
      unsubToken(); 
    };
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
    }, { merge: true });

    setIsExamMode(true);
    setShowModal(false);
  };

  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
      await signOut(auth);
      window.location.href = "/login";
    }
  };

  if (isExamMode) return <LembarUjian ujian={selectedUjian} onFinish={() => setIsExamMode(false)} />;

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* Sidebar dengan fungsi logout dan user name */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userName={userData?.nama || auth.currentUser?.email || "Siswa"} 
      />
      
      <main className="flex-1 p-4 md:p-8 mt-14 lg:mt-0">
        {activeTab === 'jadwal' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-slate-800">Jadwal Ujian Aktif</h1>
              <div className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-xs font-bold uppercase">
                Kelas: {userData?.kelas || '-'}
              </div>
            </div>

            <div className="grid gap-4">
              {jadwalTersedia.length > 0 ? (
                jadwalTersedia.map((u) => {
                  const sekarang = new Date();
                  const mulai = u.mulai?.toDate();
                  const selesai = u.selesai?.toDate();
                  const status = statusSiswa[u.id] || 'Belum Mengerjakan';

                  return (
                    <div key={u.id} className="group bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                          📚
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{u.namaMapel}</h3>
                          <div className="flex flex-wrap gap-x-4 text-xs text-slate-400 font-medium mt-1">
                            <span>⏱ {u.durasi} Menit</span>
                            <span>👤 {u.pengawas}</span>
                            <span>📅 {mulai?.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-4 md:pt-0">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-300">Status</p>
                          <p className={`text-sm font-bold ${status === 'Selesai' ? 'text-gray-400' : 'text-blue-600'}`}>{status}</p>
                        </div>
                        
                        {status === 'Selesai' ? (
                          <button disabled className="bg-gray-100 text-gray-400 px-6 py-2.5 rounded-2xl font-bold text-sm cursor-not-allowed">Selesai</button>
                        ) : sekarang < mulai ? (
                          <button disabled className="bg-amber-50 text-amber-500 px-6 py-2.5 rounded-2xl font-bold text-sm">Belum Mulai</button>
                        ) : sekarang > selesai ? (
                          <button disabled className="bg-red-50 text-red-400 px-6 py-2.5 rounded-2xl font-bold text-sm">Waktu Habis</button>
                        ) : (
                          <button 
                            onClick={() => { setSelectedUjian(u); setShowModal(true); }}
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-green-100 transition-all active:scale-95"
                          >
                            {status === 'Mengerjakan' ? 'Lanjut' : 'Mulai'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                  <p className="text-slate-400 font-medium">Tidak ada jadwal ujian untuk kelas Anda.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Konfirmasi & Token */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Konfirmasi Ujian</h2>
              <p className="text-slate-500 text-sm mb-6">Mata Pelajaran: <span className="text-blue-600 font-bold">{selectedUjian?.namaMapel}</span></p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Token Ujian</label>
                  <input 
                    type="text" 
                    placeholder="Masukkan Token"
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-3xl font-mono uppercase focus:border-blue-500 outline-none transition-all"
                    onChange={(e) => setTokenInput(e.target.value)}
                  />
                </div>

                <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 w-5 h-5 accent-yellow-600" onChange={(e) => setKonfirmasiJujur(e.target.checked)} />
                    <span className="text-xs text-yellow-800 leading-tight">Saya menyatakan akan mengerjakan ujian ini dengan jujur dan mematuhi tata tertib.</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition-all">Batal</button>
                  <button onClick={handleStartProcess} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 transition-all">Mulai Ujian</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tata-tertib' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Tata Tertib Ujian</h1>
            <div className="space-y-4 text-slate-600">
              {[
                "Dilarang membuka tab baru atau aplikasi lain selama ujian.",
                "Siswa wajib masuk ke ruang ujian tepat waktu.",
                "Segala bentuk kecurangan akan dicatat otomatis oleh sistem.",
                "Pastikan koneksi internet stabil sebelum mengirim jawaban."
              ].map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="bg-blue-50 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i+1}</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}