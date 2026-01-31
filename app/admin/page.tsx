'use client'
export default function AdminDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Dashboard Admin</h1>
      <p className="mt-2 text-gray-600">Selamat datang, Anda login sebagai Admin.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="p-6 bg-blue-100 rounded-lg shadow">
          <h2 className="font-bold">Kelola User</h2>
          <p>Tambah Guru, Siswa, & Pengawas</p>
        </div>
        <div className="p-6 bg-green-100 rounded-lg shadow">
          <h2 className="font-bold">Sesi Ujian</h2>
          <p>Atur Jadwal & Nama Ujian</p>
        </div>
      </div>
    </div>
  );
}