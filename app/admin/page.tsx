'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { 
  collection, 
  setDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc 
} from 'firebase/firestore';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('siswa');
  const [loading, setLoading] = useState(false);

  // 1. Ambil data user secara real-time untuk tabel
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fungsi Tambah User (Auth + Firestore)
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return alert("Password minimal 6 karakter!");
    
    setLoading(true);
    try {
      // Buat akun di Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Simpan data tambahan ke Firestore dengan ID yang sama (UID)
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        nama: nama,
        email: email,
        role: role,
        createdAt: new Date()
      });

      alert(`Sukses! Akun ${role} untuk ${nama} berhasil dibuat.`);
      
      // Reset Form
      setNama('');
      setEmail('');
      setPassword('');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        alert("Email sudah terdaftar!");
      } else {
        alert("Terjadi kesalahan: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Fungsi Hapus User
  const handleDeleteUser = async (id: string) => {
    if (confirm("Hapus user ini dari database? (Catatan: Akun auth perlu dihapus manual di Firebase Console)")) {
      try {
        await deleteDoc(doc(db, "users", id));
      } catch (error) {
        alert("Gagal menghapus data.");
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">Manajemen User & Hak Akses CBT</p>
          </div>
          <button onClick={handleLogout} className="text-red-600 font-semibold hover:underline">
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FORM INPUT */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-6 text-blue-700">Pendaftaran Akun</h2>
            <form onSubmit={handleAddUser} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Nama Lengkap</label>
                <input 
                  type="text" required value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Nama Pengguna"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Alamat Email</label>
                <input 
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="email@sekolah.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Password</label>
                <input 
                  type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Min. 6 Karakter"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Role / Jabatan</label>
                <select 
                  value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none"
                >
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                  <option value="pengawas">Pengawas</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button 
                type="submit" disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg"
              >
                {loading ? 'Sedang Memproses...' : 'Daftarkan Sekarang'}
              </button>
            </form>
          </div>

          {/* TABEL LIST */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800">Daftar Akun Terdaftar</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-400 text-xs uppercase border-b border-gray-50">
                    <th className="p-5">Informasi User</th>
                    <th className="p-5 text-center">Role</th>
                    <th className="p-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-5">
                        <div className="font-bold text-gray-800">{u.nama}</div>
                        <div className="text-sm text-gray-400">{u.email}</div>
                      </td>
                      <td className="p-5 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          u.role === 'guru' ? 'bg-amber-100 text-amber-700' :
                          u.role === 'pengawas' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-red-400 hover:text-red-600 text-sm font-bold"
                        >
                          Hapus
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