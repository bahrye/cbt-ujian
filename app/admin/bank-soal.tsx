'use client'
import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { 
  collection, addDoc, getDocs, query, orderBy, 
  deleteDoc, doc, onSnapshot 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  Plus, Image as ImageIcon, Music, Save, Trash2, 
  HelpCircle, Loader2, FileText, CheckCircle2, ListRestart
} from 'lucide-react';

export default function BankSoalSection() {
  const [loading, setLoading] = useState(false);
  const [soalList, setSoalList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<{id: string, nama: string}[]>([]);
  
  // State Form Utama
  const [tipeSoal, setTipeSoal] = useState('pilihan_ganda');
  const [pertanyaan, setPertanyaan] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [bobot, setBobot] = useState(1);
  const [jawabanBenar, setJawabanBenar] = useState('');
  const [opsi, setOpsi] = useState({ a: '', b: '', c: '', d: '', e: '' });
  
  // State Khusus Pencocokan
  const [pairs, setPairs] = useState([{ id: Date.now(), key: '', value: '' }]);
  
  const [media, setMedia] = useState<{type: string, url: string} | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Load Mapel
    getDocs(query(collection(db, "mapel"), orderBy("nama", "asc"))).then(snap => {
      setMapelList(snap.docs.map(d => ({ id: d.id, nama: d.data().nama })));
    });

    // Load Soal Real-time
    const unsubscribe = onSnapshot(
      query(collection(db, "bank_soal"), orderBy("createdAt", "desc")), 
      (snapshot) => {
        setSoalList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );
    return () => unsubscribe();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const storageRef = ref(storage, `bank_soal/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on('state_changed', null, null, () => {
      getDownloadURL(uploadTask.snapshot.ref).then((url) => {
        setMedia({ type, url });
        setUploading(false);
      });
    });
  };

  const simpanSoal = async () => {
    let finalKunci = jawabanBenar;
    
    // Jika Pencocokan, ubah array pairs menjadi string JSON untuk disimpan
    if (tipeSoal === 'pencocokan') {
      finalKunci = JSON.stringify(pairs);
    }

    if (!pertanyaan || !selectedMapel || (!finalKunci && tipeSoal !== 'uraian')) {
      return alert("Lengkapi pertanyaan, mapel, dan kunci jawaban!");
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "bank_soal"), {
        pertanyaan,
        mapel: selectedMapel,
        tipe: tipeSoal,
        bobot: Number(bobot),
        opsi: tipeSoal === 'pilihan_ganda' ? opsi : null,
        jawabanBenar: finalKunci,
        media,
        createdAt: new Date()
      });
      alert("Soal berhasil disimpan ke Bank Soal!");
      resetForm();
    } catch (error) {
      alert("Gagal menyimpan soal");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPertanyaan('');
    setMedia(null);
    setOpsi({ a: '', b: '', c: '', d: '', e: '' });
    setJawabanBenar('');
    setPairs([{ id: Date.now(), key: '', value: '' }]);
    setBobot(1);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      {/* KIRI: FORM INPUT */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4 sticky top-24">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
            <Plus size={18} className="text-blue-600"/> Master Soal
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <select className="p-4 bg-slate-50 border-none rounded-2xl text-xs font-bold" value={selectedMapel} onChange={(e) => setSelectedMapel(e.target.value)}>
              <option value="">Pilih Mapel</option>
              {mapelList.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
            </select>
            <select className="p-4 bg-blue-600 text-white rounded-2xl text-xs font-bold" value={tipeSoal} onChange={(e) => {setTipeSoal(e.target.value); setJawabanBenar('');}}>
              <option value="pilihan_ganda">Pilihan Ganda</option>
              <option value="isian">Isian Singkat</option>
              <option value="uraian">Uraian / Essay</option>
              <option value="benar_salah">Benar / Salah</option>
              <option value="pencocokan">Pencocokan</option>
            </select>
          </div>

          <textarea placeholder="Tulis Pertanyaan..." className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm min-h-[100px] outline-none" value={pertanyaan} onChange={(e) => setPertanyaan(e.target.value)} />

          {/* INPUT MEDIA */}
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer p-3 bg-slate-50 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600">
              <ImageIcon size={16}/> <span className="text-[10px] font-bold">GAMBAR</span>
              <input type="file" hidden accept="image/*" onChange={(e) => handleUpload(e, 'image')} />
            </label>
            <label className="flex-1 cursor-pointer p-3 bg-slate-50 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:bg-purple-50 hover:text-purple-600">
              <Music size={16}/> <span className="text-[10px] font-bold">AUDIO</span>
              <input type="file" hidden accept="audio/*" onChange={(e) => handleUpload(e, 'audio')} />
            </label>
          </div>

          {/* DINAMIS BERDASARKAN TIPE */}
          <div className="space-y-3 border-t pt-4">
            {tipeSoal === 'pencocokan' && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase">Input Pasangan</p>
                {pairs.map((p, idx) => (
                  <div key={p.id} className="flex gap-2 items-center">
                    <input placeholder="Kiri" className="flex-1 p-2 bg-slate-50 border rounded-lg text-xs" value={p.key} onChange={(e) => {
                      const n = [...pairs]; n[idx].key = e.target.value; setPairs(n);
                    }} />
                    <input placeholder="Kanan" className="flex-1 p-2 bg-slate-50 border rounded-lg text-xs" value={p.value} onChange={(e) => {
                      const n = [...pairs]; n[idx].value = e.target.value; setPairs(n);
                    }} />
                    <button onClick={() => setPairs(pairs.filter(i => i.id !== p.id))} className="text-red-400"><Trash2 size={14}/></button>
                  </div>
                ))}
                <button onClick={() => setPairs([...pairs, {id: Date.now(), key: '', value: ''}])} className="w-full py-2 border-2 border-dashed rounded-xl text-[9px] font-bold text-slate-400">+ TAMBAH BARIS</button>
              </div>
            )}

            {tipeSoal === 'pilihan_ganda' && (
              <div className="space-y-2">
                {['a', 'b', 'c', 'd', 'e'].map(l => (
                  <input key={l} placeholder={`Opsi ${l.toUpperCase()}`} className="w-full p-3 bg-slate-50 border rounded-xl text-xs" value={(opsi as any)[l]} onChange={(e) => setOpsi({...opsi, [l]: e.target.value})} />
                ))}
                <select className="w-full p-4 bg-green-50 text-green-700 rounded-2xl text-xs font-bold" value={jawabanBenar} onChange={(e) => setJawabanBenar(e.target.value)}>
                  <option value="">Pilih Kunci Jawaban</option>
                  {['a','b','c','d','e'].map(l => (opsi as any)[l] && <option key={l} value={l}>Jawaban: {l.toUpperCase()}</option>)}
                </select>
              </div>
            )}

            {tipeSoal === 'benar_salah' && (
              <div className="flex gap-2">
                {['benar', 'salah'].map(v => (
                  <button key={v} onClick={() => setJawabanBenar(v)} className={`flex-1 py-3 rounded-xl font-bold uppercase text-[10px] border ${jawabanBenar === v ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-400'}`}>{v}</button>
                ))}
              </div>
            )}

            {(tipeSoal === 'isian' || tipeSoal === 'uraian') && (
              <input placeholder="Kunci Jawaban / Kata Kunci" className="w-full p-4 bg-green-50 text-green-700 rounded-2xl text-xs font-bold" value={jawabanBenar} onChange={(e) => setJawabanBenar(e.target.value)} />
            )}
          </div>

          <div className="flex gap-4 items-end border-t pt-4">
            <div className="w-24">
              <label className="text-[10px] font-black text-slate-400 uppercase">Bobot</label>
              <input type="number" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" value={bobot} onChange={(e) => setBobot(Number(e.target.value))} />
            </div>
            <button onClick={simpanSoal} disabled={loading || uploading} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : "Simpan Ke Bank"}
            </button>
          </div>
        </div>
      </div>

      {/* KANAN: LIST SOAL */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white p-6 rounded-3xl border shadow-sm flex justify-between items-center">
          <h2 className="text-sm font-black text-slate-800 uppercase">Daftar Bank Soal</h2>
          <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{soalList.length} UNIT</span>
        </div>

        <div className="space-y-4 overflow-y-auto max-h-[85vh] pr-2 custom-scrollbar">
          {soalList.map((s, idx) => (
            <div key={s.id} className="bg-white p-6 rounded-[2rem] border shadow-sm hover:border-blue-200 transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-slate-100 rounded text-[8px] font-black text-slate-400 uppercase">{s.mapel}</span>
                  <span className="px-2 py-1 bg-blue-50 rounded text-[8px] font-black text-blue-500 uppercase">{s.tipe.replace('_', ' ')}</span>
                </div>
                <button onClick={() => deleteDoc(doc(db, "bank_soal", s.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
              </div>
              <p className="text-sm font-bold text-slate-700 leading-relaxed mb-3">{s.pertanyaan}</p>
              
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                <div className="flex items-center gap-2 text-[9px] font-black text-green-600 uppercase">
                  <CheckCircle2 size={12}/> Kunci: {s.tipe === 'pencocokan' ? 'Matching Data' : s.jawabanBenar}
                </div>
                <span className="text-[9px] font-bold text-slate-400">Poin: {s.bobot}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}