import React from 'react';
import { Employee } from '../../types.ts';

interface DocumentTabProps {
    employee: Employee;
}

const DocumentTab: React.FC<DocumentTabProps> = ({ employee }) => (
    <div>
        <h4 className="font-semibold text-primary mb-2 text-lg">Dokumen Terlampir</h4>
        {employee.documents && employee.documents.length > 0 ? (
            <ul className="space-y-3">
                {employee.documents.map(doc => (
                    <li key={doc.id} className="text-sm p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-gray-800">{doc.name}</p>
                            <p className="text-gray-500">Tipe: {doc.type} | Diunggah: {new Date(doc.uploadedAt).toLocaleDateString('id-ID')}</p>
                        </div>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                            Lihat Dokumen
                        </a>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-sm text-gray-500 mt-4">Tidak ada dokumen yang dilampirkan.</p>
        )}
    </div>
);

export default DocumentTab;
