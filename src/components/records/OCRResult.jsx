import React, { useState } from 'react';
import {
  CheckCircle2, Copy, Check, RefreshCw, FileText, AlertCircle,
  Clock, Sparkles, ArrowRight, ShieldCheck
} from 'lucide-react';

export default function OCRResult({ text, processingTime, isEmpty, onReset, onAnalyzeWithAI, aiError, documentId, filename }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  // ── EMPTY OCR STATE ───────────────────────────────────────────────────────
  if (isEmpty || !text || text.trim().length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-soft-lg text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-[#17385E]">
            We couldn't find readable text in this document.
          </h2>
          <p className="text-sm text-slate-500">
            The image or PDF might be too blurry, low-resolution, or contains handwritten content that OCR could not detect.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 py-3.5 px-8 rounded-full text-base font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B] shadow-md shadow-[#18A6A1]/20 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Another Document</span>
        </button>
      </div>
    );
  }

  // ── SUCCESSFUL OCR STATE ──────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-soft-lg space-y-6 text-left animate-fadeIn">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#17385E]">Document Read Successfully</h2>
            <p className="text-xs text-slate-500 mt-0.5">Raw text extracted via OCR.space Engine</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {documentId && (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Saved to Patient Record</span>
            </div>
          )}
          {processingTime !== undefined && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-[#18A6A1]" />
              <span>Processed in {processingTime}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Extracted Text */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#18A6A1]" />
            <span className="text-xs font-bold text-[#17385E] uppercase tracking-wider">Extracted Text</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">{text.length} characters</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-[#F8FBFC] p-4 sm:p-5 max-h-52 overflow-y-auto">
          <pre className="text-xs text-[#17385E] font-mono leading-relaxed whitespace-pre-wrap select-text font-normal">
            {text}
          </pre>
        </div>
      </div>

      {/* AI Error alert */}
      {aiError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">AI Analysis Failed</p>
            <p className="text-red-600 mt-0.5">{aiError}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 pt-1">

        {/* Primary: Analyze with AI */}
        <button
          type="button"
          onClick={onAnalyzeWithAI}
          className="w-full inline-flex items-center justify-center gap-2.5 py-4 px-8 rounded-full text-base font-bold text-white bg-gradient-to-r from-[#18A6A1] to-[#1a8fa8] hover:from-[#148F8B] hover:to-[#177a92] shadow-lg shadow-[#18A6A1]/30 transition-all duration-200 cursor-pointer"
        >
          <Sparkles className="w-5 h-5" />
          <span>Analyze with MedSync AI</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Secondary row */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-bold text-[#17385E] bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
          >
            {copied
              ? <><Check className="w-4 h-4 text-emerald-600" /><span className="text-emerald-700">Copied!</span></>
              : <><Copy className="w-4 h-4 text-[#18A6A1]" /><span>Copy Text</span></>
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

      {/* Next step teaser */}
      <div className="p-3.5 rounded-2xl bg-[#EAFafa]/70 border border-[#18A6A1]/20 flex items-start gap-2.5 text-xs text-[#17385E]/80">
        <Sparkles className="w-4 h-4 text-[#18A6A1] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Next:</strong> MedSync AI will read this record and produce a structured medical summary with patient overview, complaints, history, diagnoses, medications, observations, and visit timeline.
        </p>
      </div>

    </div>
  );
}
