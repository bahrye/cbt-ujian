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
  kelas?: string;
}

export default function AdminPage() {
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
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

  // Fungsi navigasi menu agar sidebar HP otomatis tertutup setelah pilih menu
  const handleMenuClick = (name: string) => {
    setActiveMenu(name);
    setIsMobileOpen(false);
  };

  if (!authorized) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-x-hidden">
      
      {/* --- OVERLAY UNTUK MOBILE --- */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 bg-white border-r transition-all duration-300 transform
        ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarOpen ? 'lg:w-72' : 'lg:w-20'}
        flex flex-col h-full
      `}>
        <div className="p-6 flex items-center justify-between border-b mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200 shrink-0">
              <ShieldCheck size={24}/>
            </div>
            {(isSidebarOpen || isMobileOpen) && (
              <div className="overflow-hidden whitespace-nowrap animate-in fade-in duration-500">
                <h1 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">CBT Admin</h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">System Panel</p>
              </div>
            )}
          </div>
          {/* Tombol Close Sidebar Khusus Mobile */}
          <button onClick={() => setIsMobileOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-red-500">
            <X size={20}/>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => handleMenuClick(item.name)}
              className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all group ${
                activeMenu === item.name 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <div className={`${activeMenu === item.name ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`}>
                {item.icon}
              </div>
              {(isSidebarOpen || isMobileOpen) && <span className="text-sm font-bold tracking-tight">{item.name}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t">
          <button 
            onClick={() => auth.signOut().then(() => router.push('/login'))}
            className="w-full flex items-center gap-4 p-3.5 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-bold text-sm"
          >
            <LogOut size={20}/>
            {(isSidebarOpen || isMobileOpen) && <span>Keluar Sistem</span>}
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className={`
        flex-1 transition-all duration-300 min-h-screen
        ${isSidebarOpen ? 'lg:ml-72' : 'lg:ml-20'} 
        p-4 md:p-8
      `}>
        {/* Top Header */}
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-3xl border shadow-sm sticky top-4 z-20">
          <div className="flex items-center gap-4">
            {/* Burger Button untuk Mobile */}
            <button 
              onClick={() => setIsMobileOpen(true)} 
              className="lg:hidden p-2.5 bg-slate-50 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors"
            >
              <Menu size={22}/>
            </button>
            {/* Toggle Button untuk Desktop */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="hidden lg:block p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
            >
              <Menu size={24}/>
            </button>
            <div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest hidden sm:block">{activeMenu}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pl-4 border-l">
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status Login</p>
              <p className="text-xs font-bold text-slate-800">Administrator</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center font-bold text-blue-600 border border-blue-200 shadow-inner">AD</div>
          </div>
        </header>

        {/* Content Area */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
          {activeMenu === 'Dashboard' && <DashboardOverview />}
          {activeMenu === 'Kelola User' && <UserManagementSection />}
          {activeMenu !== 'Dashboard' && activeMenu !== 'Kelola User' && (
            <div className="bg-white p-12 md:p-20 rounded-[3rem] border border-dashed border-slate-300 text-center space-y-4">
              <div className="mx-auto w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                <Database size={32}/>
              </div>
              <h2 className="text-lg md:text-xl font-black text-slate-400 uppercase tracking-widest">Modul {activeMenu}</h2>
              <p className="text-xs md:text-sm text-slate-400 italic font-medium">Sedang dikembangkan untuk versi mobile...</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// --- SUB KOMPONEN: DASHBOARD OVERVIEW ---
function DashboardOverview() {
  const [statsData, setStatsData] = useState({
    siswa: 0,
    guru: 0,
    ujian: 0,
    soal: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchRealStats = async () => {
      setLoadingStats(true);
      try {
        // Ambil semua data user untuk dihitung secara lokal berdasarkan role
        // (Atau gunakan count() query jika koleksi sangat besar)
        const userSnap = await getDocs(collection(db, "users"));
        const allUsers = userSnap.docs.map(d => d.data());
        
        const countSiswa = allUsers.filter(u => u.role === 'siswa').length;
        const countGuru = allUsers.filter(u => u.role === 'guru').length;

        // Sementara untuk Ujian dan Soal kita siapkan tempatnya (koleksi belum dibuat)
        // const ujianSnap = await getDocs(collection(db, "ujian"));
        // const soalSnap = await getDocs(collection(db, "bank_soal"));

        setStatsData({
          siswa: countSiswa,
          guru: countGuru,
          ujian: 0, // Update jika koleksi 'ujian' sudah ada
          soal: 0   // Update jika koleksi 'soal' sudah ada
        });
      } catch (error) {
        console.error("Gagal mengambil statistik:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchRealStats();
  }, []);

  const stats = [
    { label: 'Total Siswa', value: statsData.siswa, icon: <Users />, color: 'blue' },
    { label: 'Total Guru', value: statsData.guru, icon: <UserPlus />, color: 'green' },
    { label: 'Ujian Aktif', value: statsData.ujian, icon: <ClipboardCheck />, color: 'orange' },
    { label: 'Bank Soal', value: statsData.soal, icon: <Database />, color: 'purple' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all group">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 
              ${item.color === 'blue' ? 'bg-blue-50 text-blue-600' : 
                item.color === 'green' ? 'bg-green-50 text-green-600' : 
                item.color === 'orange' ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'}`}>
              {item.icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
            {loadingStats ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-300 mt-2" />
            ) : (
              <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tighter">
                {String(item.value).padStart(2, '0')}
              </h3>
            )}
          </div>
        ))}
      </div>
      
      {/* Banner Informasi */}
      <div className="bg-blue-600 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
        <div className="relative z-10 max-w-lg">
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase leading-tight text-white">Sistem Ujian Online</h2>
          <p className="mt-4 text-blue-100 text-xs md:text-sm font-medium leading-relaxed">
            Data statistik di atas diambil langsung dari database Firebase secara real-time. 
            Pastikan data user sudah terdaftar untuk melihat perubahan angka.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-8 bg-white text-blue-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 transition-all active:scale-95"
          >
            Refresh Data <ChevronRight size={16}/>
          </button>
        </div>
        <ShieldCheck size={180} className="absolute -right-10 -bottom-10 text-blue-500/20 rotate-12 hidden sm:block" />
      </div>
    </div>
  );
}

