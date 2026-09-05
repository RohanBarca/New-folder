import React, { useState } from 'react';
import { 
  FileText, 
  Edit3, 
  Check, 
  X, 
  Info, 
  Sparkles, 
  Clock, 
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function ClinicalHistorySection({ 
  history = {}, 
  onUpdateSection 
}) {
  // Track which sections are currently in edit mode and their temporary edit text
  const [editingSection, setEditingSection] = useState(null);
  const [tempText, setTempText] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  const sectionKeys = [
    { key: 'chief_complaint', label: '1. Chief Complaint' },
    { key: 'hpi', label: '2. History of Present Illness (HPI)' },
    { key: 'past_medical_history', label: '3. Past Medical History' },
    { key: 'past_surgical_history', label: '4. Past Surgical History' },
    { key: 'medications', label: '5. Medications' },
    { key: 'allergies', label: '6. Allergies' },
    { key: 'family_history', label: '7. Family History' },
    { key: 'personal_history', label: '8. Personal / Social History' },
    { key: 'review_of_systems', label: '9. Review of Systems (ROS)' },
  ];

  const handleStartEdit = (key, currentContent) => {
    setEditingSection(key);
    setTempText(currentContent === 'Not provided' ? '' : currentContent);
    setSaveSuccessMessage('');
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setTempText('');
  };

  const handleSaveEdit = async (key) => {
    if (!onUpdateSection) return;

    const updatedValue = tempText.trim() || 'Not provided';
    await onUpdateSection(key, updatedValue);
    setEditingSection(null);
    setTempText('');
    setSaveSuccessMessage(`Updated ${key.replace(/_/g, ' ')} successfully.`);
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  const getSourceBadgeColor = (type) => {
    switch (type) {
      case 'Patient-provided':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'AI-structured':
        return 'bg-[#EAFafa] text-[#18A6A1] border-[#18A6A1]/30';
      case 'Document-extracted':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Physician-verified':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-soft-sm p-6 sm:p-7 space-y-6">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-[#17385E] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#18A6A1]" />
            <span>Structured Clinical History</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            9 standard clinical history sections with source traceability and inline physician editing.
          </p>
        </div>

        {saveSuccessMessage && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 animate-fadeIn">
            <Check className="w-3.5 h-3.5" />
            <span>{saveSuccessMessage}</span>
          </span>
        )}
      </div>

      {/* Structured Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sectionKeys.map(({ key, label }) => {
          const item = history[key] || {
            title: label,
            content: 'Not provided',
            source: 'Not provided',
            type: 'Not provided',
            last_edited: null
          };

          const isEditing = editingSection === key;
          const isNotProvided = !item.content || item.content.trim() === 'Not provided';

          return (
            <div 
              key={key} 
              className={`p-4 rounded-2xl border transition-all ${
                isEditing 
                  ? 'bg-slate-50 border-[#18A6A1] ring-2 ring-[#18A6A1]/20' 
                  : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200/80'
              }`}
            >
              
              {/* Card Header: Title + Source Badge + Edit Button */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-extrabold text-[#17385E]">
                  {label}
                </span>

                <div className="flex items-center gap-1.5">
                  {/* Source Badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSourceBadgeColor(item.type)}`}>
                    {item.type || "Source recorded"}
                  </span>

                  {/* Edit/Save Controls */}
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(key, item.content)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#18A6A1] hover:bg-white transition-colors cursor-pointer"
                      title="Edit Section"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(key)}
                        className="p-1 rounded-lg bg-[#18A6A1] text-white hover:bg-[#148F8B] shadow-xs cursor-pointer"
                        title="Save Changes"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="p-1 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 cursor-pointer"
                        title="Cancel Edit"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body: Content Text or Textarea */}
              {isEditing ? (
                <div className="space-y-2 mt-1">
                  <textarea
                    value={tempText}
                    onChange={(e) => setTempText(e.target.value)}
                    placeholder="Enter updated clinical information..."
                    rows={3}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-300 focus:border-[#18A6A1] text-xs font-medium text-[#17385E] outline-none resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-end gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-2.5 py-1 rounded-lg font-bold text-slate-500 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(key)}
                      className="px-3 py-1 rounded-lg font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B]"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className={`text-xs leading-relaxed whitespace-pre-wrap ${
                    isNotProvided ? 'text-slate-400 italic font-normal' : 'text-[#17385E] font-medium'
                  }`}>
                    {item.content || 'Not provided'}
                  </p>

                  {/* Source Metadata Footnote */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="truncate">
                      {item.source ? `Source: ${item.source}` : 'Source not documented'}
                    </span>
                    {item.last_edited && (
                      <span className="shrink-0 ml-2">{item.last_edited}</span>
                    )}
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}
