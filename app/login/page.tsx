'use client'
import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setIsLoading(true);
    try {
      // 1. Ambil email berdasarkan username di Firestore
      const userRef = doc(db, "users", username.toLowerCase().trim());
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        toast.error("Username tidak terdaftar!"); // Ganti alert
        setIsLoading(false);
        return;
      }

      const userData = userSnap.data();
      
      // 2. Login ke Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
      const user = userCredential.user;

      // 3. Arahkan berdasarkan role yang ada di Firestore
      const role = userData.role;
      if (role === 'admin') router.push('/admin');
      else if (role === 'guru') router.push('/guru');
      else if (role === 'pengawas') router.push('/pengawas');
      else router.push('/siswa');
      
    } catch (error: any) {
      toast.error("Login Gagal! Periksa kembali akun Anda."); // Ganti alert
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 italic">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 space-y-6 border border-slate-100">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-blue-600 tracking-tighter uppercase">CBT LOGIN</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Masukkan Akun ID Anda</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
              <input 
                type="text" placeholder="ID Pengguna" required
                value={username} onChange={(e) => setUsername(e.target.value)} 
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all font-bold text-slate-700" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
              <input 
                type={showPassword ? "text" : "password"} placeholder="••••••••" required
                value={password} onChange={(e) => setPassword(e.target.value)} 
                className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all font-bold text-slate-700" 
              />
              <button 
                type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 uppercase text-sm tracking-widest"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Masuk Sistem"}
          </button>
        </form>
      </div>
    </div>
  );
}