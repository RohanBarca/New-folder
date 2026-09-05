import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Globe, X, Sparkles, Volume2, VolumeX } from 'lucide-react';

export default function ChatHeader({
  onExit,
  selectedLanguage = 'en',
  onLanguageChange,
  autoSpeak = false,
  onToggleAutoSpeak,
}) {
  const navigate = useNavigate();

  const handleExitClick = () => {
    if (onExit) {
      onExit();
    } else {
      navigate('/patient/records');
    }
  };

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी' },
  ];

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
        
        {/* Left: Brand + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] flex items-center justify-center shadow-md shadow-[#18A6A1]/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-[#17385E] tracking-tight truncate">
                {selectedLanguage === 'hi' ? 'AI स्वास्थ्य परामर्श' : 'AI Health Interview'}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EAFafa] border border-[#18A6A1]/30 text-[10px] font-bold text-[#18A6A1]">
                <Sparkles className="w-3 h-3" />
                <span>Clinical Assistant</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate font-medium">
              {selectedLanguage === 'hi' ? 'आइए आपका स्वास्थ्य इतिहास समझें' : "Let's understand your health history"}
            </p>
          </div>
        </div>

        {/* Right: Auto-Speak + Language Selector & Exit */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Auto-Speak Toggle Button */}
          {onToggleAutoSpeak && (
            <button
              type="button"
              onClick={onToggleAutoSpeak}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                autoSpeak
                  ? 'bg-[#EAFafa] text-[#18A6A1] border-[#18A6A1]/40 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-[#17385E] border-slate-200 hover:border-slate-300'
              }`}
              title={
                autoSpeak
                  ? (selectedLanguage === 'hi' ? 'स्वतः वाचन चालू है (बंद करने के लिए क्लिक करें)' : 'Auto-read questions is ON (click to turn OFF)')
                  : (selectedLanguage === 'hi' ? 'प्रश्न स्वतः बोलकर सुनाएँ (चालू करें)' : 'Read questions aloud automatically (click to turn ON)')
              }
            >
              {autoSpeak ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#18A6A1] animate-pulse" />
                  <span className="hidden md:inline">{selectedLanguage === 'hi' ? 'आवाज़: चालू' : 'Voice: ON'}</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden md:inline">{selectedLanguage === 'hi' ? 'आवाज़: बंद' : 'Voice: OFF'}</span>
                </>
              )}
            </button>
          )}

          {/* Language Selector */}
          <div className="relative inline-flex items-center p-0.5 rounded-full bg-slate-100/90 border border-slate-200 text-xs font-semibold text-[#17385E]">
            <div className="flex items-center gap-1 pl-2 pr-1 text-slate-400">
              <Globe className="w-3.5 h-3.5 text-[#18A6A1]" />
            </div>
            <div className="flex items-center gap-1">
              {languages.map((lang) => {
                const isActive = selectedLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => onLanguageChange && onLanguageChange(lang.code)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#18A6A1] shadow-2xs border border-slate-200/80 scale-102'
                        : 'text-slate-600 hover:text-[#17385E]'
                    }`}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exit Button */}
          <button
            type="button"
            onClick={handleExitClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200/80 hover:border-red-200 transition-colors cursor-pointer"
            title="Exit Interview"
          >
            <span>Exit</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </header>
  );
}
