
import React, { useState } from 'react';
import { Employee } from '../types.ts';
import ChangePassword from './ChangePassword.tsx';

interface DashboardProps {
    employees: Employee[];
    currentUser?: Employee;
    onNavigate?: (view: 'ess', tab?: 'overview' | 'attendance') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onNavigate }) => {
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const InfoCard: React.FC<{ title: string; value: string | number, icon: React.ReactNode, color?: string }> = ({ title, value, icon, color = 'text-[#06736a]' }) => (
        <div className="bg-white p-6 rounded-xl shadow-md flex items-center gap-4">
            <div className="text-4xl">{icon}</div>
            <div>
                <h3 className="text-sm font-medium text-gray-500">{title}</h3>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
        </div>
    );

    const QuickActionCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onClick?: () => void }> = ({ title, description, icon, onClick }) => (
        <button
            onClick={onClick}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left w-full"
        >
            <div className="flex items-start gap-4">
                <div className="text-3xl">{icon}</div>
                <div>
                    <h3 className="text-lg font-semibold text-[#06736a] mb-1">{title}</h3>
                    <p className="text-sm text-gray-600">{description}</p>
                </div>
            </div>
        </button>
    );

    if (!currentUser) {
        return (
            <div className="bg-[#e6f3f2] p-4 sm:p-6 rounded-xl mb-6">
                <div className="text-center py-12 text-gray-500">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const calculateWorkDuration = () => {
        const hireDate = new Date(currentUser.hireDate);
        const now = new Date();
        const years = now.getFullYear() - hireDate.getFullYear();
        const months = now.getMonth() - hireDate.getMonth();
        
        if (months < 0) {
            return `${years - 1} tahun ${12 + months} bulan`;
        }
        return years > 0 ? `${years} tahun ${months} bulan` : `${months} bulan`;
    };

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-[#06736a] to-[#089c8e] p-6 sm:p-8 rounded-xl shadow-md text-white">
                <div className="flex items-center gap-6">
                    {currentUser.foto && (
                        <img 
                            src={currentUser.foto} 
                            alt={currentUser.nama}
                            className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                    )}
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Selamat Datang, {currentUser.nama.split(' ')[0]}! 👋</h1>
                        <p className="text-white/90">{currentUser.jabatan} - {currentUser.departemen}</p>
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoCard 
                    title="Status Kepegawaian" 
                    value={currentUser.status} 
                    icon={<span role="img" aria-label="status">✅</span>}
                    color={currentUser.status === 'Aktif' ? 'text-green-600' : 'text-yellow-600'}
                />
                <InfoCard 
                    title="Sisa Cuti" 
                    value={`${currentUser.sisaCuti} Hari`} 
                    icon={<span role="img" aria-label="leave">🌴</span>}
                />
                <InfoCard 
                    title="Shift Kerja" 
                    value={currentUser.shift} 
                    icon={<span role="img" aria-label="shift">⏰</span>}
                />
                <InfoCard 
                    title="Masa Kerja" 
                    value={calculateWorkDuration()} 
                    icon={<span role="img" aria-label="work">💼</span>}
                />
            </div>

            {/* Profile Information */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-[#06736a] mb-4">Informasi Profil</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-gray-500">NIK</p>
                            <p className="font-semibold text-gray-800">{currentUser.nik || '-'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-semibold text-gray-800">{currentUser.email}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Telepon</p>
                            <p className="font-semibold text-gray-800">{currentUser.telepon}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-gray-500">Tanggal Lahir</p>
                            <p className="font-semibold text-gray-800">{formatDate(currentUser.birthDate)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Tanggal Bergabung</p>
                            <p className="font-semibold text-gray-800">{formatDate(currentUser.hireDate)}</p>
                        </div>
                        {currentUser.spesialisasi && (
                            <div>
                                <p className="text-sm text-gray-500">Spesialisasi</p>
                                <p className="font-semibold text-gray-800">{currentUser.spesialisasi}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#e6f3f2] p-6 rounded-xl">
                <h2 className="text-xl font-bold text-[#06736a] mb-4">Aksi Cepat</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickActionCard
                        title="Ajukan Cuti"
                        description="Buat pengajuan cuti atau izin"
                        icon={<span role="img" aria-label="request">📝</span>}
                        onClick={() => onNavigate?.('ess', 'overview')}
                    />
                    <QuickActionCard
                        title="Lihat Slip Gaji"
                        description="Akses slip gaji bulanan Anda"
                        icon={<span role="img" aria-label="payslip">💰</span>}
                        onClick={() => onNavigate?.('ess', 'overview')}
                    />
                    <QuickActionCard
                        title="Riwayat Absensi"
                        description="Cek catatan kehadiran Anda"
                        icon={<span role="img" aria-label="attendance">📅</span>}
                        onClick={() => onNavigate?.('ess', 'attendance')}
                    />
                    <QuickActionCard
                        title="Ubah Password"
                        description="Ganti password akun Anda"
                        icon={<span role="img" aria-label="password">🔒</span>}
                        onClick={() => setIsChangePasswordOpen(true)}
                    />
                </div>
            </div>

            {/* Announcements (Optional - can be populated from database) */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-[#06736a] mb-4">📢 Pengumuman</h2>
                <div className="space-y-3">
                    <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                        <p className="text-sm text-gray-600">Selamat datang di Sistem HRMS Pro! Gunakan menu di sebelah kiri untuk mengakses berbagai fitur.</p>
                    </div>
                </div>
            </div>

            {/* Change Password Modal */}
            <ChangePassword isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
        </div>
    );
};

export default Dashboard;