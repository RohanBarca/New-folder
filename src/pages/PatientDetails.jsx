import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, ArrowLeft } from 'lucide-react';
import StepProgress from '../components/registration/StepProgress';
import PatientBasicForm from '../components/registration/PatientBasicForm';

export default function PatientDetails() {
  const location = useLocation();
  const abhaProfile = location.state?.abhaProfile || null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FBFC] text-[#17385E] selection:bg-[#18A6A1] selection:text-white relative overflow-hidden">
      
      {/* Background Soft Glows */}

      {/* Top Header Navigation */}
      <header className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          
          {/* Back Button */}
          <Link
            to="/patient/register"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#17385E]/75 hover:text-[#18A6A1] transition-colors py-2 px-3 rounded-full hover:bg-white/80 border border-transparent hover:border-slate-200/80"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
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

          <div className="w-16 hidden sm:block"></div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-soft-lg">
          
          {/* Progress Indicator (Step 2 Active) */}
          <StepProgress currentStep={2} />

          {/* Basic Details Form */}
          <PatientBasicForm abhaData={abhaProfile} />

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white/50">
        © 2026 MedSync. All rights reserved.
      </footer>

    </div>
  );
}