// --- SUB KOMPONEN USER MANAGEMENT (Tetap Sama dengan sedikit perbaikan CSS mobile) ---
function UserManagementSection() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- STATE FILTER ---
  const [filterRole, setFilterRole] = useState('all');
  const [filterKelas, setFilterKelas] = useState('all');

  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    username: '', nama: '', email: '', password: '', role: 'siswa', kelas: '-'
  });

  // Daftar kelas statis (nantinya bisa diambil dari database)
  const daftarKelas = ['X-IPA-1', 'X-IPA-2', 'XI-IPS-1', 'XI-IPS-2', 'XII-IPA-1'];

  useEffect(() => { 
    fetchUsers(); 
  }, []);

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
      console.error("Gagal mengambil data user:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- LOGIKA FILTER MULTI-KRITERIA ---
  const filteredUsers = users.filter((u) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      u.nama?.toLowerCase().includes(search) ||
      u.id?.toLowerCase().includes(search) ||
      u.username?.toLowerCase().includes(search);
    
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesKelas = filterKelas === 'all' || u.kelas === filterKelas;

    return matchesSearch && matchesRole && matchesKelas;
  });

  const downloadTemplate = () => {
    const template = [
      { username: 'siswa001', nama: 'Siswa Contoh', email: 'siswa@cbt.com', password: 'password123', role: 'siswa', kelas: 'X-IPA-1' },
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
              username: uID, 
              nama: user.nama, 
              email: user.email,
              password: user.password.toString(), 
              role: user.role, 
              kelas: user.role === 'siswa' ? (user.kelas || '-') : '-',
              uid: res.user.uid
            });
            await setDoc(doc(db, "users_auth", res.user.uid), { role: user.role, username: uID });
          } catch (err) { console.warn("Gagal import baris:", err); }
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
      
      const payload = { 
        ...formData, 
        username: uID, 
        uid: res.user.uid,
        kelas: formData.role === 'siswa' ? formData.kelas : '-' 
      };

      await setDoc(doc(db, "users", uID), payload);
      await setDoc(doc(db, "users_auth", res.user.uid), { role: formData.role, username: uID });
      
      setFormData({ username: '', nama: '', email: '', password: '', role: 'siswa', kelas: '-' });
      fetchUsers();
      alert("Berhasil mendaftarkan akun!");
    } catch (error: any) { alert(error.message); } finally { setIsSubmitting(false); }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "users", editingUser.id), {
        nama: editingUser.nama,
        password: editingUser.password,
        role: editingUser.role,
        kelas: editingUser.role === 'siswa' ? editingUser.kelas : '-'
      });
      setEditingUser(null);
      fetchUsers();
      alert("Update Berhasil");
    } catch (error) { alert("Gagal Update"); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      {/* Tombol Aksi Atas */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
            <UserPlus size={24}/>
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tighter uppercase leading-none">Manajemen Akun</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic mt-1">4 Roles: Admin, Guru, Pengawas, Siswa</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={downloadTemplate} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 px-4 py-3 rounded-xl text-[10px] font-bold hover:bg-slate-200 transition-colors uppercase">
            <Download size={16}/> Template
          </button>
          <label className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 px-4 py-3 rounded-xl text-[10px] font-bold text-white cursor-pointer hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest">
            <FileUp size={16}/> Import
            <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Registrasi Manual */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm h-fit space-y-4">
          <h2 className="font-bold text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest italic">
            <UserPlus size={18} className="text-blue-500"/> Registrasi Manual
          </h2>
          <form onSubmit={handleAddUser} className="space-y-3">
            <input placeholder="Username (ID)" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500 font-medium text-slate-700" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            <input placeholder="Nama Lengkap" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500 font-medium text-slate-700" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} />
            
            <div className="grid grid-cols-2 gap-2">
              <select className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none text-slate-700" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                <option value="siswa">Siswa</option>
                <option value="guru">Guru</option>
                <option value="pengawas">Pengawas</option>
                <option value="admin">Admin</option>
              </select>
              {formData.role === 'siswa' && (
                <select className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none text-slate-700 animate-in fade-in zoom-in" value={formData.kelas} onChange={e => setFormData({...formData, kelas: e.target.value})}>
                  <option value="-">Pilih Kelas</option>
                  {daftarKelas.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              )}
            </div>

            <input type="email" placeholder="Email" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500 font-medium text-slate-700" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <input placeholder="Password" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-blue-500 font-medium text-slate-700" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            
            <button disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50 flex justify-center">
              {isSubmitting ? <Loader2 className="animate-spin"/> : "Daftarkan Akun"}
            </button>
          </form>
        </div>

        {/* Tabel Data & Filter */}
        <div className="lg:col-span-2 bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
          {/* Bar Filter */}
          <div className="p-4 border-b bg-slate-50/50 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                placeholder="Cari nama atau ID..." 
                className="bg-white w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 outline-none text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-100" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
            <div className="flex gap-2">
              <select className="bg-white px-4 py-3 rounded-2xl border border-slate-100 text-xs font-bold outline-none text-slate-700" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                <option value="all">Semua Role</option>
                <option value="siswa">Siswa</option>
                <option value="guru">Guru</option>
                <option value="pengawas">Pengawas</option>
                <option value="admin">Admin</option>
              </select>
              {filterRole === 'siswa' && (
                <select className="bg-white px-4 py-3 rounded-2xl border border-slate-100 text-xs font-bold outline-none text-slate-700 animate-in slide-in-from-right-2" value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)}>
                  <option value="all">Semua Kelas</option>
                  {daftarKelas.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-white text-slate-400 font-black uppercase text-[9px] tracking-widest border-b">
                <tr>
                  <th className="p-6">Informasi Akun</th>
                  <th className="p-6 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {loading ? (
                  <tr><td colSpan={2} className="p-16 text-center text-slate-400 font-bold italic">Memuat data...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={2} className="p-16 text-center text-slate-400 font-bold">Data tidak ditemukan.</td></tr>
                ) : filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50/40 transition-all group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase shadow-inner italic">
                          {user.nama?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-slate-800 leading-tight">{user.nama}</div>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[9px] font-mono font-bold text-blue-500 uppercase">ID: {user.id}</span>
                            {user.role === 'siswa' && (
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">• Kelas: {user.kelas || '-'}</span>
                            )}
                          </div>
                          <div className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase w-fit mt-2 shadow-sm ${
                            user.role === 'admin' ? 'bg-orange-100 text-orange-600' : 
                            user.role === 'guru' ? 'bg-green-100 text-green-600' : 
                            user.role === 'pengawas' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                          }`}>{user.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => setEditingUser(user)} className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm border border-blue-100" title="Edit">
                          <Edit3 size={16}/>
                        </button>
                        <button onClick={() => { if(confirm('Hapus pengguna?')) deleteDoc(doc(db, "users", user.id)).then(fetchUsers) }} className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm border border-red-100" title="Hapus">
                          <Trash2 size={16}/>
                        </button>
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
        <div className="fixed inset-0 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100] backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[3rem] p-8 md:p-10 space-y-6 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in duration-300">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-black text-xl text-slate-800 uppercase tracking-tighter">Edit Akun</h3>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Update Data Siswa/Guru/Pengawas</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"><X size={20}/></button>
            </div>
            <div className="space-y-4">
               <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700" value={editingUser.nama} onChange={e => setEditingUser({...editingUser, nama: e.target.value})} placeholder="Nama Lengkap" />
               <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700" value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} placeholder="Password Baru" />
               <div className="grid grid-cols-2 gap-2">
                 <select className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-700 outline-none" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})}>
                    <option value="siswa">Siswa</option>
                    <option value="guru">Guru</option>
                    <option value="pengawas">Pengawas</option>
                    <option value="admin">Admin</option>
                  </select>
                  {editingUser.role === 'siswa' && (
                    <select className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-700 outline-none" value={editingUser.kelas} onChange={e => setEditingUser({...editingUser, kelas: e.target.value})}>
                      <option value="-">Tanpa Kelas</option>
                      {daftarKelas.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  )}
               </div>
            </div>
            <button onClick={handleUpdateUser} disabled={isSubmitting} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 tracking-widest uppercase text-[10px]">
              {isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}