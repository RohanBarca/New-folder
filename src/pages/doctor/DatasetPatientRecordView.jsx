import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowLeft, BrainCircuit, HeartPulse, Sparkles, UserRound } from 'lucide-react';
import DoctorHeader from '../../components/doctor/DoctorHeader';
import DoctorSidebar from '../../components/doctor/DoctorSidebar';
import doctorService from '../../services/doctorService';

const symptomLabel = (name) => name.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function DatasetPatientRecordView() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    let active = true;
    doctorService.getDatasetPatient(patientId).then((result) => {
      if (!active) return;
      if (result.success) setPatient(result.data);
      else setError(result.error || 'Reference record not found.');
    });
    return () => { active = false; };
  }, [patientId]);

  const handleAiSummary = async () => {
    setIsAnalyzing(true);
    setAnalysisError('');
    const result = await doctorService.summarizeDatasetPatient(patient.id);
    if (result.success) setAnalysis(result.data);
    else setAnalysisError(result.error);
    setIsAnalyzing(false);
  };

  if (!patient && !error) {
    return <div className="min-h-screen flex bg-[#F8FBFC] text-[#17385E]"><DoctorSidebar /><div className="flex-1 grid place-items-center p-8"><div className="text-center"><Sparkles className="mx-auto h-7 w-7 animate-spin text-[#18A6A1]" /><p className="mt-3 text-sm font-bold">Loading reference record...</p></div></div></div>;
  }

  if (error) {
    return <div className="min-h-screen flex bg-[#F8FBFC] text-[#17385E]"><DoctorSidebar /><div className="flex-1 grid place-items-center p-8 text-center"><div><AlertTriangle className="mx-auto h-9 w-9 text-amber-600" /><h1 className="mt-3 text-lg font-extrabold">Reference record unavailable</h1><p className="mt-1 text-sm text-slate-500">{error}</p><button type="button" onClick={() => navigate('/doctor/dashboard')} className="mt-5 rounded-full bg-[#17385E] px-4 py-2 text-xs font-bold text-white">Back to dashboard</button></div></div></div>;
  }

  return (
    <div className="min-h-screen flex bg-[#F8FBFC] text-[#17385E]">
      <DoctorSidebar />
      <div className="min-w-0 flex-1">
        <DoctorHeader title={`Reference Record: ${patient.reference_id}`} subtitle="Kaggle clinical reference data - not a registered MedSync patient" breadcrumbs={[{ label: 'Kaggle Demo Patients' }, { label: patient.reference_id }]} showSearch={false} />
        <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
          <Link to="/doctor/dashboard" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-[#18A6A1] hover:text-[#18A6A1]"><ArrowLeft className="h-3.5 w-3.5" />Back to dashboard</Link>

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-extrabold">Clinical reference data only</p>
            <p className="mt-1 text-xs">This is a Kaggle dataset record for symptom-pattern review. It is not a MedSync account, cannot sign in, and must not be used as an autonomous diagnosis.</p>
          </section>

          <section className="rounded-3xl border border-[#B8D9DD] bg-[#F4FBFB] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="flex items-center gap-2 text-sm font-extrabold"><BrainCircuit className="h-4 w-4 text-[#137C8B]" />AI-assisted reference summary</h2><p className="mt-1 max-w-2xl text-xs text-slate-600">Runs only when the doctor requests it. It summarizes this dataset record; it does not diagnose, prescribe, or replace clinical judgment.</p></div>
              <button type="button" onClick={handleAiSummary} disabled={isAnalyzing} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#137C8B] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0D6471] disabled:cursor-not-allowed disabled:opacity-60"><Sparkles className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />{isAnalyzing ? 'Summarizing...' : 'Summarize with AI'}</button>
            </div>
            {analysisError && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{analysisError}</p>}
            {analysis && <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI-generated reference summary - physician review required</p><p className="mt-2 text-sm leading-6 text-slate-700">{analysis.summary.ai_summary || analysis.summary.patient_overview || 'No summary was returned.'}</p>{analysis.summary.important_observations?.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">{analysis.summary.important_observations.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>}</div>}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft-sm sm:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAFafa] text-[#18A6A1]"><UserRound className="h-6 w-6" /></div>
                <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reference patient ID</p><h1 className="text-xl font-extrabold">{patient.reference_id}</h1></div>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">Source: Kaggle dataset</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Detail label="Age" value={patient.age} /><Detail label="Gender" value={patient.gender} /><Detail label="Disease" value={patient.disease} /><Detail label="Outcome" value={patient.outcome} />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft-sm"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-[#18A6A1]" /><h2 className="text-sm font-extrabold">Recorded Symptoms</h2></div><div className="mt-4 space-y-2">{Object.entries(patient.symptoms).map(([name, value]) => <div key={name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs"><span className="font-semibold text-slate-600">{symptomLabel(name)}</span><span className={`rounded-full px-2.5 py-1 font-bold ${value === 'Yes' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>{value}</span></div>)}</div></div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft-sm"><div className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-[#18A6A1]" /><h2 className="text-sm font-extrabold">Clinical Reference Values</h2></div><div className="mt-4 space-y-2"><Detail label="Blood pressure" value={patient.blood_pressure} /><Detail label="Cholesterol level" value={patient.cholesterol_level} /><Detail label="Outcome variable" value={patient.outcome} /></div></div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-[#17385E]">{value || 'Not recorded'}</p></div>;
}
