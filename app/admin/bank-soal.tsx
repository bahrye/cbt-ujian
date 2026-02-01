'use client'
import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { 
  collection, addDoc, getDocs, query, orderBy, 
  deleteDoc, doc, onSnapshot, updateDoc, writeBatch 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  Plus, Music, Trash2, HelpCircle, Loader2, CheckCircle2, 
  Edit3, Search, X, ArrowLeft, FolderPlus, FileUp, Download
} from 'lucide-react';
import dynamic from 'next/dynamic';
import * as XLSX from 'xlsx';

const ReactQuill = dynamic(async () => {
  const { default: RQ } = await import('react-quill-new');
  const { Quill } = RQ;

  if (typeof window !== 'undefined') {
    const Parchment = (Quill as any).import('parchment');
    if (Parchment && !Parchment.Attributor) {
      Parchment.Attributor = {
        Style: (Quill as any).import('attributors/style/size'),
      };
    }
    (Quill as any).Parchment = Parchment;
    window.Quill = Quill;

    const ImageResize = (await import('quill-image-resize-module-react')).default;
    Quill.register('modules/imageResize', ImageResize);
  }
  return RQ;
}, { 
  ssr: false,
  loading: () => <div className="h-80 bg-slate-50 animate-pulse rounded-2xl border-2 border-slate-200" />
});

import 'react-quill-new/dist/quill.snow.css';

