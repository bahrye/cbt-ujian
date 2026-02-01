'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, getDocs, updateDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function LembarUjian({ ujian, onFinish }: { ujian: any, onFinish: () => void }) {
  const [daftarSoal, setDaftarSoal] = useState<any[]>([]);
  const [jawabanSiswa, setJawabanSiswa] = useState<{ [key: string]: string }>({});
  const [timeLeft, setTimeLeft] = useState(ujian.durasi * 60);
  const [violations, setViolations] = useState(0);

  useEffect(() => {
    const fetchSoal = async () => {
      const q = query(collection(db, "bank_soal"), orderBy("createdAt", "asc"));
      const snap = await getDocs(q);
      setDaftarSoal(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchSoal();

    // Anti-contek
    const handleViolation = async () => {
      setViolations(v => v + 1);
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "ujian_berjalan", `${user.uid}_${ujian.id}`), {
          violations: violations + 1,
          lastViolation: new Date()
        });
      }
      alert("PERINGATAN! Jangan meninggalkan halaman ujian!");
    };

    const blurHandler = () => handleViolation();
    window.addEventListener('blur', blurHandler);
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          submitUjian();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.removeEventListener('blur', blurHandler);
      clearInterval(timer);
    };
  }, [ujian.id]);

  const submitUjian = async () => {
    const user = auth.currentUser;
    if (user) {
      await updateDoc(doc(db, "ujian_berjalan", `${user.uid}_${ujian.id}`), {
        status: 'Selesai',
        selesaiAt: new Date(),
        jawaban: jawabanSiswa
      });
      alert("Ujian Selesai!");
      onFinish();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white shadow-md p-4 flex justify-between items-center px-10 z-50">
        <div>
          <h2 className="font-bold text-blue-800">{ujian.namaMapel}</h2>
          <p className="text-xs text-red-500 font-bold">Pelanggaran: {violations}</p>
        </div>
        <div className="bg-red-600 text-white px-6 py-2 rounded-full font-mono font-bold">
          ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      <div className="max-w-3xl mx-auto mt-8 p-4">
        {daftarSoal.map((s, i) => (
          <div key={s.id} className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-gray-100">
            <p className="text-lg font-semibold mb-4 text-gray-800">{i + 1}. {s.pertanyaan}</p>
            <div className="grid gap-3">
              {s.opsi.map((o: string) => (
                <label key={o} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${jawabanSiswa[s.id] === o ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <input type="radio" className="w-5 h-5 mr-4" onChange={() => setJawabanSiswa({...jawabanSiswa, [s.id]: o})} checked={jawabanSiswa[s.id] === o} />
                  {o}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button onClick={submitUjian} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-xl hover:bg-green-700">KIRIM JAWABAN</button>
      </div>
    </div>
  );
}