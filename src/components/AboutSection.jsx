import React from 'react';
import { Target, Users, HeartHandshake, Layers } from 'lucide-react';

export default function AboutSection() {
  return (
    <section id="about-us" className="py-20 md:py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAFafa] text-xs font-bold text-[#18A6A1] uppercase tracking-wider">
            Our Purpose
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#17385E] tracking-tight">
            Bridging Patient Memory & Clinical Consultations
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            During medical appointments, patients often forget crucial medical details while doctors struggle with scattered paper records. MedSync was built to bridge that gap with intelligent, respectful assistance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="p-7 rounded-3xl bg-[#F8FBFC] border border-slate-200/90 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EAFafa] flex items-center justify-center text-[#18A6A1]">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#17385E]">Patient-Centric Simplicity</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Designed for ease of use across all age groups. Upload files in any format, answer simple conversational questions, and finish in minutes.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-[#F8FBFC] border border-slate-200/90 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EAFafa] flex items-center justify-center text-[#18A6A1]">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#17385E]">Structured Medical Intelligence</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              We convert unstructured text and hand-written prescriptions into standardized, structured medical profiles ready for any EMR or clinical workflow.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-[#F8FBFC] border border-slate-200/90 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EAFafa] flex items-center justify-center text-[#18A6A1]">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#17385E]">Empowering Meaningful Care</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              When doctors spend less time interrogating basic medical history and decoding paper slips, they can spend more quality time treating the person in front of them.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