export default function BankSoalSection() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [showKelompokModal, setShowKelompokModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [soalList, setSoalList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<{id: string, nama: string}[]>([]);
  const [kelompokList, setKelompokList] = useState<{id: string, nama: string}[]>([]); 
  
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
  const [newKelompok, setNewKelompok] = useState({ nama: '' });

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ],
    imageResize: {
      modules: ['Resize', 'DisplaySize', 'Toolbar'], // Fitur alignment gambar di toolbar
      handleStyles: {
        backgroundColor: '#3b82f6',
        border: 'none',
        color: 'white'
      }
    }
  };

  useEffect(() => {
    getDocs(query(collection(db, "mapel"), orderBy("nama", "asc"))).then(snap => {
      setMapelList(snap.docs.map(d => ({ id: d.id, nama: d.data().nama })));
    });

    const unsubSoal = onSnapshot(query(collection(db, "bank_soal"), orderBy("createdAt", "desc")), (snap) => {
      setSoalList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubKelompok = onSnapshot(query(collection(db, "kelompok_soal"), orderBy("nama", "asc")), (snap) => {
      setKelompokList(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });

    return () => { unsubSoal(); unsubKelompok(); };
  }, []);

  // Fitur Download Template
  const downloadTemplate = () => {
    const template = [
      {
        Nama_Bank_Soal: "UAS Ganjil 2024",
        Mata_Pelajaran: "Matematika",
        Tipe_Soal: "pilihan_ganda",
        Pertanyaan: "<p>Berapakah 1+1?</p>",
        Opsi_A: "1", Opsi_B: "2", Opsi_C: "3", Opsi_D: "4", Opsi_E: "5",
        Jawaban_Benar: "b",
        Bobot: 1
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Soal");
    XLSX.writeFile(wb, "template_bank_soal.xlsx");
  };

  // Fitur Import Excel
  const handleImportExcel = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const batch = writeBatch(db);
        data.forEach((item: any) => {
          const docRef = doc(collection(db, "bank_soal"));
          batch.set(docRef, {
            namaBankSoal: item.Nama_Bank_Soal,
            mapel: item.Mata_Pelajaran,
            tipe: item.Tipe_Soal || 'pilihan_ganda',
            pertanyaan: item.Pertanyaan,
            opsi: {
              a: String(item.Opsi_A || ''),
              b: String(item.Opsi_B || ''),
              c: String(item.Opsi_C || ''),
              d: String(item.Opsi_D || ''),
              e: String(item.Opsi_E || '')
            },
            jawabanBenar: String(item.Jawaban_Benar).toLowerCase(),
            bobot: Number(item.Bobot || 1),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });

        await batch.commit();
        alert("Import Berhasil!");
      } catch (err) {
        alert("Gagal import! Periksa format file.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const tambahKelompok = async () => {
    if (!newKelompok.nama) return alert("Isi nama kelompok!");
    await addDoc(collection(db, "kelompok_soal"), newKelompok);
    setNewKelompok({ nama: '' });
    setShowKelompokModal(false);
  };

  const handleUploadAudio = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const storageRef = ref(storage, `bank_soal/audio/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on('state_changed', null, null, () => {
      getDownloadURL(uploadTask.snapshot.ref).then((url) => {
        setMedia({ type: 'audio', url });
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
      setView('list');
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
    if (soal.tipe === 'pencocokan') {
        try { setPairs(JSON.parse(soal.jawabanBenar)); }
        catch { setPairs([{ id: Date.now(), key: '', value: '' }]); }
    }
    else setJawabanBenar(soal.jawabanBenar);
    setView('form');
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
    setNamaBankSoal('');
    setSelectedMapel('');
  };

  const filteredSoal = soalList.filter(s => {
    const matchMapel = filterMapel === 'all' || s.mapel === filterMapel;
    const matchSearch = (s.pertanyaan || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (s.namaBankSoal || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchMapel && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      {view === 'list' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] border shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Bank Soal System</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{soalList.length} Soal terdaftar</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button onClick={downloadTemplate} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-3 rounded-2xl font-bold text-xs uppercase hover:bg-emerald-100 transition-all">
                <Download size={18}/> Template
              </button>
              <label className="cursor-pointer flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-3 rounded-2xl font-bold text-xs uppercase hover:bg-amber-100 transition-all">
                <FileUp size={18}/> Import Excel
                <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
              </label>
              <button onClick={() => setShowKelompokModal(true)} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-3 rounded-2xl font-bold text-xs uppercase hover:bg-slate-200 transition-all">
                <FolderPlus size={18}/> Kelompok
              </button>
              <button onClick={() => { resetForm(); setView('form'); }} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                <Plus size={18}/> Buat Soal
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border shadow-sm flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Cari soal atau nama bank..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <select className="bg-slate-50 px-6 py-4 rounded-2xl text-sm font-bold outline-none text-slate-600 border-2 border-slate-100 cursor-pointer" value={filterMapel} onChange={(e) => setFilterMapel(e.target.value)}>
              <option value="all">Semua Mata Pelajaran</option>
              {mapelList.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSoal.length === 0 ? (
              <div className="col-span-full bg-white p-20 rounded-[3rem] border border-dashed text-center">
                <HelpCircle size={48} className="mx-auto text-slate-200 mb-4"/>
                <p className="text-slate-400 font-bold italic text-sm">Belum ada soal yang ditemukan.</p>
              </div>
            ) : filteredSoal.map((s) => (
              <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:border-blue-300 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-2 py-1 bg-blue-50 rounded-lg">{s.namaBankSoal}</span>
                    <div className="flex gap-2">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{s.mapel}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">•</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{(s.tipe || 'pilihan_ganda')?.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(s)} className="p-2.5 bg-orange-50 text-orange-500 rounded-xl hover:bg-orange-500 hover:text-white transition-all"><Edit3 size={16}/></button>
                    <button onClick={() => confirm('Hapus soal?') && deleteDoc(doc(db, "bank_soal", s.id))} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-700 leading-relaxed mb-4 line-clamp-3 prose-sm" dangerouslySetInnerHTML={{ __html: s.pertanyaan }} />
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <div className="text-[9px] font-black text-green-600 uppercase flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-full">
                    <CheckCircle2 size={12}/> Kunci: {s.tipe === 'pencocokan' ? 'Matching' : s.jawabanBenar}
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 uppercase">Poin: {s.bobot}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'form' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex justify-between items-center">
             <button onClick={() => setView('list')} className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all flex items-center gap-2 font-bold text-xs uppercase">
                <ArrowLeft size={18}/> Kembali
             </button>
             <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{isEditMode ? 'Editor Mode' : 'Pembuat Soal'}</h2>
          </div>

          <div className="bg-white p-8 md:p-12 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kelompok Soal</label>
                <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-blue-400" value={namaBankSoal} onChange={(e) => setNamaBankSoal(e.target.value)}>
                  <option value="">Pilih Kelompok</option>
                  {kelompokList.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mata Pelajaran</label>
                <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-blue-400" value={selectedMapel} onChange={(e) => setSelectedMapel(e.target.value)}>
                  <option value="">Pilih Mapel</option>
                  {mapelList.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipe Soal</label>
                <select className="w-full p-4 bg-blue-600 text-white rounded-2xl text-xs font-bold outline-none" value={tipeSoal} onChange={(e) => {setTipeSoal(e.target.value); setJawabanBenar('');}}>
                  <option value="pilihan_ganda">Pilihan Ganda</option>
                  <option value="isian">Isian Singkat</option>
                  <option value="uraian">Uraian / Essay</option>
                  <option value="benar_salah">Benar / Salah</option>
                  <option value="pencocokan">Pencocokan</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pertanyaan</label>
              <div className="bg-white rounded-[2rem] border-2 border-slate-200 overflow-hidden">
                {/* CSS Inline untuk menambah tinggi editor */}
                <style>{`.ql-editor { min-height: 300px !important; font-size: 16px; }`}</style>
                <ReactQuill 
                  theme="snow" 
                  value={pertanyaan} 
                  onChange={setPertanyaan} 
                  modules={modules} 
                  placeholder="Tulis pertanyaan di sini... Klik gambar untuk mengatur ukuran dan posisi (kiri/tengah/kanan)." 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
               <label className="cursor-pointer p-5 bg-slate-50 rounded-2xl flex items-center justify-center gap-3 text-slate-500 hover:bg-purple-50 transition-all border-2 border-dashed border-slate-300">
                  <Music size={20} className="text-purple-500"/> <span className="text-sm font-bold uppercase tracking-wide">Unggah File Audio (MP3/WAV)</span>
                  <input type="file" hidden accept="audio/*" onChange={handleUploadAudio} />
               </label>
            </div>

            {media && (
              <div className="p-4 bg-blue-50 rounded-2xl flex items-center justify-between animate-in zoom-in border-2 border-blue-100">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-blue-600"/>
                  <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Audio terpasang</span>
                </div>
                <button onClick={() => setMedia(null)} className="p-2 text-red-500 hover:bg-white rounded-xl transition-all"><Trash2 size={18}/></button>
              </div>
            )}

            <div className="space-y-4 pt-6 border-t-2 border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Konfigurasi Jawaban</h4>
              
              {tipeSoal === 'pencocokan' && (
                <div className="grid grid-cols-1 gap-3">
                  {pairs.map((p, idx) => (
                    <div key={p.id} className="flex gap-3 items-center animate-in slide-in-from-left-2">
                      <input placeholder="Kiri" className="flex-1 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-400" value={p.key} onChange={(e) => { const n = [...pairs]; n[idx].key = e.target.value; setPairs(n); }} />
                      <div className="text-slate-300">→</div>
                      <input placeholder="Kanan" className="flex-1 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-400" value={p.value} onChange={(e) => { const n = [...pairs]; n[idx].value = e.target.value; setPairs(n); }} />
                      <button onClick={() => setPairs(pairs.filter(i => i.id !== p.id))} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={20}/></button>
                    </div>
                  ))}
                  <button onClick={() => setPairs([...pairs, {id: Date.now(), key: '', value: ''}])} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-xs font-black text-slate-400 uppercase hover:bg-slate-50 transition-all">+ Tambah Baris Pasangan</button>
                </div>
              )}

              {tipeSoal === 'pilihan_ganda' && (
                <div className="grid grid-cols-1 gap-3">
                  {['a', 'b', 'c', 'd', 'e'].map(l => (
                    <div key={l} className="flex gap-4 items-center">
                       <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase border border-slate-200">{l}</span>
                       <input placeholder={`Input Opsi ${l.toUpperCase()}`} className="flex-1 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-400" value={(opsi as any)[l]} onChange={(e) => setOpsi({...opsi, [l]: e.target.value})} />
                    </div>
                  ))}
                  <div className="mt-4">
                    <label className="text-[10px] font-black text-green-600 uppercase tracking-widest ml-1">Pilih Kunci Jawaban</label>
                    <div className="flex gap-2 mt-2">
                      {['a','b','c','d','e'].map(l => (opsi as any)[l] && (
                        <button key={l} onClick={() => setJawabanBenar(l)} className={`flex-1 py-4 rounded-2xl font-black uppercase text-xs border-2 transition-all ${jawabanBenar === l ? 'bg-green-600 border-green-600 text-white shadow-xl shadow-green-100' : 'bg-white text-slate-300 border-slate-200 hover:border-green-200'}`}>
                          Opsi {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tipeSoal === 'benar_salah' && (
                <div className="flex gap-4">
                  {['benar', 'salah'].map(v => (
                    <button key={v} onClick={() => setJawabanBenar(v)} className={`flex-1 py-6 rounded-[2rem] font-black uppercase text-sm border-4 transition-all ${jawabanBenar === v ? 'bg-green-600 border-green-600 text-white shadow-2xl shadow-green-200' : 'bg-white text-slate-300 border-slate-200 hover:border-green-200'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              )}

              {(tipeSoal === 'isian' || tipeSoal === 'uraian') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-green-600 uppercase tracking-widest ml-1">Kunci Jawaban Teks</label>
                  <input placeholder="Ketik kunci jawaban yang benar..." className="w-full p-5 bg-green-50 border-2 border-green-100 rounded-2xl text-sm font-bold text-green-700 outline-none focus:border-green-400" value={jawabanBenar} onChange={(e) => setJawabanBenar(e.target.value)} />
                </div>
              )}
            </div>

            <div className="flex gap-4 items-end pt-10">
              <div className="w-32">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bobot Skor</label>
                <input type="number" className="w-full p-5 bg-slate-50 rounded-2xl mt-2 font-black text-center text-lg border-2 border-slate-200 focus:border-blue-500 outline-none transition-all" value={bobot} onChange={(e) => setBobot(Number(e.target.value))} />
              </div>
              <button onClick={simpanSoal} disabled={loading || uploading} className={`flex-1 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest text-white shadow-2xl transition-all active:scale-95 ${isEditMode ? 'bg-orange-500 shadow-orange-200 hover:bg-orange-600' : 'bg-blue-600 shadow-blue-200 hover:bg-blue-700'}`}>
                {loading ? <Loader2 className="animate-spin mx-auto"/> : isEditMode ? "Perbarui Soal Sekarang" : "Simpan Soal Baru"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showKelompokModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 md:p-10 shadow-2xl space-y-6 border-2 border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Kelompok Baru</h3>
              <button onClick={() => setShowKelompokModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-all"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">Nama Kelompok</label>
                <input placeholder="Misal: UAS Ganjil 2024" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-400" value={newKelompok.nama} onChange={(e) => setNewKelompok({...newKelompok, nama: e.target.value})} />
              </div>
            </div>
            <button onClick={tambahKelompok} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl">Simpan Kelompok</button>
          </div>
        </div>
      )}
    </div>
  );
}