'use client'
import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, User, Loader2 } from 'lucide-react';

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
      // 1. Ambil dokumen user berdasarkan Username (Document ID)
      const userRef = doc(db, "users", username.toLowerCase().trim());
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error("Username tidak terdaftar!");
      }

      const userData = userSnap.data();
      
      // 2. Login menggunakan Email yang tersimpan di dokumen tersebut
      const userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
      const user = userCredential.user;

      // 3. Validasi ulang Role untuk pengalihan halaman
      const role = userData.role;

      if (role === 'admin') router.push('/admin');
      else if (role === 'guru') router.push('/guru');
      else if (role === 'pengawas') router.push('/pengawas');
      else router.push('/siswa');
      
    } catch (error: any) {
      console.error(error);
      alert("Login Gagal! Periksa kembali Username dan Password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-slate-100">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CBT Ujian</h1>
          <p className="text-slate-500 text-sm">Masuk dengan Username Anda</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Masukkan username" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)} 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900" 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}