import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DoctorSidebar from '../../components/doctor/DoctorSidebar';
import DoctorHeader from '../../components/doctor/DoctorHeader';
import RedFlagBanner from '../../components/doctor/RedFlagBanner';
import ClinicalHistorySection from '../../components/doctor/ClinicalHistorySection';
import InvestigationsSection from '../../components/doctor/InvestigationsSection';
import DocumentsSection from '../../components/doctor/DocumentsSection';
import AyushHistorySection from '../../components/doctor/AyushHistorySection';
import AiSummarySection from '../../components/doctor/AiSummarySection';
import doctorService from '../../services/doctorService';
import { 
  ArrowLeft, 
  User, 
  Globe, 
  Calendar, 
  Phone, 
  ShieldCheck, 
  FileText, 
  FlaskConical, 
  Leaf, 
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Edit3,
  CreditCard,
  Check
} from 'lucide-react';

export default function PatientRecordView() {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('clinical_history'); // 'clinical_history' | 'investigations' | 'documents' | 'ayush' | 'ai_summary'
  const [errorMessage, setErrorMessage] = useState('');
  const [insurance, setInsurance] = useState(null);

  // Load patient clinical record
  const fetchPatientData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await doctorService.getPatientRecord(patientId);
      if (response.success && response.data) {
        setPatient(response.data);
        try {
          const insuranceKeys = [response.data.id, response.data.patient_id, patientId].filter(Boolean);
          const storedInsurance = insuranceKeys
            .map((id) => localStorage.getItem(`medsync-insurance-${id}`))
            .find(Boolean);
          setInsurance(storedInsurance ? JSON.parse(storedInsurance) : null);
        } catch {
          setInsurance(null);
        }
      } else {
        setErrorMessage(response.error || "Patient record not found.");
      }
    } catch (err) {
      console.error("Error loading patient record:", err);
      setErrorMessage("Unable to connect to patient records.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyInsurance = () => {
    if (!insurance) return;
    const verifiedInsurance = {
      ...insurance,
      status: 'verified',
      verifiedBy: 'Dr. Ananya Ray, MD',
      verifiedAt: new Date().toISOString(),
    };
    [patient.id, patient.patient_id, patientId].filter(Boolean).forEach((id) => {
      localStorage.setItem(`medsync-insurance-${id}`, JSON.stringify(verifiedInsurance));
    });
    setInsurance(verifiedInsurance);
  };

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  // Update a single clinical history section
  const handleUpdateClinicalSection = async (sectionKey, updatedContent) => {
    if (!patient) return;
    try {
      const response = await doctorService.updatePatientRecord(patient.id, sectionKey, updatedContent);
      if (response.success && response.data) {
        setPatient(response.data);
      }
    } catch (err) {
      console.error("Failed to update section:", err);
    }
  };

  // Verify record
  const handleVerifyRecord = async () => {
    if (!patient) return;
    try {
      const response = await doctorService.verifyPatientRecord(patient.id, "Dr. Ananya Ray, MD");
      if (response.success && response.data) {
        setPatient(response.data);
      }
    } catch (err) {
      console.error("Failed to verify record:", err);
    }
  };

  // Update AI summary executive brief
  const handleUpdateAiSummary = (newBrief) => {
    setPatient((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ai_summary: {
          ...prev.ai_summary,
          executive_summary: newBrief
        }
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex bg-[#F8FBFC] text-[#17385E]">
        <DoctorSidebar />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-12 h-12 rounded-2xl bg-[#EAFafa] text-[#18A6A1] flex items-center justify-center animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-[#17385E] mt-4">Loading Clinical Record...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !patient) {
    return (
      <div className="min-h-screen flex bg-[#F8FBFC] text-[#17385E]">
        <DoctorSidebar />
        <div className="flex-1 flex flex-col p-8 items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#17385E]">Patient Record Not Found</h2>
          <p className="text-xs text-slate-500 max-w-sm">
            {errorMessage || `Could not find clinical data for ID: ${patientId}`}
          </p>
          <button
            type="button"
            onClick={() => navigate('/doctor/dashboard')}
            className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#17385E] hover:bg-[#0F2642] cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'clinical_history', label: 'Clinical History', icon: FileText, count: 9 },
    { id: 'investigations', label: 'Investigations', icon: FlaskConical, count: patient.investigations?.length || 0 },
    { id: 'documents', label: 'Medical Documents', icon: FileText, count: patient.documents?.length || 0 },
    { id: 'ayush', label: 'AYUSH History', icon: Leaf, count: patient.ayush_data ? 14 : 0 },
    { id: 'ai_summary', label: 'AI Summary Brief', icon: Sparkles, count: null },
  ];

  return (
    <div className="min-h-screen flex bg-[#F8FBFC] text-[#17385E]">
      
      {/* ── Left Sidebar Navigation ── */}
      <DoctorSidebar />

      {/* ── Main View Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header with Breadcrumbs */}
        <DoctorHeader
          title={`Patient Record: ${patient.name}`}
          subtitle={`ID: #${patient.patient_id} • Clinical History & Diagnostic Viewer`}
          breadcrumbs={[
            { label: 'Patients', href: '/doctor/dashboard' },
            { label: patient.name, href: '#' }
          ]}
          showSearch={false}
        />

        {/* Record Content Body */}
        <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-6xl w-full mx-auto">
          
          {/* Back Action + Quick Actions */}
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/doctor/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-[#18A6A1] bg-white border border-slate-200 hover:border-[#18A6A1] transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Patient Registry</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Record</span>
              </button>
            </div>
          </div>

          {/* ── 1. PATIENT OVERVIEW CARD ── */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-soft-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
              
              {/* Left: Demographics */}
              <div className="flex items-center gap-3.5">
                <div className={`w-14 h-14 rounded-2xl font-black text-lg flex items-center justify-center shrink-0 shadow-md ${
                  patient.has_red_flag 
                    ? 'bg-red-100 text-red-800 border border-red-200' 
                    : 'bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] text-white shadow-[#18A6A1]/20'
                }`}>
                  {patient.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>

                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-extrabold text-[#17385E] tracking-tight">
                      {patient.name}
                    </h2>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {patient.age}y • {patient.gender}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Patient ID: <strong className="text-[#17385E]">#{patient.patient_id}</strong>
                  </p>
                </div>
              </div>

              {/* Right: Verification / Status Badge */}
              <div className="flex flex-wrap items-center gap-2">
                {patient.verification?.is_verified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Verified by Physician</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Awaiting Physician Review</span>
                  </span>
                )}
              </div>

            </div>

            {/* Overview Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              
              {/* Preferred Language */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Preferred Language
                </span>
                <span className="font-bold text-[#17385E] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#18A6A1]" />
                  <span>{patient.language_display || (patient.language === 'hi' ? 'हिन्दी / Hindi' : 'English')}</span>
                </span>
              </div>

              {/* ABHA Identifier Status */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  ABHA Status
                </span>
                <span className="font-bold text-slate-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-500">ABHA integration pending</span>
                </span>
              </div>

              {/* Registration Date */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Registration Date
                </span>
                <span className="font-bold text-[#17385E] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#18A6A1]" />
                  <span>{patient.registration_date || "Today"}</span>
                </span>
              </div>

              {/* Phone / Contact */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Phone Number
                </span>
                <span className="font-bold text-[#17385E] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#18A6A1]" />
                  <span>{patient.phone || "Not provided"}</span>
                </span>
              </div>

            </div>

          </div>

          {/* ── 2. INSURANCE REVIEW ── */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft-sm">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF5F6] text-[#137C8B]">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#17385E]">Insurance information</h2>
                  <p className="text-xs text-slate-500">Patient-submitted details for administrative review</p>
                </div>
              </div>
              {insurance?.status === 'verified' ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  <Check className="h-3.5 w-3.5" /> Verified
                </span>
              ) : insurance?.status === 'submitted' ? (
                <span className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">Needs review</span>
              ) : null}
            </div>

            {!insurance || insurance.status === 'not_submitted' ? (
              <p className="text-sm text-slate-500">The patient has not added insurance information.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  {[
                    ['Provider', insurance.provider],
                    ['Plan', insurance.planName],
                    ['Policy number', insurance.policyNumber],
                    ['Member ID', insurance.memberId],
                    ['Expiry date', insurance.expiryDate || 'Not provided'],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="mt-1 truncate text-sm font-bold text-[#17385E]">{value || 'Not provided'}</p>
                    </div>
                  ))}
                </div>
                {insurance.status !== 'verified' && (
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500">Verify these details against the patient’s insurance document or provider record before relying on them.</p>
                    <button type="button" onClick={handleVerifyInsurance} className="inline-flex items-center gap-2 rounded-lg bg-[#137C8B] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0D6471]">
                      <Check className="h-4 w-4" /> Mark insurance as verified
                    </button>
                  </div>
                )}
                {insurance.status === 'verified' && (
                  <p className="mt-4 text-xs text-emerald-700">Verified by {insurance.verifiedBy || 'physician'} on {insurance.verifiedAt ? new Date(insurance.verifiedAt).toLocaleDateString('en-IN') : '—'}.</p>
                )}
              </>
            )}
          </section>

          {/* ── 3. PROMINENT RED FLAG SECTION ── */}
          <section>
            <RedFlagBanner 
              redFlags={patient.red_flags} 
              hasRedFlag={patient.has_red_flag} 
            />
          </section>

          {/* ── 3. CLINICAL SECTIONS NAVIGATION TABS ── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#17385E] text-white shadow-sm scale-102'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#25C4BE]' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── 4. ACTIVE TAB CONTENT VIEW ── */}
          <section className="space-y-6">
            
            {/* Tab 1: Structured Clinical History */}
            {activeTab === 'clinical_history' && (
              <ClinicalHistorySection 
                history={patient.clinical_history}
                onUpdateSection={handleUpdateClinicalSection}
              />
            )}

            {/* Tab 2: Diagnostic Investigations */}
            {activeTab === 'investigations' && (
              <InvestigationsSection 
                investigations={patient.investigations}
                onOpenDocument={(docName) => {
                  setActiveTab('documents');
                }}
              />
            )}

            {/* Tab 3: Uploaded Documents & OCR */}
            {activeTab === 'documents' && (
              <DocumentsSection 
                documents={patient.documents}
              />
            )}

            {/* Tab 4: AYUSH History */}
            {activeTab === 'ayush' && (
              <AyushHistorySection 
                ayushData={patient.ayush_data}
              />
            )}

            {/* Tab 5: Consolidated AI Summary */}
            {activeTab === 'ai_summary' && (
              <AiSummarySection 
                patientId={patient.id}
                summary={patient.ai_summary}
                verification={patient.verification}
                onVerify={handleVerifyRecord}
                onUpdateSummary={handleUpdateAiSummary}
              />
            )}

          </section>

        </main>

      </div>

    </div>
  );
}
