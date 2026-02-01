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

// Import modul secara dinamis untuk ReactQuill
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

  // Konfigurasi Editor
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
      modules: ['Resize', 'DisplaySize'], 
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

  const downloadTemplate = () => {
    const template = [
      { Nama_Bank_Soal: "UAS 2026", Mata_Pelajaran: "IPA", Tipe_Soal: "pilihan_ganda", Pertanyaan: "<p>Apa organ pernapasan ikan?</p>", Opsi_A: "Paru-paru", Opsi_B: "Insang", Opsi_C: "Kulit", Opsi_D: "Trakea", Opsi_E: "Hidung", Jawaban_Benar: "b", Bobot: 5 },
      { Nama_Bank_Soal: "UAS 2026", Mata_Pelajaran: "IPA", Tipe_Soal: "pilihan_ganda", Pertanyaan: "<p>Planet terbesar adalah?</p>", Opsi_A: "Mars", Opsi_B: "Bumi", Opsi_C: "Jupiter", Opsi_D: "Saturnus", Opsi_E: "Venus", Jawaban_Benar: "c", Bobot: 5 },
      { Nama_Bank_Soal: "UAS 2026", Mata_Pelajaran: "MTK", Tipe_Soal: "isian", Pertanyaan: "<p>12 x 12 = ...</p>", Opsi_A: "", Opsi_B: "", Opsi_C: "", Opsi_D: "", Opsi_E: "", Jawaban_Benar: "144", Bobot: 10 },
      { Nama_Bank_Soal: "UAS 2026", Mata_Pelajaran: "MTK", Tipe_Soal: "isian", Pertanyaan: "<p>Ibu kota Indonesia adalah...</p>", Opsi_A: "", Opsi_B: "", Opsi_C: "", Opsi_D: "", Opsi_E: "", Jawaban_Benar: "Nusantara", Bobot: 10 },
      { Nama_Bank_Soal: "UAS 2026", Mata_Pelajaran: "PKN", Tipe_Soal: "benar_salah", Pertanyaan: "<p>Pancasila ada 5 sila.</p>", Opsi_A: "", Opsi_B: "", Opsi_C: "", Opsi_D: "", Opsi_E: "", Jawaban_Benar: "benar", Bobot: 5 },
      { Nama_Bank_Soal: "UAS 2026", Mata_Pelajaran: "PKN", Tipe_Soal: "benar_salah", Pertanyaan: "<p>Matahari terbit di Utara.</p>", Opsi_A: "", Opsi_B: "", Opsi_C: "", Opsi_D: "", Opsi_E: "", Jawaban_Benar: "salah", Bobot: 5 },
      { Nama_Bank_Soal: "UAS 2026", Mata_Pelajaran: "BIN", Tipe_Soal: "uraian", Pertanyaan: "<p>Jelaskan makna Proklamasi!</p>", Opsi_A: "", Opsi_B: "", Opsi_C: "", Opsi_D: "", Opsi_E: "", Jawaban_Benar: "-", Bobot: 20 },
      { Nama_Bank_Soal: "UAS 2026", Mata_Pelajaran: "BIN", Tipe_Soal: "uraian", Pertanyaan: "<p>Sebutkan 3 jenis hewan mamalia!</p>", Opsi_A: "", Opsi_B: "", Opsi_C: "", Opsi_D: "", Opsi_E: "", Jawaban_Benar: "-", Bobot: 20 },
      { Nama_Bank_Soal: "UAS 2026", Mata_Pelajaran: "IPS", Tipe_Soal: "pencocokan", Pertanyaan: "<p>Cocokkan Negara & Ibu Kota</p>", Opsi_A: "", Opsi_B: "", Opsi_C: "", Opsi_D: "", Opsi_E: "", Jawaban_Benar: '[{"key":"Indonesia","value":"Jakarta"},{"key":"Jepang","value":"Tokyo"}]', Bobot: 15 },
      { Nama_Bank_Soal: "UAS 2026", Mata_Pelajaran: "IPS", Tipe_Soal: "pencocokan", Pertanyaan: "<p>Pasangkan Tokoh & Julukan</p>", Opsi_A: "", Opsi_B: "", Opsi_C: "", Opsi_D: "", Opsi_E: "", Jawaban_Benar: '[{"key":"Soekarno","value":"Proklamator"},{"key":"Ki Hajar","value":"Bapak Pendidikan"}]', Bobot: 15 }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Bank_Soal.xlsx");
  };

  const handleImportExcel = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        const batch = writeBatch(db);
        data.forEach((item: any) => {
          const docRef = doc(collection(db, "bank_soal"));
          const tipe = String(item.Tipe_Soal || 'pilihan_ganda').toLowerCase().trim();
          batch.set(docRef, {
            namaBankSoal: item.Nama_Bank_Soal,
            mapel: item.Mata_Pelajaran,
            tipe: tipe,
            pertanyaan: item.Pertanyaan,
            opsi: tipe === 'pilihan_ganda' ? { a: String(item.Opsi_A||''), b: String(item.Opsi_B||''), c: String(item.Opsi_C||''), d: String(item.Opsi_D||''), e: String(item.Opsi_E||'') } : null,
            jawabanBenar: String(item.Jawaban_Benar),
            bobot: Number(item.Bobot || 1),
            createdAt: new Date(), updatedAt: new Date()
          });
        });
        await batch.commit();
        alert("Import Berhasil!");
      } catch (err) { alert("Gagal Import!"); } finally { setLoading(false); e.target.value = ''; }
    };
    reader.readAsBinaryString(file);
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
      if (isEditMode) { await updateDoc(doc(db, "bank_soal", currentId), payload); }
      else { await addDoc(collection(db, "bank_soal"), { ...payload, createdAt: new Date() }); }
      resetForm(); setView('list');
    } catch (error) { alert("Gagal!"); } finally { setLoading(false); }
  };

  const handleEdit = (soal: any) => {
    setIsEditMode(true); setCurrentId(soal.id); setNamaBankSoal(soal.namaBankSoal || '');
    setPertanyaan(soal.pertanyaan); setTipeSoal(soal.tipe || 'pilihan_ganda');
    setSelectedMapel(soal.mapel); setBobot(soal.bobot); setMedia(soal.media);
    if (soal.tipe === 'pilihan_ganda') setOpsi(soal.opsi || { a: '', b: '', c: '', d: '', e: '' });
    if (soal.tipe === 'pencocokan') { try { setPairs(JSON.parse(soal.jawabanBenar)); } catch { setPairs([{ id: Date.now(), key: '', value: '' }]); } }
    else setJawabanBenar(soal.jawabanBenar);
    setView('form');
  };

  const resetForm = () => {
    setIsEditMode(false); setCurrentId(''); setPertanyaan(''); setMedia(null);
    setOpsi({ a: '', b: '', c: '', d: '', e: '' }); setJawabanBenar('');
    setPairs([{ id: Date.now(), key: '', value: '' }]); setBobot(1);
    setNamaBankSoal(''); setSelectedMapel(''); setTipeSoal('pilihan_ganda');
  };

  const filteredSoal = soalList.filter(s => {
    const matchMapel = filterMapel === 'all' || s.mapel === filterMapel;
    const matchSearch = (s.pertanyaan || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.namaBankSoal || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchMapel && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      <style>{`
        .ql-editor { min-height: 400px !important; font-size: 16px; }
        .ql-editor img { cursor: pointer; display: inline-block; margin: 10px; }
        .ql-align-center { text-align: center; }
        .ql-align-right { text-align: right; }
        .ql-align-left { text-align: left; }
        .ql-editor .ql-align-center img { display: block; margin-left: auto; margin-right: auto; }
        .ql-editor .ql-align-right img { float: right; margin-left: 15px; }
        .ql-editor .ql-align-left img { float: left; margin-right: 15px; }
      `}</style>

      {view === 'list' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] border shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Bank Soal System</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{soalList.length} Soal terdaftar</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={downloadTemplate} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-3 rounded-2xl font-bold text-xs uppercase hover:bg-emerald-100 transition-all"><Download size={18}/> Template</button>
              <label className="cursor-pointer flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-3 rounded-2xl font-bold text-xs uppercase hover:bg-amber-100 transition-all"><FileUp size={18}/> Import<input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} /></label>
              <button onClick={() => setShowKelompokModal(true)} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-3 rounded-2xl font-bold text-xs uppercase hover:bg-slate-200 transition-all"><FolderPlus size={18}/> Kelompok</button>
              <button onClick={() => { resetForm(); setView('form'); }} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"><Plus size={18}/> Buat Soal</button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border shadow-sm flex flex-col md:flex-row gap-3">
             <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Cari soal..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSoal.map((s) => (
              <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:border-blue-300 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-2 py-1 bg-blue-50 rounded-lg">{s.namaBankSoal}</span>
                    <div className="text-[8px] font-bold text-slate-400 uppercase">{s.mapel} • {s.tipe?.replace('_', ' ')}</div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(s)} className="p-2 bg-orange-50 text-orange-500 rounded-xl hover:bg-orange-500 hover:text-white"><Edit3 size={16}/></button>
                    <button onClick={() => confirm('Hapus?') && deleteDoc(doc(db, "bank_soal", s.id))} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white"><Trash2 size={16}/></button>
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-700 line-clamp-3" dangerouslySetInnerHTML={{ __html: s.pertanyaan }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'form' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex justify-between items-center">
             <button onClick={() => setView('list')} className="p-3 bg-slate-50 text-slate-600 rounded-2xl flex items-center gap-2 font-bold text-xs uppercase"><ArrowLeft size={18}/> Kembali</button>
             <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{isEditMode ? 'Edit Soal' : 'Buat Soal'}</h2>
          </div>

          <div className="bg-white p-8 md:p-12 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kelompok Soal</label>
                <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none" value={namaBankSoal} onChange={(e) => setNamaBankSoal(e.target.value)}>
                  <option value="">Pilih Kelompok</option>
                  {kelompokList.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mata Pelajaran</label>
                <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none" value={selectedMapel} onChange={(e) => setSelectedMapel(e.target.value)}>
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
                <ReactQuill theme="snow" value={pertanyaan} onChange={setPertanyaan} modules={modules} placeholder="Klik gambar lalu pilih icon Alignment di atas untuk memindahkan posisi gambar." />
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t-2 border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Konfigurasi Jawaban</h4>
              
              {tipeSoal === 'pilihan_ganda' && (
                <div className="grid grid-cols-1 gap-3 animate-in fade-in">
                  {['a', 'b', 'c', 'd', 'e'].map(l => (
                    <div key={l} className="flex gap-4 items-center">
                       <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase border border-slate-200">{l}</span>
                       <input placeholder={`Opsi ${l.toUpperCase()}`} className="flex-1 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-400" value={(opsi as any)[l]} onChange={(e) => setOpsi({...opsi, [l]: e.target.value})} />
                    </div>
                  ))}
                  <div className="mt-4 p-4 bg-green-50 rounded-2xl border-2 border-green-100">
                    <label className="text-[10px] font-black text-green-600 uppercase tracking-widest ml-1">Pilih Kunci Jawaban</label>
                    <div className="flex gap-2 mt-2">
                      {['a','b','c','d','e'].map(l => (
                        <button key={l} type="button" onClick={() => setJawabanBenar(l)} className={`flex-1 py-4 rounded-xl font-black uppercase text-xs border-2 transition-all ${jawabanBenar === l ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-100' : 'bg-white text-slate-300 border-slate-200 hover:border-green-200'}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tipeSoal === 'benar_salah' && (
                <div className="flex gap-4 animate-in zoom-in">
                  {['benar', 'salah'].map(v => (
                    <button key={v} type="button" onClick={() => setJawabanBenar(v)} className={`flex-1 py-6 rounded-[2rem] font-black uppercase text-sm border-4 transition-all ${jawabanBenar === v ? 'bg-green-600 border-green-600 text-white shadow-xl' : 'bg-white text-slate-200 border-slate-100'}`}>{v}</button>
                  ))}
                </div>
              )}

              {(tipeSoal === 'isian' || tipeSoal === 'uraian') && (
                <div className="space-y-2 animate-in slide-in-from-left-2">
                  <label className="text-[10px] font-black text-green-600 uppercase tracking-widest ml-1">Kunci Jawaban Teks</label>
                  <input placeholder="Ketik kunci jawaban..." className="w-full p-5 bg-green-50 border-2 border-green-100 rounded-2xl text-sm font-bold text-green-700 outline-none focus:border-green-400" value={jawabanBenar} onChange={(e) => setJawabanBenar(e.target.value)} />
                </div>
              )}

              {tipeSoal === 'pencocokan' && (
                <div className="grid grid-cols-1 gap-3 animate-in fade-in">
                  {pairs.map((p, idx) => (
                    <div key={p.id} className="flex gap-3 items-center">
                      <input placeholder="Kiri" className="flex-1 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold" value={p.key} onChange={(e) => { const n = [...pairs]; n[idx].key = e.target.value; setPairs(n); }} />
                      <div className="text-slate-300">→</div>
                      <input placeholder="Kanan" className="flex-1 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold" value={p.value} onChange={(e) => { const n = [...pairs]; n[idx].value = e.target.value; setPairs(n); }} />
                      <button onClick={() => setPairs(pairs.filter(i => i.id !== p.id))} className="p-2 text-red-400"><Trash2 size={18}/></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setPairs([...pairs, {id: Date.now(), key: '', value: ''}])} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-xs font-black text-slate-400 uppercase">+ Tambah Pasangan</button>
                </div>
              )}
            </div>

            <div className="flex gap-4 items-end pt-10">
              <div className="w-32">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bobot Skor</label>
                <input type="number" className="w-full p-5 bg-slate-50 rounded-2xl mt-2 font-black text-center text-lg border-2 border-slate-200 outline-none" value={bobot} onChange={(e) => setBobot(Number(e.target.value))} />
              </div>
              <button onClick={simpanSoal} disabled={loading} className={`flex-1 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest text-white shadow-2xl transition-all active:scale-95 ${isEditMode ? 'bg-orange-500 shadow-orange-200' : 'bg-blue-600 shadow-blue-200'}`}>
                {loading ? <Loader2 className="animate-spin mx-auto"/> : isEditMode ? "Perbarui Soal" : "Simpan Soal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showKelompokModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl space-y-6 border-2 border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Kelompok Baru</h3>
              <button onClick={() => setShowKelompokModal(false)} className="p-2 bg-slate-100 rounded-full hover:text-red-500 transition-all"><X size={20}/></button>
            </div>
            <div className="space-y-4">
               <input placeholder="Misal: UAS Ganjil 2024" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold outline-none" value={newKelompok.nama} onChange={(e) => setNewKelompok({...newKelompok, nama: e.target.value})} />
            </div>
            <button onClick={async () => { if (!newKelompok.nama) return; await addDoc(collection(db, "kelompok_soal"), newKelompok); setNewKelompok({ nama: '' }); setShowKelompokModal(false); }} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase hover:bg-black transition-all shadow-xl">Simpan Kelompok</button>
          </div>
        </div>
      )}
    </div>
  );
}