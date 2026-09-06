import React from 'react';
import { ShieldCheck, HeartHandshake, FileSearch, UserCheck, AlertTriangle } from 'lucide-react';

export default function SafetySection() {
  return (
    <section className="py-16 md:py-20 bg-white border-y border-slate-200/80 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Card */}
        <div className="bg-[#17324D] rounded-xl p-8 sm:p-12 text-white shadow-sm relative overflow-hidden">
          
          {/* Subtle background badge shape */}
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#18A6A1]/30 border border-[#18A6A1]/50 text-xs font-bold text-teal-200">
              <ShieldCheck className="w-4 h-4 text-teal-300" />
              <span>Responsible Healthcare AI</span>
            </div>

            {/* Headline */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              AI assists. <span className="text-[#18A6A1]">Doctors decide.</span>
            </h2>

            {/* Core Description */}
            <p className="text-base sm:text-lg text-slate-200 max-w-3xl leading-relaxed font-normal">
              MedSync organizes patient information and assists with medical history collection. 
              It does not replace professional medical judgment, formulate diagnoses, or prescribe treatments.
            </p>

            {/* Safety Principles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4 border-t border-white/10">
              
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-teal-300 font-bold text-sm">
                  <UserCheck className="w-4 h-4" />
                  <span>Clinician In Control</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  All clinical decisions, diagnoses, and care plans are made solely by certified physicians.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-teal-300 font-bold text-sm">
                  <FileSearch className="w-4 h-4" />
                  <span>Source Verification</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  Every summarized fact links back directly to the original medical document for instant verification.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-teal-300 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Zero Assumptions</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  Missing information is explicitly marked unknown rather than guessed by AI.
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
