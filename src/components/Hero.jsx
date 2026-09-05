import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Stethoscope, 
  ShieldCheck, 
  Bot, 
  Sparkles, 
  FileText, 
  UploadCloud, 
  Mic, 
  CheckCircle2, 
  FileCheck2, 
  Clock, 
  Activity,
  HeartPulse
} from 'lucide-react';

export default function Hero() {
  return (
    <section id="hero" className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background Soft Glow Accents */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#18A6A1]/10 via-[#EAFafa]/40 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-40 right-10 w-72 h-72 bg-[#18A6A1]/5 rounded-full blur-2xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline & CTAs */}
          <div className="lg:col-span-6 space-y-8 text-center lg:text-left">
            
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EAFafa] border border-[#18A6A1]/30 text-xs sm:text-sm font-bold text-[#18A6A1] shadow-soft-sm">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#18A6A1] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#18A6A1]"></span>
              </span>
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-Powered Medical History Assistant</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-[#17385E] leading-[1.15]">
              Your Medical History, <br />
              <span className="text-[#18A6A1] relative inline-block">
                Organized by AI.
                {/* Subtle highlight curve under text */}
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#18A6A1]/20 -z-10" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0 15 Q50 0 100 15" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            {/* Supporting Subtext */}
            <p className="text-base sm:text-lg text-[#17385E]/75 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Upload your previous medical records and let MedSync understand your history, 
              identify missing information, and prepare a clear summary for your doctor.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                to="/patient/entry"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full text-base font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B] shadow-md shadow-[#18A6A1]/25 hover:shadow-teal-glow hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#for-doctors"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-base font-bold text-[#17385E] bg-white hover:bg-[#EAFafa] border border-[#CBD5E1] hover:border-[#18A6A1] shadow-soft-sm hover:-translate-y-0.5 transition-all duration-200"
              >
                <Stethoscope className="w-4 h-4 text-[#18A6A1]" />
                I'm a Doctor
              </a>
            </div>

            {/* Trust Row */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs sm:text-sm font-semibold text-[#17385E]/80">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#EAFafa] flex items-center justify-center text-[#18A6A1]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>Privacy Focused</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#EAFafa] flex items-center justify-center text-[#18A6A1]">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <span>AI Assisted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#EAFafa] flex items-center justify-center text-[#18A6A1]">
                  <HeartPulse className="w-3.5 h-3.5" />
                </div>
                <span>Patient Friendly</span>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Visual Illustration (Matching Design 1) */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            
            {/* Mint Backdrop Circle from Design 1 */}
            <div className="relative w-full max-w-[480px] aspect-square flex items-center justify-center">
              
              {/* Soft geometric circular backdrop */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#EAFafa] via-[#D5F5F3] to-[#C0EFEA]/60 opacity-90 shadow-inner" />
              
              {/* Outer decorative ring */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#18A6A1]/20 animate-[spin_60s_linear_infinite]" />

              {/* Main Medical Record Card (Fictional Demo) */}
              <div className="relative z-10 w-[90%] sm:w-[380px] bg-white rounded-2xl p-5 sm:p-6 shadow-soft-lg border border-[#18A6A1]/20">
                
                {/* Card Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EAFafa] flex items-center justify-center text-[#18A6A1]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#17385E]">Patient History</h3>
                      <p className="text-[11px] text-slate-400 font-medium">Demo Consultation Profile</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                </div>

                {/* Patient Information Content Blocks */}
                <div className="mt-4 space-y-3.5">
                  
                  {/* Item 1: Medical History */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-[#18A6A1]/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Medical History</span>
                      <span className="text-[10px] text-slate-400">Past record</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-[#17385E] mt-0.5">Hypertension</p>
                  </div>

                  {/* Item 2: Current Complaint */}
                  <div className="p-2.5 rounded-xl bg-[#EAFafa]/60 border border-[#18A6A1]/20">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#18A6A1]">Current Complaint</span>
                      <span className="text-[10px] text-[#18A6A1]/80 font-medium">3 days duration</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-[#17385E] mt-0.5">Fever & Cough</p>
                  </div>

                  {/* Item 3: Records Analyzed Summary */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-[#18A6A1]" />
                      <span className="text-xs font-semibold text-slate-600">Records Analyzed</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-md bg-[#17385E] text-white text-xs font-bold">
                      04 Documents
                    </span>
                  </div>

                </div>
              </div>

              {/* Floating Element 1: Upload Card (Top Right) */}
              <div className="absolute -top-3 right-0 sm:right-2 z-20 bg-white rounded-2xl p-3.5 shadow-soft-lg border border-[#18A6A1]/25 flex items-center gap-3 animate-float-slow">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#18A6A1] to-[#2DD4BF] flex items-center justify-center text-white shadow-sm">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#17385E]">Records uploaded</h4>
                  <p className="text-[10px] font-semibold text-[#18A6A1]">PDF • JPG • PNG</p>
                </div>
              </div>

              {/* Floating Element 2: AI Assistant Prompt (Bottom Left) */}
              <div className="absolute -bottom-4 left-0 sm:-left-2 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-soft-lg border border-[#18A6A1]/20 max-w-[210px] sm:max-w-[240px] animate-float-delayed">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-[#EAFafa] flex items-center justify-center text-[#18A6A1]">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#17385E]">AI Assistant</span>
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[11px] font-medium text-slate-600 leading-snug">
                  "I'll collect only the missing details."
                </p>
              </div>

              {/* Floating Element 3: Voice / Audio Waveform Widget (Bottom Right) */}
              <div className="absolute bottom-6 -right-2 sm:-right-4 z-20 bg-[#17385E] text-white rounded-full py-2 px-3.5 shadow-soft-lg flex items-center gap-2.5 border border-white/20">
                <div className="w-6 h-6 rounded-full bg-[#18A6A1] flex items-center justify-center text-white">
                  <Mic className="w-3.5 h-3.5" />
                </div>
                {/* Audio Waveform Bars */}
                <div className="flex items-center gap-0.5 h-5">
                  <span className="w-0.5 bg-[#18A6A1] rounded-full animate-[waveform_0.8s_ease-in-out_infinite]" style={{ height: '14px' }}></span>
                  <span className="w-0.5 bg-white rounded-full animate-[waveform_1.1s_ease-in-out_0.2s_infinite]" style={{ height: '20px' }}></span>
                  <span className="w-0.5 bg-[#18A6A1] rounded-full animate-[waveform_0.7s_ease-in-out_0.4s_infinite]" style={{ height: '10px' }}></span>
                  <span className="w-0.5 bg-white rounded-full animate-[waveform_1.3s_ease-in-out_0.1s_infinite]" style={{ height: '18px' }}></span>
                  <span className="w-0.5 bg-[#18A6A1] rounded-full animate-[waveform_0.9s_ease-in-out_0.3s_infinite]" style={{ height: '12px' }}></span>
                </div>
                <span className="text-[10px] font-semibold text-teal-200 hidden sm:inline">Voice Ready</span>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
