import React, { useState } from 'react';
import { Employee } from '../types.ts';
import ChangePassword from './ChangePassword.tsx';
import { CheckCircleIcon, SunIcon, ClockIcon, BriefcaseIcon, DocumentTextIcon, CurrencyDollarIcon, CalendarDaysIcon, LockClosedIcon, BellAlertIcon } from './icons.tsx';

interface DashboardProps {
    employees: Employee[];
    currentUser?: Employee;
    onNavigate?: (view: 'ess', tab?: 'overview' | 'attendance') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onNavigate }) => {
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    
    const InfoCard: React.FC<{ title: string; value: string | number, icon: React.ReactNode, color?: string }> = ({ title, value, icon, color = 'text-[#06736a]' }) => (
        <div className="bg-white p-6 rounded-xl shadow-md flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className={`w-12 h-12 flex items-center justify-center rounded-full bg-opacity-10 ${color.replace('text-', 'bg-')} ${color}`}>
                <div className="w-6 h-6">{icon}</div>
            </div>
            <div>
                <h3 className="text-sm font-medium text-gray-500">{title}</h3>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
        </div>
    );

    const QuickActionCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onClick?: () => void }> = ({ title, description, icon, onClick }) => (
        <button
            onClick={onClick}
            className="bg-white p-6 rounded-xl shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-left w-full group"
        >
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#06736a]/10 text-[#06736a] group-hover:scale-110 transition-transform duration-300">
                    <div className="w-6 h-6">{icon}</div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-[#06736a] mb-1">{title}</h3>
                    <p className="text-sm text-gray-600">{description}</p>
                </div>
            </div>
        </button>
    );

    if (!currentUser) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-32 bg-gray-200 rounded-xl w-full"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 bg-gray-200 rounded-xl w-full"></div>
                    ))}
                </div>
                <div className="h-64 bg-gray-200 rounded-xl w-full"></div>
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
            <div className="relative overflow-hidden bg-gradient-to-r from-[#06736a] to-[#089c8e] p-6 sm:p-8 rounded-xl shadow-md text-white">
                {/* Glassmorphism subtle pattern overlay */}
                <div className="absolute inset-0 bg-white/5 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none"></div>
                <div className="relative flex items-center gap-6 z-10">
                    {currentUser.foto && (
                        <img 
                            src={currentUser.foto} 
                            alt={currentUser.nama}
                            className="w-20 h-20 rounded-full object-cover border-4 border-white/80 shadow-lg"
                        />
                    )}
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Selamat Datang, {currentUser.nama.split(' ')[0]}!</h1>
                        <p className="text-white/90">{currentUser.jabatan} - {currentUser.departemen}</p>
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoCard 
                    title="Status Kepegawaian" 
                    value={currentUser.status} 
                    icon={<CheckCircleIcon />}
                    color={currentUser.status === 'Aktif' ? 'text-green-600' : 'text-yellow-600'}
                />
                <InfoCard 
                    title="Sisa Cuti" 
                    value={`${currentUser.sisaCuti} Hari`} 
                    icon={<SunIcon />}
                    color="text-orange-500"
                />
                <InfoCard 
                    title="Shift Kerja" 
                    value={currentUser.shift} 
                    icon={<ClockIcon />}
                    color="text-blue-500"
                />
                <InfoCard 
                    title="Masa Kerja" 
                    value={calculateWorkDuration()} 
                    icon={<BriefcaseIcon />}
                    color="text-indigo-500"
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
                        icon={<DocumentTextIcon />}
                        onClick={() => onNavigate?.('ess', 'overview')}
                    />
                    <QuickActionCard
                        title="Lihat Slip Gaji"
                        description="Akses slip gaji bulanan Anda"
                        icon={<CurrencyDollarIcon />}
                        onClick={() => onNavigate?.('ess', 'overview')}
                    />
                    <QuickActionCard
                        title="Riwayat Absensi"
                        description="Cek catatan kehadiran Anda"
                        icon={<CalendarDaysIcon />}
                        onClick={() => onNavigate?.('ess', 'attendance')}
                    />
                    <QuickActionCard
                        title="Ubah Password"
                        description="Ganti password akun Anda"
                        icon={<LockClosedIcon />}
                        onClick={() => setIsChangePasswordOpen(true)}
                    />
                </div>
            </div>

            {/* Announcements (Optional - can be populated from database) */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <BellAlertIcon className="w-6 h-6 text-[#06736a]" />
                    <h2 className="text-xl font-bold text-[#06736a]">Pengumuman</h2>
                </div>
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