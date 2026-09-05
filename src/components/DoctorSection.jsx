import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Stethoscope, 
  ArrowRight, 
  FileText, 
  AlertCircle, 
  Activity, 
  Pill, 
  Clock, 
  CheckCircle2,
  ExternalLink,
  Eye,
  Sparkles
} from 'lucide-react';

export default function DoctorSection() {
  return (
    <section id="for-doctors" className="py-20 md:py-28 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAFafa] border border-[#18A6A1]/30 text-xs font-bold text-[#18A6A1]">
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Built For Clinicians</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#17385E] tracking-tight leading-tight">
              See the patient, <br />
              <span className="text-[#18A6A1]">not the paperwork.</span>
            </h2>

            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
              Review structured history, previous records, important findings and patient responses from one doctor-friendly dashboard.
            </p>

            {/* Feature bullets */}
            <div className="space-y-3.5 pt-2 text-left">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  <strong className="text-[#17385E] font-bold">10-second history scan:</strong> Key diagnoses, vitals, and current complaints prioritized at the top.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  <strong className="text-[#17385E] font-bold">Original source verification:</strong> Click any AI-extracted finding to view the exact original prescription image or lab report.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  <strong className="text-[#17385E] font-bold">Flagged uncertain details:</strong> Missing or ambiguous data is clearly highlighted for quick verbal confirmation.
                </p>
              </div>
            </div>

            {/* Doctor Login Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link
                to="/doctor/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full text-base font-bold text-white bg-[#17385E] hover:bg-[#0F2642] shadow-md shadow-[#17385E]/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                <Stethoscope className="w-4 h-4 text-[#18A6A1]" />
                Open Doctor Dashboard
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
              <span className="text-xs text-slate-400 font-medium">No installation required • Browser-based</span>
            </div>

          </div>

          {/* Right Column: Doctor Dashboard UI Mockup */}
          <div className="lg:col-span-7 relative">
            
            {/* Background Glow */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#18A6A1]/10 via-[#EAFafa]/60 to-[#17385E]/5 rounded-3xl blur-xl -z-10" />

            {/* Dashboard Container */}
            <div className="bg-[#F8FBFC] rounded-3xl border border-slate-200 shadow-soft-lg p-5 sm:p-7 space-y-5">
              
              {/* Doctor Dashboard Topbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#18A6A1] text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    RS
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#17385E]">Rahul S.</h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">42y • Male</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">ID: #MS-8492 • Intake completed 12m ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Consultation Ready
                  </span>
                </div>
              </div>

              {/* Grid: Summary + Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Vitals summary */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="font-semibold text-slate-500">Blood Pressure</span>
                    <Activity className="w-3.5 h-3.5 text-[#18A6A1]" />
                  </div>
                  <div className="text-base font-extrabold text-[#17385E]">145 / 92 <span className="text-[10px] font-medium text-slate-400">mmHg</span></div>
                  <div className="mt-1 text-[10px] font-semibold text-amber-600 bg-amber-50 rounded px-1.5 py-0.5 inline-block">Elevated Stage 1</div>
                </div>

                {/* Current Symptoms */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="font-semibold text-slate-500">Primary Complaint</span>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-base font-extrabold text-[#17385E]">Fever & Cough</div>
                  <div className="mt-1 text-[10px] font-semibold text-slate-500">Duration: 3 days</div>
                </div>

                {/* Medications */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="font-semibold text-slate-500">Active Meds</span>
                    <Pill className="w-3.5 h-3.5 text-[#18A6A1]" />
                  </div>
                  <div className="text-sm font-extrabold text-[#17385E] truncate">Azithromycin 500mg</div>
                  <div className="mt-1 text-[10px] font-semibold text-slate-500">Source: Doc #2</div>
                </div>

              </div>

              {/* Consolidated AI Summary Box */}
              <div className="p-4 rounded-2xl bg-[#EAFafa]/70 border border-[#18A6A1]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#18A6A1]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Consolidated Clinical Brief</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Source: Form + 4 Records</span>
                </div>
                <p className="text-xs text-[#17385E] leading-relaxed">
                  Patient presents with acute fever and productive cough for 3 days. Previous medical records identify history of hypertension diagnosed in 2021. AI intake interview verified no known drug allergies (NKDA).
                </p>
              </div>

              {/* Source Document Inspector Widget */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#17385E]">Prescription_Cardio_2023.pdf</h5>
                    <p className="text-[10px] text-slate-400">OCR parsed with 100% confidence</p>
                  </div>
                </div>
                <button
                  onClick={() => alert("Original document inspector view preview.")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#18A6A1] bg-[#EAFafa] hover:bg-[#18A6A1] hover:text-white transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  Inspect Source
                </button>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
