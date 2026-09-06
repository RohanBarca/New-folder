import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  ArrowLeft, 
  LogIn, 
  UserRound, 
  UserRoundPlus, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function PatientAuthEntry() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FBFC] text-[#17385E] selection:bg-[#18A6A1] selection:text-white relative overflow-hidden">
      
      {/* Top Header Bar */}
      <header className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          
          {/* Back to Home Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#17385E]/75 hover:text-[#18A6A1] transition-colors py-2 px-3 rounded-full hover:bg-white/80 border border-transparent hover:border-slate-200/80 shadow-none hover:shadow-soft-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          {/* MedSync Logo */}
          <Link to="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] flex items-center justify-center shadow-md shadow-[#18A6A1]/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="flex items-baseline">
              <span className="text-xl font-extrabold tracking-tight text-[#17385E]">
                Med<span className="text-[#18A6A1]">Sync</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#18A6A1] ml-0.5"></span>
            </div>
          </Link>

          {/* Placeholder spacer for center balance */}
          <div className="w-24 hidden sm:block"></div>

        </div>
      </header>

      {/* Main Content: Centered Selection Cards */}
      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-4xl w-full mx-auto text-center space-y-10">
          
          {/* Page Title and Subtitle */}
          <div className="space-y-3 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#EAFafa] border border-[#18A6A1]/30 text-xs font-bold text-[#18A6A1]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Patient Portal</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-[#17385E] tracking-tight">
              Welcome to <span className="text-[#18A6A1]">MedSync</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
              Your medical history, organized and ready for care.
            </p>
          </div>

          {/* Two Large Selectable Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 text-left">
            
            {/* OPTION 1 — EXISTING PATIENT */}
            <div 
              onClick={() => navigate('/patient/login')}
              className="group cursor-pointer bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 hover:border-[#18A6A1] shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-5">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-[#EAFafa] border border-[#18A6A1]/20 flex items-center justify-center text-[#18A6A1] group-hover:bg-[#18A6A1] group-hover:text-white transition-all duration-300 shadow-soft-sm">
                  <UserRound className="w-8 h-8 stroke-[2]" />
                </div>

                {/* Heading */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-[#17385E] group-hover:text-[#18A6A1] transition-colors">
                    Already a Patient?
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Log in to continue your MedSync journey and access your medical information.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-base font-bold text-[#17385E] bg-slate-50 hover:bg-[#EAFafa] border border-slate-200 group-hover:border-[#18A6A1] group-hover:text-[#18A6A1] transition-all duration-200"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform ml-1" />
                </button>
              </div>
            </div>

            {/* OPTION 2 — NEW PATIENT */}
            <div 
              onClick={() => navigate('/patient/register')}
              className="group cursor-pointer bg-white rounded-3xl p-8 sm:p-10 border-2 border-[#18A6A1]/40 hover:border-[#18A6A1] shadow-soft hover:shadow-teal-glow hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
            >
              {/* Recommended Badge */}
              <div className="absolute top-0 right-0 bg-[#18A6A1] text-white text-[11px] font-bold uppercase tracking-wider px-4 py-1 rounded-bl-2xl">
                Get Started
              </div>

              <div className="space-y-5">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-[#EAFafa] border border-[#18A6A1]/30 flex items-center justify-center text-[#18A6A1] group-hover:bg-[#18A6A1] group-hover:text-white transition-all duration-300 shadow-soft-sm">
                  <UserRoundPlus className="w-8 h-8 stroke-[2]" />
                </div>

                {/* Heading */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-[#17385E] group-hover:text-[#18A6A1] transition-colors">
                    New to MedSync?
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    Create your patient account and start building your medical history.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-base font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B] shadow-md shadow-[#18A6A1]/20 transition-all duration-200"
                >
                  <UserRoundPlus className="w-4 h-4" />
                  <span>Register as New Patient</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform ml-1" />
                </button>
              </div>
            </div>

          </div>

          {/* Footer note */}
          <div className="pt-4 text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#18A6A1]" />
            <span>Secure & HIPAA-Compliant Architecture</span>
          </div>

        </div>
      </main>

      {/* Simple Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white/50">
        © 2026 MedSync. All rights reserved.
      </footer>

    </div>
  );
}
