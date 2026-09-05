import React, { useState } from 'react';
import {
  Sparkles, User, Stethoscope, Pill, Activity, FlaskConical,
  FileText, CalendarClock, ChevronDown, ChevronUp, MessageCircle,
  ArrowRight, Copy, Check, ClipboardList, RefreshCw, AlertCircle,
  Clock, HeartPulse, History, ShieldAlert, FileSearch
} from 'lucide-react';

const TagBadge = ({ text }) => (
  <span className="inline-block px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-[#17385E] shadow-sm">
    {text}
  </span>
);

// ─── Collapsible Section Card ─────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, count, color = 'teal', children }) {
  const [open, setOpen] = useState(true);
  const colors = {
    teal:   { bg: 'bg-[#EAFafa]', border: 'border-[#18A6A1]/30', icon: 'text-[#18A6A1]', title: 'text-[#17385E]' },
    indigo: { bg: 'bg-indigo-50',  border: 'border-indigo-200',   icon: 'text-indigo-600',  title: 'text-indigo-900' },
    rose:   { bg: 'bg-rose-50',    border: 'border-rose-200',     icon: 'text-rose-600',    title: 'text-rose-900' },
    amber:  { bg: 'bg-amber-50',   border: 'border-amber-200',    icon: 'text-amber-600',   title: 'text-amber-900' },
    violet: { bg: 'bg-violet-50',  border: 'border-violet-200',   icon: 'text-violet-600',  title: 'text-violet-900' },
    slate:  { bg: 'bg-slate-50',   border: 'border-slate-200',    icon: 'text-slate-600',   title: 'text-slate-900' },
    cyan:   { bg: 'bg-cyan-50',    border: 'border-cyan-200',     icon: 'text-cyan-600',    title: 'text-cyan-900' },
    emerald:{ bg: 'bg-emerald-50', border: 'border-emerald-200',  icon: 'text-emerald-600', title: 'text-emerald-900' }
  };
  const c = colors[color] || colors.teal;
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden shadow-sm`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:opacity-85 transition-opacity"
      >
        <div className="flex items-center gap-2.5">
          <Icon className={`w-4 h-4 ${c.icon}`} />
          <span className={`text-sm font-bold ${c.title}`}>{title}</span>
          {count !== undefined && count !== null && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-600">
              {count}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400" />
          : <ChevronDown className="w-4 h-4 text-slate-400" />
        }
      </button>
      {open && (
        <div className="px-5 pb-4 pt-1 border-t border-white/60">
          {children}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-white/70 last:border-0">
      <span className="text-xs text-slate-500 font-medium shrink-0">{label}</span>
      <span className="text-xs font-bold text-[#17385E] text-right">{value}</span>
    </div>
  );
}

// ─── Main AISummary Component ─────────────────────────────────────────────────
export default function AISummary({ summary, onReset, onChatWithAI }) {
  const [copied, setCopied] = useState(false);

  if (!summary) return null;

  const {
    patient_overview,
    current_complaint,
    relevant_medical_history,
    previous_diagnoses = [],
    previous_medications = [],
    important_observations = [],
    timeline_of_previous_visits = [],
    document_type,
    patient,
    doctor,
    diagnoses = previous_diagnoses,
    medications = previous_medications,
    vitals,
    lab_results = [],
    clinical_notes,
    follow_up,
    ai_summary
  } = summary;

  const overviewText = patient_overview || ai_summary || '';
  const complaintText = current_complaint && current_complaint !== 'Not specified' ? current_complaint : null;
  const historyText = relevant_medical_history || null;
  const observationsList = Array.isArray(important_observations) ? important_observations : [];
  const timelineList = Array.isArray(timeline_of_previous_visits) ? timeline_of_previous_visits : [];
  const diagnosesList = Array.isArray(diagnoses) ? diagnoses : (Array.isArray(previous_diagnoses) ? previous_diagnoses : []);
  const medsList = Array.isArray(medications) ? medications : (Array.isArray(previous_medications) ? previous_medications : []);

  const hasPatient   = patient && Object.values(patient).some(Boolean);
  const hasDoctor    = doctor && Object.values(doctor).some(Boolean);
  const hasVitals    = vitals && Object.values(vitals).some(Boolean);
  const hasMeds      = medsList.length > 0;
  const hasDiagnoses = diagnosesList.length > 0;
  const hasLabs      = Array.isArray(lab_results) && lab_results.length > 0;
  const hasObservations = observationsList.length > 0;
  const hasTimeline  = timelineList.length > 0;

  const handleCopySummary = async () => {
    const sections = [];
    sections.push('MEDSYNC AI PATIENT SUMMARY');
    sections.push('=========================');
    if (document_type) sections.push(`Document: ${document_type}`);
    if (overviewText) sections.push(`\n1. PATIENT OVERVIEW:\n${overviewText}`);
    if (complaintText) sections.push(`\n2. CURRENT COMPLAINT:\n${complaintText}`);
    if (historyText) sections.push(`\n3. RELEVANT MEDICAL HISTORY:\n${historyText}`);
    if (hasDiagnoses) sections.push(`\n4. PREVIOUS DIAGNOSES:\n- ${diagnosesList.join('\n- ')}`);
    if (hasMeds) {
      sections.push(`\n5. PREVIOUS MEDICATIONS:\n${medsList.map(m => `- ${m.name || m} ${m.dosage || ''} ${m.frequency || ''} ${m.duration || ''}`.trim()).join('\n')}`);
    }
    if (hasObservations) sections.push(`\n6. IMPORTANT OBSERVATIONS:\n- ${observationsList.join('\n- ')}`);
    if (hasTimeline) {
      sections.push(`\n7. TIMELINE OF PREVIOUS VISITS:\n${timelineList.map(t => typeof t === 'object' ? `- ${t.date || 'Visit'}: ${t.event || ''}` : `- ${t}`).join('\n')}`);
    }

    await navigator.clipboard.writeText(sections.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-5 text-left animate-fadeIn">

      {/* ── Header / Overview Banner ────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#17385E] to-[#1a4a7a] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-soft-lg">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-[#18A6A1]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18A6A1]/25 border border-[#18A6A1]/40 text-xs font-bold text-[#25C4BE]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Groq AI Analysis Complete</span>
            </div>
            {document_type && (
              <span className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white/90">
                {document_type}
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
            AI Patient Clinical Summary
          </h2>

          {/* Patient Overview section */}
          {overviewText && (
            <div className="mt-4 p-4 rounded-2xl bg-white/10 border border-white/15 text-sm text-white/90 leading-relaxed font-normal">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#25C4BE] mb-1">Patient Overview</p>
              <p>{overviewText}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Current Complaint ─────────────────────────────────────────────── */}
      {complaintText && (
        <SectionCard icon={HeartPulse} title="Current Complaint" color="rose">
          <p className="text-xs text-[#17385E] font-medium leading-relaxed mt-1">
            {complaintText}
          </p>
        </SectionCard>
      )}

      {/* ── Relevant Medical History ──────────────────────────────────────── */}
      {historyText && (
        <SectionCard icon={History} title="Relevant Medical History" color="cyan">
          <p className="text-xs text-[#17385E] leading-relaxed mt-1 whitespace-pre-wrap">
            {historyText}
          </p>
        </SectionCard>
      )}

      {/* ── Previous Diagnoses / Conditions ───────────────────────────────── */}
      {hasDiagnoses && (
        <SectionCard icon={ClipboardList} title="Previous Diagnoses" count={diagnosesList.length} color="amber">
          <div className="flex flex-wrap gap-2 mt-2">
            {diagnosesList.map((d, i) => (
              <TagBadge key={i} text={d} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Previous Medications ──────────────────────────────────────────── */}
      {hasMeds && (
        <SectionCard icon={Pill} title="Previous Medications" count={medsList.length} color="violet">
          <div className="mt-2 space-y-2.5">
            {medsList.map((med, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-white/60 last:border-0">
                <div className="w-6 h-6 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-600 text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#17385E] leading-tight">{med.name || med}</p>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5">
                    {med.dosage && <span className="text-xs text-slate-600 font-medium">{med.dosage}</span>}
                    {med.frequency && <><span className="text-slate-300">·</span><span className="text-xs text-slate-600">{med.frequency}</span></>}
                    {med.duration && <><span className="text-slate-300">·</span><span className="text-xs text-slate-500">{med.duration}</span></>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Important Observations ────────────────────────────────────────── */}
      {hasObservations && (
        <SectionCard icon={ShieldAlert} title="Important Observations" count={observationsList.length} color="rose">
          <ul className="mt-2 space-y-1.5 list-disc list-inside text-xs text-[#17385E] leading-relaxed">
            {observationsList.map((obs, i) => (
              <li key={i} className="text-xs font-medium">
                <span className="text-[#17385E]">{obs}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* ── Timeline of Previous Visits ───────────────────────────────────── */}
      {hasTimeline && (
        <SectionCard icon={Clock} title="Timeline of Previous Visits" count={timelineList.length} color="emerald">
          <div className="mt-2 space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200">
            {timelineList.map((item, i) => {
              const date = typeof item === 'object' ? item.date : null;
              const event = typeof item === 'object' ? item.event : item;
              return (
                <div key={i} className="flex items-start gap-3 relative pl-1">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-sm flex items-center justify-center text-[10px] text-white font-bold shrink-0 mt-0.5 z-10">
                    {i + 1}
                  </div>
                  <div className="flex-1 bg-white/70 rounded-xl p-2.5 border border-emerald-100">
                    {date && <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">{date}</p>}
                    <p className="text-xs text-[#17385E] font-medium mt-0.5">{event}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* ── Vitals (if present in records) ─────────────────────────────────── */}
      {hasVitals && (
        <SectionCard icon={Activity} title="Vitals Detected" color="amber">
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { label: 'Blood Pressure', value: vitals.blood_pressure },
              { label: 'Pulse',          value: vitals.pulse },
              { label: 'Temperature',    value: vitals.temperature },
              { label: 'Weight',         value: vitals.weight },
              { label: 'SpO₂',           value: vitals.spo2 },
              { label: 'Blood Sugar',    value: vitals.blood_sugar },
            ].filter(v => v.value).map((v, i) => (
              <div key={i} className="bg-white/70 rounded-xl p-2.5 border border-amber-100 text-center">
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{v.label}</p>
                <p className="text-sm font-extrabold text-[#17385E] mt-0.5">{v.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Lab Results (if present) ───────────────────────────────────────── */}
      {hasLabs && (
        <SectionCard icon={FlaskConical} title={`Lab Results (${lab_results.length})`} color="slate">
          <div className="mt-2 space-y-0">
            {lab_results.map((lab, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/60 last:border-0 gap-2">
                <span className="text-xs font-semibold text-[#17385E] flex-1">{lab.test}</span>
                <span className="text-xs font-bold text-slate-700">{lab.value} {lab.unit}</span>
                {lab.reference_range && (
                  <span className="text-[10px] text-slate-400 hidden sm:block">{lab.reference_range}</span>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Patient & Doctor Details (if present) ─────────────────────────── */}
      {(hasPatient || hasDoctor) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {hasPatient && (
            <SectionCard icon={User} title="Patient Info" color="teal">
              <div className="mt-1 space-y-0.5">
                <InfoRow label="Name" value={patient.name} />
                <InfoRow label="Age" value={patient.age} />
                <InfoRow label="Gender" value={patient.gender} />
                <InfoRow label="Patient ID" value={patient.patient_id} />
              </div>
            </SectionCard>
          )}
          {hasDoctor && (
            <SectionCard icon={Stethoscope} title="Doctor / Clinic" color="indigo">
              <div className="mt-1 space-y-0.5">
                <InfoRow label="Doctor" value={doctor.name} />
                <InfoRow label="Specialization" value={doctor.specialization} />
                <InfoRow label="Hospital" value={doctor.hospital} />
                <InfoRow label="Date" value={doctor.date} />
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ── Clinical Notes & Follow-up ────────────────────────────────────── */}
      {(clinical_notes || follow_up) && (
        <SectionCard icon={FileText} title="Notes & Follow-up" color="teal">
          <div className="mt-2 space-y-3">
            {clinical_notes && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Clinical Notes</p>
                <p className="text-xs text-[#17385E] leading-relaxed">{clinical_notes}</p>
              </div>
            )}
            {follow_up && (
              <div className="flex items-start gap-2 p-3 bg-white/60 rounded-xl border border-[#18A6A1]/20">
                <CalendarClock className="w-4 h-4 text-[#18A6A1] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Follow-up</p>
                  <p className="text-xs font-semibold text-[#17385E]">{follow_up}</p>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ── Action Buttons ────────────────────────────────────────────────── */}
      <div className="pt-2 space-y-3">

        {/* Primary: Chat with AI */}
        <button
          type="button"
          onClick={onChatWithAI}
          className="w-full inline-flex items-center justify-center gap-3 py-4 px-8 rounded-full text-base font-bold text-white bg-gradient-to-r from-[#18A6A1] to-[#1a8fa8] hover:from-[#148F8B] hover:to-[#177a92] shadow-lg shadow-[#18A6A1]/30 hover:shadow-xl hover:shadow-[#18A6A1]/40 transition-all duration-200 cursor-pointer"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Chat with AI</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Secondary Row: Copy Summary & Upload Another */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-bold text-[#17385E] bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
          >
            {copied
              ? <><Check className="w-4 h-4 text-emerald-600" /><span className="text-emerald-700">Copied!</span></>
              : <><Copy className="w-4 h-4 text-[#18A6A1]" /><span>Copy Summary</span></>
            }
          </button>
          <button
            type="button"
            onClick={onReset}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Upload Another</span>
          </button>
        </div>
      </div>

    </div>
  );
}
