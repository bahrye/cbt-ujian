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
  HelpCircle, Loader2, FileText, CheckCircle2, Layers
} from 'lucide-react';

export default function BankSoalSection() {
  const [loading, setLoading] = useState(false);
  const [soalList, setSoalList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<{id: string, nama: string}[]>([]);
  
  // State Form
  const [tipeSoal, setTipeSoal] = useState('pilihan_ganda');
  const [pertanyaan, setPertanyaan] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [bobot, setBobot] = useState(1);
  const [jawabanBenar, setJawabanBenar] = useState('');
  const [opsi, setOpsi] = useState({ a: '', b: '', c: '', d: '', e: '' });
  
  // State khusus Pencocokan
  const [pairs, setPairs] = useState([{ id: 1, key: '', value: '' }]);
  
  const [media, setMedia] = useState<{type: string, url: string} | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const qMapel = query(collection(db, "mapel"), orderBy("nama", "asc"));
    getDocs(qMapel).then(snap => {
      setMapelList(snap.docs.map(d => ({ id: d.id, nama: d.data().nama })));
    });

    const qSoal = query(collection(db, "bank_soal"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(qSoal, (snapshot) => {
      setSoalList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
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

  const addPair = () => setPairs([...pairs, { id: Date.now(), key: '', value: '' }]);
  const removePair = (id: number) => setPairs(pairs.filter(p => p.id !== id));

  const simpanSoal = async () => {
    // Validasi kunci jawaban berdasarkan tipe
    let finalJawaban = jawabanBenar;
    if (tipeSoal === 'pencocokan') {
      finalJawaban = JSON.stringify(pairs); // Simpan pasangan sebagai string JSON
    }

    if (!pertanyaan || !selectedMapel || (!finalJawaban && tipeSoal !== 'uraian')) {
      return alert("Mohon lengkapi Pertanyaan, Mapel, dan Kunci Jawaban!");
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "bank_soal"), {
        pertanyaan,
        mapel: selectedMapel,
        tipe: tipeSoal,
        bobot: Number(bobot),
        opsi: tipeSoal === 'pilihan_ganda' ? opsi : null,
        jawabanBenar: finalJawaban.toLowerCase().trim(),
        media,
        createdAt: new Date()
      });
      alert("Soal berhasil disimpan!");
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
    setPairs([{ id: 1, key: '', value: '' }]);
    setBobot(1);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* PANEL INPUT (5 KOLOM) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-5">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
            <Plus size={18} className="text-blue-600"/> Tambah Soal
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <select className="p-4 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none" value={selectedMapel} onChange={(e) => setSelectedMapel(e.target.value)}>
              <option value="">Pilih Mapel</option>
              {mapelList.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
            </select>
            <select className="p-4 bg-blue-600 text-white rounded-2xl text-xs font-bold outline-none" value={tipeSoal} onChange={(e) => setTipeSoal(e.target.value)}>
              <option value="pilihan_ganda">Pilihan Ganda</option>
              <option value="isian">Isian Singkat</option>
              <option value="uraian">Uraian / Essay</option>
              <option value="benar_salah">Benar / Salah</option>
              <option value="pencocokan">Pencocokan</option>
            </select>
          </div>

          <textarea placeholder="Tulis Pertanyaan..." className="w-full p-5 bg-slate-50 border-none rounded-2xl text-sm min-h-[100px] outline-none" value={pertanyaan} onChange={(e) => setPertanyaan(e.target.value)} />

          {/* INPUT KHUSUS PENCOCOKAN */}
          {tipeSoal === 'pencocokan' && (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pasangan Kunci & Jawaban</p>
              {pairs.map((p, idx) => (
                <div key={p.id} className="flex gap-2 items-center">
                  <input placeholder="Kunci (Kiri)" className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs" value={p.key} onChange={(e) => {
                    const newPairs = [...pairs];
                    newPairs[idx].key = e.target.value;
                    setPairs(newPairs);
                  }} />
                  <span className="text-slate-300">→</span>
                  <input placeholder="Pasangan (Kanan)" className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs" value={p.value} onChange={(e) => {
                    const newPairs = [...pairs];
                    newPairs[idx].value = e.target.value;
                    setPairs(newPairs);
                  }} />
                  <button onClick={() => removePair(p.id)} className="text-red-400"><Trash2 size={14}/></button>
                </div>
              ))}
              <button onClick={addPair} className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 uppercase hover:bg-slate-50 transition-all">+ Tambah Pasangan</button>
            </div>
          )}

          {/* INPUT TIAP TIPE LAINNYA (Sama seperti sebelumnya) */}
          {tipeSoal === 'pilihan_ganda' && (
            <div className="space-y-2">
              {['a', 'b', 'c', 'd', 'e'].map(l => (
                <input key={l} placeholder={`Opsi ${l.toUpperCase()}`} className="w-full p-3 bg-slate-50 border rounded-xl text-xs" value={(opsi as any)[l]} onChange={(e) => setOpsi({...opsi, [l]: e.target.value})} />
              ))}
              <select className="w-full p-4 bg-green-50 text-green-700 rounded-2xl text-xs font-black uppercase border-none" value={jawabanBenar} onChange={(e) => setJawabanBenar(e.target.value)}>
                <option value="">Kunci Jawaban</option>
                {['a', 'b', 'c', 'd', 'e'].map(l => (opsi as any)[l] && <option key={l} value={l}>Opsi {l.toUpperCase()}</option>)}
              </select>
            </div>
          )}

          {tipeSoal === 'benar_salah' && (
            <div className="flex gap-2">
              {['benar', 'salah'].map(v => (
                <button key={v} onClick={() => setJawabanBenar(v)} className={`flex-1 py-3 rounded-xl font-bold uppercase text-[10px] border ${jawabanBenar === v ? 'bg-green-600 text-white' : 'bg-white text-slate-400'}`}>{v}</button>
              ))}
            </div>
          )}

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bobot</label>
              <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl mt-1 font-bold text-sm border-none" value={bobot} onChange={(e) => setBobot(Number(e.target.value))} />
            </div>
            <button onClick={simpanSoal} disabled={loading} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : "Simpan Soal"}
            </button>
          </div>
        </div>
      </div>

      {/* PANEL DAFTAR SOAL (7 KOLOM) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white p-6 rounded-3xl border shadow-sm flex justify-between items-center">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Database Bank Soal</h2>
          <span className="text-[10px] font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-500">{soalList.length} SOAL</span>
        </div>

        <div className="space-y-4 overflow-y-auto max-h-[80vh] pr-2 custom-scrollbar">
          {soalList.map((s, idx) => (
            <div key={s.id} className="bg-white p-6 rounded-[2rem] border shadow-sm hover:border-blue-200 transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-slate-100 rounded text-[8px] font-black text-slate-400 uppercase">{s.mapel}</span>
                  <span className="px-2 py-1 bg-blue-50 rounded text-[8px] font-black text-blue-500 uppercase">{s.tipe.replace('_', ' ')}</span>
                </div>
                <button onClick={() => deleteDoc(doc(db, "bank_soal", s.id))} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
              </div>
              <p className="text-sm font-bold text-slate-700"><span className="text-blue-500 mr-2">#{soalList.length - idx}</span>{s.pertanyaan}</p>
              
              <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-2 text-[9px] font-black text-green-600 bg-green-50 px-3 py-1.5 rounded-lg uppercase">
                  <CheckCircle2 size={12}/> 
                  Kunci: {s.tipe === 'pencocokan' ? 'Lihat Pasangan' : s.jawabanBenar}
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