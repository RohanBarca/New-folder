import React from 'react';
import { 
  FlaskConical, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Calendar,
  ExternalLink
} from 'lucide-react';

export default function InvestigationsSection({ investigations = [], onOpenDocument }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-soft-sm p-6 sm:p-7 space-y-5">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-[#17385E] flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#18A6A1]" />
            <span>Diagnostic Investigations & Lab Findings</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Extracted from uploaded medical records and clinical reports. Highlighted values reflect range discrepancies only.
          </p>
        </div>

        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          {investigations.length} Lab Test{investigations.length === 1 ? '' : 's'} Extracted
        </span>
      </div>

      {/* Investigations Table / List */}
      {investigations.length === 0 ? (
        <div className="py-10 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-200/80">
          <FlaskConical className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
          <p className="text-xs font-bold text-slate-600">No laboratory investigations extracted yet</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Documents uploaded without structured lab results will show raw text in the Documents tab.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Test Name</th>
                <th className="py-3 px-4">Observed Value</th>
                <th className="py-3 px-4">Reference Range</th>
                <th className="py-3 px-4">Evaluation</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Source Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {investigations.map((item, idx) => (
                <tr 
                  key={idx} 
                  className={`hover:bg-slate-50/80 transition-colors ${
                    item.is_abnormal ? 'bg-amber-50/20' : ''
                  }`}
                >
                  
                  {/* Test Name */}
                  <td className="py-3.5 px-4 font-bold text-[#17385E]">
                    {item.name || "Unnamed Investigation"}
                  </td>

                  {/* Observed Value & Unit */}
                  <td className="py-3.5 px-4">
                    <span className={`font-extrabold ${item.is_abnormal ? 'text-amber-800 font-black' : 'text-[#17385E]'}`}>
                      {item.value || "Not provided"} {item.unit}
                    </span>
                  </td>

                  {/* Reference Range */}
                  <td className="py-3.5 px-4 font-medium text-slate-500">
                    {item.reference_range || "Not specified"}
                  </td>

                  {/* Flag / Evaluation tag */}
                  <td className="py-3.5 px-4">
                    {item.is_abnormal ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                        <AlertCircle className="w-3 h-3" />
                        <span>Outside provided reference range</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Within range</span>
                      </span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 text-slate-400 text-[11px] font-medium">
                    {item.date || "Not dated"}
                  </td>

                  {/* Source Document */}
                  <td className="py-3.5 px-4 text-right">
                    <span 
                      onClick={() => onOpenDocument && onOpenDocument(item.source_doc)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#18A6A1] hover:underline cursor-pointer"
                      title="Inspect source document"
                    >
                      <FileText className="w-3 h-3" />
                      <span className="truncate max-w-[130px]">{item.source_doc || "Uploaded Record"}</span>
                    </span>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Non-Diagnostic Safety Footnote */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 font-medium">
        * Reference ranges are cited verbatim from submitted laboratory report headers. Range discrepancies are flagged for clinical awareness and do not constitute an automated diagnosis.
      </div>

    </div>
  );
}
