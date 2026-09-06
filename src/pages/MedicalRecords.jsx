import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, FileText, ShieldCheck, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import DocumentUploader from '../components/records/DocumentUploader';
import DocumentPreview from '../components/records/DocumentPreview';
import OCRResult from '../components/records/OCRResult';
import AISummary from '../components/records/AISummary';
import ocrService from '../services/ocrService';
import aiService from '../services/aiService';

// ─── Step Indicator ─────────────────────────────────────────────────────────
const STEPS = ['Upload', 'Preview', 'OCR Text', 'AI Summary'];

function StepBar({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 max-w-sm mx-auto mb-8">
      {STEPS.map((label, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold border-2 transition-all duration-300 ${
                done   ? 'bg-[#18A6A1] border-[#18A6A1] text-white'    :
                active ? 'bg-white border-[#18A6A1] text-[#18A6A1]'   :
                         'bg-white border-slate-200 text-slate-300'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wide ${active ? 'text-[#18A6A1]' : done ? 'text-[#18A6A1]/70' : 'text-slate-300'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-10 sm:w-14 mb-4 transition-all duration-500 ${done ? 'bg-[#18A6A1]' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── AI Analyzing Overlay ────────────────────────────────────────────────────
function AIAnalyzingCard() {
  return (
    <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-soft-lg flex flex-col items-center text-center space-y-5 animate-pulse">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#18A6A1] to-[#1a8fa8] flex items-center justify-center shadow-lg shadow-[#18A6A1]/25">
        <Sparkles className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '3s' }} />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-extrabold text-[#17385E]">MedSync AI is analyzing...</h3>
        <p className="text-sm text-slate-500">Reading your medical records and synthesizing a structured clinical summary.</p>
        <p className="text-xs text-slate-400">Preparing a structured summary from your record.</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-[#18A6A1] font-semibold">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Processing securely with MedSync AI</span>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function MedicalRecords() {
  const navigate = useNavigate();

  // Active patient session from registration
  const [patientId, setPatientId] = useState(() => sessionStorage.getItem('medsync_patient_id') || '');
  const [patientName, setPatientName] = useState(() => sessionStorage.getItem('medsync_patient_name') || '');

  // Step: 0=upload, 1=preview, 2=ocr-result, 3=ai-summary
  const [step, setStep] = useState(0);

  const [file, setFile] = useState(null);
  const [ocrData, setOcrData]       = useState(null);
  const [aiSummary, setAiSummary]   = useState(null);
  const [isOcrProcessing, setIsOcrProcessing]   = useState(false);
  const [isAiProcessing, setIsAiProcessing]     = useState(false);
  const [ocrError, setOcrError]     = useState('');
  const [aiError, setAiError]       = useState('');

  // ── Handlers ──
  const handleFileSelected = (selectedFile) => {
    setFile(selectedFile);
    setOcrError('');
    setStep(1);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setOcrError('');
    setStep(0);
  };

  const handleReadDocument = async () => {
    if (!file) return;

    const currentPatientId = patientId || sessionStorage.getItem('medsync_patient_id');
    if (!currentPatientId) {
      setOcrError('Patient registration required. Please complete patient registration first so documents are linked to your profile.');
      return;
    }

    setIsOcrProcessing(true);
    setOcrError('');

    try {
      const response = await ocrService.extractText(file, currentPatientId);
      if (response.success) {
        setOcrData(response);
        if (response.document_id) {
          sessionStorage.setItem('medsync_last_document_id', response.document_id);
        }
        setStep(2);
      } else {
        setOcrError(response.error || 'Failed to extract text. Please try again.');
      }
    } catch {
      setOcrError('Unexpected error communicating with the OCR backend.');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleAnalyzeWithAI = async () => {
    if (!ocrData?.text) return;
    setIsAiProcessing(true);
    setAiError('');

    try {
      const response = await aiService.summarizeMedicalDocument(ocrData.text);
      if (response.success && response.summary) {
        setAiSummary(response.summary);
        setStep(3);
      } else {
        setAiError(response.error || 'AI analysis failed. Please try again.');
      }
    } catch {
      setAiError('Unexpected error communicating with the AI backend.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setOcrData(null);
    setAiSummary(null);
    setOcrError('');
    setAiError('');
    setStep(0);
    setIsOcrProcessing(false);
    setIsAiProcessing(false);
  };

  const handleChatWithAI = () => {
    // Future phase — AI chatbot
    navigate('/patient/chat');
  };

  const showHeading = step < 3;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FBFC] text-[#17385E] selection:bg-[#18A6A1] selection:text-white relative overflow-hidden">

      {/* ── Header ── */}
      <header className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            to={patientId ? "/patient/dashboard" : "/patient/register/details"}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#17385E]/75 hover:text-[#18A6A1] transition-colors py-2 px-3 rounded-full hover:bg-white/80 border border-transparent hover:border-slate-200/80"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{patientId ? 'Dashboard' : 'Back'}</span>
          </Link>

          <Link to="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] flex items-center justify-center shadow-md shadow-[#18A6A1]/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div className="flex items-baseline">
              <span className="text-xl font-extrabold tracking-tight text-[#17385E]">
                Med<span className="text-[#18A6A1]">Sync</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#18A6A1] ml-0.5"></span>
            </div>
          </Link>

          <div className="w-16 hidden sm:block" />
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-grow flex items-start justify-center px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="max-w-2xl w-full mx-auto space-y-6">

          {/* Step progress bar */}
          <StepBar current={step} />

          {/* Page heading (hidden on AI summary step — the summary card is self-contained) */}
          {showHeading && (
            <div className="text-center space-y-3 max-w-xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#EAFafa] border border-[#18A6A1]/30 text-xs font-bold text-[#18A6A1]">
                <FileText className="w-3.5 h-3.5" />
                <span>OPD & Medical Document Reader</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#17385E] tracking-tight">
                {step === 0 && 'Upload Your Medical Records'}
                {step === 1 && 'Review Your Document'}
                {step === 2 && 'OCR Text Extracted'}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                {step === 0 && 'Upload a prescription, lab report, or any medical document — we\'ll read and analyze it for you.'}
                {step === 1 && 'Confirm the document looks correct, then click Read Document to extract the text.'}
                {step === 2 && 'Here\'s the raw text extracted from your document. Click Analyze with MedSync AI to get a structured summary.'}
              </p>

              {/* Patient Session Status Indicator */}
              {patientId ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Linked Patient: {patientName || 'Active Session'}</span>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>No active patient registration found in session.</span>
                  </div>
                  <Link
                    to="/patient/register"
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-full whitespace-nowrap text-xs transition-colors"
                  >
                    Register First
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ── Step 0: Upload ── */}
          {step === 0 && (
            <DocumentUploader
              onFileSelected={handleFileSelected}
              error={ocrError}
              onErrorClear={() => setOcrError('')}
            />
          )}

          {/* ── Step 1: Preview & Read ── */}
          {step === 1 && file && (
            <DocumentPreview
              file={file}
              onRemove={handleRemoveFile}
              onReadDocument={handleReadDocument}
              isProcessing={isOcrProcessing}
              error={ocrError}
            />
          )}

          {/* ── Step 2: OCR Result + Analyze with AI ── */}
          {step === 2 && ocrData && !isAiProcessing && (
            <OCRResult
              text={ocrData.text}
              processingTime={ocrData.processing_time}
              isEmpty={ocrData.is_empty}
              documentId={ocrData.document_id}
              filename={ocrData.filename || file?.name}
              onReset={handleReset}
              onAnalyzeWithAI={handleAnalyzeWithAI}
              aiError={aiError}
            />
          )}

          {/* ── AI Processing overlay ── */}
          {isAiProcessing && <AIAnalyzingCard />}

          {/* ── Step 3: AI Summary + Chat with AI ── */}
          {step === 3 && aiSummary && (
            <AISummary
              summary={aiSummary}
              onReset={handleReset}
              onChatWithAI={handleChatWithAI}
            />
          )}

          {/* Security note */}
          <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-2 pt-2 pb-4">
            <ShieldCheck className="w-4 h-4 text-[#18A6A1]" />
            <span>Encrypted pipeline · API key never exposed to browser</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-5 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white/50">
        © 2026 MedSync. All rights reserved.
      </footer>
    </div>
  );
}
