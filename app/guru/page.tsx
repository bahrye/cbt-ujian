'use client'
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function DashboardGuru() {
  const [soal, setSoal] = useState('');
  const [opsi, setOpsi] = useState(['', '', '', '']);
  const [jawabanBenar, setJawabanBenar] = useState('');

  const simpanSoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "bank_soal"), {
        pertanyaan: soal,
        opsi: opsi,
        jawabanBenar: jawabanBenar,
        createdAt: serverTimestamp()
      });
      alert("Soal berhasil disimpan!");
      setSoal('');
      setOpsi(['', '', '', '']);
    } catch (err) {
      alert("Gagal menyimpan soal.");
    }
  };

  const handleOpsiChange = (index: number, value: string) => {
    const newOpsi = [...opsi];
    newOpsi[index] = value;
    setOpsi(newOpsi);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Input Bank Soal</h1>
      <form onSubmit={simpanSoal} className="space-y-4">
        <textarea 
          placeholder="Tulis pertanyaan..." 
          className="w-full border p-3 rounded"
          value={soal}
          onChange={(e) => setSoal(e.target.value)}
          required
        />
        {opsi.map((item, index) => (
          <div key={index} className="flex gap-2">
            <span className="font-bold">{String.fromCharCode(65 + index)}.</span>
            <input 
              type="text" 
              placeholder={`Opsi ${index + 1}`}
              className="w-full border p-2 rounded"
              value={item}
              onChange={(e) => handleOpsiChange(index, e.target.value)}
              required
            />
          </div>
        ))}
        <select 
          className="w-full border p-2 rounded bg-gray-50"
          value={jawabanBenar}
          onChange={(e) => setJawabanBenar(e.target.value)}
          required
        >
          <option value="">Pilih Jawaban Benar</option>
          {opsi.map((item, index) => (
            <option key={index} value={item}>{item || `Opsi ${index + 1}`}</option>
          ))}
        </select>
        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded font-bold">
          Simpan ke Bank Soal
        </button>
      </form>
    </div>
  );
}