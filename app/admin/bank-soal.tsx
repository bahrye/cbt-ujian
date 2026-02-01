'use client'
import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  Plus, Image as ImageIcon, Music, Video, Save, Trash2, 
  HelpCircle, Loader2, CheckCircle2, AlertCircle 
} from 'lucide-react';

export default function BankSoalSection() {
  const [loading, setLoading] = useState(false);
  const [mapelList, setMapelList] = useState<{id: string, nama: string}[]>([]);
  const [tipeSoal, setTipeSoal] = useState('pilihan_ganda');
  
  // State Form
  const [pertanyaan, setPertanyaan] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [bobot, setBobot] = useState(1);
  const [jawabanBenar, setJawabanBenar] = useState('');
  const [opsi, setOpsi] = useState({ a: '', b: '', c: '', d: '', e: '' });
  const [media, setMedia] = useState<{type: string, url: string} | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchMapel = async () => {
      const q = query(collection(db, "mapel"), orderBy("nama", "asc"));
      const snap = await getDocs(q);
      setMapelList(snap.docs.map(d => ({ id: d.id, nama: d.data().nama })));
    };
    fetchMapel();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const storageRef = ref(storage, `bank_soal/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', null, 
      (error) => { console.error(error); setUploading(false); }, 
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
          setMedia({ type, url });
          setUploading(false);
        });
      }
    );
  };

  const simpanSoal = async () => {
    if (!pertanyaan || !selectedMapel) return alert("Pertanyaan dan Mapel wajib diisi!");
    setLoading(true);
    try {
      await addDoc(collection(db, "bank_soal"), {
        pertanyaan,
        mapel: selectedMapel,
        tipe: tipeSoal,
        bobot,
        opsi: tipeSoal === 'pilihan_ganda' ? opsi : null,
        jawabanBenar,
        media,
        createdAt: new Date()
      });
      alert("Soal berhasil disimpan!");
      resetForm();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPertanyaan('');
    setTipeSoal('pilihan_ganda');
    setMedia(null);
    setOpsi({ a: '', b: '', c: '', d: '', e: '' });
    setJawabanBenar('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* KIRI: FORM INPUT */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
            <Plus size={18} className="text-blue-600"/> Buat Soal
          </h3>

          <select 
            className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
            value={selectedMapel}
            onChange={(e) => setSelectedMapel(e.target.value)}
          >
            <option value="">Pilih Mata Pelajaran</option>
            {mapelList.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
          </select>

          <select 
            className="w-full p-4 bg-blue-600 text-white border-none rounded-2xl text-sm font-bold outline-none"
            value={tipeSoal}
            onChange={(e) => setTipeSoal(e.target.value)}
          >
            <option value="pilihan_ganda">Pilihan Ganda</option>
            <option value="isian">Isian Singkat</option>
            <option value="uraian">Uraian / Essay</option>
            <option value="benar_salah">Benar / Salah</option>
          </select>

          <textarea 
            placeholder="Tulis Pertanyaan..."
            className="w-full p-4 bg-slate-50 border rounded-2xl text-sm min-h-[120px] outline-none"
            value={pertanyaan}
            onChange={(e) => setPertanyaan(e.target.value)}
          />

          {/* Media Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <label className="cursor-pointer p-3 bg-slate-50 rounded-xl flex flex-col items-center gap-1 hover:bg-blue-50 transition-all">
              <ImageIcon size={16} className="text-blue-500"/>
              <span className="text-[9px] font-bold uppercase">Gambar</span>
              <input type="file" hidden accept="image/*" onChange={(e) => handleUpload(e, 'image')} />
            </label>
            <label className="cursor-pointer p-3 bg-slate-50 rounded-xl flex flex-col items-center gap-1 hover:bg-purple-50 transition-all">
              <Music size={16} className="text-purple-500"/>
              <span className="text-[9px] font-bold uppercase">Audio</span>
              <input type="file" hidden accept="audio/*" onChange={(e) => handleUpload(e, 'audio')} />
            </label>
            <label className="cursor-pointer p-3 bg-slate-50 rounded-xl flex flex-col items-center gap-1 hover:bg-red-50 transition-all">
              <Video size={16} className="text-red-500"/>
              <span className="text-[9px] font-bold uppercase">Video</span>
              <input type="file" hidden accept="video/*" onChange={(e) => handleUpload(e, 'video')} />
            </label>
          </div>

          {/* Preview Media */}
          {uploading && <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 animate-pulse"><Loader2 size={14} className="animate-spin"/> Mengunggah File...</div>}
          {media && (
            <div className="p-2 bg-green-50 rounded-xl flex items-center justify-between">
              <span className="text-[10px] font-bold text-green-600 uppercase">✓ {media.type} Terlampir</span>
              <button onClick={() => setMedia(null)} className="text-red-500 hover:scale-110 transition-transform"><Trash2 size={14}/></button>
            </div>
          )}

          {/* Dynamic Inputs Based on Type */}
          {tipeSoal === 'pilihan_ganda' && (
            <div className="space-y-2 mt-4">
              {['a', 'b', 'c', 'd', 'e'].map((l) => (
                <div key={l} className="flex gap-2">
                  <input 
                    placeholder={`Opsi ${l.toUpperCase()} ${l === 'e' ? '(Opsional)' : ''}`}
                    className="flex-1 p-3 bg-white border rounded-xl text-sm"
                    value={(opsi as any)[l]}
                    onChange={(e) => setOpsi({...opsi, [l]: e.target.value})}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bobot Nilai</label>
            <input 
              type="number" 
              className="w-full p-4 bg-slate-50 border rounded-2xl mt-1 font-bold" 
              value={bobot}
              onChange={(e) => setBobot(Number(e.target.value))}
            />
          </div>

          <button 
            disabled={loading || uploading}
            onClick={simpanSoal}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin mx-auto"/> : "Simpan Soal"}
          </button>
        </div>
      </div>

      {/* KANAN: PREVIEW/DAFTAR SOAL (Sederhana) */}
      <div className="lg:col-span-2 bg-white rounded-[2.5rem] border shadow-sm p-8">
        <div className="flex justify-between items-center mb-8">
           <h3 className="font-black text-slate-800 uppercase text-sm tracking-tighter">Bank Soal Terkini</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-slate-300">
           <HelpCircle size={64} className="mb-4 opacity-10"/>
           <p className="text-sm font-bold italic">Simpan soal pertama Anda untuk melihat preview di sini.</p>
        </div>
      </div>
    </div>
  );
}