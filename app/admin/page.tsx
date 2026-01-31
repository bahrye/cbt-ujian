'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; // Konfigurasi utama
import { doc, setDoc, getDocs, collection, deleteDoc, query, orderBy } from 'firebase/firestore';
// Import untuk Auth Sekunder agar Admin tidak logout saat mendaftarkan siswa
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { UserPlus, Trash2, Users, ShieldCheck, Search, Loader2, Mail, Lock, UserCircle } from 'lucide-react';

// === KONFIGURASI FIREBASE ===
// Salin data ini tepat seperti yang ada di file lib/firebase.js Anda
const firebaseConfig = {
  apiKey: "AIzaSy...", 
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "...",
  appId: "..."
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

  // Ambil data semua user dari Firestore
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

  // Handler Tambah User (Auth + Firestore)
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const userDocId = formData.username.toLowerCase().trim();
    
    try {
      // 1. Inisialisasi Auth Sekunder
      // Kita cek dulu apakah apps "Secondary" sudah ada untuk menghindari error inisialisasi ganda
      const secondaryApp = getApps().find(app => app.name === "Secondary") 
                          || initializeApp(firebaseConfig, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);

      // 2. Daftarkan ke Firebase Authentication
      await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);

      // 3. Simpan data ke Firestore dengan Document ID = Username
      await setDoc(doc(db, "users", userDocId), {
        username: userDocId,
        nama: formData.nama,
        email: formData.email,
        password: formData.password, // Disimpan agar admin bisa melihat jika siswa lupa
        role: formData.role,
        createdAt: new Date().toISOString()
      });

      alert(`Sukses! User ${userDocId} berhasil didaftarkan.`);
      setFormData({ username: '', email: '', password: '', role: 'siswa', nama: '' });
      fetchUsers();
    } catch (error: any) {
      console.error(error);
      alert("Gagal mendaftarkan user: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Hapus user ${id}? Catatan: Ini hanya menghapus data di Firestore, akun di Firebase Auth tetap ada.`)) {
      try {
        await deleteDoc(doc(db, "users", id));
        fetchUsers();
      } catch (error) {
        alert("Gagal menghapus data.");
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.nama?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Dashboard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShieldCheck className="text-blue-600 w-8 h-8" /> Control Panel Admin
            </h1>
            <p className="text-slate-500 mt-1">Kelola akses siswa, guru, dan pengawas ujian.</p>
          </div>
          <div className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 w-fit">
            <Users className="w-5 h-5" />
            <span className="font-semibold">{users.length} Total User</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Kolom Kiri: Form Tambah User */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" /> Registrasi Akun
              </h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-500 ml-1">Username / NIS</label>
                  <input 
                    type="text" placeholder="siswa001" required
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-500 ml-1">Nama Lengkap</label>
                  <input 
                    type="text" placeholder="Budi Santoso" required
                    value={formData.nama}
                    onChange={(e) => setFormData({...formData, nama: e.target.value})}
                    className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-500 ml-1">Email</label>
                  <input 
                    type="email" placeholder="budi@cbt.com" required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-500 ml-1">Password</label>
                  <input 
                    type="text" placeholder="Minimal 6 karakter" required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-500 ml-1">Role Akses</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Akun"}
                </button>
              </form>
            </div>
          </div>

          {/* Kolom Kanan: Daftar User */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" placeholder="Cari berdasarkan username atau nama..." 
                    className="pl-10 pr-4 py-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={fetchUsers} 
                  className="ml-2 p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                  title="Refresh Data"
                >
                  <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Informasi User</th>
                      <th className="px-6 py-4">Konten Login</th>
                      <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="text-center py-20 text-slate-400">Memuat data user...</td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-20 text-slate-400">Tidak ada user ditemukan.</td>
                      </tr>
                    ) : filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                              {user.nama?.charAt(0) || <UserCircle />}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{user.nama || 'User'}</div>
                              <div className="text-xs font-mono text-blue-500">ID: {user.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                              <Mail className="w-3 h-3" /> {user.email}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                              <Lock className="w-3 h-3" /> {user.password}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase w-fit mt-1 ${
                              user.role === 'admin' ? 'bg-red-100 text-red-600' : 
                              user.role === 'guru' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {user.role}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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