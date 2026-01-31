'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy 
} from 'firebase/firestore';

export default function HalamanUjianSiswa() {
  // State Management
  const [isVerified, setIsVerified] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenAsli, setTokenAsli] = useState('');
  const [daftarSoal, setDaftarSoal] = useState<any[]>([]);
  const [violations, setViolations] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3600); // Default 60 Menit
  const [jawabanSiswa, setJawabanSiswa] = useState<{ [key: string]: string }>({});

  // 1. Ambil Token Aktif dari Pengawas (Real-time)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "ujian_aktif"), (docSnap) => {
      if (docSnap.exists()) {
        setTokenAsli(docSnap.data().token);
      }
    });
    return () => unsub();
  }, []);

  // 2. Sistem Anti-Contek & Timer (Hanya aktif jika sudah masuk ujian)
  useEffect(() => {
    if (!isVerified) return;

    // Fungsi mencatat pelanggaran ke Firebase
    const laporPelanggaran = async (jumlahBaru: number) => {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "ujian_berjalan", user.uid), {
          violations: jumlahBaru,
          lastViolation: new Date()
        });
      }
    };

    const handleViolation = () => {
      setViolations((v) => {
        const newCount = v + 1;
        laporPelanggaran(newCount);
        return newCount;
      });
      alert("PERINGATAN! Anda terdeteksi meninggalkan halaman ujian. Pelanggaran dicatat!");
    };

    // Event Listeners untuk deteksi tab/jendela
    const handleVisibility = () => { if (document.hidden) handleViolation(); };
    const handleBlur = () => { handleViolation(); };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);

    // Timer Countdown
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSelesaiUjian(); // Otomatis selesai jika waktu habis
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      clearInterval(timer);
    };
  }, [isVerified]);

  // 3. Ambil Soal dari Bank Soal setelah Token Benar
  const fetchSoal = async () => {
    const q = query(collection(db, "bank_soal"), orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setDaftarSoal(data);
  };

  // 4. Verifikasi Token & Mulai Ujian
  const handleStartUjian = async () => {
    if (tokenInput.toUpperCase() === tokenAsli) {
      const user = auth.currentUser;
      if (user) {
        // Daftarkan siswa ke tabel monitoring Pengawas
        await setDoc(doc(db, "ujian_berjalan", user.uid), {
          nama: user.email?.split('@')[0] || "Siswa",
          email: user.email,
          violations: 0,
          status: 'Mengerjakan',
          mulaiAt: new Date()
        });
        await fetchSoal();
        setIsVerified(true);
      }
    } else {
      alert("Token salah! Silakan minta token terbaru ke pengawas.");
    }
  };

  // 5. Simpan Jawaban ke State
  const handlePilihJawaban = (soalId: string, pilihan: string) => {
    setJawabanSiswa(prev => ({ ...prev, [soalId]: pilihan }));
  };

  // 6. Selesai Ujian
  const handleSelesaiUjian = async () => {
    const user = auth.currentUser;
    if (user && confirm("Apakah Anda yakin ingin mengakhiri ujian?")) {
      await updateDoc(doc(db, "ujian_berjalan", user.uid), {
        status: 'Selesai',
        selesaiAt: new Date(),
        jawaban: jawabanSiswa
      });
      alert("Ujian selesai. Terima kasih!");
      window.location.reload(); // Reset halaman
    }
  };

  // Format Waktu MM:SS
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Tampilan 1: Input Token
  if (!isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
          <h2 className="text-3xl font-extrabold mb-2 text-blue-700">CBT Online</h2>
          <p className="text-gray-500 mb-8 text-sm">Masukkan token ujian untuk memvalidasi akses Anda.</p>
          <input 
            type="text" 
            placeholder="Ketik 6 Digit Token" 
            className="w-full border-2 border-blue-100 p-4 rounded-xl text-center text-3xl font-mono uppercase focus:border-blue-500 outline-none mb-6 transition-all"
            onChange={(e) => setTokenInput(e.target.value)}
          />
          <button 
            onClick={handleStartUjian}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:bg-blue-700 transition-all"
          >
            Masuk Ruang Ujian
          </button>
        </div>
      </div>
    );
  }

  // Tampilan 2: Lembar Ujian
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header Bar */}
      <div className="sticky top-0 z-50 bg-white border-b p-4 flex justify-between items-center px-4 md:px-20 shadow-sm">
        <div>
          <h1 className="font-bold text-blue-800">Ujian Berlangsung</h1>
          <p className="text-xs font-semibold text-red-500">Pelanggaran: {violations}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full font-mono font-bold">
            ⏱️ {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto mt-8 p-4">
        {daftarSoal.length === 0 ? (
          <p className="text-center text-gray-500">Memuat soal...</p>
        ) : (
          daftarSoal.map((s, index) => (
            <div key={s.id} className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-gray-100">
              <p className="text-lg font-semibold mb-6 text-gray-800">
                <span className="text-blue-600 mr-2">{index + 1}.</span> {s.pertanyaan}
              </p>
              <div className="grid grid-cols-1 gap-3">
                {s.opsi.map((opsi: string, i: number) => (
                  <label 
                    key={i} 
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      jawabanSiswa[s.id] === opsi ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name={s.id} 
                      className="w-5 h-5 mr-4 accent-blue-600"
                      onChange={() => handlePilihJawaban(s.id, opsi)}
                      checked={jawabanSiswa[s.id] === opsi}
                    />
                    <span className="text-gray-700">{opsi}</span>
                  </label>
                ))}
              </div>
            </div>
          ))
        )}

        <button 
          onClick={handleSelesaiUjian}
          className="mt-10 w-full bg-green-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-green-700 shadow-xl"
        >
          KIRIM JAWABAN SEKARANG
        </button>
      </div>
    </div>
  );
}