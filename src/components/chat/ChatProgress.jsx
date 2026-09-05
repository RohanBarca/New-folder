import React from 'react';
import { Leaf } from 'lucide-react';

export default function ChatProgress({ currentStep, totalSteps = 8, sectionName, ayushParameter, mode = 'general', isComplete }) {
  const isAyush = mode === 'ayush';
  const percentage = isComplete 
    ? 100 
    : Math.min(Math.round(((currentStep - 1) / totalSteps) * 100), 100);

  return (
    <div className="bg-[#EAFafa]/60 border-b border-[#18A6A1]/20 py-2.5 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        
        {/* Step count, Mode & Section Title */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5 flex-wrap">
          {isAyush ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              <span>AYUSH History</span>
            </span>
          ) : (
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#18A6A1] bg-white px-2.5 py-0.5 rounded-full border border-[#18A6A1]/30 shadow-2xs">
              {isComplete ? 'Complete' : `Step ${currentStep}`}
            </span>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-[#17385E]">
              {isComplete 
                ? (isAyush ? 'AYUSH History Complete' : 'Medical History Complete') 
                : (sectionName || 'Clinical Interview')}
            </span>

            {isAyush && ayushParameter && !isComplete && (
              <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-[11px] font-extrabold text-emerald-800 shadow-2xs">
                {ayushParameter}
              </span>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="flex items-center gap-3 sm:w-56">
          <div className="flex-1 h-2 bg-white rounded-full overflow-hidden border border-slate-200/80 p-0.5">
            <div 
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isAyush 
                  ? 'bg-gradient-to-r from-emerald-500 to-[#18A6A1]' 
                  : 'bg-gradient-to-r from-[#18A6A1] to-[#25C4BE]'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-[11px] font-bold text-slate-500 shrink-0">
            {isComplete ? '100%' : 'In Progress'}
          </span>
        </div>

      </div>
    </div>
  );
}
