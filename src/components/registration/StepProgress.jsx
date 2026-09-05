import React from 'react';
import { Check, ShieldCheck, User } from 'lucide-react';

export default function StepProgress({ currentStep = 1 }) {
  const steps = [
    { id: 1, label: 'ABHA Verification', icon: ShieldCheck },
    { id: 2, label: 'Basic Details', icon: User },
  ];

  return (
    <div className="w-full max-w-sm mx-auto mb-8">
      <div className="flex items-center justify-between relative">
        {/* Connecting Line */}
        <div className="absolute left-1/4 right-1/4 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0">
          <div 
            className="h-full bg-[#18A6A1] transition-all duration-500 ease-in-out" 
            style={{ width: currentStep >= 2 ? '100%' : '0%' }}
          />
        </div>

        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const IconComp = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-[#18A6A1] text-white shadow-sm ring-4 ring-[#EAFafa]'
                    : isActive
                    ? 'bg-[#17385E] text-white ring-4 ring-[#EAFafa] shadow-soft-sm'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <IconComp className="w-4 h-4" />
                )}
              </div>
              
              <span 
                className={`mt-2 text-xs font-semibold tracking-tight transition-colors ${
                  isActive || isCompleted ? 'text-[#17385E]' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
