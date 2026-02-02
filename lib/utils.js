// Fungsi untuk membuat token yang berubah setiap 15 menit berdasarkan token dasar dari database
export const generateDynamicToken = (baseToken) => {
  if (!baseToken) return "";
  const now = new Date();
  // Menghitung interval 15 menit (15 * 60 * 1000 ms)
  const interval = Math.floor(now.getTime() / (15 * 60 * 1000));
  // Menggunakan btoa untuk encoding sederhana agar menghasilkan string alfanumerik
  const hash = btoa(`${baseToken}-${interval}`).substring(0, 6).toUpperCase();
  return hash;
};