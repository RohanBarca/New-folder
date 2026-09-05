import React from 'react';
import { 
  ClipboardList, 
  UploadCloud, 
  Sparkles, 
  MessageSquare, 
  FileCheck, 
  ChevronRight,
  ArrowRight
} from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Fill Patient Form',
      description: 'Share your basic details, symptoms and relevant medical history.',
      icon: ClipboardList,
    },
    {
      number: '02',
      title: 'Upload Records',
      description: 'Upload previous prescriptions, reports or medical documents.',
      icon: UploadCloud,
    },
    {
      number: '03',
      title: 'AI Analysis',
      description: 'AI reads your information and organizes your medical history.',
      icon: Sparkles,
    },
    {
      number: '04',
      title: 'AI Interview',
      description: 'Answer only the questions needed to complete your history.',
      icon: MessageSquare,
    },
    {
      number: '05',
      title: 'Doctor Ready',
      description: 'Get a structured summary ready for your doctor.',
      icon: FileCheck,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white relative">
      {/* Subtle background divider line */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16 md:mb-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAFafa] text-xs font-bold text-[#18A6A1] uppercase tracking-wider">
            Step-by-Step Workflow
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#17385E] tracking-tight">
            How MedSync Works
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            From scattered medical records to a complete patient history before the consultation.
          </p>
        </div>

        {/* Five Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-4 relative">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={step.number} className="relative flex flex-col items-center group">
                
                {/* Connecting arrow for desktop between steps */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-10 -right-3.5 z-10 text-slate-300 group-hover:text-[#18A6A1] transition-colors duration-200">
                    <ChevronRight className="w-5 h-5 stroke-[2]" />
                  </div>
                )}

                {/* Card */}
                <div className="w-full h-full bg-[#F8FBFC] hover:bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-[#18A6A1]/40 shadow-soft-sm hover:shadow-soft transition-all duration-300 flex flex-col items-center text-center group-hover:-translate-y-1">
                  
                  {/* Step Number & Icon */}
                  <div className="relative mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-[#18A6A1]/20 flex items-center justify-center text-[#18A6A1] shadow-soft-sm group-hover:bg-[#18A6A1] group-hover:text-white transition-all duration-300">
                      <IconComponent className="w-7 h-7 stroke-[2]" />
                    </div>
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-[#17385E] text-white text-[11px] font-bold shadow-sm">
                      {step.number}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-[#17385E] mb-2">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>

                </div>

              </div>
            );
          })}
        </div>

        {/* Bottom Helper Callout */}
        <div className="mt-14 max-w-2xl mx-auto p-4 sm:p-5 rounded-2xl bg-[#EAFafa]/70 border border-[#18A6A1]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#18A6A1] animate-pulse"></div>
            <p className="text-xs sm:text-sm text-[#17385E] font-medium">
              Average intake preparation takes under <strong className="font-bold text-[#18A6A1]">3 minutes</strong>.
            </p>
          </div>
          <a
            href="#features"
            className="text-xs sm:text-sm font-bold text-[#18A6A1] hover:text-[#148F8B] inline-flex items-center gap-1 shrink-0"
          >
            Explore features
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </section>
  );
}
