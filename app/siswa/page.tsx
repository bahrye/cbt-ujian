'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

export default function HalamanUjianSiswa() {
  const [isVerified, setIsVerified] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenAsli, setTokenAsli] = useState('');
  const [violations, setViolations] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3600); // 60 Menit

  // 1. Ambil token aktif dari pengawas saat halaman dimuat
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "ujian_aktif"), (docSnap) => {
      if (docSnap.exists()) setTokenAsli(docSnap.data().token);
    });
    return () => unsub();
  }, []);

  // 2. Logika Anti-Contek (Hanya jalan jika sudah verifikasi token)
  useEffect(() => {
    if (!isVerified) return;

    const handleViolation = async () => {
      setViolations((v) => {
        const newV = v + 1;
        // Update jumlah pelanggaran ke Firebase agar pengawas tahu
        const user = auth.currentUser;
        if (user) {
          updateDoc(doc(db, "ujian_berjalan", user.uid), {
            violations: newV
          });
        }
        return newV;
      });
      alert("PERINGATAN! Jangan meninggalkan halaman ujian atau membuka tab lain!");
    };

    const handleVisibility = () => { if (document.hidden) handleViolation(); };
    const handleBlur = () => { handleViolation(); };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      clearInterval(timer);
    };
  }, [isVerified]);

  // 3. Fungsi Verifikasi Token
  const handleStartUjian = async () => {
    if (tokenInput.toUpperCase() === tokenAsli) {
      const user = auth.currentUser;
      if (user) {
        // Daftarkan siswa ke tabel monitoring pengawas
        await setDoc(doc(db, "ujian_berjalan", user.uid), {
          nama: user.email?.split('@')[0], // Contoh ambil nama dari email
          violations: 0,
          status: 'Mengerjakan',
          mulaiAt: new Date()
        });
      }
      setIsVerified(true);
    } else {
      alert("Token yang Anda masukkan salah!");
    }
  };

  // Tampilan Input Token (Sebelum Ujian)
  if (!isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-6">Konfirmasi Ujian</h2>
          <p className="text-gray-500 mb-6">Silakan masukkan token yang diberikan oleh pengawas.</p>
          <input 
            type="text" 
            placeholder="Ketik Token..." 
            className="w-full border-2 border-gray-200 p-4 rounded-xl text-center text-2xl font-mono uppercase focus:border-blue-500 outline-none mb-4"
            onChange={(e) => setTokenInput(e.target.value)}
          />
          <button 
            onClick={handleStartUjian}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all"
          >
            Mulai Mengerjakan
          </button>
        </div>
      </div>
    );
  }

  // Tampilan Soal (Saat Ujian Berlangsung)
  return (
    <div className="min-h-screen bg-white">
      {/* Header Sticky */}
      <div className="sticky top-0 bg-blue-700 text-white p-4 shadow-md flex justify-between items-center px-8">
        <div>
          <h1 className="font-bold">Ujian Sekolah 2026</h1>
          <p className="text-xs text-blue-200">Pelanggaran: {violations}</p>
        </div>
        <div className="bg-blue-800 px-4 py-2 rounded-lg font-mono text-xl font-bold">
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-8">
        <div className="mb-10 p-6 bg-red-50 border-l-4 border-red-500 rounded">
          <p className="text-red-700 font-medium">Jangan menutup halaman ini hingga selesai tekan tombol kirim.</p>
        </div>

        {/* Contoh Soal */}
        <div className="text-xl mb-6">1. Apa ibu kota Indonesia saat ini?</div>
        <div className="space-y-4">
          {['Jakarta', 'Bandung', 'Surabaya', 'IKN'].map((pilihan) => (
            <label key={pilihan} className="flex items-center p-4 border rounded-xl hover:bg-blue-50 cursor-pointer transition-all">
              <input type="radio" name="soal1" className="w-5 h-5 mr-4" />
              {pilihan}
            </label>
          ))}
        </div>

        <button className="mt-12 w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700">
          Kirim Jawaban
        </button>
      </div>
    </div>
  );
}