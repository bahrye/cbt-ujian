import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, addDoc, getDocs, query, orderBy, 
  deleteDoc, doc, updateDoc, where 
} from 'firebase/firestore';
import { 
  ClipboardCheck, Plus, Trash2, Edit3, 
  Clock, Calendar, Users, Settings, Save, X 
} from 'lucide-react';

export default function KelolaUjianSection() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(false);
  const [ujianList, setUjianList] = useState<any[]>([]);
  
  // Data Master untuk Dropdown
  const [kelompokList, setKelompokList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [pengawasList, setPengawasList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    namaUjian: '',
    kelompokId: '',
    mapel: '',
    tglMulai: '',
    tglSelesai: '',
    durasi: 60,
    acakSoal: false,
    acakJawaban: false,
    pengawasIds: [] as string[],
    kelas: [] as string[],
    status: 'nonaktif' // aktif | nonaktif
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    // Ambil daftar Ujian
    const uSnap = await getDocs(query(collection(db, "ujian"), orderBy("tglMulai", "desc")));
    setUjianList(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    // Ambil Kelompok Soal
    const kSnap = await getDocs(collection(db, "kelompok_soal"));
    setKelompokList(kSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    // Ambil Mapel
    const mSnap = await getDocs(collection(db, "mapel"));
    setMapelList(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    // Ambil Pengawas (User dengan role pengawas/guru)
    const pSnap = await getDocs(query(collection(db, "users"), where("role", "in", ["pengawas", "guru"])));
    setPengawasList(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    // Ambil Kelas
    const clSnap = await getDocs(collection(db, "kelas"));
    setKelasList(clSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleSimpan = async () => {
    setLoading(true);
    try {
      if (formData.id) {
        await updateDoc(doc(db, "ujian", formData.id), formData);
      } else {
        await addDoc(collection(db, "ujian"), { ...formData, createdAt: new Date() });
      }
      setView('list');
      fetchInitialData();
      resetForm();
    } catch (e) {
      alert("Gagal menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '', namaUjian: '', kelompokId: '', mapel: '', tglMulai: '',
      tglSelesai: '', durasi: 60, acakSoal: false, acakJawaban: false,
      pengawasIds: [], kelas: [], status: 'nonaktif'
    });
  };

  return (
    <div className="space-y-6">
      {view === 'list' ? (
        <>
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase">Jadwal Ujian</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Atur pelaksanaan ujian sekolah</p>
            </div>
            <button onClick={() => setView('form')} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2">
              <Plus size={18}/> Tambah Ujian
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {ujianList.map((u) => (
              <div key={u.id} className="bg-white p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${u.status === 'aktif' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {u.status}
                    </span>
                    <h3 className="font-bold text-slate-800">{u.namaUjian}</h3>
                  </div>
                  <div className="text-[10px] text-slate-500 flex gap-4">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {u.tglMulai}</span>
                    <span className="flex items-center gap-1"><Clock size={12}/> {u.durasi} Menit</span>
                    <span className="flex items-center gap-1"><Users size={12}/> {u.kelas?.join(', ')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setFormData(u); setView('form'); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit3 size={16}/></button>
                  <button onClick={async () => { if(confirm('Hapus?')) await deleteDoc(doc(db, "ujian", u.id)); fetchInitialData(); }} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm max-w-4xl mx-auto">
          <div className="flex justify-between mb-8">
            <h2 className="text-xl font-black text-slate-800 uppercase">Konfigurasi Ujian</h2>
            <button onClick={() => setView('list')} className="text-slate-400"><X/></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase">Nama Ujian</span>
                <input className="w-full mt-1 p-4 bg-slate-50 border rounded-2xl outline-none" value={formData.namaUjian} onChange={e => setFormData({...formData, namaUjian: e.target.value})} placeholder="Contoh: Penilaian Tengah Semester" />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase">Kelompok Soal</span>
                  <select className="w-full mt-1 p-4 bg-slate-50 border rounded-2xl outline-none" value={formData.kelompokId} onChange={e => setFormData({...formData, kelompokId: e.target.value})}>
                    <option value="">Pilih Kelompok</option>
                    {kelompokList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase">Mata Pelajaran</span>
                  <select className="w-full mt-1 p-4 bg-slate-50 border rounded-2xl outline-none" value={formData.mapel} onChange={e => setFormData({...formData, mapel: e.target.value})}>
                    <option value="">Pilih Mapel</option>
                    {mapelList.map(m => <option key={m.id} value={m.nama}>{m.nama}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase">Waktu Mulai</span>
                  <input type="datetime-local" className="w-full mt-1 p-4 bg-slate-50 border rounded-2xl outline-none" value={formData.tglMulai} onChange={e => setFormData({...formData, tglMulai: e.target.value})} />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-500 uppercase">Waktu Selesai</span>
                  <input type="datetime-local" className="w-full mt-1 p-4 bg-slate-50 border rounded-2xl outline-none" value={formData.tglSelesai} onChange={e => setFormData({...formData, tglSelesai: e.target.value})} />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase">Pilih Kelas (Target Siswa)</span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {kelasList.map(k => (
                    <label key={k.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl cursor-pointer">
                      <input type="checkbox" checked={formData.kelas.includes(k.nama)} onChange={e => {
                        const val = k.nama;
                        const newKelas = e.target.checked ? [...formData.kelas, val] : formData.kelas.filter(i => i !== val);
                        setFormData({...formData, kelas: newKelas});
                      }} />
                      <span className="text-xs font-bold">{k.nama}</span>
                    </label>
                  ))}
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase">Pengawas Ujian (Bisa Multiple)</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {pengawasList.map(p => (
                    <button key={p.id} onClick={() => {
                      const exists = formData.pengawasIds.includes(p.id);
                      const newIds = exists ? formData.pengawasIds.filter(i => i !== p.id) : [...formData.pengawasIds, p.id];
                      setFormData({...formData, pengawasIds: newIds});
                    }} className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${formData.pengawasIds.includes(p.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-500'}`}>
                      {p.nama}
                    </button>
                  ))}
                </div>
              </label>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5" checked={formData.acakSoal} onChange={e => setFormData({...formData, acakSoal: e.target.checked})} />
                  <span className="text-xs font-bold text-slate-700">Acak Soal</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5" checked={formData.acakJawaban} onChange={e => setFormData({...formData, acakJawaban: e.target.checked})} />
                  <span className="text-xs font-bold text-slate-700">Acak Jawaban</span>
                </label>
              </div>

              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Status Ujian</span>
                  <select className={`w-full mt-1 p-4 rounded-2xl font-black text-xs uppercase outline-none border-2 ${formData.status === 'aktif' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'}`} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="aktif">Aktif (Bisa Dikerjakan)</option>
                    <option value="nonaktif">Nonaktif (Ditutup)</option>
                  </select>
                </div>
                <div className="w-24">
                  <span className="text-xs font-bold text-slate-500 uppercase">Durasi</span>
                  <input type="number" className="w-full mt-1 p-4 bg-slate-50 border rounded-2xl text-center font-bold" value={formData.durasi} onChange={e => setFormData({...formData, durasi: Number(e.target.value)})} />
                </div>
              </div>
            </div>
          </div>

          <button onClick={handleSimpan} disabled={loading} className="w-full mt-10 bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-100">
            {loading ? 'Menyimpan...' : <><Save size={20}/> Simpan Pengaturan Ujian</>}
          </button>
        </div>
      )}
    </div>
  );
}