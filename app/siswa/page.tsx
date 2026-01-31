'use client'
import { useState, useEffect } from 'react';

export default function UjianSiswa() {
  const [violations, setViolations] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3600); // 60 Menit dalam detik

  useEffect(() => {
    // Fungsi Deteksi Pindah Tab (Anti-Contek)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolations((prev) => prev + 1);
        alert("PERINGATAN! Anda terdeteksi meninggalkan halaman ujian.");
      }
    };

    // Fungsi Deteksi Keluar Jendela Browser
    const handleBlur = () => {
      setViolations((prev) => prev + 1);
      console.log("Siswa keluar dari fokus browser");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    // Timer Ujian
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      clearInterval(timer);
    };
  }, []);

  // Format Waktu MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <h1 className="text-xl font-bold">Ujian Matematika - Kelas IX</h1>
          <div className="text-right">
            <p className="text-sm text-gray-500">Sisa Waktu</p>
            <p className="text-2xl font-mono font-bold text-red-600">{formatTime(timeLeft)}</p>
          </div>
        </div>

        <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-400">
          <p className="text-sm text-yellow-700 font-semibold">
            Status Pelanggaran: <span className="text-red-600 text-lg">{violations}</span>
          </p>
          <p className="text-xs text-yellow-600">Catatan: Membuka tab baru atau menutup aplikasi akan menambah poin pelanggaran.</p>
        </div>

        {/* Area Soal (Contoh) */}
        <div className="space-y-6">
          <p className="text-lg font-medium">1. Berapakah hasil dari 15 + 25 x 2?</p>
          <div className="grid grid-cols-1 gap-3">
            {['50', '65', '80', '100'].map((opsi) => (
              <label key={opsi} className="flex items-center p-3 border rounded hover:bg-blue-50 cursor-pointer">
                <input type="radio" name="soal1" className="mr-3" />
                {opsi}
              </label>
            ))}
          </div>
        </div>

        <button className="mt-10 w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">
          Selesaikan Ujian
        </button>
      </div>
    </div>
  );
}