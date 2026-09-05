import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Clock } from 'lucide-react';

export default function RedFlagBanner({ redFlags = [], hasRedFlag = false }) {
  if (!hasRedFlag || redFlags.length === 0) {
    return (
      <div className="p-4 rounded-3xl bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-extrabold text-emerald-900 text-sm block">
              No Potential Red Flags Detected
            </span>
            <span className="text-[11px] text-emerald-700">
              No immediate acute or life-threatening symptoms were flagged in patient conversation or documents.
            </span>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-300">
          Standard Intake
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-red-50 border-2 border-red-300 p-5 shadow-soft-md space-y-3 animate-fadeIn">
      
      {/* Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-red-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs animate-pulse">
            <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-red-950 flex items-center gap-2">
              <span>Potential Red Flag Alert</span>
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-red-200 text-red-900">
                Priority Attention
              </span>
            </h3>
            <p className="text-xs font-bold text-red-800">
              Potential clinical attention required — AI-detected information — physician verification required.
            </p>
          </div>
        </div>
      </div>

      {/* Flagged Items List */}
      <div className="space-y-2.5 pt-1">
        {redFlags.map((flag, idx) => (
          <div 
            key={idx} 
            className="p-3.5 rounded-2xl bg-white border border-red-200 shadow-2xs space-y-1.5"
          >
            <p className="text-xs font-bold text-red-900 leading-relaxed">
              {flag.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-500 pt-1">
              <span className="inline-flex items-center gap-1 text-red-700 font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                <span>Source: {flag.source || "Patient conversation (AI Interview)"}</span>
              </span>

              {flag.detected_at && (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>Detected: {flag.detected_at}</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Safety Notice Footer */}
      <div className="text-[10px] text-red-700/90 font-medium">
        * Notice: This system does not make definitive clinical diagnoses. The flagged information represents high-priority self-reported symptoms or elevated lab metrics for immediate attending physician evaluation.
      </div>

    </div>
  );
}
