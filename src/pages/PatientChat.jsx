import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, ShieldCheck, HeartPulse, ArrowRight,
  RotateCcw, MessageSquareHeart, AlertTriangle, AlertCircle
} from 'lucide-react';
import ChatHeader from '../components/chat/ChatHeader';
import ChatProgress from '../components/chat/ChatProgress';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import QuickReplies from '../components/chat/QuickReplies';
import InterviewComplete from '../components/chat/InterviewComplete';
import aiService from '../services/aiService';
import speechService from '../services/speechService';
import { API_BASE } from '../services/api';

export default function PatientChat() {
  const navigate = useNavigate();
  const chatBottomRef = useRef(null);

  // Session state
  const [patientId, setPatientId]               = useState(() => sessionStorage.getItem('medsync_patient_id') || '');
  const [patientName, setPatientName]           = useState(() => sessionStorage.getItem('medsync_patient_name') || '');
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // 'en' | 'hi'
  const [selectedMode, setSelectedMode]         = useState('general'); // 'general' -> 'ayush' (optional follow-up)
  const [sessionId, setSessionId]               = useState(() => sessionStorage.getItem('medsync_chat_session_id') || null);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentSection, setCurrentSection]     = useState('Chief Complaint');
  const [ayushParameter, setAyushParameter]     = useState(null);
  const [ayushHistory, setAyushHistory]         = useState(null);
  const [questionNumber, setQuestionNumber]     = useState(1);
  const [messages, setMessages]                 = useState([]);
  const [qnaPairs, setQnaPairs]                 = useState([]);
  const [isTyping, setIsTyping]                 = useState(false);
  const [isComplete, setIsComplete]             = useState(false);
  const [hasRedFlag, setHasRedFlag]             = useState(false);
  const [chatError, setChatError]               = useState('');

  // Voice output state
  const [autoSpeak, setAutoSpeak]               = useState(false);
  const [isSpeaking, setIsSpeaking]             = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  // Timestamp helper
  const getTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Hydrate conversation after browser refresh from PostgreSQL
  useEffect(() => {
    const storedSessionId = sessionStorage.getItem('medsync_chat_session_id');
    const currentPatientId = sessionStorage.getItem('medsync_patient_id');

    if (storedSessionId && currentPatientId) {
      const restoreSession = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/chat/session/${storedSessionId}`);
          if (res.ok) {
            const data = await res.json();
            setSessionId(storedSessionId);
            setSelectedLanguage(data.language || 'en');
            setSelectedMode(data.mode || 'general');
            setCurrentSection(data.current_section || 'Chief Complaint');
            setAyushParameter(data.current_ayush_parameter || null);
            setAyushHistory(data.ayush_history || null);
            setQuestionNumber(data.question_number || 1);
            setIsComplete(Boolean(data.complete));
            setHasRedFlag(Boolean(data.red_flag));

            // Retrieve chronological conversation turns from PostgreSQL
            const msgsRes = await aiService.getChatSessionMessages(storedSessionId, currentPatientId);
            if (Array.isArray(msgsRes) && msgsRes.length > 0) {
              const mappedMsgs = msgsRes.map((m, idx) => ({
                id: idx + 1,
                sender: m.role === 'assistant' ? 'ai' : 'patient',
                text: m.message_text,
                timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : getTimestamp(),
              }));
              setMessages(mappedMsgs);
              setInterviewStarted(true);

              // Reconstruct Q&A pairs
              const pairs = [];
              let lastQ = '';
              for (const m of msgsRes) {
                if (m.role === 'assistant') lastQ = m.message_text;
                else if (m.role === 'patient' && lastQ) {
                  pairs.push({ question: lastQ, answer: m.message_text });
                }
              }
              setQnaPairs(pairs);
            }
          }
        } catch (err) {
          console.warn("Could not restore previous chat session:", err);
        }
      };
      restoreSession();
    }
  }, []);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      speechService.stopSpeaking();
      speechService.stopListening();
    };
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isComplete, hasRedFlag]);

  // Handle speaking a specific AI message
  const handleSpeakMessage = (msg) => {
    if (!msg || !msg.text) return;

    setSpeakingMessageId(msg.id);
    setIsSpeaking(true);

    speechService.speakText(msg.text, selectedLanguage, {
      onStart: () => {
        setIsSpeaking(true);
        setSpeakingMessageId(msg.id);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
      },
    });
  };

  // Stop currently playing speech
  const handleStopSpeaking = () => {
    speechService.stopSpeaking();
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  };

  // Handle language change (before or during conversation)
  const handleLanguageChange = async (newLang) => {
    if (newLang === selectedLanguage) return;

    // Stop ongoing speech on language switch
    handleStopSpeaking();
    speechService.stopListening();

    setSelectedLanguage(newLang);

    // If an active session exists, update session language on backend without restarting
    if (sessionId) {
      try {
        await aiService.updateSessionLanguage(sessionId, newLang);
      } catch (err) {
        console.error("Failed to update backend session language:", err);
      }
    }
  };

  const handleDetectedLanguage = (languageCode) => {
    const shortCode = languageCode.toLowerCase().split('-')[0];
    if (shortCode && shortCode !== selectedLanguage) {
      setSelectedLanguage(shortCode);
    }
  };

  // Start initial General Medical interview
  const handleStartInterview = async () => {
    const currentPatientId = patientId || sessionStorage.getItem('medsync_patient_id');
    if (!currentPatientId) {
      setChatError(selectedLanguage === 'hi'
        ? "परामर्श शुरू करने से पहले कृपया अपना पंजीकरण पूरा करें ताकि आपका इतिहास सुरक्षित रखा जा सके।"
        : "Please complete patient registration first so your consultation can be saved to your health record.");
      return;
    }

    handleStopSpeaking();
    setSelectedMode('general');
    setInterviewStarted(true);
    setIsTyping(true);
    setChatError('');
    setHasRedFlag(false);
    setIsComplete(false);
    setQnaPairs([]);
    setMessages([]);

    try {
      const response = await aiService.startChat({
        patient_id: currentPatientId,
        mode: 'general',
        language: selectedLanguage
      });
      if (response.success && response.session_id) {
        setSessionId(response.session_id);
        sessionStorage.setItem('medsync_chat_session_id', response.session_id);
        setCurrentSection(response.section || 'Chief Complaint');
        setQuestionNumber(response.question_number || 1);

        const defaultGeneralQ = selectedLanguage === 'hi' 
          ? "नमस्ते! आज आपकी मुख्य स्वास्थ्य समस्या क्या है?"
          : "Hello! What is your main health concern today?";
        const initialQuestion = response.question || defaultGeneralQ;
        const msgId = Date.now();

        const newAiMsg = {
          id: msgId,
          sender: 'ai',
          text: initialQuestion,
          timestamp: getTimestamp(),
        };

        setMessages([newAiMsg]);

        // Auto speak if enabled
        if (autoSpeak) {
          handleSpeakMessage(newAiMsg);
        }
      } else {
        setChatError(response.error || (selectedLanguage === 'hi' ? "AI सर्वर से जुड़ने में समस्या हुई।" : "Failed to connect to AI server. Please try again."));
      }
    } catch {
      setChatError(selectedLanguage === 'hi' ? "AI चैट सत्र शुरू नहीं हो सका।" : "Unable to start AI chat session. Please verify backend server is running.");
    } finally {
      setIsTyping(false);
    }
  };

  // Transition to AYUSH mode after General mode finishes
  const handleStartAyushMode = async () => {
    handleStopSpeaking();
    setSelectedMode('ayush');
    setIsComplete(false);
    setIsTyping(true);
    setChatError('');

    try {
      const currentPatientId = patientId || sessionStorage.getItem('medsync_patient_id');
      const response = await aiService.startChat({
        patient_id: currentPatientId,
        mode: 'ayush',
        language: selectedLanguage,
        session_id: sessionId
      });

      if (response.success) {
        if (response.session_id) {
          setSessionId(response.session_id);
          sessionStorage.setItem('medsync_chat_session_id', response.session_id);
        }
        setCurrentSection(response.section || 'AYUSH History');
        setAyushParameter(response.ayush_parameter || 'Prakriti');

        const defaultAyushQ = selectedLanguage === 'hi'
          ? "अब हम आपका आयुर्वेदिक इतिहास (दशविध परीक्षा) लेंगे। क्या आप गर्म मौसम में अधिक सहज महसूस करते हैं या ठंडे मौसम में?"
          : "Now let's collect your Ayurvedic history (Dashavidha Pariksha). How would you describe your preference for warm vs cool climates?";
        const ayushInitQ = response.question || defaultAyushQ;
        const msgId = Date.now();

        const newAiMsg = {
          id: msgId,
          sender: 'ai',
          text: `🌿 ${selectedLanguage === 'hi' ? 'आयुष परामर्श' : 'AYUSH Consultation'}: ${ayushInitQ}`,
          timestamp: getTimestamp(),
        };
        
        setMessages((prev) => [...prev, newAiMsg]);

        // Auto speak if enabled
        if (autoSpeak) {
          handleSpeakMessage(newAiMsg);
        }
      } else {
        setChatError(response.error || (selectedLanguage === 'hi' ? "आयुष परामर्श शुरू नहीं हो सका।" : "Failed to start AYUSH history consultation."));
      }
    } catch {
      setChatError(selectedLanguage === 'hi' ? "AI बैकएंड से जुड़ने में असमर्थ।" : "Unable to connect to AI backend for AYUSH consultation.");
    } finally {
      setIsTyping(false);
    }
  };

  // Restart interview handler
  const handleRestart = () => {
    handleStopSpeaking();
    speechService.stopListening();
    sessionStorage.removeItem('medsync_chat_session_id');
    setSessionId(null);
    setSelectedMode('general');
    setInterviewStarted(false);
    setCurrentSection('Chief Complaint');
    setAyushParameter(null);
    setAyushHistory(null);
    setQuestionNumber(1);
    setMessages([]);
    setQnaPairs([]);
    setIsTyping(false);
    setIsComplete(false);
    setHasRedFlag(false);
    setChatError('');
  };

  // Handle patient answer calling POST /api/chat/message
  const handleSendAnswer = async (answerText, metadata = {}) => {
    if (isTyping || isComplete || !answerText) return;

    handleStopSpeaking();
    setChatError('');

    const lastQuestion = messages[messages.length - 1]?.text || '';
    const patientMsg = {
      id: Date.now(),
      sender: 'patient',
      text: answerText,
      timestamp: getTimestamp(),
    };

    setMessages((prev) => [...prev, patientMsg]);
    setQnaPairs((prev) => [
      ...prev,
      { question: lastQuestion, answer: answerText },
    ]);

    setIsTyping(true);

    try {
      const currentPatientId = patientId || sessionStorage.getItem('medsync_patient_id');
      const response = await aiService.sendChatMessage(
        sessionId,
        answerText,
        metadata.source === 'voice' ? metadata.language : null,
        currentPatientId,
      );

      if (response.success) {
        if (response.red_flag) {
          setHasRedFlag(true);
        }

        if (response.ayush_history) {
          setAyushHistory(response.ayush_history);
        }

        if (response.complete) {
          setIsComplete(true);
        } else if (response.question) {
          setCurrentSection(response.section || currentSection);
          if (response.ayush_parameter) {
            setAyushParameter(response.ayush_parameter);
          }
          setQuestionNumber(response.question_number || questionNumber + 1);

          const newAiMsgId = Date.now() + 1;
          const newAiMsg = {
            id: newAiMsgId,
            sender: 'ai',
            text: response.question,
            timestamp: getTimestamp(),
          };

          setMessages((prev) => [...prev, newAiMsg]);

          // Auto speak if enabled
          if (autoSpeak) {
            handleSpeakMessage(newAiMsg);
          }
        }
      } else {
        setChatError(response.error || (selectedLanguage === 'hi' ? "प्रक्रिया में समस्या हुई। कृपया पुनः प्रयास करें।" : "I'm having trouble processing that. Please try again."));
      }
    } catch {
      setChatError(selectedLanguage === 'hi' ? "प्रक्रिया में समस्या हुई। कृपया पुनः प्रयास करें।" : "I'm having trouble processing that. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  // Quick reply options helper
  const getQuickReplies = () => {
    if (isTyping || isComplete) return null;
    const lowerSec = (currentSection || '').toLowerCase();
    const lowerParam = (ayushParameter || '').toLowerCase();
    const isHi = selectedLanguage === 'hi';

    if (selectedMode === 'ayush') {
      if (lowerParam.includes('prakriti') || lowerParam.includes('climate') || lowerParam.includes('satmya')) {
        return isHi 
          ? ['गर्म मौसम', 'ठंडा मौसम', 'कोई विशेष पसंद नहीं']
          : ['Warm climate', 'Cool climate', 'No preference'];
      }
      if (lowerParam.includes('ahara') || lowerParam.includes('agni') || lowerParam.includes('digest')) {
        return isHi
          ? ['अच्छी भूख', 'भारीपन / सुस्ती', 'अनियमित / गैस', 'एसिडिटी / जलन']
          : ['Good appetite', 'Sluggish / Heavy', 'Irregular / Gas', 'Acidity / Burning'];
      }
      if (lowerParam.includes('vihara') || lowerParam.includes('sleep')) {
        return isHi
          ? ['गहरी नींद', 'हल्की / बार-बार टूटने वाली', 'सोने में परेशानी']
          : ['Sound sleep', 'Light / Disturbed', 'Difficulty falling asleep'];
      }
      return isHi ? ['हाँ', 'नहीं', 'पक्का नहीं पता'] : ['Yes', 'No', 'Not sure'];
    }

    if (lowerSec.includes('medication') || lowerSec.includes('past') || lowerSec.includes('allergy')) {
      return isHi ? ['हाँ', 'नहीं', 'पक्का नहीं पता'] : ['Yes', 'No', 'Not sure'];
    }
    if (lowerSec.includes('duration') || lowerSec.includes('hpi')) {
      return isHi
        ? ['आज से', 'कुछ दिनों से', 'एक हफ्ते या अधिक से', 'महीनों से']
        : ['Today', 'Few days', 'A week or more', 'Months'];
    }
    return null;
  };

  const activeQuickReplies = getQuickReplies();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FBFC] text-[#17385E] selection:bg-[#18A6A1] selection:text-white relative overflow-hidden">
      
      {/* Soft background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-[#18A6A1]/10 via-[#EAFafa]/40 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* ── Top Header Bar ── */}
      <ChatHeader
        onExit={() => navigate('/patient/records')}
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={() => setAutoSpeak((prev) => !prev)}
      />

      {/* ── Progress Indicator Bar ── */}
      {interviewStarted && (
        <ChatProgress
          currentStep={questionNumber}
          totalSteps={selectedMode === 'ayush' ? 10 : 8}
          sectionName={currentSection}
          ayushParameter={ayushParameter}
          mode={selectedMode}
          isComplete={isComplete}
        />
      )}

      {/* ── Main Chat Area Container ── */}
      <main className="flex-grow flex flex-col justify-between max-w-3xl w-full mx-auto px-4 sm:px-6 py-4 relative">
        
        {/* ── 1. WELCOME SCREEN ── */}
        {!interviewStarted && (
          <div className="my-auto py-10 px-6 sm:px-10 bg-white rounded-3xl border border-slate-200 shadow-soft-lg text-center space-y-6 max-w-lg mx-auto animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#18A6A1] to-[#25C4BE] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#18A6A1]/30">
              <MessageSquareHeart className="w-9 h-9 stroke-[2.2]" />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAFafa] border border-[#18A6A1]/30 text-xs font-bold text-[#18A6A1]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Powered by Groq AI</span>
                </span>
                {patientId && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Patient: {patientName || 'Linked'}</span>
                  </span>
                )}
              </div>

              {!patientId && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{selectedLanguage === 'hi' ? 'कोई सक्रिय मरीज सत्र नहीं मिला।' : 'No active patient registration found.'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/patient/register')}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-full text-xs transition-colors cursor-pointer"
                  >
                    {selectedLanguage === 'hi' ? 'पंजीकरण' : 'Register'}
                  </button>
                </div>
              )}

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#17385E]">
                {selectedLanguage === 'hi' ? 'शुरू करने से पहले' : 'Before we begin'}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                {selectedLanguage === 'hi'
                  ? 'हम आपके स्वास्थ्य के बारे में कुछ सरल प्रश्न पूछेंगे। आपके उत्तर चिकित्सक के लिए एक संरचित रिपोर्ट तैयार करने में मदद करेंगे।'
                  : "We'll ask you a few questions about your health. Your answers will help create a structured medical history for your healthcare professional."}
              </p>
            </div>

            <div className="bg-[#EAFafa]/70 rounded-2xl p-4 border border-[#18A6A1]/20 text-xs text-[#17385E] text-left space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#18A6A1]">
                <HeartPulse className="w-4 h-4" />
                <span>{selectedLanguage === 'hi' ? 'मुख्य बातें:' : 'What to expect:'}</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                <li>{selectedLanguage === 'hi' ? 'पहले सामान्य मेडिकल इतिहास साक्षात्कार' : 'Basic general medical history interview first'}</li>
                <li>{selectedLanguage === 'hi' ? 'एक समय में केवल एक सरल प्रश्न' : 'One simple question at a time'}</li>
                <li>{selectedLanguage === 'hi' ? 'पूरा होने पर आयुर्वेदिक / आयुष परामर्श का विकल्प' : 'Option to add Ayurvedic / AYUSH history upon completion'}</li>
              </ul>
            </div>

            {chatError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{chatError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleStartInterview}
              className="w-full inline-flex items-center justify-center gap-2.5 py-4 px-8 rounded-full text-base font-bold text-white bg-gradient-to-r from-[#18A6A1] to-[#1a8fa8] hover:from-[#148F8B] hover:to-[#177a92] shadow-lg shadow-[#18A6A1]/30 hover:shadow-xl transition-all cursor-pointer"
            >
              <span>{selectedLanguage === 'hi' ? 'परामर्श शुरू करें' : 'Start Interview'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── 2. ACTIVE CHAT MESSAGES ── */}
        {interviewStarted && (
          <div className="flex-grow flex flex-col justify-start py-2 overflow-y-auto space-y-1">
            
            {/* Red Flag Alert Banner */}
            {hasRedFlag && (
              <div className="p-4 mb-3 rounded-2xl bg-red-50 border-2 border-red-300 text-red-800 text-xs font-bold flex items-start gap-3 shadow-md animate-pulse">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-extrabold text-red-900">
                    {selectedLanguage === 'hi' ? 'आपातकालीन लक्षण सूचना' : 'Urgent Symptom Notice'}
                  </p>
                  <p className="mt-0.5 text-red-700 leading-relaxed font-semibold">
                    {selectedLanguage === 'hi'
                      ? 'कृपया तुरंत किसी चिकित्सक से संपर्क करें। आपने ऐसे लक्षण बताए हैं जिनके लिए तत्काल चिकित्सा मूल्यांकन की आवश्यकता हो सकती है।'
                      : 'Please alert a healthcare professional immediately. You described symptoms that may require urgent medical evaluation.'}
                  </p>
                </div>
              </div>
            )}

            {/* List of Messages */}
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                selectedLanguage={selectedLanguage}
                isSpeaking={isSpeaking}
                speakingMessageId={speakingMessageId}
                onSpeak={handleSpeakMessage}
                onStopSpeak={handleStopSpeaking}
              />
            ))}

            {/* AI Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 my-3.5 justify-start animate-fadeIn">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#18A6A1] to-[#25C4BE] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#18A6A1]/20 mt-1">
                  <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <div className="bg-[#EAFafa] border border-[#18A6A1]/30 rounded-3xl rounded-tl-none px-5 py-3.5 text-xs font-bold text-[#18A6A1] flex items-center gap-2 shadow-xs">
                  <span>{selectedLanguage === 'hi' ? 'AI सोच रहा है...' : 'AI is thinking...'}</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#18A6A1] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#18A6A1] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#18A6A1] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}

            {/* Error Message retry */}
            {chatError && !isTyping && (
              <div className="p-3.5 my-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{chatError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const lastPatientMsg = messages.filter(m => m.sender === 'patient').pop();
                    if (lastPatientMsg) {
                      handleSendAnswer(lastPatientMsg.text);
                    } else {
                      handleStartInterview();
                    }
                  }}
                  className="px-3 py-1 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-bold cursor-pointer"
                >
                  {selectedLanguage === 'hi' ? 'पुनः प्रयास करें' : 'Retry'}
                </button>
              </div>
            )}

            {/* Completion Screen when interview is finished */}
            {isComplete && (
              <InterviewComplete
                qnaPairs={qnaPairs}
                mode={selectedMode}
                ayushHistory={ayushHistory}
                onStartAyush={handleStartAyushMode}
                onRestart={handleRestart}
                onViewSummary={() => navigate('/patient/summary')}
              />
            )}

            <div ref={chatBottomRef} />
          </div>
        )}

        {/* ── 3. BOTTOM CONTROLS & INPUT ── */}
        {interviewStarted && !isComplete && (
          <div className="pt-3 pb-2 sticky bottom-0 bg-[#F8FBFC]/90 backdrop-blur-md border-t border-slate-200/60 mt-2 space-y-2">
            
            {/* Quick Answer Buttons */}
            {activeQuickReplies && (
              <QuickReplies
                options={activeQuickReplies}
                onSelect={handleSendAnswer}
                disabled={isTyping}
              />
            )}

            {/* Chat Input Bar */}
            <ChatInput
              onSend={handleSendAnswer}
              onLanguageDetected={handleDetectedLanguage}
              disabled={isComplete}
              isTyping={isTyping}
              selectedLanguage={selectedLanguage}
            />

            {/* Restart link */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 pt-1">
              <span>{selectedLanguage === 'hi' ? 'भेजने के लिए Enter दबाएँ' : 'Press Enter to send'}</span>
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-1 hover:text-[#18A6A1] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{selectedLanguage === 'hi' ? 'पुनः शुरू करें' : 'Restart Interview'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── 4. MANDATORY SAFETY NOTICE ── */}
        <div className="text-[11px] text-slate-400 text-center py-3 flex items-center justify-center gap-1.5 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-[#18A6A1] shrink-0" />
          <span>
            {selectedMode === 'ayush'
              ? (selectedLanguage === 'hi'
                  ? 'यह AI सहायक केवल इतिहास लेने के लिए आयुर्वेदिक मापदंडों का संग्रह करता है। यह कोई प्रत्यक्ष निदान या उपचार निर्धारित नहीं करता।'
                  : 'This AI assistant collects Ayurvedic history parameters for history-taking. It does not render diagnoses or prescriptives.')
              : (selectedLanguage === 'hi'
                  ? 'यह AI सहायक स्वास्थ्य इतिहास एकत्र करने के लिए है। यह कोई अंतिम निदान प्रदान नहीं करता अथवा डॉक्टर का स्थान नहीं लेता।'
                  : 'This AI assistant collects health information for history-taking. It does not provide a diagnosis or replace a healthcare professional.')}
          </span>
        </div>

      </main>

    </div>
  );
}
