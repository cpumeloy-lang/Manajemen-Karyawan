import React from 'react';

interface PersonalGuardProps {
  activePortal: 'personal' | 'operational' | null;
  children: React.ReactNode;
}

const PersonalGuard: React.FC<PersonalGuardProps> = ({ activePortal, children }) => {
  if (activePortal !== 'personal') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        Akses ditolak. Fitur ini hanya tersedia di Portal Personal.
      </div>
    );
  }

  return <>{children}</>;
};

export default PersonalGuard;
