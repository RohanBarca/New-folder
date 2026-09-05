import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  Activity,
  Pill,
  Heart,
  Leaf,
  FlaskConical,
  Search,
  HelpCircle,
  Link2,
  Clock,
  Layers,
  RefreshCw,
  Shield,
  Stethoscope,
} from 'lucide-react';
import aiService from '../../services/aiService';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true if value is non-null, non-empty, and not a "not available" string.
 */
function hasValue(v) {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  const s = String(v).trim().toLowerCase();
  return s !== '' && s !== 'not available' && s !== 'not recorded in available records.';
}

/**
 * Renders a simple text field with a "Not available" fallback.
 */
function TextField({ value, className = '' }) {
  const val = hasValue(value) ? value : null;
  return (
    <p className={`text-xs text-[#17385E] font-medium leading-relaxed ${className}`}>
      {val || <span className="text-slate-400 italic">Not available in records</span>}
    </p>
  );
}

/**
 * Renders a list of strings or objects.
 */
function ListField({ items, renderItem }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="text-xs text-slate-400 italic">Not available in records</p>;
  }
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-[#17385E] font-medium leading-relaxed">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#18A6A1] shrink-0" />
          {renderItem ? renderItem(item) : String(item)}
        </li>
      ))}
    </ul>
  );
}

/**
 * A collapsible section card used throughout the summary.
 */
