import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Mic, MicOff, AlertCircle } from 'lucide-react';
import asrService, { ASR_LANGUAGE_NAMES } from '../../services/asrService';

export default function ChatInput({ onSend, onLanguageDetected, disabled, isTyping, selectedLanguage = 'en' }) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [transcriptLanguage, setTranscriptLanguage] = useState('');
  const [speechError, setSpeechError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Clear speech error on language change or typing
  useEffect(() => {
    setSpeechError('');
  }, [selectedLanguage]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleToggleRecording = async () => {
    if (disabled || isTyping || isTranscribing) return;
    setSpeechError('');

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setSpeechError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsTranscribing(true);
        try {
          const result = await asrService.transcribe(
            new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' }),
            selectedLanguage,
          );
          setText(result.text || '');
          const languageCode = result.language || '';
          setDetectedLanguage(ASR_LANGUAGE_NAMES[languageCode] || languageCode);
          setTranscriptLanguage(languageCode.toLowerCase().split('-')[0]);
          onLanguageDetected?.(languageCode);
        } catch (error) {
          setSpeechError(error.message || 'Speech transcription failed.');
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      setSpeechError(error.name === 'NotAllowedError' ? 'Microphone permission is required.' : 'Unable to access the microphone.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled || isTyping || isRecording || isTranscribing) return;

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }

    onSend(text.trim(), transcriptLanguage ? { source: 'voice', language: transcriptLanguage } : { source: 'text' });
    setText('');
    setSpeechError('');
    setTranscriptLanguage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getPlaceholder = () => {
    if (isTyping) {
      return selectedLanguage === 'hi' ? 'AI उत्तर तैयार कर रहा है...' : 'AI is typing...';
    }
    if (isRecording) {
      return selectedLanguage === 'hi' ? 'बोलिए, रिकॉर्ड हो रहा है...' : 'Recording... Speak now...';
    }
    if (isTranscribing) {
      return selectedLanguage === 'hi' ? 'ऑडियो का प्रतिलेखन हो रहा है...' : 'Transcribing audio...';
    }
    return selectedLanguage === 'hi' ? 'अपना उत्तर यहाँ लिखें या बोलें...' : 'Type or speak your answer...';
  };

  return (
    <div className="space-y-1.5 w-full">
      {/* Friendly Speech Error Banner */}
      {speechError && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="flex-1">{speechError}</span>
          <button
            type="button"
            onClick={() => setSpeechError('')}
            className="text-amber-900 hover:text-amber-700 font-bold text-xs cursor-pointer ml-1"
          >
            ✕
          </button>
        </div>
      )}
      {detectedLanguage && !speechError && (
        <div className="px-3.5 text-[11px] font-semibold text-slate-500">
          Detected language: <span className="text-[#18A6A1]">{detectedLanguage}</span>
        </div>
      )}

      {/* Input Form with Mic and Send Button */}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
        
        {/* Voice Input Microphone Button */}
        <>
          <button
            type="button"
            onClick={handleToggleRecording}
            disabled={disabled || isTyping || isTranscribing}
            className={`relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30 animate-pulse ring-4 ring-red-300/50 scale-105'
                : 'bg-slate-100 hover:bg-[#EAFafa] text-slate-700 hover:text-[#18A6A1] border border-slate-200/80 hover:border-[#18A6A1]/40'
            }`}
            title={
              isRecording
                ? (selectedLanguage === 'hi' ? 'आवाज़ रिकॉर्डिंग बंद करें' : 'Stop voice recording')
                : (selectedLanguage === 'hi' ? 'बोलकर उत्तर दें (हिन्दी / English)' : 'Speak your answer (English / Hindi)')
            }
          >
            {isRecording ? (
              <MicOff className="w-5 h-5 stroke-[2.2]" />
            ) : (
              <Mic className="w-5 h-5 stroke-[2.2]" />
            )}
            {isRecording && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            )}
          </button>
          {isTranscribing && <Loader2 className="w-4 h-4 text-[#18A6A1] animate-spin shrink-0" aria-label="Transcribing" />}
        </>

        {/* Text Input Field */}
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (speechError) setSpeechError('');
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled || isTyping}
          placeholder={getPlaceholder()}
          className={`flex-1 py-3.5 px-5 rounded-full text-sm font-medium placeholder-slate-400 transition-all outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
            isRecording
              ? 'bg-red-50/60 border-2 border-red-400 text-[#17385E] ring-4 ring-red-100'
              : 'bg-slate-100 focus:bg-white text-[#17385E] border border-slate-200 focus:border-[#18A6A1] focus:ring-4 focus:ring-[#18A6A1]/15'
          }`}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!text.trim() || disabled || isTyping || isRecording || isTranscribing}
          className="w-12 h-12 rounded-full bg-gradient-to-r from-[#18A6A1] to-[#1a8fa8] hover:from-[#148F8B] hover:to-[#177a92] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#18A6A1]/25 hover:shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          title={selectedLanguage === 'hi' ? 'उत्तर भेजें' : 'Send Answer'}
        >
          {isTyping ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            <Send className="w-5 h-5 stroke-[2.2] translate-x-0.5" />
          )}
        </button>

      </form>
    </div>
  );
}
