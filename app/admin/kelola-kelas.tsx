'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, getDocs, addDoc, deleteDoc, 
  doc, updateDoc, query, orderBy 
} from 'firebase/firestore';
import { Trash2, Edit3, Plus, Loader2, School } from 'lucide-react';

export default function KelolaKelasSection() {
  const [kelas, setKelas] = useState<{id: string, nama: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [namaKelas, setNamaKelas] = useState('');
  const [editingKelas, setEditingKelas] = useState<{id: string, nama: string} | null>(null);

  useEffect(() => { fetchKelas(); }, []);

  const fetchKelas = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "kelas"), orderBy("nama", "asc"));
      const snap = await getDocs(q);
      setKelas(snap.docs.map(d => ({ id: d.id, nama: d.data().nama })));
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleTambah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKelas) return;
    try {
      await addDoc(collection(db, "kelas"), { nama: namaKelas });
      setNamaKelas('');
      fetchKelas();
    } catch (error) { alert("Gagal menambah kelas"); }
  };

  const handleUpdate = async () => {
    if (!editingKelas) return;
    try {
      await updateDoc(doc(db, "kelas", editingKelas.id), { nama: editingKelas.nama });
      setEditingKelas(null);
      fetchKelas();
    } catch (error) { alert("Gagal update kelas"); }
  };

  const handleHapus = async (id: string) => {
    if (confirm("Hapus kelas ini?")) {
      await deleteDoc(doc(db, "kelas", id));
      fetchKelas();
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {/* Form Input */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm h-fit">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest mb-4">
          <Plus size={18} className="text-blue-500"/> {editingKelas ? 'Edit Kelas' : 'Tambah Kelas'}
        </h3>
        <div className="space-y-3">
          <input 
            placeholder="Nama Kelas (Contoh: X-IPA-1)" 
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500 font-medium"
            value={editingKelas ? editingKelas.nama : namaKelas}
            onChange={(e) => editingKelas ? setEditingKelas({...editingKelas, nama: e.target.value}) : setNamaKelas(e.target.value)}
          />
          {editingKelas ? (
            <div className="flex gap-2">
              <button onClick={handleUpdate} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-xs uppercase">Simpan</button>
              <button onClick={() => setEditingKelas(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase">Batal</button>
            </div>
          ) : (
            <button onClick={handleTambah} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all">
              Tambah Kelas
            </button>
          )}
        </div>
      </div>

      {/* Daftar Tabel */}
      <div className="md:col-span-2 bg-white rounded-3xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[9px] tracking-widest border-b">
            <tr>
              <th className="p-6">Nama Kelas</th>
              <th className="p-6 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={2} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-300"/></td></tr>
            ) : kelas.map((k) => (
              <tr key={k.id} className="hover:bg-slate-50">
                <td className="p-6 font-bold text-slate-700">{k.nama}</td>
                <td className="p-6 flex justify-center gap-2">
                  <button onClick={() => setEditingKelas(k)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit3 size={16}/></button>
                  <button onClick={() => handleHapus(k.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}