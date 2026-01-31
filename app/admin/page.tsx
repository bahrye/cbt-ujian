'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  collection, setDoc, doc, query, orderBy, onSnapshot, deleteDoc 
} from 'firebase/firestore';
import * as XLSX from 'xlsx';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('siswa');
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    });
    return () => unsubscribe();
  }, []);

  // --- FUNGSI IMPORT EXCEL ---
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        for (const row of data) {
          // Format Excel: Nama, Email, Password, Role
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, row.Email, row.Password.toString());
            await setDoc(doc(db, "users", userCredential.user.uid), {
              uid: userCredential.user.uid,
              nama: row.Nama,
              email: row.Email,
              role: row.Role.toLowerCase(),
              createdAt: new Date()
            });
          } catch (err) {
            console.error(`Gagal mendaftarkan ${row.Email}:`, err);
          }
        }
        alert("Proses Import Selesai!");
      } catch (error) {
        alert("Gagal membaca file Excel. Pastikan format benar.");
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        nama, email, role, createdAt: new Date()
      });
      alert("User Berhasil Dibuat!");
      setNama(''); setEmail(''); setPassword('');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            {/* FORM MANUAL */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h2 className="font-bold mb-4 text-blue-600">Input Manual</h2>
              <form onSubmit={handleAddUser} className="space-y-3">
                <input type="text" placeholder="Nama" value={nama} onChange={e => setNama(e.target.value)} className="w-full p-2 border rounded" required />
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded" required />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded" required />
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-2 border rounded">
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                  <option value="pengawas">Pengawas</option>
                </select>
                <button className="w-full bg-blue-600 text-white py-2 rounded font-bold">{loading ? 'Loading...' : 'Simpan'}</button>
              </form>
            </div>

            {/* IMPORT EXCEL */}
            <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
              <h2 className="font-bold mb-2 text-green-700">Import Massal (Excel)</h2>
              <p className="text-xs text-green-600 mb-4">Gunakan kolom: Nama, Email, Password, Role</p>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleImportExcel}
                className="block w-full text-sm text-green-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
              />
              {importLoading && <p className="mt-2 text-xs animate-pulse">Sedang memproses banyak data...</p>}
            </div>
          </div>

          {/* TABEL USER */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4">Nama</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-bold">{u.nama}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </td>
                    <td className="p-4 uppercase text-xs font-bold">{u.role}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => deleteDoc(doc(db, "users", u.id))} className="text-red-500 text-sm">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}