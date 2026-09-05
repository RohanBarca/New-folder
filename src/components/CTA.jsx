import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Stethoscope, ShieldCheck } from 'lucide-react';

export default function CTA() {
  return (
    <section className="py-20 md:py-28 bg-[#F8FBFC] relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="relative bg-gradient-to-br from-[#18A6A1] to-[#148F8B] rounded-3xl p-8 sm:p-14 text-white text-center shadow-soft-lg overflow-hidden">
          
          {/* Subtle Decorative Rings */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-black/10 blur-xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white border border-white/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ready in less than 3 minutes</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Start building a clearer medical history.
            </h2>

            <p className="text-base sm:text-lg text-teal-50 font-normal leading-relaxed">
              Upload your documents, answer quick AI-guided questions, and walk into your next consultation with full confidence.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/patient/entry"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-base font-bold text-[#17385E] bg-white hover:bg-slate-50 shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                Get Started
                <ArrowRight className="w-4 h-4 text-[#18A6A1]" />
              </Link>

              <a
                href="#for-doctors"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-base font-bold text-white bg-[#17385E]/60 hover:bg-[#17385E] border border-white/30 hover:border-white transition-all duration-200"
              >
                <Stethoscope className="w-4 h-4 text-teal-300" />
                For Healthcare Providers
              </a>
            </div>

            <div className="pt-4 flex items-center justify-center gap-6 text-xs text-teal-100 font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                No credit card required
              </span>
              <span>•</span>
              <span>Encrypted & Confidential</span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
