import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, AlertCircle, FileCheck, Sparkles } from 'lucide-react';

export default function DocumentUploader({ onFileSelected, error, onErrorClear }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  const validateAndPassFile = (file) => {
    if (onErrorClear) onErrorClear();

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileName = file.name.toLowerCase();
    const isValid = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      alert("Please upload a supported format: PDF, JPG, JPEG, or PNG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5 MB limit. Please select a smaller document.");
      return;
    }

    onFileSelected(file);
  };

  // Helper to create a simulated sample medical prescription image for quick testing
  const handleLoadSamplePrescription = () => {
    // Generate a simple sample medical canvas drawing as image file
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 700, 500);

    // Header
    ctx.fillStyle = '#17385E';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('CITY HOSPITAL & CLINICAL CARE', 50, 55);

    ctx.fillStyle = '#18A6A1';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Dr. S. Mehta, MD (General Medicine) - Reg: 48921', 50, 85);

    // Divider
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 100);
    ctx.lineTo(650, 100);
    ctx.stroke();

    // Patient info
    ctx.fillStyle = '#334155';
    ctx.font = '15px Arial';
    ctx.fillText('Patient Name: Rahul S.        Age: 42 Yrs        Gender: Male', 50, 135);
    ctx.fillText('Date: 12-Oct-2023            BP: 145/92 mmHg    Pulse: 78 bpm', 50, 165);

    // Symptoms & History
    ctx.fillStyle = '#17385E';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Chief Complaints & Clinical History:', 50, 210);

    ctx.fillStyle = '#334155';
    ctx.font = '14px Arial';
    ctx.fillText('• Fever and productive cough since 3 days', 70, 240);
    ctx.fillText('• History of hypertension diagnosed in 2021', 70, 268);
    ctx.fillText('• Known allergies: No known drug allergies (NKDA)', 70, 296);

    // Rx Medications
    ctx.fillStyle = '#17385E';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Rx / Prescriptions:', 50, 340);

    ctx.fillStyle = '#334155';
    ctx.font = '14px Arial';
    ctx.fillText('1. Tab. Azithromycin 500mg - 1 Tab OD x 5 Days (After food)', 70, 370);
    ctx.fillText('2. Tab. Paracetamol 650mg - SOS for fever', 70, 398);
    ctx.fillText('3. Tab. Telmisartan 40mg - 1 Tab OD in morning (Continue)', 70, 426);

    // Signature
    ctx.fillStyle = '#64748B';
    ctx.font = 'italic 13px Arial';
    ctx.fillText('Signature: Dr. S. Mehta', 480, 470);

    canvas.toBlob((blob) => {
      if (blob) {
        const sampleFile = new File([blob], 'Sample_OPD_Prescription.png', { type: 'image/png' });
        validateAndPassFile(sampleFile);
      }
    }, 'image/png');
  };

  return (
    <div className="space-y-4">
      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-300 ${
          isDragging
            ? 'border-[#18A6A1] bg-[#EAFafa]/60 scale-[1.01] shadow-teal-glow'
            : 'border-slate-300 hover:border-[#18A6A1] bg-[#F8FBFC] hover:bg-white shadow-soft-sm hover:shadow-soft'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Upload Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#EAFafa] border border-[#18A6A1]/20 flex items-center justify-center text-[#18A6A1] mx-auto mb-5 shadow-soft-sm group-hover:scale-105 transition-transform">
          <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2]" />
        </div>

        {/* Instructions */}
        <div className="space-y-2 max-w-sm mx-auto">
          <h3 className="text-base sm:text-lg font-extrabold text-[#17385E]">
            Drag & drop your document here
          </h3>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            or
          </p>
          <div>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B] shadow-sm hover:shadow-teal-glow transition-all"
            >
              Choose a file
            </button>
          </div>
        </div>

        {/* Format constraints */}
        <div className="mt-6 pt-5 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 font-medium">
          <span>Supported formats: <strong className="text-[#17385E] font-bold">PDF, JPG, JPEG, PNG</strong></span>
          <span>•</span>
          <span>Maximum size: <strong className="text-[#17385E] font-bold">5 MB</strong></span>
        </div>
      </div>

      {/* Helper Bar: Sample prescription generator */}
      <div className="p-3.5 rounded-2xl bg-[#EAFafa]/70 border border-[#18A6A1]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[#17385E] font-medium">
          <Sparkles className="w-4 h-4 text-[#18A6A1] shrink-0" />
          <span>Don't have a medical record handy?</span>
        </div>
        <button
          type="button"
          onClick={handleLoadSamplePrescription}
          className="px-3.5 py-1.5 rounded-xl bg-white border border-[#18A6A1]/40 text-[#18A6A1] font-bold hover:bg-[#18A6A1] hover:text-white transition-colors shrink-0 cursor-pointer shadow-soft-sm"
        >
          Try Sample OPD Prescription
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-3 text-left">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Upload Error</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
