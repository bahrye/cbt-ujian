'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase'; //
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  doc, setDoc, getDocs, collection, deleteDoc, 
  query, orderBy, updateDoc, getDoc 
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { 
  UserPlus, Trash2, Users, ShieldCheck, Search, Loader2, 
  Mail, Lock, UserCircle, FileUp, Download, Edit3, X 
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Konfigurasi sesuai dengan lib/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyAssFyf3tsDnisxlZqdJKBUBi7mOM_HLXM",
  authDomain: "aplikasiujianonline-5be47.firebaseapp.com",
  projectId: "aplikasiujianonline-5be47",
  storageBucket: "aplikasiujianonline-5be47.firebasestorage.app",
  messagingSenderId: "1008856297907",
  appId: "1:1008856297907:web:ec351d3aca4b924fb61bc6"
};

// Definisi Interface untuk menghindari "Problem" tipe data di VSC
interface UserData {
  id: string;
  username: string;
  nama: string;
  email: string;
  password?: string;
  role: string;
  uid?: string;
}

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: '', nama: '', email: '', password: '', role: 'siswa'
  });

  // --- PROTEKSI HALAMAN ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users_auth", user.uid));
          const userData = userDoc.data();
          if (userData?.role === 'admin') {
            setAuthorized(true);
            fetchUsers();
          } else {
            router.push('/login');
          }
        } catch (error) {
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), orderBy("role", "asc"));
      const querySnapshot = await getDocs(q);
      const userList = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as UserData));
      setUsers(userList);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIKA FILTERED USERS (PERBAIKAN PROBLEM VSC) ---
  const filteredUsers = users.filter((u) => {
    const search = searchTerm.toLowerCase();
    return (
      u.id?.toLowerCase().includes(search) || 
      u.nama?.toLowerCase().includes(search) ||
      u.username?.toLowerCase().includes(search)
    );
  });

  const downloadTemplate = () => {
    const template = [
      { username: 'siswa001', nama: 'Siswa Contoh', email: 'siswa@cbt.com', password: 'password123', role: 'siswa' },
      { username: 'guru001', nama: 'Guru Contoh', email: 'guru@cbt.com', password: 'password123', role: 'guru' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DataUser");
    XLSX.writeFile(wb, "Template_User_CBT.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      setIsSubmitting(true);
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const secApp = getApps().find(a => a.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");
        const secAuth = getAuth(secApp);

        for (const user of data) {
          const uID = user.username.toString().toLowerCase().trim();
          try {
            const res = await createUserWithEmailAndPassword(secAuth, user.email, user.password.toString());
            await setDoc(doc(db, "users", uID), {
              username: uID, nama: user.nama, email: user.email,
              password: user.password.toString(), role: user.role, uid: res.user.uid
            });
            await setDoc(doc(db, "users_auth", res.user.uid), { role: user.role, username: uID });
          } catch (err) { console.warn(err); }
        }
        alert("Import Selesai!");
        fetchUsers();
      } catch (error) { alert("File tidak valid"); } finally { setIsSubmitting(false); }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const uID = formData.username.toLowerCase().trim();
    try {
      const secApp = getApps().find(a => a.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");
      const secAuth = getAuth(secApp);
      const res = await createUserWithEmailAndPassword(secAuth, formData.email, formData.password);
      
      await setDoc(doc(db, "users", uID), { ...formData, username: uID, uid: res.user.uid });
      await setDoc(doc(db, "users_auth", res.user.uid), { role: formData.role, username: uID });
      
      setFormData({ username: '', nama: '', email: '', password: '', role: 'siswa' });
      fetchUsers();
      alert("Berhasil!");
    } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "users", editingUser.id), {
        nama: editingUser.nama,
        password: editingUser.password,
        role: editingUser.role
      });
      setEditingUser(null);
      fetchUsers();
      alert("Update Berhasil");
    } catch (error) { alert("Gagal Update"); } finally { setIsSubmitting(false); }
  };

  if (!authorized) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl text-white">
              <ShieldCheck size={24}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">CBT Admin</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Management Dashboard</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={downloadTemplate} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-200">
              <Download size={16}/> Template
            </button>
            <label className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 px-4 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer hover:bg-blue-700 transition-all">
              <FileUp size={16}/> Import Excel
              <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
            </label>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Kolom Form */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm h-fit space-y-4">
            <h2 className="font-bold text-slate-700 flex items-center gap-2"><UserPlus size={18} className="text-blue-500"/> Registrasi User</h2>
            <form onSubmit={handleAddUser} className="space-y-3">
              <input placeholder="Username" required className="w-full p-3 bg-slate-50 border rounded-xl text-sm outline-none focus:border-blue-500" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
              <input placeholder="Nama Lengkap" required className="w-full p-3 bg-slate-50 border rounded-xl text-sm outline-none focus:border-blue-500" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} />
              <input type="email" placeholder="Email" required className="w-full p-3 bg-slate-50 border rounded-xl text-sm outline-none focus:border-blue-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input placeholder="Password" required className="w-full p-3 bg-slate-50 border rounded-xl text-sm outline-none focus:border-blue-500" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              <select className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                <option value="siswa">Siswa</option>
                <option value="guru">Guru</option>
                <option value="pengawas">Pengawas</option>
                <option value="admin">Admin</option>
              </select>
              <button disabled={isSubmitting} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-black transition-all flex justify-center shadow-lg active:scale-95">
                {isSubmitting ? <Loader2 className="animate-spin"/> : "Daftarkan Akun"}
              </button>
            </form>
          </div>

          {/* Kolom Tabel */}
          <div className="lg:col-span-2 bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-slate-50/50 flex items-center gap-3">
              <Search size={20} className="text-slate-400 ml-2" />
              <input 
                placeholder="Cari nama atau username..." 
                className="bg-transparent w-full outline-none text-sm font-medium" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
            <div className="overflow-x-auto text-sm">
              <table className="w-full text-left">
                <thead className="bg-white text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b">
                  <tr>
                    <th className="p-4">Informasi Akun</th>
                    <th className="p-4 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={2} className="p-10 text-center text-slate-400 italic">Sinkronisasi data...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={2} className="p-10 text-center text-slate-400">Data tidak ditemukan.</td></tr>
                  ) : filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-blue-50/40 transition-all group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 uppercase">{user.nama?.charAt(0)}</div>
                          <div>
                            <div className="font-bold text-slate-800">{user.nama}</div>
                            <div className="text-[10px] font-mono text-blue-500 uppercase tracking-tighter">ID: {user.id} | Psw: {user.password}</div>
                            <div className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase w-fit mt-1 shadow-sm ${
                              user.role === 'admin' ? 'bg-orange-100 text-orange-600' : 
                              user.role === 'guru' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                            }`}>{user.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => setEditingUser(user)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl" title="Edit"><Edit3 size={18}/></button>
                          <button onClick={() => { if(confirm('Hapus?')) deleteDoc(doc(db, "users", user.id)).then(fetchUsers) }} className="p-2 text-red-500 hover:bg-red-100 rounded-xl" title="Hapus"><Trash2 size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL EDIT */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="font-black text-xl text-slate-800 uppercase tracking-tighter">Edit Akun</h3>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Username: {editingUser.id}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><X size={20}/></button>
            </div>
            <div className="space-y-4 text-sm font-semibold">
              <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-blue-500 transition-all" value={editingUser.nama} onChange={e => setEditingUser({...editingUser, nama: e.target.value})} placeholder="Nama Lengkap" />
              <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-blue-500 transition-all" value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} placeholder="Password" />
              <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})}>
                <option value="siswa">Siswa</option>
                <option value="guru">Guru</option>
                <option value="pengawas">Pengawas</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button onClick={handleUpdateUser} disabled={isSubmitting} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 flex justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95">
              {isSubmitting ? <Loader2 className="animate-spin"/> : "SIMPAN PERUBAHAN"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}