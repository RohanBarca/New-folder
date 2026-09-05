import React from 'react';
import { 
  FileStack, 
  HelpCircle, 
  Lock, 
  FileCheck2, 
  Sparkles,
  ArrowRight,
  CheckCircle,
  ScanText,
  FilterX,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';

export default function Features() {
  const features = [
    {
      id: 'records',
      icon: ScanText,
      badge: 'OCR & Vision AI',
      title: 'Understand Old Records',
      description: 'Turn scattered medical documents into organized information.',
      detail: 'Extracts critical diagnoses, prescriptions, lab values, and past treatments from PDFs, scans, and phone photos without manual transcription.',
      tag: 'Multi-format OCR',
    },
    {
      id: 'questions',
      icon: FilterX,
      badge: 'Context-Aware AI',
      title: 'No Repeated Questions',
      description: 'AI identifies what\'s already known before asking new questions.',
      detail: 'Smart gap detection checks your existing records first, only prompting you for missing essentials like unknown allergies or current symptom duration.',
      tag: 'Zero Redundancy',
    },
    {
      id: 'privacy',
      icon: ShieldCheck,
      badge: 'Protected & Private',
      title: 'Privacy Focused',
      description: 'Keep patient information protected and make AI assistance transparent.',
      detail: 'All documents are processed with strict isolation. Every extracted item is clearly attributed so doctors know exactly which document provided the data.',
      tag: 'Transparent AI',
    },
    {
      id: 'doctor-ready',
      icon: Stethoscope,
      badge: 'Clinical Grade',
      title: 'Doctor-Ready Summary',
      description: 'Give doctors a clear view of the patient\'s collected history.',
      detail: 'Delivers a concise, chronological timeline of medical conditions, vital trends, and current complaints in a clean, standardized format.',
      tag: 'Standardized Format',
    },
  ];

  return (
    <section id="features" className="py-20 md:py-28 bg-[#F8FBFC] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAFafa] text-xs font-bold text-[#18A6A1] uppercase tracking-wider">
            Core Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#17385E] tracking-tight">
            Less paperwork. <br className="hidden sm:inline" />
            <span className="text-[#18A6A1]">More context.</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            MedSync helps patients prepare while giving doctors a clearer starting point.
          </p>
        </div>

        {/* 4 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feature) => {
            const IconComp = feature.icon;
            return (
              <div
                key={feature.id}
                className="group relative bg-white rounded-3xl p-8 border border-slate-200/90 hover:border-[#18A6A1]/40 shadow-soft hover:shadow-soft-lg transition-all duration-300 flex flex-col justify-between"
              >
                {/* Card Top */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#EAFafa] border border-[#18A6A1]/20 flex items-center justify-center text-[#18A6A1] group-hover:bg-[#18A6A1] group-hover:text-white transition-all duration-300 shadow-soft-sm">
                      <IconComp className="w-7 h-7 stroke-[2]" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-[#17385E] text-xs font-semibold">
                      {feature.badge}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-[#17385E] mb-3 group-hover:text-[#18A6A1] transition-colors">
                    {feature.title}
                  </h3>

                  <p className="text-base font-semibold text-slate-700 mb-2">
                    "{feature.description}"
                  </p>

                  <p className="text-sm text-slate-500 leading-relaxed font-normal">
                    {feature.detail}
                  </p>
                </div>

                {/* Card Bottom Tag */}
                <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#18A6A1]">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {feature.tag}
                  </span>
                  <span className="text-xs text-slate-400 group-hover:text-[#18A6A1] transition-colors flex items-center gap-1">
                    Learn more
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