function SummaryCard({ icon: Icon, title, accentColor = '#18A6A1', badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50/60 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${accentColor}18` }}
          >
            <Icon className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <span className="text-xs font-extrabold text-[#17385E] uppercase tracking-wider">
            {title}
          </span>
          {badge !== undefined && badge !== null && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const MIN_LOADING_MS = 3000;

export default function AiSummarySection({
  patientId,
  summary: legacySummary = {},
  verification = {},
  onVerify,
  onUpdateSummary,
}) {
  const [state, setState] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [summaryData, setSummaryData] = useState(null);
  const [summaryMeta, setSummaryMeta] = useState(null); // { model, version, created_at, data_sources_used }
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [versionsData, setVersionsData] = useState(null);
  const [showVersions, setShowVersions] = useState(false);

  const isVerified = verification?.is_verified;

  // ── Load existing summary on mount ──────────────────────────────────────
  useEffect(() => {
    if (!patientId) return;
    loadExistingSummary();
  }, [patientId]);

  const loadExistingSummary = async () => {
    if (!patientId) return;
    try {
      const result = await aiService.getLatestSummary(patientId);
      if (result.success && result.summary_record?.summary_json) {
        setSummaryData(result.summary_record.summary_json);
        setSummaryMeta({
          model: result.summary_record.model_name,
          version: result.summary_record.generation_version,
          created_at: result.summary_record.created_at,
          data_sources_used: result.summary_record.data_sources_used || [],
        });
        setState('success');
      } else {
        setState('idle');
      }
    } catch {
      setState('idle');
    }
  };

  // ── Generate new summary ─────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!patientId) {
      setErrorMessage('No patient ID available. Please ensure the patient record is loaded.');
      setState('error');
      return;
    }

    setState('loading');
    setErrorMessage('');
    setSummaryData(null);

    // Start both the API call and the 3-second timer simultaneously
    const startTime = Date.now();

    const [result] = await Promise.all([
      aiService.generateFinalSummary(patientId),
      new Promise(resolve => setTimeout(resolve, MIN_LOADING_MS)),
    ]);

    if (!result.success) {
      setErrorMessage(result.error || 'AI summary generation failed. Please try again.');
      setState('error');
      return;
    }

    setSummaryData(result.summary);
    setSummaryMeta({
      model: result.model,
      version: result.version,
      created_at: result.created_at,
      data_sources_used: result.data_sources_used || [],
    });
    setState('success');

    setFeedbackMessage(`Summary v${result.version || '—'} generated using ${result.model || 'AI'}.`);
    setTimeout(() => setFeedbackMessage(''), 5000);

    if (onUpdateSummary && result.summary?.clinical_summary) {
      onUpdateSummary(result.summary.clinical_summary);
    }
  }, [patientId, onUpdateSummary]);

  const handleVerifyClick = () => {
    if (onVerify) {
      onVerify();
      setFeedbackMessage('Record marked as verified by physician.');
      setTimeout(() => setFeedbackMessage(''), 4000);
    }
  };

  const handleShowVersions = async () => {
    if (!showVersions && patientId) {
      const v = await aiService.getSummaryVersions(patientId);
      setVersionsData(v);
    }
    setShowVersions(s => !s);
  };

  const s = summaryData || {};

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-soft-sm p-8 sm:p-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] text-white flex items-center justify-center shadow-md shadow-[#18A6A1]/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#17385E]">Consolidated AI Clinical Summary</h3>
            <p className="text-xs text-slate-500 font-medium">Multi-source synthesis in progress</p>
          </div>
        </div>

        {/* Animated loading experience */}
        <div className="flex flex-col items-center justify-center py-10 space-y-6">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-[#18A6A1]/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#18A6A1] animate-spin" />
            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-[#EAFafa] to-[#d4f4f3] flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-[#18A6A1]" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm font-extrabold text-[#17385E]">AI is analysing your data</p>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Collecting patient records, chat history, OCR documents, and AYUSH data — then synthesizing a clinical summary.
            </p>
          </div>

          {/* Animated progress steps */}
          <div className="w-full max-w-sm space-y-2">
            {[
              { icon: User, label: 'Collecting patient demographics' },
              { icon: FileText, label: 'Processing medical documents & OCR' },
              { icon: Activity, label: 'Analysing chatbot clinical history' },
              { icon: Leaf, label: 'Reviewing AYUSH history' },
              { icon: Sparkles, label: 'Synthesizing final AI summary' },
            ].map(({ icon: Icon, label }, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80"
                style={{ animationDelay: `${idx * 0.4}s` }}
              >
                <div className="w-6 h-6 rounded-lg bg-[#18A6A1]/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-[#18A6A1]" />
                </div>
                <span className="text-xs font-semibold text-slate-600">{label}</span>
                <div className="ml-auto flex gap-1">
                  {[0, 1, 2].map(d => (
                    <div
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-[#18A6A1] animate-bounce"
                      style={{ animationDelay: `${d * 0.15 + idx * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: IDLE (no summary generated yet)
  // ─────────────────────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-soft-sm p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#18A6A1]/20">
              <Sparkles className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#17385E] flex items-center gap-2">
                <span>Consolidated AI Clinical Summary</span>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#EAFafa] text-[#18A6A1] border border-[#18A6A1]/30">
                  Final Engine
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Multi-source synthesis from patient interview, registration, and OCR documents.
              </p>
            </div>
          </div>
        </div>

        {/* Safety notice */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#18A6A1] shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">
            <strong className="font-bold text-[#17385E]">AI-generated summary — physician verification required.</strong>{' '}
            This engine synthesizes information from all available patient records. It does not diagnose, prescribe medication, or invent clinical information.
          </p>
        </div>

        {/* Generate prompt */}
        <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#EAFafa] to-[#d4f4f3] flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-[#18A6A1]" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-[#17385E]">No summary generated yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              Generate a comprehensive AI clinical summary from all collected patient data.
            </p>
          </div>
          <button
            type="button"
            id="btn-generate-ai-summary"
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-extrabold text-white bg-gradient-to-r from-[#18A6A1] to-[#1a8fa8] hover:from-[#148F8B] hover:to-[#177a92] shadow-lg shadow-[#18A6A1]/25 hover:shadow-xl transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Generate Final AI Summary
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: ERROR STATE
  // ─────────────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-soft-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#18A6A1]/20">
            <Sparkles className="w-5 h-5 stroke-[2.2]" />
          </div>
          <h3 className="text-base font-extrabold text-[#17385E]">Consolidated AI Clinical Summary</h3>
        </div>

        <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-[#17385E]">Summary Generation Failed</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
              {errorMessage || 'An error occurred during AI summary generation. Please try again.'}
            </p>
          </div>
          <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 font-medium max-w-sm">
            No fabricated summary content will be displayed. Please retry or contact support if the issue persists.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-extrabold text-white bg-gradient-to-r from-[#18A6A1] to-[#1a8fa8] hover:from-[#148F8B] hover:to-[#177a92] shadow-md transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: SUCCESS — Full Structured Summary Display
  // ─────────────────────────────────────────────────────────────────────────
  const po = s.patient_overview || {};
  const ayush = s.ayush_history || {};
  const ros = s.review_of_systems || {};

  return (
    <div className="space-y-4">

      {/* ── TOP HEADER CARD ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-soft-sm p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#18A6A1]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#17385E] flex flex-wrap items-center gap-2">
                <span>Consolidated AI Clinical Summary</span>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#EAFafa] text-[#18A6A1] border border-[#18A6A1]/30">
                  AI-generated
                </span>
              </h3>
              {summaryMeta && (
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  v{summaryMeta.version} · {summaryMeta.model} ·{' '}
                  {summaryMeta.created_at
                    ? new Date(summaryMeta.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'Just generated'}
                </p>
              )}
            </div>
          </div>

          {/* Verification pill + action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-extrabold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Verified by physician
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Physician verification required
              </span>
            )}

            {/* Regenerate */}
            <button
              type="button"
              id="btn-regenerate-ai-summary"
              onClick={handleGenerate}
              title="Generate a new version of the AI summary"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Regenerate
            </button>

            {/* Version history */}
            <button
              type="button"
              onClick={handleShowVersions}
              title="View all summary versions"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              History
            </button>
          </div>
        </div>

        {/* Mandatory safety notice */}
        <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium text-amber-900">
            <strong className="font-bold">AI-generated summary — physician verification required.</strong>{' '}
            This summary is synthesized from recorded patient data only. It does not constitute a diagnosis, clinical advice, or medical opinion. All findings must be independently verified by the attending physician.
          </p>
        </div>

        {/* Data sources used */}
        {summaryMeta?.data_sources_used?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider self-center">Sources:</span>
            {summaryMeta.data_sources_used.map(src => (
              <span key={src} className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {src.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Feedback toast */}
        {feedbackMessage && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
            {feedbackMessage}
          </div>
        )}
      </div>

      {/* ── VERSION HISTORY (collapsible) ────────────────────────────────── */}
      {showVersions && versionsData && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <p className="text-xs font-extrabold text-[#17385E] uppercase tracking-wider">
            Summary Version History ({versionsData.total_versions})
          </p>
          {versionsData.versions?.length > 0 ? (
            <div className="space-y-2">
              {versionsData.versions.map(v => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#17385E]">v{v.version}</span>
                    <span className="text-slate-400">{v.model_name}</span>
                  </div>
                  <span className="text-slate-400">
                    {v.created_at ? new Date(v.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No versions stored.</p>
          )}
        </div>
      )}

      {/* ── CLINICAL EXECUTIVE SUMMARY ───────────────────────────────────── */}
      {hasValue(s.clinical_summary) && (
        <div className="bg-gradient-to-r from-[#EAFafa]/80 to-[#d4f4f3]/50 rounded-2xl border border-[#18A6A1]/25 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#18A6A1]" />
            <span className="text-xs font-extrabold text-[#17385E] uppercase tracking-wider">Executive Clinical Brief</span>
          </div>
          <p className="text-sm text-[#17385E] font-medium leading-relaxed">{s.clinical_summary}</p>
        </div>
      )}

      {/* ── PATIENT OVERVIEW ─────────────────────────────────────────────── */}
      <SummaryCard icon={User} title="Patient Overview" defaultOpen={true}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          {[
            { label: 'Name', value: po.name },
            { label: 'Age', value: po.age != null ? `${po.age} years` : null },
            { label: 'Gender', value: po.gender },
            { label: 'Language', value: po.language },
            { label: 'ABHA Address', value: po.abha_address },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
              <span className="text-xs font-bold text-[#17385E]">
                {hasValue(value) ? value : <span className="text-slate-400 font-medium italic">Not provided</span>}
              </span>
            </div>
          ))}
        </div>
      </SummaryCard>

      {/* ── CHIEF COMPLAINT & HPI ────────────────────────────────────────── */}
      <SummaryCard icon={Activity} title="Chief Complaint & Present Illness" defaultOpen={true} accentColor="#e44c4c">
        <div className="mt-3 space-y-4">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Chief Complaint</span>
            <TextField value={s.chief_complaint} />
          </div>
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">History of Present Illness</span>
            <TextField value={s.history_of_present_illness} />
          </div>
          {Array.isArray(s.symptoms) && s.symptoms.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Reported Symptoms</span>
              <div className="flex flex-wrap gap-1.5">
                {s.symptoms.map((sym, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </SummaryCard>

      {/* ── RED FLAGS ────────────────────────────────────────────────────── */}
      {Array.isArray(s.red_flags) && s.red_flags.length > 0 && (
        <div className="bg-red-50 rounded-2xl border border-red-300 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-xs font-extrabold text-red-800 uppercase tracking-wider">Red Flags ({s.red_flags.length})</span>
          </div>
          <div className="space-y-2">
            {s.red_flags.map((flag, i) => {
              const text = typeof flag === 'string' ? flag : (flag.evidence || flag.finding || flag.title);
              const type = typeof flag === 'object' ? (flag.severity || flag.type) : null;
              const src = typeof flag === 'object' ? (flag.source_type || flag.source) : null;
              return (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-red-100/60 border border-red-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-900">{text}</p>
                    {(type || src) && (
                      <p className="text-[10px] text-red-600 mt-0.5 font-medium">
                        {type && <span className="capitalize">{type.replace(/_/g, ' ')}</span>}
                        {type && src && ' · '}
                        {src && <span className="capitalize">{src}</span>}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MEDICAL HISTORY ──────────────────────────────────────────────── */}
      <SummaryCard icon={FileText} title="Medical & Surgical History" badge={(s.past_medical_history?.length || 0) + (s.past_surgical_history?.length || 0)}>
        <div className="mt-3 space-y-4">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Past Medical History</span>
            <ListField items={s.past_medical_history} />
          </div>
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Surgical History</span>
            <ListField items={s.surgical_history || s.past_surgical_history} />
          </div>
        </div>
      </SummaryCard>

      {/* ── MEDICATIONS & ALLERGIES ──────────────────────────────────────── */}
      <SummaryCard icon={Pill} title="Medications & Allergies" badge={(s.medications?.length || 0) + (s.allergies?.length || 0)} accentColor="#7c3aed">
        <div className="mt-3 space-y-4">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Medications</span>
            {Array.isArray(s.medications) && s.medications.length > 0 ? (
              <div className="space-y-2">
                {s.medications.map((med, i) => {
                  const name = typeof med === 'string' ? med : med.name;
                  const dosage = typeof med === 'object' ? med.dosage : null;
                  const freq = typeof med === 'object' ? med.frequency : null;
                  const dur = typeof med === 'object' ? med.duration : null;
                  const src = typeof med === 'object' ? med.source : null;
                  return (
                    <div key={i} className="p-3 rounded-xl bg-violet-50/60 border border-violet-200/60 text-xs">
                      <p className="font-bold text-[#17385E]">{name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-slate-500 font-medium">
                        {dosage && <span>{dosage}</span>}
                        {freq && <span>{freq}</span>}
                        {dur && <span>{dur}</span>}
                        {src && <span className="text-[10px] italic text-slate-400">Source: {src}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Not available in records</p>
            )}
          </div>
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Allergies</span>
            <ListField items={s.allergies} />
          </div>
        </div>
      </SummaryCard>

      {/* ── FAMILY & PERSONAL HISTORY ────────────────────────────────────── */}
      <SummaryCard icon={Heart} title="Family & Personal History" accentColor="#db2777">
        <div className="mt-3 space-y-4">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Family History</span>
            <TextField value={s.family_history} />
          </div>
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Personal / Social History</span>
            <TextField value={s.personal_history} />
          </div>
        </div>
      </SummaryCard>

      {/* ── REVIEW OF SYSTEMS ────────────────────────────────────────────── */}
      {Object.keys(ros).length > 0 && (
        <SummaryCard icon={Stethoscope} title="Review of Systems" badge={Object.keys(ros).length}>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(ros).map(([system, findings]) => (
              <div key={system} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">{system}</span>
                <p className="text-xs font-medium text-[#17385E] leading-relaxed">{findings}</p>
              </div>
            ))}
          </div>
        </SummaryCard>
      )}

      {/* ── VITALS ───────────────────────────────────────────────────────── */}
      <SummaryCard icon={Activity} title="Vitals" badge={s.vitals?.length || 0} accentColor="#0891b2">
        <div className="mt-3">
          {Array.isArray(s.vitals) && s.vitals.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {s.vitals.map((v, i) => {
                const param = typeof v === 'string' ? v : v.parameter;
                const val = typeof v === 'object' ? v.value : null;
                const src = typeof v === 'object' ? v.source : null;
                return (
                  <div key={i} className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-200/60 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{param}</span>
                    <span className="text-xs font-extrabold text-[#17385E]">{val || '—'}</span>
                    {src && <span className="text-[10px] text-slate-400 block">{src}</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic mt-2">No vitals recorded</p>
          )}
        </div>
      </SummaryCard>

      {/* ── INVESTIGATIONS & LAB FINDINGS ───────────────────────────────── */}
      <SummaryCard icon={FlaskConical} title="Investigations & Lab Findings" badge={(s.investigations?.length || 0) + (s.laboratory_findings?.length || 0)} accentColor="#0d9488">
        <div className="mt-3 space-y-4">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Investigations Ordered / Reported</span>
            <ListField items={s.investigations} />
          </div>
          {Array.isArray(s.laboratory_findings) && s.laboratory_findings.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Laboratory Findings</span>
              <div className="space-y-2">
                {s.laboratory_findings.map((lab, i) => {
                  const test = typeof lab === 'string' ? lab : lab.test;
                  const val = typeof lab === 'object' ? lab.value : null;
                  const unit = typeof lab === 'object' ? lab.unit : null;
                  const ref = typeof lab === 'object' ? lab.reference_range : null;
                  const src = typeof lab === 'object' ? lab.source : null;
                  return (
                    <div key={i} className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/60 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-[#17385E]">{test}</p>
                        {val && <span className="font-extrabold text-teal-700">{val}{unit ? ` ${unit}` : ''}</span>}
                      </div>
                      <div className="flex gap-4 mt-1 text-slate-400 font-medium">
                        {ref && <span>Ref: {ref}</span>}
                        {src && <span className="italic">{src}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SummaryCard>

      {/* ── DIAGNOSES IN RECORDS ─────────────────────────────────────────── */}
      <SummaryCard icon={Search} title="Diagnoses Mentioned in Records" badge={s.diagnoses_mentioned_in_records?.length || 0} accentColor="#d97706">
        <div className="mt-3">
          <div className="mb-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
            These are diagnoses explicitly stated in the source records — not AI-generated diagnoses.
          </div>
          <ListField items={s.diagnoses_mentioned_in_records} />
        </div>
      </SummaryCard>

      {/* ── PROCEDURES ───────────────────────────────────────────────────── */}
      <SummaryCard icon={Activity} title="Procedures" badge={s.procedures?.length || 0}>
        <div className="mt-3">
          <ListField items={s.procedures} />
        </div>
      </SummaryCard>

      {/* ── IMPORTANT FINDINGS ───────────────────────────────────────────── */}
      {Array.isArray(s.important_findings) && s.important_findings.length > 0 && (
        <SummaryCard icon={AlertCircle} title="Important Findings" badge={s.important_findings.length} accentColor="#dc2626" defaultOpen={true}>
          <div className="mt-3 space-y-2">
            {s.important_findings.map((finding, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-orange-50/60 border border-orange-200/60">
                <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-[#17385E] leading-relaxed">{finding}</p>
              </div>
            ))}
          </div>
        </SummaryCard>
      )}

      {/* ── AYUSH HISTORY ────────────────────────────────────────────────── */}
      <SummaryCard icon={Leaf} title="AYUSH History (Patient-Reported)" accentColor="#16a34a">
        <div className="mt-3 space-y-2">
          <div className="px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800 font-medium mb-3">
            All AYUSH data is patient-reported/collected information. No independent Prakriti/Vikriti assessment has been made by the AI.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { key: 'prakriti', label: 'Prakriti' },
              { key: 'vikriti', label: 'Vikriti' },
              { key: 'sara', label: 'Sara (Tissue Quality)' },
              { key: 'samhanana', label: 'Samhanana (Build)' },
              { key: 'pramana', label: 'Pramana (Proportions)' },
              { key: 'satmya', label: 'Satmya (Adaptability)' },
              { key: 'sattva', label: 'Sattva (Temperament)' },
              { key: 'ahara_shakti', label: 'Ahara Shakti (Digestion)' },
              { key: 'vyayama_shakti', label: 'Vyayama Shakti (Stamina)' },
              { key: 'vaya', label: 'Vaya (Age-State)' },
              { key: 'ahara', label: 'Ahara (Diet)' },
              { key: 'vihara', label: 'Vihara (Lifestyle)' },
              { key: 'nidana', label: 'Nidana (Causative Factors)' },
              { key: 'samprapti', label: 'Samprapti (Progression)' },
            ].map(({ key, label }) => (
              <div key={key} className="p-3 rounded-xl bg-green-50/40 border border-green-200/60 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
                <p className="text-xs font-medium text-[#17385E] leading-relaxed">
                  {hasValue(ayush[key])
                    ? ayush[key]
                    : <span className="text-slate-400 italic">Not recorded</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SummaryCard>

      {/* ── UNCERTAIN / CONFLICTING ──────────────────────────────────────── */}
      {Array.isArray(s.uncertain_or_conflicting_information) && s.uncertain_or_conflicting_information.length > 0 && (
        <SummaryCard icon={AlertCircle} title="Uncertain / Conflicting Information" badge={s.uncertain_or_conflicting_information.length} accentColor="#b45309">
          <div className="mt-3 space-y-2">
            {s.uncertain_or_conflicting_information.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200/60">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-amber-900 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </SummaryCard>
      )}

      {/* ── MISSING INFORMATION ──────────────────────────────────────────── */}
      {Array.isArray(s.missing_information) && s.missing_information.length > 0 && (
        <SummaryCard icon={HelpCircle} title="Missing Information" badge={s.missing_information.length} accentColor="#6366f1">
          <div className="mt-3">
            <ListField items={s.missing_information} />
          </div>
        </SummaryCard>
      )}

      {/* ── QUESTIONS FOR PHYSICIAN ──────────────────────────────────────── */}
      {Array.isArray(s.questions_for_physician) && s.questions_for_physician.length > 0 && (
        <SummaryCard icon={HelpCircle} title="Questions for Physician" badge={s.questions_for_physician.length} accentColor="#7c3aed">
          <div className="mt-3">
            <ListField items={s.questions_for_physician} />
          </div>
        </SummaryCard>
      )}

      {/* ── SOURCE TRACEABILITY ──────────────────────────────────────────── */}
      <SummaryCard icon={Link2} title="Source Traceability" badge={s.source_traceability?.length || 0} accentColor="#0891b2">
        <div className="mt-3">
          {Array.isArray(s.source_traceability) && s.source_traceability.length > 0 ? (
            <div className="space-y-2">
              {s.source_traceability.map((trace, i) => {
                const finding = typeof trace === 'string' ? trace : trace.finding;
                const src = typeof trace === 'object' ? trace.source : null;
                const doc = typeof trace === 'object' ? trace.document_filename : null;
                const section = typeof trace === 'object' ? trace.section : null;
                return (
                  <div key={i} className="p-3 rounded-xl bg-cyan-50/40 border border-cyan-200/60 text-xs space-y-0.5">
                    <p className="font-medium text-[#17385E] leading-relaxed">{finding}</p>
                    <div className="flex flex-wrap gap-x-3 text-[10px] text-slate-400 font-medium mt-1">
                      {src && <span className="capitalize">Source: {src.replace(/_/g, ' ')}</span>}
                      {doc && <span>Document: {doc}</span>}
                      {section && <span>Section: {section}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic mt-2">No source traceability data available.</p>
          )}
        </div>
      </SummaryCard>

      {/* ── PHYSICIAN VERIFICATION ACTION BAR ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {isVerified ? (
            <span>
              <strong className="text-[#17385E]">Verified by:</strong>{' '}
              {verification.verified_by || 'Physician'} ·{' '}
              <span className="font-medium">{verification.verified_at || '—'}</span>
            </span>
          ) : (
            <span className="font-medium">Review history and confirm accuracy to complete intake verification.</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {feedbackMessage && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {feedbackMessage}
            </span>
          )}

          {!isVerified ? (
            <button
              type="button"
              id="btn-verify-clinical-record"
              onClick={handleVerifyClick}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-extrabold text-white bg-gradient-to-r from-[#18A6A1] to-[#1a8fa8] hover:from-[#148F8B] hover:to-[#177a92] shadow-md shadow-[#18A6A1]/20 hover:shadow-lg transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              Verify Clinical Record
            </button>
          ) : (
            <button
              type="button"
              onClick={handleVerifyClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Re-verify
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
