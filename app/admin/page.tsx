'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
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
  FileUp, Download, Edit3, X, LayoutDashboard, BookOpen, 
  School, Database, ClipboardCheck, FileText, BarChart3, 
  LogOut, Menu, ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Konfigurasi Firebase untuk Secondary App (Keperluan Auth Admin)
const firebaseConfig = {
  apiKey: "AIzaSyAssFyf3tsDnisxlZqdJKBUBi7mOM_HLXM",
  authDomain: "aplikasiujianonline-5be47.firebaseapp.com",
  projectId: "aplikasiujianonline-5be47",
  storageBucket: "aplikasiujianonline-5be47.firebasestorage.app",
  messagingSenderId: "1008856297907",
  appId: "1:1008856297907:web:ec351d3aca4b924fb61bc6"
};

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
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20}/> },
    { name: 'Kelola User', icon: <Users size={20}/> },
    { name: 'Kelola Mapel', icon: <BookOpen size={20}/> },
    { name: 'Kelola Kelas', icon: <School size={20}/> },
    { name: 'Bank Soal', icon: <Database size={20}/> },
    { name: 'Kelola Ujian', icon: <ClipboardCheck size={20}/> },
    { name: 'Kelola Tata Tertib Ujian', icon: <FileText size={20}/> },
    { name: 'Hasil Ujian', icon: <BarChart3 size={20}/> },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users_auth", user.uid));
          const userData = userDoc.data();
          if (userData?.role === 'admin') {
            setAuthorized(true);
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

  if (!authorized) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* --- SIDEBAR --- */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-white border-r transition-all duration-300 flex flex-col fixed h-full z-20`}>
        <div className="p-6 flex items-center gap-3 border-b mb-4">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
            <ShieldCheck size={24}/>
          </div>
          {isSidebarOpen && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">CBT Admin</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">System Panel</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveMenu(item.name)}
              className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all group ${
                activeMenu === item.name 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <div className={`${activeMenu === item.name ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`}>
                {item.icon}
              </div>
              {isSidebarOpen && <span className="text-sm font-bold tracking-tight">{item.name}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t">
          <button 
            onClick={() => auth.signOut().then(() => router.push('/login'))}
            className="w-full flex items-center gap-4 p-3.5 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-bold text-sm"
          >
            <LogOut size={20}/>
            {isSidebarOpen && <span>Keluar Sistem</span>}
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-72' : 'ml-20'} p-4 md:p-8`}>
        {/* Top Header */}
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-3xl border shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors">
              <Menu size={24}/>
            </button>
            <div className="hidden sm:block">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{activeMenu}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pl-4 border-l">
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Selamat Datang,</p>
              <p className="text-xs font-bold text-slate-800">Administrator</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center font-bold text-blue-600 border border-blue-200 shadow-inner">AD</div>
          </div>
        </header>

        {/* Content Area */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeMenu === 'Dashboard' && <DashboardOverview />}
          {activeMenu === 'Kelola User' && <UserManagementSection />}
          {activeMenu !== 'Dashboard' && activeMenu !== 'Kelola User' && (
            <div className="bg-white p-20 rounded-[3rem] border border-dashed border-slate-300 text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                <Database size={40}/>
              </div>
              <h2 className="text-xl font-black text-slate-400 uppercase tracking-widest">Modul {activeMenu}</h2>
              <p className="text-sm text-slate-400 italic font-medium">Fitur ini sedang dalam tahap integrasi database...</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// --- SUB KOMPONEN: DASHBOARD OVERVIEW ---
function DashboardOverview() {
  const stats = [
    { label: 'Total Siswa', value: '128', icon: <Users />, color: 'blue' },
    { label: 'Total Guru', value: '14', icon: <UserPlus />, color: 'green' },
    { label: 'Ujian Aktif', value: '02', icon: <ClipboardCheck />, color: 'orange' },
    { label: 'Bank Soal', value: '542', icon: <Database />, color: 'purple' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all group">
            <div className={`w-12 h-12 rounded-2xl bg-${item.color}-50 text-${item.color}-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              {item.icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tighter">{item.value}</h3>
          </div>
        ))}
      </div>
      
      <div className="bg-blue-600 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
        <div className="relative z-10 max-w-lg">
          <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">Sistem Ujian Online</h2>
          <p className="mt-4 text-blue-100 text-sm font-medium leading-relaxed">Selamat datang di dashboard kontrol utama. Di sini Anda dapat memantau aktivitas ujian, mengelola data pengguna, dan mengatur jadwal ujian secara real-time.</p>
          <button className="mt-8 bg-white text-blue-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 transition-all">
            Mulai Pengaturan <ChevronRight size={16}/>
          </button>
        </div>
        <ShieldCheck size={200} className="absolute -right-10 -bottom-10 text-blue-500/20 rotate-12" />
      </div>
    </div>
  );
}

// --- SUB KOMPONEN: USER MANAGEMENT ---
function UserManagementSection() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    username: '', nama: '', email: '', password: '', role: 'siswa'
  });

  useEffect(() => { fetchUsers(); }, []);

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
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
            <UserPlus size={24}/>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase">Manajemen Akun</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">User & Access Control</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={downloadTemplate} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 px-4 py-3 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">
            <Download size={16}/> Template
          </button>
          <label className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 px-4 py-3 rounded-xl text-xs font-bold text-white cursor-pointer hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
            <FileUp size={16}/> Import Excel
            <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
          </label>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border shadow-sm h-fit space-y-4">
          <h2 className="font-bold text-slate-700 flex items-center gap-2"><UserPlus size={18} className="text-blue-500"/> Registrasi Manual</h2>
          <form onSubmit={handleAddUser} className="space-y-3">
            <input placeholder="Username (ID)" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-medium" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            <input placeholder="Nama Lengkap" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-medium" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} />
            <input type="email" placeholder="Email" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-medium" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <input placeholder="Password" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-medium" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="siswa">Siswa</option>
              <option value="guru">Guru</option>
              <option value="pengawas">Pengawas</option>
              <option value="admin">Admin</option>
            </select>
            <button disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all flex justify-center shadow-lg active:scale-95 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="animate-spin"/> : "Daftarkan Akun"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-slate-50/50 flex items-center gap-3">
            <Search size={20} className="text-slate-400 ml-2" />
            <input 
              placeholder="Cari nama atau username..." 
              className="bg-transparent w-full outline-none text-sm font-bold text-slate-700" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                <tr>
                  <th className="p-6">Informasi Akun</th>
                  <th className="p-6 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={2} className="p-20 text-center text-slate-400 font-bold italic">Menghubungkan ke database...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={2} className="p-20 text-center text-slate-400 font-bold">Data pengguna tidak ditemukan.</td></tr>
                ) : filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50/40 transition-all group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase shadow-inner">{user.nama?.charAt(0)}</div>
                        <div>
                          <div className="font-black text-slate-800 leading-tight">{user.nama}</div>
                          <div className="text-[10px] font-mono font-bold text-blue-500 uppercase tracking-tighter mt-1 italic">ID: {user.id} • PW: {user.password}</div>
                          <div className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase w-fit mt-2 shadow-sm ${
                            user.role === 'admin' ? 'bg-orange-100 text-orange-600' : 
                            user.role === 'guru' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                          }`}>{user.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                        <button onClick={() => setEditingUser(user)} className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl transition-all shadow-sm" title="Edit"><Edit3 size={18}/></button>
                        <button onClick={() => { if(confirm('Hapus pengguna ini?')) deleteDoc(doc(db, "users", user.id)).then(fetchUsers) }} className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm" title="Hapus"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL EDIT */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-black text-2xl text-slate-800 uppercase tracking-tighter">Edit Akun</h3>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Sistem Pembaruan Data</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"><X size={20}/></button>
            </div>
            <div className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nama Lengkap</label>
                 <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white font-bold transition-all" value={editingUser.nama} onChange={e => setEditingUser({...editingUser, nama: e.target.value})} />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Password Baru</label>
                 <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white font-bold transition-all" value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Role Akses</label>
                 <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})}>
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                  <option value="pengawas">Pengawas</option>
                  <option value="admin">Admin</option>
                </select>
               </div>
            </div>
            <button onClick={handleUpdateUser} disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-xl shadow-blue-200 flex justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 tracking-widest uppercase text-xs">
              {isSubmitting ? <Loader2 className="animate-spin"/> : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}