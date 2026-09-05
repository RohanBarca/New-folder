import React from 'react';
import { Activity, ShieldCheck, Heart, ArrowUp } from 'lucide-react';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#17385E] text-white pt-16 pb-12 border-t border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-700/60">
          
          {/* Col 1: Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] flex items-center justify-center shadow-md text-white">
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-white">
                Med<span className="text-[#18A6A1]">Sync</span>
              </span>
            </div>
            
            <p className="text-sm font-semibold text-teal-300">
              AI-Powered Medical History Assistant
            </p>
            
            <p className="text-xs sm:text-sm text-slate-300 max-w-sm leading-relaxed font-normal">
              Empowering patients and doctors with clear, structured medical history summaries and intelligent record organization before consultations.
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <a href="#hero" className="hover:text-[#18A6A1] transition-colors">Home</a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#18A6A1] transition-colors">How it Works</a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#18A6A1] transition-colors">Features</a>
              </li>
              <li>
                <a href="#for-doctors" className="hover:text-[#18A6A1] transition-colors">For Doctors</a>
              </li>
              <li>
                <a href="#about-us" className="hover:text-[#18A6A1] transition-colors">About Us</a>
              </li>
            </ul>
          </div>

          {/* Col 3: Medical Ethics & Notice */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300">
              Clinical Disclaimer
            </h4>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 leading-relaxed space-y-2">
              <p>
                MedSync is an informational summarization tool designed to assist history taking. It is not a medical device and does not render diagnostic or treatment decisions.
              </p>
              <div className="flex items-center gap-1.5 text-teal-300 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Protected by HIPAA-compliant design principles</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 MedSync. All rights reserved.</p>
          
          <div className="flex items-center gap-6">
            <button
              onClick={() => alert("Privacy policy is available in production.")}
              className="hover:text-teal-300 transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => alert("Terms of service are available in production.")}
              className="hover:text-teal-300 transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1 hover:text-white transition-colors"
            >
              Back to top
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
