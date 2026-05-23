/**

 * components/AppHeader.tsx

 * Header component with search and action buttons

 * Extracted from App.tsx

 */



import React from 'react';

import LoadingSpinner from './LoadingSpinner';

import { isAdminRole, isHrRole, isKepalaRuanganRole } from '../utils/roleUtils';

import type { Department, View, WorkUnit } from '../types';



interface AppHeaderProps {

  effectiveView: View;

  searchTerm: string;

  statusFilter: string;

  departmentFilter: string;

  unitFilter: string;

  departments: Department[];

  workUnits: WorkUnit[];

  dataLoading: boolean;

  userRole?: string;

  onSearchChange: (value: string) => void;

  onStatusFilterChange: (value: string) => void;

  onDepartmentFilterChange: (value: string) => void;

  onUnitFilterChange: (value: string) => void;

  onAddEmployee: () => void;

}



export const AppHeader: React.FC<AppHeaderProps> = ({

  effectiveView,

  searchTerm,

  statusFilter,

  departmentFilter,

  unitFilter,

  departments,

  workUnits,

  dataLoading,

  userRole,

  onSearchChange,

  onStatusFilterChange,

  onDepartmentFilterChange,

  onUnitFilterChange,

  onAddEmployee,

}) => {

  const isEmployeeTableView = (isAdminRole(userRole) || isHrRole(userRole)) && effectiveView === 'employees';

  const isEmployeeViewOnly = isKepalaRuanganRole(userRole) && effectiveView === 'employees';



  return (

    <>

      <header className="flex justify-between items-center mb-8">

        {(isEmployeeTableView || isEmployeeViewOnly) ? (

          <div className="flex-1 max-w-4xl space-y-3">

            <input

              type="text"

              placeholder="Cari NIK, nama, email, jabatan, atau departemen..."

              value={searchTerm}

              onChange={(e) => onSearchChange(e.target.value)}

              className="w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a]"

            />

            {isEmployeeTableView && (

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

                <select

                  value={statusFilter}

                  onChange={(e) => onStatusFilterChange(e.target.value)}

                  title="Filter status karyawan"

                  aria-label="Filter status karyawan"

                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] bg-white"

                >

                  <option value="">Semua Status</option>

                  <option value="Aktif">Aktif</option>

                  <option value="Cuti">Cuti</option>

                  <option value="Non-Aktif">Non-Aktif</option>

                </select>

                <select

                  value={departmentFilter}

                  onChange={(e) => onDepartmentFilterChange(e.target.value)}

                  title="Filter departemen"

                  aria-label="Filter departemen"

                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] bg-white"

                >

                  <option value="">Semua Departemen</option>

                  {departments.map((department) => (

                    <option key={department.id} value={department.nama}>

                      {department.nama}

                    </option>

                  ))}

                </select>

                <select

                  value={unitFilter}

                  onChange={(e) => onUnitFilterChange(e.target.value)}

                  title="Filter unit kerja"

                  aria-label="Filter unit kerja"

                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] bg-white"

                >

                  <option value="">Semua Unit Kerja</option>

                  {workUnits.map((unit) => (

                    <option key={unit.id} value={unit.id}>

                      {unit.nama}

                    </option>

                  ))}

                </select>

              </div>

            )}

          </div>

        ) : (

          <div />

        )}

        {isEmployeeTableView && (

          <button

            onClick={onAddEmployee}

            className="bg-[#06736a] text-white font-bold py-2 px-6 rounded-lg hover:bg-[#054f46] transition-colors"

          >

            + Tambah Karyawan

          </button>

        )}

        {isEmployeeViewOnly && (

          <div className="text-sm text-gray-600">

            Mode View-Only: Hanya bisa melihat data karyawan unit Anda

          </div>

        )}

      </header>



      {dataLoading && (

        <div className="mb-4 bg-[#e6f3f2] border border-[#06736a] rounded-lg p-3 flex items-center">

          <LoadingSpinner size="small" text="" />

          <span className="ml-2 text-[#06736a] text-sm">Memperbarui data...</span>

        </div>

      )}

    </>

  );

};

