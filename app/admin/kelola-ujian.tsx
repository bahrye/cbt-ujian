'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, addDoc, getDocs, query, orderBy, 
  deleteDoc, doc, updateDoc, where, getDoc 
} from 'firebase/firestore';
import { 
  ClipboardCheck, Plus, Trash2, Edit3, 
  Clock, Calendar, Users, Settings, Save, X,
  Database, CheckCircle2, ChevronRight, Info, ArrowLeft
} from 'lucide-react';

interface UjianData {
  id?: string;
  namaUjian: string;
  kelompokId: string;
  kelompokNama: string;
  mapel: string;
  tglMulai: string;
  tglSelesai: string;
  durasi: number;
  acakSoal: boolean;
  acakJawaban: boolean;
  pengawasIds: string[];
  kelas: string[];
  status: string;
  soalTerpilih: string[];
  createdAt?: any;
}

export default function KelolaUjianSection() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(false);
  const [ujianList, setUjianList] = useState<UjianData[]>([]);
  
  // Data Master
  const [kelompokList, setKelompokList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [pengawasList, setPengawasList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);

  // Modal Pilih Soal State
  const [showPilihSoalModal, setShowPilihSoalModal] = useState(false);
  const [selectedUjian, setSelectedUjian] = useState<UjianData | null>(null);
  const [availableSoal, setAvailableSoal] = useState<any[]>([]);
  const [tempSelectedSoal, setTempSelectedSoal] = useState<string[]>([]);

  const [filteredMapelList, setFilteredMapelList] = useState<string[]>([]);

  // Form State
  const [formData, setFormData] = useState<UjianData>({
    namaUjian: '',
    kelompokId: '',
    kelompokNama: '',
    mapel: '',
    tglMulai: '',
    tglSelesai: '',
    durasi: 60,
    acakSoal: false,
    acakJawaban: false,
    pengawasIds: [],
    kelas: [],
    status: 'nonaktif',
    soalTerpilih: []
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Perbaikan: Sinkronisasi daftar mapel saat data kelompok terisi (terutama saat Mode Edit)
  useEffect(() => {
    if (formData.kelompokNama) {
      updateFilteredMapel(formData.kelompokNama);
    }
  }, [formData.kelompokNama]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const uSnap = await getDocs(query(collection(db, "ujian"), orderBy("createdAt", "desc")));
      setUjianList(uSnap.docs.map(d => ({ id: d.id, ...d.data() } as UjianData)));

      const kSnap = await getDocs(collection(db, "kelompok_soal"));
      setKelompokList(kSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const mSnap = await getDocs(collection(db, "mapel"));
      setMapelList(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const pSnap = await getDocs(query(collection(db, "users"), where("role", "in", ["pengawas", "guru"])));
      setPengawasList(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const clSnap = await getDocs(query(collection(db, "kelas"), orderBy("nama", "asc")));
      setKelasList(clSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateFilteredMapel = async (kelompokNama: string) => {
    if (!kelompokNama) {
        setFilteredMapelList([]);
        return;
    }

    try {
        const q = query(
        collection(db, "bank_soal"),
        where("namaBankSoal", "==", kelompokNama)
        );
        const snap = await getDocs(q);

        const mapels = snap.docs.map(d => d.data().mapel);
        const uniqueMapels = Array.from(new Set(mapels)) as string[];

        setFilteredMapelList(uniqueMapels);
    } catch (e) {
        console.error("Gagal filter mapel:", e);
    }
  };

  const handleSimpan = async () => {
    if (!formData.namaUjian || !formData.kelompokId || !formData.mapel) {
        return alert("Mohon lengkapi data utama (Nama, Kelompok, Mapel)");
    }

    setLoading(true);
    try {
        const payload = {
          ...formData, // Mengambil semua input dari form
          // token: generatedToken,
          createdAt: new Date(),
          status: 'aktif'
        };
        
        if (formData.id) {
        const docRef = doc(db, "ujian", formData.id as string); 
        const { id, ...updateData } = payload;
        await updateDoc(docRef, updateData);
        } else {
        await addDoc(collection(db, "ujian"), payload);
        }
        
        setView('list');
        fetchInitialData();
        resetForm();
    } catch (e) {
        console.error("Error saving:", e);
        alert("Gagal menyimpan data");
    } finally {
        setLoading(false);
    }
  };

  const bukaPilihSoal = async (ujian: UjianData) => {
    setSelectedUjian(ujian);
    setLoading(true);
    try {
      const q = query(
        collection(db, "bank_soal"),
        where("namaBankSoal", "==", ujian.kelompokNama),
        where("mapel", "==", ujian.mapel)
      );
      const snap = await getDocs(q);
      setAvailableSoal(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTempSelectedSoal(ujian.soalTerpilih || []);
      setShowPilihSoalModal(true);
    } catch (e) {
      alert("Gagal mengambil bank soal. Pastikan nama kelompok dan mapel sesuai.");
    } finally {
      setLoading(false);
    }
  };

  const simpanPilihanSoal = async () => {
    if (!selectedUjian?.id) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "ujian", selectedUjian.id), {
        soalTerpilih: tempSelectedSoal
      });
      setShowPilihSoalModal(false);
      fetchInitialData();
      alert("Daftar soal berhasil diperbarui!");
    } catch (e) {
      alert("Gagal menyimpan pilihan soal");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      namaUjian: '', kelompokId: '', kelompokNama: '', mapel: '', tglMulai: '',
      tglSelesai: '', durasi: 60, acakSoal: false, acakJawaban: false,
      pengawasIds: [], kelas: [], status: 'nonaktif', soalTerpilih: []
    });
    setFilteredMapelList([]);
  };

  const toggleSelectSoal = (id: string) => {
    if (tempSelectedSoal.includes(id)) {
      setTempSelectedSoal(tempSelectedSoal.filter(sid => sid !== id));
    } else {
      setTempSelectedSoal([...tempSelectedSoal, id]);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {view === 'list' ? (
        <div className="animate-in fade-in duration-500 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] border shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                <ClipboardCheck size={24}/>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">Manajemen Ujian</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Total {ujianList.length} Jadwal Terdaftar</p>
              </div>
            </div>
            <button onClick={() => { resetForm(); setView('form'); }} className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2">
              <Plus size={18}/> Tambah Jadwal
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading && ujianList.length === 0 ? (
              <div className="p-20 text-center bg-white rounded-[3rem] border border-dashed">
                <Clock className="animate-spin mx-auto text-slate-200 mb-4" size={40}/>
                <p className="text-slate-400 font-bold italic">Memuat data ujian...</p>
              </div>
            ) : ujianList.length === 0 ? (
              <div className="p-20 text-center bg-white rounded-[3rem] border border-dashed">
                <Info className="mx-auto text-slate-200 mb-4" size={40}/>
                <p className="text-slate-400 font-bold italic">Belum ada jadwal ujian yang dibuat.</p>
              </div>
            ) : ujianList.map((u) => (
              <div key={u.id} className="bg-white p-5 md:p-6 rounded-[2rem] border shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${u.status === 'aktif' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {u.status}
                    </span>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">{u.namaUjian}</h3>
                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-lg">
                      <Database size={12}/>
                      <span className="text-[10px] font-black uppercase">{u.soalTerpilih?.length || 0} Soal</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-y-2 gap-x-6">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar size={14} className="text-blue-500"/>
                      <span className="text-[10px] font-bold uppercase tracking-tight">{new Date(u.tglMulai).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock size={14} className="text-orange-500"/>
                      <span className="text-[10px] font-bold uppercase tracking-tight">{u.durasi} Menit</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Users size={14} className="text-purple-500"/>
                      <span className="text-[10px] font-bold uppercase tracking-tight truncate max-w-[150px]">{u.kelas?.join(', ') || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-50">
                  <button 
                    onClick={() => bukaPilihSoal(u)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-amber-50 text-amber-600 px-4 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                  >
                    <Database size={16}/> Pilih Soal
                  </button>
                  <button onClick={() => { setFormData(u); setView('form'); }} className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm">
                    <Edit3 size={18}/>
                  </button>
                  <button onClick={async () => { if(confirm('Hapus jadwal ini?')) { await deleteDoc(doc(db, "ujian", u.id!)); fetchInitialData(); } }} className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm">
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex justify-between items-center mb-6">
             <button onClick={() => setView('list')} className="p-3 bg-slate-50 text-slate-600 rounded-2xl flex items-center gap-2 font-black text-[10px] uppercase hover:bg-slate-100 transition-all"><ArrowLeft size={18}/> Kembali</button>
             <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Konfigurasi Jadwal Ujian</h2>
          </div>

          <div className="bg-white p-8 md:p-12 rounded-[3rem] border shadow-sm space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Ujian</label>
                  <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all" value={formData.namaUjian} onChange={e => setFormData({...formData, namaUjian: e.target.value})} placeholder="Contoh: PTS Ganjil 2024" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kelompok Soal</label>
                    <select 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all" 
                        value={formData.kelompokId} 
                        onChange={e => {
                        const sel = kelompokList.find(k => k.id === e.target.value);
                        const namaKelompok = sel?.nama || '';
                        setFormData({...formData, kelompokId: e.target.value, kelompokNama: namaKelompok});
                        }}
                    >
                        <option value="">Pilih Kelompok</option>
                        {kelompokList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mata Pelajaran</label>
                    <select 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-blue-500 transition-all" 
                        value={formData.mapel} 
                        onChange={e => setFormData({...formData, mapel: e.target.value})}
                        disabled={!formData.kelompokId}
                    >
                        <option value="">{formData.kelompokId ? "Pilih Mapel" : "Pilih Kelompok Dulu"}</option>
                        {filteredMapelList.map(m => (
                        <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    {formData.kelompokId && filteredMapelList.length === 0 && (
                        <p className="text-[9px] text-red-500 font-bold mt-1">* Belum ada soal di kelompok ini</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Waktu Mulai</label>
                    <input type="datetime-local" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-blue-500" value={formData.tglMulai} onChange={e => setFormData({...formData, tglMulai: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Waktu Selesai</label>
                    <input type="datetime-local" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-blue-500" value={formData.tglSelesai} onChange={e => setFormData({...formData, tglSelesai: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Kelas</label>
                  <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-[2rem] border-2 border-slate-100">
                    {kelasList.map(k => (
                      <label key={k.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all border-2 ${formData.kelas.includes(k.nama) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                        <input type="checkbox" className="hidden" checked={formData.kelas.includes(k.nama)} onChange={e => {
                          const val = k.nama;
                          const newKelas = e.target.checked ? [...formData.kelas, val] : formData.kelas.filter(i => i !== val);
                          setFormData({...formData, kelas: newKelas});
                        }} />
                        <span className="text-[10px] font-black uppercase">{k.nama}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pengawas Ujian</label>
                  <div className="flex flex-wrap gap-2">
                    {pengawasList.map(p => (
                      <button key={p.id} onClick={() => {
                        const exists = formData.pengawasIds.includes(p.id);
                        const newIds = exists ? formData.pengawasIds.filter(i => i !== p.id) : [...formData.pengawasIds, p.id];
                        setFormData({...formData, pengawasIds: newIds});
                      }} className={`px-4 py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${formData.pengawasIds.includes(p.id) ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-100' : 'bg-white border-slate-100 text-slate-400 hover:border-purple-200'}`}>
                        {p.nama}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-900 p-5 rounded-[2rem] text-white">
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${formData.acakSoal ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                        {formData.acakSoal && <CheckCircle2 size={12}/>}
                      </div>
                      <input type="checkbox" className="hidden" checked={formData.acakSoal} onChange={e => setFormData({...formData, acakSoal: e.target.checked})} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Acak Soal</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${formData.acakJawaban ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                        {formData.acakJawaban && <CheckCircle2 size={12}/>}
                      </div>
                      <input type="checkbox" className="hidden" checked={formData.acakJawaban} onChange={e => setFormData({...formData, acakJawaban: e.target.checked})} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Acak Jawaban</span>
                    </label>
                  </div>
                  <div className="border-l border-slate-700 pl-4 space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Durasi (Menit)</label>
                    <input type="number" className="w-full bg-transparent text-xl font-black outline-none text-blue-400" value={formData.durasi} onChange={e => setFormData({...formData, durasi: Number(e.target.value)})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Ujian</label>
                  <select className={`w-full p-4 rounded-2xl font-black text-xs uppercase outline-none border-2 transition-all ${formData.status === 'aktif' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'}`} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="aktif">Aktif (Dapat Dikerjakan)</option>
                    <option value="nonaktif">Nonaktif (Sembunyikan)</option>
                  </select>
                </div>
              </div>
            </div>

            <button onClick={handleSimpan} disabled={loading} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">
              {loading ? 'Proses Sinkronisasi...' : 'Simpan Konfigurasi Ujian'}
            </button>
          </div>
        </div>
      )}

      {showPilihSoalModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl flex flex-col h-full md:max-h-[90vh]">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                  <Database size={28}/>
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">Penyusunan Butir Soal</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {selectedUjian?.namaUjian} • {selectedUjian?.mapel}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowPilihSoalModal(false)} className="p-3 bg-slate-50 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                <X size={24}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {availableSoal.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold italic">Tidak ditemukan soal untuk kelompok "{selectedUjian?.kelompokNama}" dan mapel "{selectedUjian?.mapel}".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Pilih soal untuk menambahkan (Klik untuk urutkan)</p>
                  {availableSoal.map((soal, index) => {
                    const isSelected = tempSelectedSoal.includes(soal.id);
                    const orderNumber = tempSelectedSoal.indexOf(soal.id) + 1;

                    return (
                      <div 
                        key={soal.id}
                        onClick={() => toggleSelectSoal(soal.id)}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-5 group ${
                          isSelected ? 'border-blue-500 bg-blue-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-blue-200'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all ${
                          isSelected ? 'bg-blue-600 text-white scale-110' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isSelected ? orderNumber : index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-700 truncate prose-sm" dangerouslySetInnerHTML={{ __html: soal.pertanyaan }} />
                          <div className="flex gap-3 mt-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">Tipe: {soal.tipe?.replace('_', ' ')}</span>
                            <span className="text-[9px] font-black text-blue-400 uppercase">Bobot: {soal.bobot}</span>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-transparent'
                        }`}>
                          <CheckCircle2 size={14}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <p className="text-lg font-black text-slate-800 tracking-tighter leading-none">{tempSelectedSoal.length} Soal Terpilih</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Urutan ditentukan berdasarkan waktu pemilihan</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={() => setShowPilihSoalModal(false)} className="flex-1 md:flex-none px-8 py-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all">Batal</button>
                <button 
                  onClick={simpanPilihanSoal}
                  disabled={loading}
                  className="flex-1 md:flex-none px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? <Clock className="animate-spin" size={16}/> : <Save size={16}/>}
                  Simpan Urutan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}