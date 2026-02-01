'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, getDocs, updateDoc, collection, query, orderBy } from 'firebase/firestore';

export default function LembarUjian({ ujian, onFinish }: { ujian: any, onFinish: () => void }) {
  const [daftarSoal, setDaftarSoal] = useState<any[]>([]);
  const [jawabanSiswa, setJawabanSiswa] = useState<{ [key: string]: string }>({});
  const [timeLeft, setTimeLeft] = useState(Number(ujian.durasi) * 60);
  const [violations, setViolations] = useState(0);

  useEffect(() => {
    const fetchSoal = async () => {
      const q = query(collection(db, "bank_soal"), orderBy("createdAt", "asc"));
      const snap = await getDocs(q);
      setDaftarSoal(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchSoal();

    const handleViolation = async () => {
      setViolations(v => {
        const newCount = v + 1;
        const user = auth.currentUser;
        if (user) {
          updateDoc(doc(db, "ujian_berjalan", `${user.uid}_${ujian.id}`), {
            violations: newCount,
            lastViolation: new Date()
          });
        }
        return newCount;
      });
      alert("⚠️ PERINGATAN! Anda terdeteksi meninggalkan halaman. Pelanggaran dicatat!");
    };

    const handleBlur = () => handleViolation();
    window.addEventListener('blur', handleBlur);
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          submitUjian(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.removeEventListener('blur', handleBlur);
      clearInterval(timer);
    };
  }, [ujian.id]);

  const submitUjian = async (auto = false) => {
    if(!auto && !confirm("Yakin ingin mengirim jawaban sekarang?")) return;
    
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
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b p-4 flex justify-between items-center px-6 md:px-20 z-50">
        <div>
          <h2 className="font-bold text-slate-800">{ujian.namaMapel}</h2>
          <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">⚠️ Pelanggaran: {violations}</span>
        </div>
        <div className="bg-slate-900 text-white px-5 py-2 rounded-2xl font-mono font-bold shadow-lg">
          ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      <div className="max-w-3xl mx-auto py-10 px-4">
        {daftarSoal.map((s, i) => (
          <div key={s.id} className="bg-white p-8 rounded-3xl shadow-sm mb-6 border border-slate-100">
            <p className="text-lg text-slate-800 font-medium leading-relaxed mb-6">
              <span className="inline-block w-8 h-8 bg-blue-600 text-white rounded-lg text-center leading-8 mr-3 font-bold">{i + 1}</span>
              {s.pertanyaan}
            </p>
            <div className="grid gap-3 ml-11">
              {s.opsi.map((o: string) => (
                <label key={o} className={`flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${jawabanSiswa[s.id] === o ? 'border-blue-500 bg-blue-50' : 'border-slate-50 hover:border-slate-200'}`}>
                  <input type="radio" className="w-5 h-5 mr-4 accent-blue-600" onChange={() => setJawabanSiswa({...jawabanSiswa, [s.id]: o})} checked={jawabanSiswa[s.id] === o} />
                  {o}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button onClick={() => submitUjian()} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-xl hover:bg-blue-700 shadow-xl transition-all">KIRIM JAWABAN SEKARANG</button>
      </div>
    </div>
  );
}