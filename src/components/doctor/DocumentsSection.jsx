import React, { useState } from 'react';
import { 
  FileText, 
  Eye, 
  CheckCircle2, 
  FileCode, 
  Clock, 
  X, 
  Download,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export default function DocumentsSection({ documents = [] }) {
  const [selectedDocForOcr, setSelectedDocForOcr] = useState(null);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(null);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-soft-sm p-6 sm:p-7 space-y-5">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-[#17385E] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#18A6A1]" />
            <span>Uploaded Medical Documents & OCR Records</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Review original patient prescriptions, discharge summaries, and verified OCR text extracts.
          </p>
        </div>

        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          {documents.length} Document{documents.length === 1 ? '' : 's'} Uploaded
        </span>
      </div>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="py-10 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-200/80">
          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
          <p className="text-xs font-bold text-slate-600">No medical documents uploaded for this patient</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Intake was completed via direct patient consultation form and conversational interview.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id || doc.name}
              className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3 hover:border-slate-300 transition-all"
            >
              
              {/* Top metadata */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-[#18A6A1] flex items-center justify-center shrink-0 shadow-2xs">
                    <FileText className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold text-[#17385E] truncate" title={doc.name}>
                      {doc.name}
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-500">
                      {doc.type || "Medical Record"}
                    </p>
                  </div>
                </div>

                {/* OCR Status Pill */}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{doc.ocr_status || "OCR Processed"}</span>
                </span>
              </div>

              {/* Upload Date */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Uploaded: {doc.upload_date || "Recent"}</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                
                {/* View Extracted Text Button */}
                <button
                  type="button"
                  onClick={() => setSelectedDocForOcr(doc)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-[#18A6A1] bg-[#EAFafa] hover:bg-[#18A6A1] hover:text-white border border-[#18A6A1]/30 transition-all cursor-pointer shadow-2xs"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>View Extracted Text</span>
                </button>

                {/* View Document Button */}
                <button
                  type="button"
                  onClick={() => setSelectedDocForPreview(doc)}
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Document</span>
                </button>

              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── MODAL 1: Extracted OCR Text Inspector ── */}
      {selectedDocForOcr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col text-left">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EAFafa] text-[#18A6A1] flex items-center justify-center">
                  <FileCode className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-[#17385E]">
                    OCR Extracted Text
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedDocForOcr.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocForOcr(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 rounded-2xl p-4 border border-slate-200 font-mono text-xs text-[#17385E] leading-relaxed whitespace-pre-wrap">
              {selectedDocForOcr.extracted_text || "No raw OCR text available for this document."}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Text parsed via OCR Engine</span>
              </span>

              <button
                type="button"
                onClick={() => setSelectedDocForOcr(null)}
                className="px-4 py-1.5 rounded-full font-bold text-white bg-[#17385E] hover:bg-[#0F2642] cursor-pointer"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL 2: Document Preview ── */}
      {selectedDocForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 text-left">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#17385E] flex items-center justify-center">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-[#17385E]">
                    Document Preview
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedDocForPreview.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocForPreview(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <FileText className="w-12 h-12 mx-auto text-[#18A6A1] stroke-[1.5]" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#17385E]">
                  {selectedDocForPreview.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {selectedDocForPreview.type} • Processed with OCR
                </p>
              </div>
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                Verified Document Source
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setSelectedDocForPreview(null);
                  setSelectedDocForOcr(selectedDocForPreview);
                }}
                className="px-4 py-2 rounded-full text-xs font-bold text-[#18A6A1] bg-[#EAFafa] hover:bg-[#18A6A1] hover:text-white transition-colors cursor-pointer"
              >
                View OCR Text
              </button>
              <button
                type="button"
                onClick={() => setSelectedDocForPreview(null)}
                className="px-4 py-2 rounded-full text-xs font-bold text-white bg-[#17385E] hover:bg-[#0F2642] cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
