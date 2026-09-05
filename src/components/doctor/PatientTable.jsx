import React from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Eye, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Globe, 
  ArrowUpDown,
  Filter,
  Search,
  FileCheck
} from 'lucide-react';

export default function PatientTable({ 
  patients = [], 
  searchQuery = '', 
  onSearchChange,
  statusFilter = 'all',
  onStatusFilterChange,
  redFlagFilter = false,
  onRedFlagFilterChange,
  sortBy = 'recent',
  onSortByChange
}) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Awaiting Review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span>Awaiting Review</span>
          </span>
        );
      case 'Review in Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Review in Progress</span>
          </span>
        );
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Verified</span>
          </span>
        );
      case 'Consultation Complete':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <FileCheck className="w-3.5 h-3.5" />
            <span>Consultation Complete</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-soft-sm overflow-hidden">
      
      {/* Table Header Controls */}
      <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by patient name, ID (#MS-...) or complaints..."
            className="w-full py-2.5 pl-9 pr-4 rounded-2xl bg-slate-50 focus:bg-white text-xs font-semibold text-[#17385E] placeholder-slate-400 border border-slate-200 focus:border-[#18A6A1] focus:ring-4 focus:ring-[#18A6A1]/15 transition-all outline-none"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-[#17385E]">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-normal">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#17385E] outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Awaiting Review">Awaiting Review</option>
              <option value="Review in Progress">Review in Progress</option>
              <option value="Verified">Verified</option>
              <option value="Consultation Complete">Consultation Complete</option>
            </select>
          </div>

          {/* Red Flag Filter Toggle */}
          <button
            type="button"
            onClick={() => onRedFlagFilterChange(!redFlagFilter)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
              redFlagFilter
                ? 'bg-red-50 text-red-700 border-red-300 ring-2 ring-red-200 shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:text-red-700 border-slate-200 hover:border-red-200'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${redFlagFilter ? 'text-red-600' : 'text-slate-400'}`} />
            <span>Red Flags Only</span>
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-[#17385E]">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#17385E] outline-none cursor-pointer"
            >
              <option value="recent">Sort: Most Recent</option>
              <option value="red_flags_first">Sort: Red Flags First</option>
              <option value="name">Sort: Patient Name</option>
            </select>
          </div>

        </div>

      </div>

      {/* Mobile Patient Cards */}
      <div className="md:hidden divide-y divide-slate-100">
        {patients.length === 0 ? (
          <div className="py-12 px-5 text-center text-slate-400">
            <p className="font-bold text-sm text-slate-600">No patients found</p>
            <p className="text-xs mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : patients.map((patient) => (
          <article key={patient.id} className={`p-4 space-y-3 ${patient.has_red_flag ? 'bg-red-50/30' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-2xl font-extrabold text-xs flex items-center justify-center shrink-0 ${patient.has_red_flag ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-[#EAFafa] text-[#18A6A1] border border-[#18A6A1]/20'}`}>
                  {patient.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div className="min-w-0">
                  <Link to={`/doctor/patient/${patient.id}`} className="block truncate font-bold text-[#17385E] hover:text-[#18A6A1]">
                    {patient.name}
                  </Link>
                  <p className="text-[11px] font-semibold text-slate-400 truncate">ID: #{patient.patient_id}</p>
                </div>
              </div>
              {patient.has_red_flag && <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-500">
              <span>{patient.age} yrs · {patient.gender}</span>
              <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-[#18A6A1]" />{patient.language_display || (patient.language === 'hi' ? 'हिन्दी' : 'English')}</span>
              <span className="col-span-2">Updated {patient.last_updated}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              {getStatusBadge(patient.status)}
              <Link to={`/doctor/patient/${patient.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-[#18A6A1] bg-[#EAFafa] border border-[#18A6A1]/30">
                <Eye className="w-3.5 h-3.5" /> View Record
              </Link>
            </div>
          </article>
        ))}
      </div>

      {/* Desktop Table Content */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3.5 px-6">Patient</th>
              <th className="py-3.5 px-4">Demographics</th>
              <th className="py-3.5 px-4">Language</th>
              <th className="py-3.5 px-4">Clinical Status</th>
              <th className="py-3.5 px-4">Red Flags</th>
              <th className="py-3.5 px-4">Last Updated</th>
              <th className="py-3.5 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {patients.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <p className="font-bold text-sm text-slate-600">No patients found</p>
                  <p className="text-xs mt-1">Try adjusting your search query or active filters.</p>
                </td>
              </tr>
            ) : (
              patients.map((patient) => (
                <tr 
                  key={patient.id} 
                  className={`hover:bg-slate-50/80 transition-colors ${
                    patient.has_red_flag ? 'bg-red-50/20' : ''
                  }`}
                >
                  
                  {/* Patient Name + ID */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-2xl font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                        patient.has_red_flag 
                          ? 'bg-red-100 text-red-700 border border-red-200' 
                          : 'bg-[#EAFafa] text-[#18A6A1] border border-[#18A6A1]/20'
                      }`}>
                        {patient.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <Link 
                          to={`/doctor/patient/${patient.id}`}
                          className="font-bold text-[#17385E] hover:text-[#18A6A1] transition-colors"
                        >
                          {patient.name}
                        </Link>
                        <p className="text-[11px] font-semibold text-slate-400">ID: #{patient.patient_id}</p>
                      </div>
                    </div>
                  </td>

                  {/* Demographics */}
                  <td className="py-4 px-4 font-semibold text-slate-600">
                    <span>{patient.age} yrs • {patient.gender}</span>
                  </td>

                  {/* Language */}
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1 text-slate-600 font-semibold text-[11px]">
                      <Globe className="w-3.5 h-3.5 text-[#18A6A1]" />
                      <span>{patient.language_display || (patient.language === 'hi' ? 'हिन्दी' : 'English')}</span>
                    </span>
                  </td>

                  {/* Consultation Status */}
                  <td className="py-4 px-4">
                    {getStatusBadge(patient.status)}
                  </td>

                  {/* Red Flag Indicator */}
                  <td className="py-4 px-4">
                    {patient.has_red_flag ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-100 text-red-800 border border-red-300 shadow-2xs animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        <span>Attention Required</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-medium">None detected</span>
                    )}
                  </td>

                  {/* Last Updated */}
                  <td className="py-4 px-4 text-slate-400 font-medium">
                    {patient.last_updated}
                  </td>

                  {/* Action Link */}
                  <td className="py-4 px-6 text-right">
                    <Link
                      to={`/doctor/patient/${patient.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#18A6A1] hover:text-white bg-[#EAFafa] hover:bg-[#18A6A1] border border-[#18A6A1]/30 shadow-2xs transition-all duration-150 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Record</span>
                    </Link>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-slate-50/60 border-t border-slate-200 text-xs text-slate-400 flex items-center justify-between">
        <span>Showing {patients.length} patient record{patients.length === 1 ? '' : 's'}</span>
        <span className="text-[11px] font-medium text-slate-400">Demo clinical data • Connected to local state</span>
      </div>

    </div>
  );
}
