import React from 'react';
import { Employee, Document } from '../../types';
import { TrashIcon, SparklesIcon } from '../icons';
import LoadingSpinner from '../LoadingSpinner';

interface DocumentsTabProps {
    employee: Employee;
    documents: Document[];
    newDoc: { name: string; type: Document['type']; fileUrl: string };
    setNewDoc: (doc: { name: string; type: Document['type']; fileUrl: string }) => void;
    documentTypeOptions: Document['type'][];
    selectedFile: File | null;
    setSelectedFile: (file: File | null) => void;
    handleAddDocument: () => void;
    isUploadingDoc: boolean;
    handleDeleteDocument: (id: string) => void;
    handleGenerateDesc: () => void;
    isGenerating: boolean;
    generatedDesc: string;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({
    employee,
    documents,
    newDoc,
    setNewDoc,
    documentTypeOptions,
    selectedFile,
    setSelectedFile,
    handleAddDocument,
    isUploadingDoc,
    handleDeleteDocument,
    handleGenerateDesc,
    isGenerating,
    generatedDesc,
}) => {
    return (
        <div className="space-y-6">
            <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                <h3 className="font-semibold text-lg text-[#06736a]">Dokumen Karyawan</h3>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow">
                            <div className="flex-1">
                                <p className="font-medium text-base">{doc.name}</p>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-sm text-gray-500">{doc.type}</span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <a 
                                        href={doc.fileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                        Lihat Dokumen →
                                    </a>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                    Diunggah: {new Date(doc.uploadedAt).toLocaleDateString('id-ID')}
                                </p>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => handleDeleteDocument(doc.id)} 
                                className="ml-4 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus dokumen"
                            >
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                    
                    {documents.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-base">📄 Belum ada dokumen yang diunggah.</p>
                            <p className="text-sm mt-2">Gunakan form di bawah untuk menambahkan dokumen</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Document Form */}
            <div className="space-y-5 p-6 border rounded-lg bg-blue-50 border-blue-200">
                <h4 className="font-semibold text-base text-[#06736a]">➕ Tambah Dokumen Baru</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nama Dokumen *</label>
                        <input 
                            type="text" 
                            value={newDoc.name} 
                            onChange={e => setNewDoc({...newDoc, name: e.target.value})} 
                            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            placeholder="Contoh: Ijazah S1 Kedokteran"
                            title="Nama dokumen"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Dokumen *</label>
                        <select 
                            value={newDoc.type} 
                            onChange={e => setNewDoc({...newDoc, type: e.target.value as Document['type']})} 
                            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            title="Tipe dokumen"
                        >
                            {documentTypeOptions.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pilih File (PDF/JPG/PNG)</label>
                        <input 
                            type="file" 
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={e => setSelectedFile(e.target.files?.[0] || null)} 
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#06736a] file:text-white hover:file:bg-[#055f57] border border-gray-300 rounded-lg shadow-sm p-2"
                            title="Pilih file dari komputer"
                        />
                        {selectedFile && <p className="mt-1 text-xs text-[#06736a]">File siap diunggah: {selectedFile.name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Atau masukkan URL eksternal</label>
                        <input 
                            type="text" 
                            value={newDoc.fileUrl} 
                            onChange={e => setNewDoc({...newDoc, fileUrl: e.target.value})} 
                            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3 disabled:opacity-50 disabled:bg-gray-100"
                            placeholder="https://..."
                            title="URL file eksternal (opsional jika sudah memilih file)"
                            disabled={!!selectedFile}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <button 
                            type="button" 
                            onClick={handleAddDocument} 
                            disabled={isUploadingDoc}
                            className="w-full bg-[#06736a] text-white px-6 py-3 rounded-lg shadow-sm hover:bg-[#054f46] transition-colors font-medium disabled:opacity-70 flex justify-center items-center"
                        >
                            {isUploadingDoc ? 'Sedang Mengunggah...' : '➕ Tambah Dokumen'}
                        </button>
                    </div>
                </div>
            </div>

            {/* AI Job Description Generator */}
            <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                <h4 className="font-semibold text-base text-[#06736a]">✨ Generator Deskripsi Pekerjaan (AI)</h4>
                <p className="text-sm text-gray-600">Generate deskripsi pekerjaan otomatis menggunakan AI berdasarkan jabatan dan departemen</p>
                
                <button 
                    type="button" 
                    onClick={handleGenerateDesc} 
                    disabled={isGenerating || !employee.jabatan || !employee.departemen} 
                    className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isGenerating ? (
                        <LoadingSpinner size="small" text="" />
                    ) : (
                        <SparklesIcon className="h-5 w-5" />
                    )}
                    {isGenerating ? 'Membuat deskripsi...' : 'Generate Deskripsi Pekerjaan'}
                </button>

                {!employee.jabatan || !employee.departemen && (
                    <p className="text-xs text-orange-600">⚠️ Isi Jabatan dan Departemen terlebih dahulu (Tab Kepegawaian)</p>
                )}

                {isGenerating && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 p-3 bg-blue-50 rounded-lg">
                        <LoadingSpinner size="small" text="" />
                        <span>AI sedang membuat deskripsi pekerjaan...</span>
                    </div>
                )}

                {generatedDesc && (
                    <div className="mt-4 p-4 bg-white border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-sm text-green-800">✅ Deskripsi Berhasil Dibuat</h5>
                        </div>
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                            {generatedDesc}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentsTab;
