import React from 'react';
import { 
  Leaf, 
  ShieldCheck, 
  Sparkles, 
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function AyushHistorySection({ ayushData = null }) {
  if (!ayushData) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-soft-sm p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#17385E]">
                AYUSH / Ayurvedic History (Dashavidha Pariksha)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Traditional holistic health evaluation parameters
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
            Optional Module
          </span>
        </div>

        <div className="py-8 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-200/80">
          <Leaf className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
          <p className="text-xs font-bold text-slate-600">AYUSH history not collected</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            This patient completed standard General Medical intake only.
          </p>
        </div>
      </div>
    );
  }

  const parameters = [
    { key: 'prakriti', label: '1. Prakriti (Natural Constitution)', desc: 'Baseline physical & constitutional tendency' },
    { key: 'vikriti', label: '2. Vikriti (Current Imbalance)', desc: 'Active doshic deviations from baseline' },
    { key: 'sara', label: '3. Sara (Tissue Vitality)', desc: 'Quality & strength of primary bodily dhatus' },
    { key: 'samhanana', label: '4. Samhanana (Body Compactness)', desc: 'Bone density, muscular tone & firmness' },
    { key: 'pramana', label: '5. Pramana (Anthropometric Proportions)', desc: 'Body symmetry and standard physical build' },
    { key: 'satmya', label: '6. Satmya (Habituation & Adaptability)', desc: 'Dietary suitability and environmental tolerance' },
    { key: 'sattva', label: '7. Sattva (Mental Resilience / Temperament)', desc: 'Psychological tolerance, stress coping, fortitude' },
    { key: 'ahara_shakti', label: '8. Ahara Shakti (Digestive & Assimilation Capacity)', desc: 'State of Agni, hunger strength & digestion' },
    { key: 'vyayama_shakti', label: '9. Vyayama Shakti (Physical Endurance / Exercise)', desc: 'Work capacity, stamina, and physical vigor' },
    { key: 'vaya', label: '10. Vaya (Age Group / Stage of Life)', desc: 'Bala, Madhyama, or Pravriddha life stage' },
    { key: 'ahara', label: '11. Ahara (Dietary Intake & Habitudes)', desc: 'Food taste preferences, regularity, and hydration' },
    { key: 'vihara', label: '12. Vihara (Lifestyle & Daily Routine)', desc: 'Sleep cycle (Nidra), activity, and occupational habits' },
    { key: 'nidana', label: '13. Nidana (Etiological & Triggering Factors)', desc: 'Exposures and stressors preceding symptoms' },
    { key: 'samprapti', label: '14. Samprapti (Pathophysiological Progression)', desc: 'Holistic disease evolution and dosha localization' },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-soft-sm p-6 sm:p-7 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Leaf className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#17385E] flex items-center gap-2">
              <span>AYUSH History & Ayurvedic Evaluation</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Dashavidha Pariksha
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Self-reported patient responses mapped to classical Ayurvedic clinical parameters.
            </p>
          </div>
        </div>

        {/* Verification Required Notice Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Practitioner verification required</span>
        </span>
      </div>

      {/* Safety Notice Box */}
      <div className="p-3.5 rounded-2xl bg-[#EAFafa]/80 border border-[#18A6A1]/30 text-xs text-[#17385E] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#18A6A1] shrink-0 mt-0.5" />
        <p className="leading-relaxed font-medium">
          <strong className="font-bold text-[#18A6A1]">Clinical Notice:</strong> AYUSH parameters below represent structured intake responses collected from the patient. They do not constitute a confirmed Ayurvedic diagnosis until independently evaluated and verified by a licensed AYUSH practitioner.
        </p>
      </div>

      {/* 14 Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parameters.map(({ key, label, desc }) => {
          const value = ayushData[key] || "Not provided";
          const isNotProvided = value === "Not provided";

          return (
            <div
              key={key}
              className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-2 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-extrabold text-[#17385E]">
                    {label}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {desc}
                  </p>
                </div>

                <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  Patient response
                </span>
              </div>

              <p className={`text-xs leading-relaxed ${
                isNotProvided ? 'text-slate-400 italic font-normal' : 'text-[#17385E] font-medium'
              }`}>
                {value}
              </p>
            </div>
          );
        })}
      </div>

    </div>
  );
}
