import React from 'react';
import { Activity, User, Volume2, VolumeX } from 'lucide-react';

export default function ChatMessage({
  message,
  selectedLanguage = 'en',
  isSpeaking = false,
  speakingMessageId = null,
  onSpeak,
  onStopSpeak,
}) {
  const isAi = message.sender === 'ai';
  const isCurrentlySpeakingThis = isSpeaking && speakingMessageId === message.id;

  const handleSpeakerClick = () => {
    if (isCurrentlySpeakingThis) {
      if (onStopSpeak) onStopSpeak();
    } else {
      if (onSpeak) onSpeak(message);
    }
  };

  return (
    <div className={`flex gap-3 my-3.5 animate-fadeIn ${isAi ? 'justify-start' : 'justify-end'}`}>
      
      {/* AI Avatar */}
      {isAi && (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#18A6A1]/20 mt-1">
          <Activity className="w-5 h-5 stroke-[2.5]" />
        </div>
      )}

      {/* Message Content Bubble */}
      <div className={`max-w-[85%] sm:max-w-[75%] space-y-1.5 ${isAi ? 'items-start' : 'items-end'}`}>
        
        {/* Sender Name + Audio Speaker Button */}
        <div className={`flex items-center gap-2 text-[11px] font-bold ${isAi ? 'text-slate-500' : 'text-slate-400 justify-end'}`}>
          <span>{isAi ? 'MedSync Assistant' : 'You'}</span>
          {message.timestamp && (
            <span className="text-[10px] text-slate-400 font-normal">{message.timestamp}</span>
          )}

          {/* AI Message Speaker Button */}
          {isAi && (
            <button
              type="button"
              onClick={handleSpeakerClick}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                isCurrentlySpeakingThis
                  ? 'bg-[#18A6A1] text-white shadow-xs animate-pulse ring-2 ring-[#18A6A1]/40'
                  : 'bg-white/80 hover:bg-[#EAFafa] text-[#18A6A1] border border-[#18A6A1]/30 hover:border-[#18A6A1]'
              }`}
              title={
                isCurrentlySpeakingThis
                  ? (selectedLanguage === 'hi' ? 'बोलना बंद करें' : 'Stop reading aloud')
                  : (selectedLanguage === 'hi' ? 'प्रश्न सुनें' : 'Read question aloud')
              }
            >
              {isCurrentlySpeakingThis ? (
                <>
                  <VolumeX className="w-3 h-3" />
                  <span className="text-[9px]">{selectedLanguage === 'hi' ? 'रोकें' : 'Stop'}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3" />
                  <span className="text-[9px] hidden sm:inline">{selectedLanguage === 'hi' ? 'सुनें' : 'Listen'}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Bubble */}
        <div
          className={`px-5 py-3.5 rounded-3xl text-sm leading-relaxed shadow-xs font-normal ${
            isAi
              ? `bg-[#EAFafa] text-[#17385E] border rounded-tl-none font-medium transition-all ${
                  isCurrentlySpeakingThis
                    ? 'border-[#18A6A1] ring-2 ring-[#18A6A1]/20 shadow-sm'
                    : 'border-[#18A6A1]/30'
                }`
              : 'bg-[#17385E] text-white rounded-tr-none shadow-md shadow-[#17385E]/10'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>

      </div>

      {/* Patient Avatar */}
      {!isAi && (
        <div className="w-9 h-9 rounded-2xl bg-slate-200 text-[#17385E] flex items-center justify-center shrink-0 shadow-xs mt-1 border border-slate-300">
          <User className="w-5 h-5" />
        </div>
      )}

    </div>
  );
}
