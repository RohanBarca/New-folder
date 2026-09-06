import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DoctorSidebar from '../../components/doctor/DoctorSidebar';
import DoctorHeader from '../../components/doctor/DoctorHeader';
import DoctorStatsCards from '../../components/doctor/DoctorStatsCards';
import PatientTable from '../../components/doctor/PatientTable';
import doctorService from '../../services/doctorService';
import { 
  Users, 
  RefreshCw, 
  AlertTriangle, 
  Sparkles, 
  Stethoscope, 
  Activity,
  FileCheck,
  Eye
} from 'lucide-react';

export default function DoctorDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Dashboard state
  const [stats, setStats] = useState({
    total_patients: 0,
    awaiting_review: 0,
    review_in_progress: 0,
    completed_histories: 0,
    red_flags_count: 0
  });

  const [patients, setPatients] = useState([]);
  const [datasetPatients, setDatasetPatients] = useState([]);
  const [datasetError, setDatasetError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [redFlagFilter, setRedFlagFilter] = useState(false);
  const [sortBy, setSortBy] = useState('recent');

  // Check URL query parameters on initial load
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'red_flags') {
      setRedFlagFilter(true);
      setSortBy('red_flags_first');
    }
  }, [searchParams]);

  // Load stats and patient data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, patientsRes, datasetRes] = await Promise.all([
        doctorService.getDashboardStats(),
        doctorService.getPatients({
          search: searchQuery,
          status: statusFilter,
          hasRedFlag: redFlagFilter,
          sortBy: sortBy
        }),
        doctorService.getDatasetPatients(),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (patientsRes.success) setPatients(patientsRes.data);
      if (datasetRes.success) {
        setDatasetPatients(datasetRes.data);
        setDatasetError('');
      } else {
        setDatasetError(datasetRes.error);
      }
    } catch (err) {
      console.error("Failed to load doctor dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [searchQuery, statusFilter, redFlagFilter, sortBy]);

  // Quick stat card click filter
  const handleSelectStatCard = (cardId) => {
    if (cardId === 'all') {
      setStatusFilter('all');
      setRedFlagFilter(false);
    } else if (cardId === 'awaiting_review') {
      setStatusFilter('Awaiting Review');
      setRedFlagFilter(false);
    } else if (cardId === 'completed') {
      setStatusFilter('Verified');
      setRedFlagFilter(false);
    } else if (cardId === 'red_flags') {
      setStatusFilter('all');
      setRedFlagFilter(true);
      setSortBy('red_flags_first');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FBFC] text-[#17385E]">
      
      {/* ── Left Sidebar Navigation ── */}
      <DoctorSidebar redFlagsCount={stats.red_flags_count} />

      {/* ── Main Dashboard Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header */}
        <DoctorHeader
          title="Physician Dashboard"
          subtitle="Real-time structured clinical intake, OCR investigation reports, and red-flag triage"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          showSearch={true}
        />

        {/* Dashboard Body */}
        <main className="flex-1 p-4 sm:p-8 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Welcome & Live Status Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-[#17324D] text-white shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#9BD8D7] bg-white/10 px-2.5 py-0.5 rounded-lg">
                  MedSync Clinical Workspace
                </span>
                  <span className="text-xs text-white/80">• OPD Session Active</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Welcome, Dr. Ananya Ray
              </h2>
              <p className="text-xs text-white/80 max-w-xl">
                Review structured medical history, investigation lab values, and AYUSH evaluations submitted by incoming patients.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={loadDashboardData}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-[#17385E] bg-white hover:bg-slate-100 transition-colors cursor-pointer"
                title="Refresh Records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* ── 1. Summary Cards ── */}
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Clinical Overview
              </h3>
              <span className="hidden sm:inline text-[11px] font-semibold text-slate-400">
                Click any metric to filter patient table below
              </span>
            </div>

            <DoctorStatsCards 
              stats={stats}
              activeFilter={redFlagFilter ? 'red_flags' : statusFilter === 'Awaiting Review' ? 'awaiting_review' : statusFilter === 'Verified' ? 'completed' : 'all'}
              onSelectFilter={handleSelectStatCard}
            />
          </section>

          {/* ── 2. Patient List Table ── */}
          <section id="patients" className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-[#17385E] tracking-tight">
                  Patient Intake Registry
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Select a patient to inspect their full structured clinical history and investigation files.
                </p>
              </div>

              {redFlagFilter && (
                <button
                  type="button"
                  onClick={() => setRedFlagFilter(false)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full border border-red-200 shrink-0"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Showing Red Flags (Clear filter)</span><span className="sm:hidden">Clear flags</span>
                </button>
              )}
            </div>

            <PatientTable
              patients={patients}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              redFlagFilter={redFlagFilter}
              onRedFlagFilterChange={setRedFlagFilter}
              sortBy={sortBy}
              onSortByChange={setSortBy}
            />
          </section>

          <section className="space-y-3 pt-2" aria-labelledby="kaggle-demo-patients-heading">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 id="kaggle-demo-patients-heading" className="text-sm font-extrabold text-[#17385E] tracking-tight">
                  Kaggle Demo Patients
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Clinical reference data only. These records are not registered MedSync patients.
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#18A6A1] bg-[#EAFafa] px-2.5 py-1 rounded-full">
                {datasetPatients.length} reference records
              </span>
            </div>

            {datasetError ? (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">{datasetError}</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-extrabold">Reference ID</th>
                      <th className="px-4 py-3 font-extrabold">Age / Gender</th>
                      <th className="px-4 py-3 font-extrabold">Disease</th>
                      <th className="px-4 py-3 font-extrabold">Symptoms</th>
                      <th className="px-4 py-3 font-extrabold">BP</th>
                      <th className="px-4 py-3 font-extrabold">Cholesterol</th>
                      <th className="px-4 py-3 font-extrabold">Outcome</th>
                      <th className="px-4 py-3 font-extrabold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {datasetPatients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-[#17385E]">{patient.reference_id}</td>
                        <td className="px-4 py-3 text-slate-600">{patient.age} / {patient.gender}</td>
                        <td className="px-4 py-3 font-semibold text-[#17385E]">{patient.disease}</td>
                        <td className="px-4 py-3 text-slate-600">{Object.entries(patient.symptoms).filter(([, value]) => value === 'Yes').map(([key]) => key.replaceAll('_', ' ')).join(', ') || 'None recorded'}</td>
                        <td className="px-4 py-3 text-slate-600">{patient.blood_pressure}</td>
                        <td className="px-4 py-3 text-slate-600">{patient.cholesterol_level}</td>
                        <td className="px-4 py-3 font-semibold text-slate-600">{patient.outcome}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/doctor/reference-patient/${patient.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#18A6A1]/30 bg-[#EAFafa] px-3 py-1.5 text-[11px] font-bold text-[#18A6A1] transition-colors hover:bg-[#18A6A1] hover:text-white"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View reference
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </main>

      </div>

    </div>
  );
}
