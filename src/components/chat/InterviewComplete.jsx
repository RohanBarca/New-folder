import React, { useState } from 'react';
import { CheckCircle2, ClipboardCheck, ArrowRight, RefreshCw, FileText, Info, Leaf, ShieldAlert, PlusCircle } from 'lucide-react';

export default function InterviewComplete({ qnaPairs = [], mode = 'general', ayushHistory = null, onStartAyush, onRestart, onViewSummary }) {
  const [noticeMessage, setNoticeMessage] = useState('');
  const isAyush = mode === 'ayush';

  const handleContinueClick = () => {
    setNoticeMessage('AI history report saved for healthcare provider review.');
    if (onViewSummary) {
      onViewSummary();
      return;
    }
    setTimeout(() => {
      setNoticeMessage('');
    }, 4000);
  };

  const ayushParamsList = [
    { label: 'Prakriti', key: 'prakriti' },
    { label: 'Vikriti', key: 'vikriti' },
    { label: 'Sara', key: 'sara' },
    { label: 'Samhanana', key: 'samhanana' },
    { label: 'Pramana', key: 'pramana' },
    { label: 'Satmya', key: 'satmya' },
    { label: 'Sattva', key: 'sattva' },
    { label: 'Ahara Shakti', key: 'ahara_shakti' },
    { label: 'Vyayama Shakti', key: 'vyayama_shakti' },
    { label: 'Vaya', key: 'vaya' },
    { label: 'Ahara', key: 'ahara' },
    { label: 'Vihara', key: 'vihara' },
    { label: 'Nidana', key: 'nidana' },
    { label: 'Samprapti', key: 'samprapti' },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-soft-lg space-y-6 text-left animate-fadeIn max-w-xl mx-auto my-4">
      
      {/* Header Badge */}
      <div className="flex flex-col items-center text-center space-y-3 pb-5 border-b border-slate-200">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-md ${
          isAyush ? 'bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-emerald-500/10' : 'bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-emerald-500/10'
        }`}>
          {isAyush ? <Leaf className="w-9 h-9 stroke-[2.2] text-emerald-600" /> : <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />}
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-[#17385E]">
            {isAyush ? 'AYUSH History Complete' : 'General Medical History Complete'}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-md">
            {isAyush 
              ? "Your Ayurvedic history has been collected for review by your healthcare professional." 
              : "Thank you. We've collected your basic general medical history."}
          </p>
        </div>
      </div>

      {/* AYUSH Verification Disclaimer Badge */}
      {isAyush && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>AI-generated assessment — requires practitioner verification.</span>
        </div>
      )}

      {/* Summary Card */}
      <div className={`rounded-2xl p-5 border space-y-3 ${
        isAyush ? 'bg-emerald-50/50 border-emerald-200' : 'bg-[#EAFafa]/70 border-[#18A6A1]/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#17385E] uppercase tracking-wider">
            <ClipboardCheck className={`w-4 h-4 ${isAyush ? 'text-emerald-600' : 'text-[#18A6A1]'}`} />
            <span>{isAyush ? 'AYUSH History Overview' : 'Interview Summary'}</span>
          </div>
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
            isAyush ? 'bg-emerald-100 border border-emerald-300 text-emerald-800' : 'bg-emerald-100 border border-emerald-300 text-emerald-700'
          }`}>
            {isAyush ? 'Dashavidha Pariksha Collected' : 'General Medical Collected'}
          </span>
        </div>

        {/* AYUSH Parameters Grid */}
        {isAyush ? (
          <div className="grid grid-cols-2 gap-2 pt-2">
            {ayushParamsList.map((param) => {
              const val = ayushHistory?.[param.key];
              const isCollected = Boolean(val && String(val).trim());
              return (
                <div key={param.key} className="bg-white/90 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between gap-1 text-xs">
                  <span className="font-bold text-[#17385E] truncate">{param.label}</span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                    isCollected 
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    {isCollected ? 'Collected' : 'Collected'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Questions Answered</span>
              <p className="text-lg font-extrabold text-[#17385E] mt-0.5">{qnaPairs.length}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Status</span>
              <p className="text-xs font-extrabold text-emerald-600 mt-1">Ready for Review</p>
            </div>
          </div>
        )}

        {/* Collected Q&A Snippets */}
        {qnaPairs.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
            <p className="text-[11px] font-bold uppercase text-[#17385E] tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#18A6A1]" />
              <span>Collected Responses</span>
            </p>
            <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
              {qnaPairs.map((item, index) => (
                <div key={index} className="bg-white/90 rounded-xl p-2.5 border border-slate-200/80 text-xs space-y-1">
                  <p className="font-bold text-[#18A6A1]">{item.question}</p>
                  <p className="text-[#17385E] font-medium pl-2 border-l-2 border-[#18A6A1]/50">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Option to Add AYUSH Mode after General Mode finishes */}
      {!isAyush && onStartAyush && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-left space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-emerald-800">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-emerald-950">Add Ayurvedic / AYUSH History?</h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Collect Dashavidha Pariksha parameters (Prakriti, Agni, Ahara & Vihara) for holistic practitioner review.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartAyush}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-full text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-[#18A6A1] hover:from-emerald-700 hover:to-[#148F8B] shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Ayurvedic / AYUSH Consultation History</span>
          </button>
        </div>
      )}

      {/* Notice Message Toast */}
      {noticeMessage && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 pt-1">
        <button
          type="button"
          onClick={handleContinueClick}
          className="w-full inline-flex items-center justify-center gap-2.5 py-4 px-8 rounded-full text-base font-bold text-white bg-gradient-to-r from-[#18A6A1] to-[#1a8fa8] hover:from-[#148F8B] hover:to-[#177a92] shadow-lg shadow-[#18A6A1]/30 transition-all duration-200 cursor-pointer"
        >
          <span>Save & Finish Interview</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Start Over / Retake Interview</span>
        </button>
      </div>

    </div>
  );
}
