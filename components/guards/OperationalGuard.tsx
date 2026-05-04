import React from 'react';

interface OperationalGuardProps {
  activePortal: 'personal' | 'operational' | null;
  children: React.ReactNode;
}

const OperationalGuard: React.FC<OperationalGuardProps> = ({ activePortal, children }) => {
  if (activePortal !== 'operational') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        Akses ditolak. Fitur ini hanya tersedia di Portal Operasional.
      </div>
    );
  }

  return <>{children}</>;
};

export default OperationalGuard;
