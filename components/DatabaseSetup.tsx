import React, { useState } from 'react';

const DatabaseSetup: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const getSetupSql = async () => {
    const response = await fetch('/database-setup.sql');
    if (!response.ok) {
      throw new Error('Gagal membaca file database-setup.sql');
    }
    return response.text();
  };

  const handleDownloadSetupScript = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const sqlScript = await getSetupSql();
      const blob = new Blob([sqlScript], { type: 'text/sql;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'database-setup.sql';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setResult({
        success: true,
        message: 'Script SQL berhasil diunduh. Jalankan file ini di Supabase SQL Editor, lalu refresh aplikasi.'
      });
    } catch (error: any) {
      console.error('Error downloading setup SQL:', error);
      setResult({
        success: false,
        message: `Gagal menyiapkan script setup: ${error.message}. Silakan buka file database-setup.sql langsung dari proyek.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySetupScript = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const sqlScript = await getSetupSql();
      if (!navigator.clipboard) {
        throw new Error('Clipboard tidak tersedia di browser ini');
      }

      await navigator.clipboard.writeText(sqlScript);
      setResult({
        success: true,
        message: 'Isi database-setup.sql berhasil disalin. Tempelkan ke Supabase SQL Editor lalu jalankan.'
      });
    } catch (error: any) {
      console.error('Error copying setup SQL:', error);
      setResult({
        success: false,
        message: `Gagal menyalin script setup: ${error.message}. Silakan copy manual dari file database-setup.sql.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Setup Database</h2>
      
      <div className="mb-4">
        <p className="text-gray-700 mb-2">
          Tabel yang diperlukan belum dibuat di database Supabase Anda. 
          Gunakan tombol di bawah untuk menyiapkan script SQL, lalu jalankan secara manual di SQL Editor.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Catatan: Anda harus memiliki akses admin ke database Supabase.
        </p>
      </div>
      
      <div className="flex flex-col space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadSetupScript}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Sedang Memproses...' : 'Download Script SQL'}
          </button>
          <button
            onClick={handleCopySetupScript}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-600 hover:bg-slate-700'
            }`}
          >
            {isLoading ? 'Sedang Memproses...' : 'Salin Script SQL'}
          </button>
        </div>
        
        <div className="text-sm">
          <p>Atau ikuti langkah-langkah manual:</p>
          <ol className="list-decimal ml-5 mt-2 space-y-1">
            <li>Buka dashboard Supabase Anda</li>
            <li>Buka tab SQL Editor</li>
            <li>Salin isi file <code>database-setup.sql</code> dari proyek ini</li>
            <li>Tempel dan jalankan di SQL Editor</li>
            <li>Refresh aplikasi ini</li>
          </ol>
        </div>
      </div>
      
      {result && (
        <div className={`mt-4 p-3 rounded-md ${
          result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {result.message}
        </div>
      )}
    </div>
  );
};

export default DatabaseSetup;