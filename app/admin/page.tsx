'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDocs, collection, deleteDoc, query, orderBy } from 'firebase/firestore';
import { UserPlus, Trash2, Users, ShieldCheck, GraduationCap, Search, Loader2 } from 'lucide-react';

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State untuk form tambah user
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'siswa',
    nama: ''
  });

  // Ambil data semua user
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), orderBy("role", "asc"));
      const querySnapshot = await getDocs(q);
      const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Handler Tambah User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const userDocId = formData.username.toLowerCase().trim();
    
    try {
      // Menggunakan setDoc dengan ID dokumen yang ditentukan (username)
      await setDoc(doc(db, "users", userDocId), {
        username: userDocId,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        nama: formData.nama,
        createdAt: new Date().toISOString()
      });
      
      alert("User berhasil ditambahkan!");
      setFormData({ username: '', email: '', password: '', role: 'siswa', nama: '' });
      fetchUsers();
    } catch (error) {
      alert("Gagal menambah user.");
    }
  };

  // Handler Hapus User
  const handleDelete = async (id: string) => {
    if (confirm(`Hapus user ${id}?`)) {
      await deleteDoc(doc(db, "users", id));
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(u => 
    u.id.includes(searchTerm.toLowerCase()) || u.nama?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-blue-600" /> Admin Dashboard - Kelola User
          </h1>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Form Tambah User */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" /> Tambah User Baru
            </h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <input 
                type="text" placeholder="Username (ID Dokumen)" required
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input 
                type="text" placeholder="Nama Lengkap" required
                value={formData.nama}
                onChange={(e) => setFormData({...formData, nama: e.target.value})}
                className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input 
                type="email" placeholder="Email" required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input 
                type="text" placeholder="Password" required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select 
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="siswa">Siswa</option>
                <option value="guru">Guru</option>
                <option value="pengawas">Pengawas</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Simpan User
              </button>
            </form>
          </div>

          {/* Tabel Daftar User */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" placeholder="Cari username/nama..." 
                  className="pl-9 pr-4 py-2 w-full bg-slate-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button onClick={fetchUsers} className="p-2 hover:bg-slate-100 rounded-full">
                <Users className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-sm uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Username / ID</th>
                    <th className="px-6 py-4">Nama & Role</th>
                    <th className="px-6 py-4">Password</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                      </td>
                    </tr>
                  ) : filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm text-blue-600 font-bold">{user.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{user.nama || 'Tanpa Nama'}</div>
                        <div className="text-xs px-2 py-0.5 rounded-full bg-slate-100 w-fit mt-1 capitalize">{user.role}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{user.password}</td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}