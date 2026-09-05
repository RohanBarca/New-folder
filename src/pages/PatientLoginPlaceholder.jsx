import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, LogIn, Construction } from 'lucide-react';

export default function PatientLoginPlaceholder() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FBFC] text-[#17385E] selection:bg-[#18A6A1] selection:text-white">
      {/* Header */}
      <header className="py-6 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 bg-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            to="/patient/entry"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#17385E]/75 hover:text-[#18A6A1] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Selection</span>
          </Link>

          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#18A6A1] flex items-center justify-center text-white">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-lg font-extrabold text-[#17385E]">
              Med<span className="text-[#18A6A1]">Sync</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-soft-lg text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#EAFafa] border border-[#18A6A1]/20 flex items-center justify-center text-[#18A6A1] mx-auto">
            <LogIn className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[#17385E]">Patient Login</h1>
            <p className="text-sm text-slate-500">
              Authentication and patient dashboard will be integrated in upcoming development phases.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs flex items-center gap-2.5 text-left">
            <Construction className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Form and authentication backend will be hooked up in Phase 6.</span>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              to="/patient/entry"
              className="w-full py-3 rounded-full text-sm font-bold text-[#17385E] bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Choose Another Option
            </Link>
            <Link
              to="/"
              className="text-xs font-semibold text-[#18A6A1] hover:underline"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
