'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase'; // Mengambil db dan auth yang sudah ada
import { doc, setDoc, getDocs, collection, deleteDoc, query, orderBy } from 'firebase/firestore';
// Import untuk pendaftaran user baru tanpa mengganggu sesi admin
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { UserPlus, Trash2, Users, ShieldCheck, Search, Loader2, Mail, Lock, UserCircle } from 'lucide-react';

// Ambil konfigurasi dari file lib/firebase.js yang Anda miliki
const firebaseConfig = {
  apiKey: "AIzaSyAssFyf3tsDnisxlZqdJKBUBi7mOM_HLXM",
  authDomain: "aplikasiujianonline-5be47.firebaseapp.com",
  projectId: "aplikasiujianonline-5be47",
  storageBucket: "aplikasiujianonline-5be47.firebasestorage.app",
  messagingSenderId: "1008856297907",
  appId: "1:1008856297907:web:ec351d3aca4b924fb61bc6"
};

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'siswa',
    nama: ''
  });

  // Fungsi mengambil data user dari Firestore
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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const userDocId = formData.username.toLowerCase().trim();
    
    try {
      // Menggunakan instance sekunder agar Admin tidak ter-logout otomatis
      const secondaryApp = getApps().find(app => app.name === "Secondary") 
                          || initializeApp(firebaseConfig, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);

      // 1. Daftarkan di Firebase Authentication
      await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);

      // 2. Simpan di Firestore dengan ID = Username
      await setDoc(doc(db, "users", userDocId), {
        username: userDocId,
        nama: formData.nama,
        email: formData.email,
        password: formData.password, 
        role: formData.role,
        createdAt: new Date().toISOString()
      });

      alert(`Berhasil! Akun ${userDocId} sudah aktif.`);
      setFormData({ username: '', email: '', password: '', role: 'siswa', nama: '' });
      fetchUsers();
    } catch (error: any) {
      alert("Gagal: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Hapus data user ${id}?`)) {
      try {
        await deleteDoc(doc(db, "users", id));
        fetchUsers();
      } catch (error) {
        alert("Gagal menghapus.");
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.nama?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Dashboard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <ShieldCheck className="text-blue-600 w-8 h-8" /> Panel Manajemen User
            </h1>
            <p className="text-slate-500">Otomatisasi pendaftaran Auth & Firestore</p>
          </div>
          <div className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-200">
            <Users className="w-5 h-5" />
            <span className="font-bold">{users.length} Terdaftar</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Kolom Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-700">
                <UserPlus className="w-5 h-5 text-blue-500" /> Tambah Akun Baru
              </h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 ml-1 uppercase">Username</label>
                  <input 
                    type="text" placeholder="ID Siswa / Username" required
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 ml-1 uppercase">Nama Lengkap</label>
                  <input 
                    type="text" placeholder="Nama asli" required
                    value={formData.nama}
                    onChange={(e) => setFormData({...formData, nama: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 ml-1 uppercase">Email</label>
                  <input 
                    type="email" placeholder="email@sekolah.com" required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 ml-1 uppercase">Password</label>
                  <input 
                    type="text" placeholder="Min. 6 Karakter" required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 ml-1 uppercase">Role</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium"
                  >
                    <option value="siswa">Siswa</option>
                    <option value="guru">Guru</option>
                    <option value="pengawas">Pengawas</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 hover:bg-black text-white py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan & Daftarkan"}
                </button>
              </form>
            </div>
          </div>

          {/* Kolom Tabel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center bg-white sticky top-0 z-10">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" placeholder="Cari user..." 
                    className="pl-10 pr-4 py-2.5 w-full bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button onClick={fetchUsers} className="ml-3 p-2.5 hover:bg-slate-100 rounded-xl transition-colors">
                  <Loader2 className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="overflow-x-auto text-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Data User</th>
                      <th className="px-6 py-4">Akses Login</th>
                      <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan={3} className="text-center py-20 text-slate-300">Menyinkronkan data...</td></tr>
                    ) : filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold italic">
                              {user.nama?.charAt(0) || "U"}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{user.nama}</div>
                              <div className="text-[11px] text-blue-500 font-mono tracking-tighter">ID: {user.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 space-y-1">
                          <div className="flex items-center gap-2 text-slate-500"><Mail className="w-3 h-3" /> {user.email}</div>
                          <div className="flex items-center gap-2 text-slate-500"><Lock className="w-3 h-3" /> {user.password}</div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            user.role === 'admin' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                          }`}>{user.role}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
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
    </div>
  );
}