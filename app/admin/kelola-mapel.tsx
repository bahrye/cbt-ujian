'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, getDocs, addDoc, deleteDoc, 
  doc, updateDoc, query, orderBy 
} from 'firebase/firestore';
import { Trash2, Edit3, Plus, Loader2, BookOpen } from 'lucide-react';

export default function KelolaMapelSection() {
  const [mapel, setMapel] = useState<{id: string, nama: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [namaMapel, setNamaMapel] = useState('');
  const [editingMapel, setEditingMapel] = useState<{id: string, nama: string} | null>(null);

  useEffect(() => { 
    fetchMapel(); 
  }, []);

  const fetchMapel = async () => {
    setLoading(true);
    try {
      // Mengambil data dari koleksi "mapel" di Firestore
      const q = query(collection(db, "mapel"), orderBy("nama", "asc"));
      const snap = await getDocs(q);
      setMapel(snap.docs.map(d => ({ id: d.id, nama: d.data().nama })));
    } catch (error) { 
      console.error("Gagal mengambil data mapel:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleTambah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaMapel.trim()) return;
    try {
      await addDoc(collection(db, "mapel"), { nama: namaMapel });
      setNamaMapel('');
      fetchMapel();
    } catch (error) { 
      alert("Gagal menambah mata pelajaran"); 
    }
  };

  const handleUpdate = async () => {
    if (!editingMapel || !editingMapel.nama.trim()) return;
    try {
      await updateDoc(doc(db, "mapel", editingMapel.id), { nama: editingMapel.nama });
      setEditingMapel(null);
      fetchMapel();
    } catch (error) { 
      alert("Gagal update mata pelajaran"); 
    }
  };

  const handleHapus = async (id: string) => {
    if (confirm("Hapus mata pelajaran ini?")) {
      try {
        await deleteDoc(doc(db, "mapel", id));
        fetchMapel();
      } catch (error) {
        alert("Gagal menghapus mata pelajaran");
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {/* Form Input Mata Pelajaran */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm h-fit">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest mb-4">
          <Plus size={18} className="text-blue-500"/> {editingMapel ? 'Edit Mapel' : 'Tambah Mapel'}
        </h3>
        <div className="space-y-3">
          <input 
            placeholder="Nama Mapel (Contoh: Matematika)" 
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500 font-medium"
            value={editingMapel ? editingMapel.nama : namaMapel}
            onChange={(e) => editingMapel 
              ? setEditingMapel({...editingMapel, nama: e.target.value}) 
              : setNamaMapel(e.target.value)
            }
          />
          {editingMapel ? (
            <div className="flex gap-2">
              <button onClick={handleUpdate} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-xs uppercase">Simpan</button>
              <button onClick={() => setEditingMapel(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-xs uppercase">Batal</button>
            </div>
          ) : (
            <button onClick={handleTambah} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all">
              Tambah Mapel
            </button>
          )}
        </div>
      </div>

      {/* Daftar Tabel Mata Pelajaran */}
      <div className="md:col-span-2 bg-white rounded-3xl border shadow-sm overflow-hidden">
        <table className="w-full text-left table-fixed"> {/* Tambahkan table-fixed agar lebar kolom konsisten */}
            <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[9px] tracking-widest border-b">
            <tr>
                <th className="p-6 w-2/3">Nama Mata Pelajaran</th> {/* Atur lebar 2/3 */}
                <th className="p-6 text-center w-1/3">Aksi</th>     {/* Atur lebar 1/3 */}
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
            {loading ? (
                <tr><td colSpan={2} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-300"/></td></tr>
            ) : mapel.length > 0 ? (
                mapel.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-6 font-bold text-slate-700">
                    <div className="flex items-center gap-3">
                        <BookOpen size={16} className="text-slate-400 shrink-0"/> 
                        <span className="truncate">{m.nama}</span>
                    </div>
                    </td>
                    <td className="p-6">
                    <div className="flex justify-center gap-2">
                        <button 
                        onClick={() => setEditingMapel(m)} 
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                        title="Edit"
                        >
                        <Edit3 size={16}/>
                        </button>
                        <button 
                        onClick={() => handleHapus(m.id)} 
                        className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                        title="Hapus"
                        >
                        <Trash2 size={16}/>
                        </button>
                    </div>
                    </td>
                </tr>
                ))
            ) : (
                <tr><td colSpan={2} className="p-10 text-center text-slate-400 text-sm italic">Belum ada mata pelajaran.</td></tr>
            )}
            </tbody>
        </table>
      </div>
    </div>
  );
}