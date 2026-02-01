'use client'
import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { 
  collection, addDoc, getDocs, query, orderBy, 
  deleteDoc, doc, onSnapshot 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  Plus, Image as ImageIcon, Music, Video, Save, Trash2, 
  HelpCircle, Loader2, FileText, CheckCircle2, XCircle
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
  const [jawabanBenar, setJawabanBenar] = useState(''); // Kunci Jawaban
  const [opsi, setOpsi] = useState({ a: '', b: '', c: '', d: '', e: '' });
  const [media, setMedia] = useState<{type: string, url: string} | null>(null);
  const [uploading, setUploading] = useState(false);

  // Load Data Mapel & Real-time Soal
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

  const simpanSoal = async () => {
    if (!pertanyaan || !selectedMapel || !jawabanBenar) {
      return alert("Pertanyaan, Mapel, dan Kunci Jawaban wajib diisi!");
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "bank_soal"), {
        pertanyaan,
        mapel: selectedMapel,
        tipe: tipeSoal,
        bobot: Number(bobot),
        opsi: tipeSoal === 'pilihan_ganda' ? opsi : null,
        jawabanBenar: jawabanBenar.toLowerCase().trim(),
        media,
        createdAt: new Date()
      });
      alert("Soal berhasil ditambahkan!");
      resetForm();
    } catch (error) {
      console.error(error);
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
    setBobot(1);
  };

  const hapusSoal = async (id: string) => {
    if (confirm("Hapus soal ini dari bank soal?")) {
      await deleteDoc(doc(db, "bank_soal", id));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
      {/* --- PANEL KIRI: INPUT SOAL (4 Kolom) --- */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-5 sticky top-24">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
              <Plus size={18} className="text-blue-600"/> Tambah Soal
            </h3>
            <span className="text-[10px] font-bold px-3 py-1 bg-blue-50 text-blue-600 rounded-full uppercase tracking-tighter">
              Mode: {tipeSoal.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select 
              className="p-4 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none"
              value={selectedMapel}
              onChange={(e) => setSelectedMapel(e.target.value)}
            >
              <option value="">Pilih Mapel</option>
              {mapelList.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
            </select>
            <select 
              className="p-4 bg-slate-900 text-white rounded-2xl text-xs font-bold outline-none"
              value={tipeSoal}
              onChange={(e) => {setTipeSoal(e.target.value); setJawabanBenar('');}}
            >
              <option value="pilihan_ganda">Pilihan Ganda</option>
              <option value="isian">Isian Singkat</option>
              <option value="uraian">Uraian</option>
              <option value="benar_salah">Benar / Salah</option>
            </select>
          </div>

          <textarea 
            placeholder="Tulis Pertanyaan di sini..."
            className="w-full p-5 bg-slate-50 border-none rounded-[1.5rem] text-sm min-h-[120px] outline-none focus:ring-2 focus:ring-blue-100 font-medium"
            value={pertanyaan}
            onChange={(e) => setPertanyaan(e.target.value)}
          />

          {/* Media Upload & Preview */}
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer p-3 bg-blue-50 rounded-xl flex items-center justify-center gap-2 text-blue-600 hover:bg-blue-600 hover:text-white transition-all">
              <ImageIcon size={16}/> <span className="text-[10px] font-black uppercase">Gambar</span>
              <input type="file" hidden accept="image/*" onChange={(e) => handleUpload(e, 'image')} />
            </label>
            <label className="flex-1 cursor-pointer p-3 bg-purple-50 rounded-xl flex items-center justify-center gap-2 text-purple-600 hover:bg-purple-600 hover:text-white transition-all">
              <Music size={16}/> <span className="text-[10px] font-black uppercase">Audio</span>
              <input type="file" hidden accept="audio/*" onChange={(e) => handleUpload(e, 'audio')} />
            </label>
          </div>

          {media && (
            <div className="relative group rounded-2xl overflow-hidden border">
              <div className="absolute top-2 right-2 z-10">
                <button onClick={() => setMedia(null)} className="p-1 bg-red-500 text-white rounded-full shadow-lg"><Trash2 size={12}/></button>
              </div>
              {media.type === 'image' && <img src={media.url} alt="preview" className="w-full h-32 object-cover" />}
              {media.type === 'audio' && <audio src={media.url} controls className="w-full p-2" />}
            </div>
          )}

          {/* Input Jawaban Berdasarkan Tipe */}
          <div className="space-y-3 pt-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Konfigurasi Jawaban</label>
            
            {tipeSoal === 'pilihan_ganda' && (
              <>
                <div className="grid grid-cols-1 gap-2">
                  {['a', 'b', 'c', 'd', 'e'].map((l) => (
                    <input 
                      key={l}
                      placeholder={`Opsi ${l.toUpperCase()} ${l === 'e' ? '(Opsional)' : ''}`}
                      className="p-3 bg-slate-50 border rounded-xl text-sm outline-none focus:bg-white"
                      value={(opsi as any)[l]}
                      onChange={(e) => setOpsi({...opsi, [l]: e.target.value})}
                    />
                  ))}
                </div>
                <select 
                  className="w-full p-4 bg-green-50 text-green-700 border-none rounded-2xl text-xs font-black uppercase"
                  value={jawabanBenar}
                  onChange={(e) => setJawabanBenar(e.target.value)}
                >
                  <option value="">Pilih Kunci Jawaban</option>
                  {['a', 'b', 'c', 'd', 'e'].map(l => (opsi as any)[l] && <option key={l} value={l}>Jawaban Benar: {l.toUpperCase()}</option>)}
                </select>
              </>
            )}

            {tipeSoal === 'benar_salah' && (
              <div className="flex gap-2">
                {['benar', 'salah'].map(v => (
                  <button 
                    key={v}
                    onClick={() => setJawabanBenar(v)}
                    className={`flex-1 py-3 rounded-xl font-bold uppercase text-[10px] border transition-all ${jawabanBenar === v ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-100' : 'bg-white text-slate-400'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}

            {(tipeSoal === 'isian' || tipeSoal === 'uraian') && (
              <input 
                placeholder={tipeSoal === 'isian' ? "Kunci Jawaban (Satu kata/pendek)" : "Kata Kunci Penilaian (Pisahkan dengan koma)"}
                className="w-full p-4 bg-green-50 text-green-700 border-none rounded-2xl text-xs font-bold outline-none"
                value={jawabanBenar}
                onChange={(e) => setJawabanBenar(e.target.value)}
              />
            )}
          </div>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bobot Nilai</label>
              <input type="number" className="w-full p-4 bg-slate-50 border-none rounded-2xl mt-1 font-bold text-sm" value={bobot} onChange={(e) => setBobot(Number(e.target.value))} />
            </div>
            <button 
              disabled={loading || uploading}
              onClick={simpanSoal}
              className="flex-[2] mt-5 bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin"/> : <><Save size={18}/> Simpan Soal</>}
            </button>
          </div>
        </div>
      </div>

      {/* --- PANEL KANAN: DAFTAR SOAL (7 Kolom) --- */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 rounded-2xl text-slate-600"><FileText size={20}/></div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter leading-none">Database Soal</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Total: {soalList.length} Soal Tersedia</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {soalList.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border border-dashed p-20 text-center text-slate-300">
               <HelpCircle size={48} className="mx-auto mb-4 opacity-20"/>
               <p className="font-bold italic">Belum ada soal yang dibuat.</p>
            </div>
          ) : soalList.map((s, i) => (
            <div key={s.id} className="bg-white p-6 rounded-[2rem] border shadow-sm hover:border-blue-200 transition-all group relative">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase">{s.mapel}</span>
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                    s.tipe === 'pilihan_ganda' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'
                  }`}>{s.tipe.replace('_', ' ')}</span>
                </div>
                <button onClick={() => hapusSoal(s.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={16}/>
                </button>
              </div>

              <p className="text-sm font-bold text-slate-700 leading-relaxed pr-8">
                <span className="text-blue-600 mr-2">Q{soalList.length - i}.</span>
                {s.pertanyaan}
              </p>

              {s.media && (
                <div className="mt-3 p-2 bg-slate-50 rounded-xl w-fit">
                  {s.media.type === 'image' && <img src={s.media.url} className="h-20 rounded-lg" />}
                  {s.media.type === 'audio' && <audio src={s.media.url} controls className="h-8 w-48" />}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-green-600 bg-green-50 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 size={14}/> Kunci: {s.jawabanBenar}
                </div>
                <div className="text-[10px] font-bold text-slate-400">Poin: {s.bobot}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}