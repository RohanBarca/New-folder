import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowLeft, CheckCircle2, FileText, Leaf, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import aiService from '../services/aiService';

function List({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="text-sm text-slate-400 italic">Not available in records.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm text-[#17385E]">
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#18A6A1] shrink-0" />
          <span>{typeof item === 'string' ? item : item.name || item.evidence || JSON.stringify(item)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PatientSummary() {
  const patientId = sessionStorage.getItem('medsync_patient_id');
  const [summary, setSummary] = useState(null);
  const [flags, setFlags] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [meta, setMeta] = useState(null);

  const loadSummary = useCallback(async (regenerate = false) => {
    if (!patientId) {
      setError('No patient record is available. Please return to your dashboard.');
      setState('error');
      return;
    }

    setState('loading');
    setError('');
    try {
      let result;
      if (regenerate) {
        result = await aiService.generateFinalSummary(patientId);
      } else {
        result = await aiService.getLatestSummary(patientId);
        if (!result.success && result.error?.toLowerCase().includes('no ai summary')) {
          result = await aiService.generateFinalSummary(patientId);
        }
      }

      if (!result.success) {
        setError(result.error || 'The summary could not be generated.');
        setState('error');
        return;
      }

      const record = result.summary_record;
      setSummary(result.summary || record?.summary_json || null);
      setMeta({
        version: result.version || record?.generation_version,
        created_at: result.created_at || record?.created_at,
        sources: result.data_sources_used || record?.data_sources_used || [],
      });

      const flagsResult = await aiService.getRedFlags(patientId);
      setFlags(flagsResult.red_flags || []);
      setState('success');
    } catch {
      setError('Unable to load the AI summary. Please try again.');
      setState('error');
    }
  }, [patientId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const s = summary || {};

  return (
    <div className="min-h-screen bg-[#F8FBFC] text-[#17385E]">
      <header className="bg-white border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/patient/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#18A6A1]">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
          <Link to="/" className="flex items-center gap-2 font-extrabold text-lg">
            <span className="w-8 h-8 rounded-xl bg-[#18A6A1] flex items-center justify-center"><Activity className="w-4 h-4 text-white" /></span>
            Med<span className="text-[#18A6A1]">Sync</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#18A6A1] text-xs font-extrabold uppercase tracking-wider"><Sparkles className="w-4 h-4" /> Final health summary</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">Your interview report</h1>
            <p className="text-sm text-slate-500 mt-1">Generated from your saved interview and available health records.</p>
          </div>
          <button type="button" onClick={() => loadSummary(true)} disabled={state === 'loading'} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#17385E] text-white text-sm font-bold disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${state === 'loading' ? 'animate-spin' : ''}`} /> Regenerate
          </button>
        </div>

        {state === 'loading' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-[#18A6A1] animate-spin mx-auto" />
            <h2 className="text-lg font-extrabold">Preparing your report</h2>
            <p className="text-sm text-slate-500">Combining interview answers, documents, investigations, and AYUSH history.</p>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center space-y-4">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
            <p className="text-sm font-semibold text-red-800">{error}</p>
            <button type="button" onClick={() => loadSummary(true)} className="px-5 py-2.5 rounded-full bg-red-700 text-white text-sm font-bold">Try again</button>
          </div>
        )}

        {state === 'success' && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-amber-700 shrink-0" />
              <p className="text-sm text-amber-900"><strong>AI-generated report.</strong> This is not a diagnosis or treatment plan. A qualified physician must verify it before it is used as clinical documentation.</p>
            </div>

            {flags.length > 0 ? (
              <section className="bg-red-50 border-2 border-red-300 rounded-3xl p-5 space-y-3">
                <div className="flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-red-700" /><h2 className="text-lg font-extrabold text-red-950">Potential red flags detected</h2></div>
                <p className="text-xs text-red-800">These items came from your saved records and require physician review. The system has not made a diagnosis.</p>
                {flags.map((flag) => (
                  <div key={flag.id} className="bg-white border border-red-200 rounded-2xl p-4 space-y-1">
                    <p className="text-sm font-bold text-red-950">{flag.title}</p>
                    <p className="text-sm text-red-900">{flag.evidence}</p>
                    <p className="text-xs text-slate-500">Severity: {flag.severity} · Source: {flag.source_type} · Status: {flag.status}</p>
                  </div>
                ))}
              </section>
            ) : (
              <section className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 flex items-center gap-3"><CheckCircle2 className="w-6 h-6 text-emerald-700" /><div><h2 className="font-extrabold text-emerald-950">No source-backed red flags detected</h2><p className="text-xs text-emerald-800">This does not replace a physician assessment.</p></div></section>
            )}

            <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100"><FileText className="w-5 h-5 text-[#18A6A1]" /><h2 className="text-lg font-extrabold">Clinical summary</h2></div>
              <p className="text-sm leading-relaxed">{s.clinical_summary || 'Not available in records.'}</p>
              <div><h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Chief complaint</h3><p className="text-sm">{s.chief_complaint || 'Not available in records.'}</p></div>
              <div><h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Symptoms</h3><List items={s.symptoms} /></div>
              <div><h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Important findings</h3><List items={s.important_findings} /></div>
              <div><h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Investigations</h3><List items={s.investigations} /></div>
              <div><h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">AYUSH history</h3><List items={Object.entries(s.ayush_history || {}).filter(([, value]) => value).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)} /></div>
              <div><h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Missing information</h3><List items={s.missing_information} /></div>
            </section>

            <p className="text-xs text-slate-400 text-center">Version {meta?.version || '—'} · Sources: {meta?.sources?.join(', ') || 'patient records'} · Physician verification required</p>
            <Link
              to="/patient/dashboard"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#18A6A1] hover:bg-[#148F8B] text-white text-sm font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
              Go to Patient Dashboard
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
