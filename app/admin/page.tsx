'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  onSnapshot 
} from 'firebase/firestore';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('siswa');
  const [loading, setLoading] = useState(false);

  // 1. Ambil data user secara real-time dari Firestore
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fungsi Tambah User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "users"), {
        nama,
        email,
        role,
        createdAt: new Date()
      });
      alert("User berhasil ditambahkan!");
      setNama('');
      setEmail('');
    } catch (error) {
      alert("Gagal menambah user: " + error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fungsi Hapus User
  const handleDeleteUser = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus user ini?")) {
      await deleteDoc(doc(db, "users", id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-800">Panel Kendali Admin</h1>
          <p className="text-gray-500">Kelola data Guru, Siswa, dan Pengawas CBT</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FORM TAMBAH USER */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-xl font-bold mb-6 text-blue-700">Tambah Akun Baru</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input 
                  type="text" required value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Budi Santoso"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@sekolah.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role / Jabatan</label>
                <select 
                  value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                  <option value="pengawas">Pengawas</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button 
                type="submit" disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                {loading ? 'Menyimpan...' : 'Daftarkan User'}
              </button>
            </form>
          </div>

          {/* TABEL DAFTAR USER */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Daftar Pengguna</h2>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                {users.length} Total
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-sm">
                  <tr>
                    <th className="p-4 font-semibold">Nama & Email</th>
                    <th className="p-4 font-semibold text-center">Role</th>
                    <th className="p-4 font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{u.nama}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          u.role === 'guru' ? 'bg-orange-100 text-orange-700' :
                          u.role === 'pengawas' ? 'bg-teal-100 text-teal-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-red-400 hover:text-red-600 font-medium text-sm transition-colors"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-10 text-center text-gray-400">Belum ada user terdaftar.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}