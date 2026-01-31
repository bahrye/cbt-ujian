'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDocs, collection, deleteDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  UserPlus, Trash2, Users, ShieldCheck, Search, Loader2, 
  Mail, Lock, UserCircle, FileUp, Download, Edit3, X 
} from 'lucide-react';
import * as XLSX from 'xlsx';

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
  const [editingUser, setEditingUser] = useState<any>(null); // State untuk Modal Edit
  
  const [formData, setFormData] = useState({
    username: '', nama: '', email: '', password: '', role: 'siswa'
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), orderBy("role", "asc"));
      const querySnapshot = await getDocs(q);
      const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  // --- FUNGSI DOWNLOAD TEMPLATE EXCEL ---
  const downloadTemplate = () => {
    const template = [
      { username: 'siswa001', nama: 'Budi Santoso', email: 'budi@sekolah.com', password: 'password123', role: 'siswa' },
      { username: 'guru001', nama: 'Siti Aminah', email: 'siti@sekolah.com', password: 'password123', role: 'guru' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template User");
    XLSX.writeFile(wb, "Template_User_CBT.xlsx");
  };

  // --- FUNGSI IMPORT EXCEL ---
  const handleImportExcel = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      setIsSubmitting(true);
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        const secondaryApp = getApps().find(app => app.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);

        for (const user of data) {
          const uID = user.username.toString().toLowerCase().trim();
          // Daftarkan Auth & Firestore
          try {
            await createUserWithEmailAndPassword(secondaryAuth, user.email, user.password.toString());
            await setDoc(doc(db, "users", uID), {
              username: uID, nama: user.nama, email: user.email,
              password: user.password.toString(), role: user.role,
              createdAt: new Date().toISOString()
            });
          } catch (err) { console.warn(`Gagal daftar ${uID}:`, err); }
        }
        alert("Proses Import Selesai!");
        fetchUsers();
      } catch (error) { alert("Format File Salah!"); } finally { setIsSubmitting(false); }
    };
    reader.readAsBinaryString(file);
  };

  // --- FUNGSI TAMBAH MANUAL ---
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const uID = formData.username.toLowerCase().trim();
    try {
      const secondaryApp = getApps().find(app => app.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);
      await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      await setDoc(doc(db, "users", uID), { ...formData, username: uID, createdAt: new Date().toISOString() });
      setFormData({ username: '', nama: '', email: '', password: '', role: 'siswa' });
      fetchUsers();
    } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
  };

  // --- FUNGSI UPDATE USER (EDIT) ---
  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      const userRef = doc(db, "users", editingUser.id);
      await updateDoc(userRef, {
        nama: editingUser.nama,
        password: editingUser.password,
        role: editingUser.role
      });
      alert("Data berhasil diperbarui!");
      setEditingUser(null);
      fetchUsers();
    } catch (error) { alert("Gagal update data."); } finally { setIsSubmitting(false); }
  };

  const filteredUsers = users.filter(u => u.id.toLowerCase().includes(searchTerm.toLowerCase()) || u.nama?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Tools */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-extrabold flex items-center gap-2 italic tracking-tighter"><ShieldCheck className="text-blue-600"/> ADMIN PANEL</h1>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadTemplate} className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all text-slate-600">
              <Download size={18}/> Template
            </button>
            <label className="flex items-center gap-2 bg-green-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition-all text-white cursor-pointer">
              <FileUp size={18}/> Import Excel
              <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
            </label>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form Tambah */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm h-fit">
            <h2 className="font-bold mb-4 flex items-center gap-2"><UserPlus size={20} className="text-blue-500"/> Akun Baru</h2>
            <form onSubmit={handleAddUser} className="space-y-3">
              <input placeholder="Username" required className="w-full p-3 bg-slate-50 border rounded-xl text-sm" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
              <input placeholder="Nama Lengkap" required className="w-full p-3 bg-slate-50 border rounded-xl text-sm" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} />
              <input type="email" placeholder="Email" required className="w-full p-3 bg-slate-50 border rounded-xl text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input placeholder="Password" required className="w-full p-3 bg-slate-50 border rounded-xl text-sm" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              <select className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                <option value="siswa">Siswa</option><option value="guru">Guru</option><option value="admin">Admin</option>
              </select>
              <button disabled={isSubmitting} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex justify-center">{isSubmitting ? <Loader2 className="animate-spin"/> : "Daftarkan"}</button>
            </form>
          </div>

          {/* Tabel User */}
          <div className="lg:col-span-2 bg-white rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center gap-2">
              <Search size={18} className="text-slate-400" />
              <input placeholder="Cari user..." className="w-full outline-none text-sm" onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                  <tr><th className="p-4">User</th><th className="p-4">Info</th><th className="p-4 text-center">Aksi</th></tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? <tr><td colSpan={3} className="p-10 text-center"><Loader2 className="animate-spin mx-auto"/></td></tr> : filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-all">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{user.nama}</div>
                        <div className="text-[10px] font-mono text-blue-500 italic uppercase">ID: {user.id}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-slate-500">Psw: {user.password}</div>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase w-fit ${user.role === 'admin' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{user.role}</div>
                      </td>
                      <td className="p-4 flex justify-center gap-2">
                        <button onClick={() => setEditingUser(user)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={18}/></button>
                        <button onClick={() => deleteDoc(doc(db, "users", user.id)).then(fetchUsers)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="font-bold text-lg">Edit User: {editingUser.id}</h3>
              <button onClick={() => setEditingUser(null)}><X size={20}/></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Nama Lengkap</label>
                <input className="w-full p-3 bg-slate-50 border rounded-xl" value={editingUser.nama} onChange={e => setEditingUser({...editingUser, nama: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Password</label>
                <input className="w-full p-3 bg-slate-50 border rounded-xl" value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Role</label>
                <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})}>
                  <option value="siswa">Siswa</option><option value="guru">Guru</option><option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button onClick={handleUpdateUser} disabled={isSubmitting} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 flex justify-center">
              {isSubmitting ? <Loader2 className="animate-spin"/> : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}