'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, onSnapshot, collection } from 'firebase/firestore';

export default function DashboardPengawas() {
  const [token, setToken] = useState('');
  const [students, setStudents] = useState<any[]>([]);

  // 1. Monitor Token dan Daftar Siswa secara Real-time
  useEffect(() => {
    // Ambil Token Aktif
    const unsubToken = onSnapshot(doc(db, "settings", "ujian_aktif"), (docSnap) => {
      if (docSnap.exists()) {
        setToken(docSnap.data().token);
      }
    });

    // Ambil Data Siswa yang sedang ujian
    const unsubSiswa = onSnapshot(collection(db, "ujian_berjalan"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(data);
    });

    return () => {
      unsubToken();
      unsubSiswa();
    };
  }, []);

  // 2. Fungsi Membuat Token Acak Baru
  const generateToken = async () => {
    const newToken = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      await updateDoc(doc(db, "settings", "ujian_aktif"), {
        token: newToken
      });
      alert("Token baru berhasil dibuat: " + newToken);
    } catch (err) {
      console.error("Gagal update token:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Panel Pengawas</h1>
        
        {/* Card Token */}
        <div className="bg-blue-600 text-white p-8 rounded-2xl shadow-lg mb-10 flex justify-between items-center">
          <div>
            <p className="text-blue-100 text-lg">Token Ujian Saat Ini</p>
            <h2 className="text-6xl font-mono font-black tracking-widest">{token || '......'}</h2>
          </div>
          <button 
            onClick={generateToken}
            className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl font-bold transition-all shadow-md"
          >
            Update Token Baru
          </button>
        </div>

        {/* Tabel Monitoring */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-700">Monitoring Siswa Real-time</h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 uppercase text-sm">
                <th className="p-4 font-semibold">Nama Siswa</th>
                <th className="p-4 font-semibold text-center">Pelanggaran (Pindah Tab)</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-10 text-center text-gray-400">Belum ada siswa yang masuk ujian.</td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium">{s.nama}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full font-bold ${s.violations > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {s.violations} Kali
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        {s.status || 'Aktif'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}