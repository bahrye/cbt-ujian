'use client'
import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { 
  collection, addDoc, getDocs, query, orderBy, 
  deleteDoc, doc, onSnapshot, updateDoc 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  Plus, Image as ImageIcon, Music, Save, Trash2, 
  HelpCircle, Loader2, FileText, CheckCircle2, Edit3, Search, X
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-40 bg-slate-50 animate-pulse rounded-2xl" />
});
import 'react-quill/dist/quill.snow.css';

export default function BankSoalSection() {
  const [loading, setLoading] = useState(false);
  const [soalList, setSoalList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<{id: string, nama: string}[]>([]);
  const [filterMapel, setFilterMapel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [namaBankSoal, setNamaBankSoal] = useState('');
  const [tipeSoal, setTipeSoal] = useState('pilihan_ganda');
  const [pertanyaan, setPertanyaan] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [bobot, setBobot] = useState(1);
  const [jawabanBenar, setJawabanBenar] = useState('');
  const [opsi, setOpsi] = useState({ a: '', b: '', c: '', d: '', e: '' });
  const [pairs, setPairs] = useState([{ id: Date.now(), key: '', value: '' }]);
  const [media, setMedia] = useState<{type: string, url: string} | null>(null);
  const [uploading, setUploading] = useState(false);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  useEffect(() => {
    getDocs(query(collection(db, "mapel"), orderBy("nama", "asc"))).then(snap => {
      setMapelList(snap.docs.map(d => ({ id: d.id, nama: d.data().nama })));
    });
    const unsubscribe = onSnapshot(
      query(collection(db, "bank_soal"), orderBy("createdAt", "desc")), 
      (snapshot) => {
        setSoalList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );
    return () => unsubscribe();
  }, []);

  const handleUpload = async (e: any, type: 'image' | 'audio') => {
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
    if (tipeSoal === 'pencocokan') finalKunci = JSON.stringify(pairs);
    if (!pertanyaan || !selectedMapel || !namaBankSoal) return alert("Lengkapi data!");
    setLoading(true);
    const payload = {
      namaBankSoal, pertanyaan, mapel: selectedMapel, tipe: tipeSoal,
      bobot: Number(bobot), opsi: tipeSoal === 'pilihan_ganda' ? opsi : null,
      jawabanBenar: finalKunci, media, updatedAt: new Date()
    };
    try {
      if (isEditMode) {
        await updateDoc(doc(db, "bank_soal", currentId), payload);
      } else {
        await addDoc(collection(db, "bank_soal"), { ...payload, createdAt: new Date() });
      }
      resetForm();
      alert("Berhasil!");
    } catch (error) { alert("Gagal!"); } finally { setLoading(false); }
  };

  const handleEdit = (soal: any) => {
    setIsEditMode(true);
    setCurrentId(soal.id);
    setNamaBankSoal(soal.namaBankSoal || '');
    setPertanyaan(soal.pertanyaan);
    setTipeSoal(soal.tipe || 'pilihan_ganda');
    setSelectedMapel(soal.mapel);
    setBobot(soal.bobot);
    setMedia(soal.media);
    if (soal.tipe === 'pilihan_ganda') setOpsi(soal.opsi);
    if (soal.tipe === 'pencocokan') setPairs(JSON.parse(soal.jawabanBenar));
    else setJawabanBenar(soal.jawabanBenar);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditMode(false);
    setCurrentId('');
    setPertanyaan('');
    setMedia(null);
    setOpsi({ a: '', b: '', c: '', d: '', e: '' });
    setJawabanBenar('');
    setPairs([{ id: Date.now(), key: '', value: '' }]);
    setBobot(1);
  };

  const filteredSoal = soalList.filter(s => {
    const matchMapel = filterMapel === 'all' || s.mapel === filterMapel;
    const matchSearch = (s.pertanyaan || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (s.namaBankSoal || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchMapel && matchSearch;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4 sticky top-24">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
              {isEditMode ? <Edit3 size={18} className="text-orange-500"/> : <Plus size={18} className="text-blue-600"/>}
              {isEditMode ? 'Edit Soal' : 'Buat Soal'}
            </h3>
            {isEditMode && <button onClick={resetForm} className="text-[10px] font-bold text-red-500 uppercase">Batal</button>}
          </div>
          <input placeholder="Nama Kelompok Bank Soal" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none ring-2 ring-transparent focus:ring-blue-100" value={namaBankSoal} onChange={(e) => setNamaBankSoal(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <select className="p-4 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none" value={selectedMapel} onChange={(e) => setSelectedMapel(e.target.value)}>
              <option value="">Mapel</option>
              {mapelList.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
            </select>
            <select className="p-4 bg-blue-600 text-white rounded-2xl text-xs font-bold outline-none" value={tipeSoal} onChange={(e) => {setTipeSoal(e.target.value); setJawabanBenar('');}}>
              <option value="pilihan_ganda">Pilihan Ganda</option>
              <option value="isian">Isian Singkat</option>
              <option value="uraian">Uraian / Essay</option>
              <option value="benar_salah">Benar / Salah</option>
              <option value="pencocokan">Pencocokan</option>
            </select>
          </div>
          <div className="bg-slate-50 rounded-2xl overflow-hidden border-none quill-container">
            <ReactQuill theme="snow" value={pertanyaan} onChange={setPertanyaan} modules={modules} placeholder="Tulis pertanyaan..." />
          </div>
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer p-3 bg-slate-50 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:bg-blue-50">
              <ImageIcon size={16}/> <span className="text-[10px] font-bold uppercase">Gambar</span>
              <input type="file" hidden accept="image/*" onChange={(e) => handleUpload(e, 'image')} />
            </label>
            <label className="flex-1 cursor-pointer p-3 bg-slate-50 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:bg-purple-50">
              <Music size={16}/> <span className="text-[10px] font-bold uppercase">Audio</span>
              <input type="file" hidden accept="audio/*" onChange={(e) => handleUpload(e, 'audio')} />
            </label>
          </div>
          {media && (
            <div className="p-2 bg-blue-50 rounded-xl flex items-center justify-between border border-blue-100">
              <span className="text-[9px] font-black text-blue-600 uppercase ml-2">✓ {media.type} Terunggah</span>
              <button onClick={() => setMedia(null)} className="p-1 text-red-500"><X size={14}/></button>
            </div>
          )}
          <div className="space-y-3 pt-2">
            {tipeSoal === 'pencocokan' && (
              <div className="space-y-2">
                {pairs.map((p, idx) => (
                  <div key={p.id} className="flex gap-2 items-center">
                    <input placeholder="Kiri" className="flex-1 p-2 bg-slate-50 border rounded-lg text-xs" value={p.key} onChange={(e) => { const n = [...pairs]; n[idx].key = e.target.value; setPairs(n); }} />
                    <input placeholder="Kanan" className="flex-1 p-2 bg-slate-50 border rounded-lg text-xs" value={p.value} onChange={(e) => { const n = [...pairs]; n[idx].value = e.target.value; setPairs(n); }} />
                    <button onClick={() => setPairs(pairs.filter(i => i.id !== p.id))} className="text-red-400"><Trash2 size={14}/></button>
                  </div>
                ))}
                <button onClick={() => setPairs([...pairs, {id: Date.now(), key: '', value: ''}])} className="w-full py-2 border-2 border-dashed rounded-xl text-[9px] font-bold text-slate-400 uppercase">+ BARIS</button>
              </div>
            )}
            {tipeSoal === 'pilihan_ganda' && (
              <div className="space-y-2">
                {['a', 'b', 'c', 'd', 'e'].map(l => (
                  <input key={l} placeholder={`Opsi ${l.toUpperCase()}`} className="w-full p-3 bg-slate-50 border rounded-xl text-xs" value={(opsi as any)[l]} onChange={(e) => setOpsi({...opsi, [l]: e.target.value})} />
                ))}
                <select className="w-full p-4 bg-green-50 text-green-700 rounded-2xl text-xs font-black uppercase outline-none" value={jawabanBenar} onChange={(e) => setJawabanBenar(e.target.value)}>
                  <option value="">Kunci Jawaban</option>
                  {['a','b','c','d','e'].map(l => (opsi as any)[l] && <option key={l} value={l}>{l.toUpperCase()}</option>)}
                </select>
              </div>
            )}
            {tipeSoal === 'benar_salah' && (
              <div className="flex gap-2">
                {['benar', 'salah'].map(v => (
                  <button key={v} onClick={() => setJawabanBenar(v)} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] border ${jawabanBenar === v ? 'bg-green-600 text-white' : 'bg-white text-slate-400'}`}>{v}</button>
                ))}
              </div>
            )}
            {(tipeSoal === 'isian' || tipeSoal === 'uraian') && (
              <input placeholder="Kunci Jawaban" className="w-full p-4 bg-green-50 text-green-700 rounded-2xl text-xs font-bold border-none outline-none" value={jawabanBenar} onChange={(e) => setJawabanBenar(e.target.value)} />
            )}
          </div>
          <div className="flex gap-4 items-end border-t pt-4">
            <div className="w-24">
              <label className="text-[10px] font-black text-slate-400 uppercase">Bobot</label>
              <input type="number" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none outline-none" value={bobot} onChange={(e) => setBobot(Number(e.target.value))} />
            </div>
            <button onClick={simpanSoal} disabled={loading || uploading} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white transition-all ${isEditMode ? 'bg-orange-500' : 'bg-slate-900'}`}>
              {loading ? <Loader2 className="animate-spin mx-auto"/> : isEditMode ? "Perbarui" : "Simpan"}
            </button>
          </div>
        </div>
      </div>
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white p-4 rounded-3xl border shadow-sm flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Cari soal..." className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-2xl text-xs font-bold outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <select className="bg-slate-50 px-4 py-3 rounded-2xl text-xs font-bold outline-none" value={filterMapel} onChange={(e) => setFilterMapel(e.target.value)}>
            <option value="all">Semua Mapel</option>
            {mapelList.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
          </select>
        </div>
        <div className="space-y-4">
          {filteredSoal.map((s) => (
            <div key={s.id} className="bg-white p-6 rounded-[2.2rem] border shadow-sm hover:border-blue-200 transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{s.namaBankSoal}</span>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-slate-100 rounded text-[8px] font-black text-slate-500 uppercase">{s.mapel}</span>
                    <span className="px-2 py-1 bg-blue-50 rounded text-[8px] font-black text-blue-600 uppercase">{(s.tipe || 'pilihan_ganda')?.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(s)} className="p-2 bg-orange-50 text-orange-500 rounded-xl"><Edit3 size={16}/></button>
                  <button onClick={() => confirm('Hapus?') && deleteDoc(doc(db, "bank_soal", s.id))} className="p-2 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16}/></button>
                </div>
              </div>
              <div className="text-sm font-bold text-slate-700 leading-relaxed mb-3 prose-sm max-w-none ql-editor-preview" dangerouslySetInnerHTML={{ __html: s.pertanyaan }} />
              <div className="bg-slate-50 p-3 rounded-2xl flex justify-between items-center">
                <span className="text-[9px] font-black text-green-600 uppercase">Kunci: {s.tipe === 'pencocokan' ? 'Matching' : s.jawabanBenar}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">Poin: {s.bobot}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}