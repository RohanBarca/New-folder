import React, { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Trash2, ArrowRight, Loader2, Sparkles, AlertCircle } from 'lucide-react';

export default function DocumentPreview({ file, onRemove, onReadDocument, isProcessing, error }) {
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const isImage = file && file.type.startsWith('image/');
  const isPdf = file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImagePreviewUrl(null);
    }
  }, [file, isImage]);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      
      {/* Document Card */}
      <div className="bg-[#F8FBFC] rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-soft-sm space-y-6 text-left">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          
          {/* File Metadata Overview */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-[#18A6A1]/20 flex items-center justify-center text-[#18A6A1] shadow-soft-sm shrink-0">
              {isPdf ? (
                <FileText className="w-7 h-7 text-[#18A6A1]" />
              ) : (
                <ImageIcon className="w-7 h-7 text-[#18A6A1]" />
              )}
            </div>
            
            <div className="overflow-hidden">
              <h4 className="text-base font-bold text-[#17385E] truncate max-w-xs sm:max-w-md">
                {file.name}
              </h4>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 uppercase tracking-wider text-[10px]">
                  {isPdf ? 'PDF Document' : file.type.replace('image/', '').toUpperCase()}
                </span>
                <span>•</span>
                <span>{formatFileSize(file.size)}</span>
              </div>
            </div>
          </div>

          {/* Remove Button (disabled during processing) */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>

        </div>

        {/* Visual Preview */}
        {isImage && imagePreviewUrl && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Document Preview</span>
            <div className="relative max-h-64 sm:max-h-80 overflow-hidden rounded-2xl border border-slate-200 bg-white flex items-center justify-center p-2">
              <img
                src={imagePreviewUrl}
                alt="Uploaded Medical Document Preview"
                className="max-h-60 sm:max-h-76 object-contain rounded-xl shadow-sm"
              />
            </div>
          </div>
        )}

        {isPdf && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center text-center space-y-2">
            <FileText className="w-12 h-12 text-[#18A6A1]" />
            <p className="text-sm font-bold text-[#17385E]">{file.name}</p>
            <p className="text-xs text-slate-400">PDF ready for text extraction</p>
          </div>
        )}

        {/* Processing State Display */}
        {isProcessing && (
          <div className="p-5 rounded-2xl bg-[#EAFafa] border border-[#18A6A1]/40 flex items-center gap-4 animate-pulse">
            <Loader2 className="w-7 h-7 text-[#18A6A1] animate-spin shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#17385E]">Reading your document...</p>
              <p className="text-xs text-slate-600 mt-0.5">This may take a few seconds.</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Extraction Error</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onReadDocument}
            className="w-full inline-flex items-center justify-center gap-2.5 py-4 px-8 rounded-full text-base font-bold text-white bg-[#18A6A1] hover:bg-[#148F8B] disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#18A6A1]/25 hover:shadow-teal-glow transition-all duration-200 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Reading Document...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Read Document</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
}
