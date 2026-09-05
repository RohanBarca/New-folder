/**
 * MedSync — Multilingual Speech Service
 * --------------------------------------
 * Provides unified, cross-browser Web Speech API abstraction for:
 *  - Speech-to-Text (SpeechRecognition)
 *  - Text-to-Speech (SpeechSynthesis)
 *
 * Configured for English (en-US) and Hindi (hi-IN).
 */

export const SPEECH_LANGUAGES = {
  en: 'en-US',
  hi: 'hi-IN',
};

class SpeechService {
  constructor() {
    this.recognition = null;
    this.isListeningActive = false;
    this.currentUtterance = null;
  }

  /**
   * Checks if browser supports Speech Recognition (Web Speech API)
   */
  isSpeechRecognitionSupported() {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Checks if browser supports Speech Synthesis (Text-to-Speech)
   */
  isSpeechSynthesisSupported() {
    if (typeof window === 'undefined') return false;
    return Boolean(window.speechSynthesis && typeof window.SpeechSynthesisUtterance !== 'undefined');
  }

  /**
   * Resolves the BCP-47 speech language code for a given language code
   */
  getSpeechLangCode(lang = 'en') {
    return SPEECH_LANGUAGES[lang] || SPEECH_LANGUAGES.en;
  }

  /**
   * Starts Speech Recognition for the chosen language
   *
   * @param {Object} options
   * @param {string} options.language - 'en' | 'hi'
   * @param {Function} options.onResult - Callback when a final/interim transcript is received
   * @param {Function} options.onStart - Callback when recognition actually starts
   * @param {Function} options.onEnd - Callback when recognition ends
   * @param {Function} options.onError - Callback with user-friendly error message
   */
  startListening({ language = 'en', onResult, onStart, onEnd, onError }) {
    if (!this.isSpeechRecognitionSupported()) {
      if (onError) {
        onError('Speech recognition is not supported in this browser. Please use text input or try Chrome/Edge.');
      }
      return false;
    }

    // Stop any existing session before starting a new one
    this.stopListening();

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.lang = this.getSpeechLangCode(language);
      this.recognition.continuous = false; // Stop when the user finishes speaking a phrase
      this.recognition.interimResults = true; // Enable live real-time transcription
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListeningActive = true;
        if (onStart) onStart();
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (onResult) {
          onResult({
            transcript: finalTranscript || interimTranscript,
            isFinal: Boolean(finalTranscript),
          });
        }
      };

      this.recognition.onerror = (event) => {
        this.isListeningActive = false;
        let errorMessage = 'Voice recognition error. Please try again.';

        switch (event.error) {
          case 'not-allowed':
          case 'permission-denied':
            errorMessage = 'Microphone permission is required for voice input. You can continue using text.';
            break;
          case 'no-speech':
            errorMessage = 'No speech was detected. Please tap the microphone and speak again.';
            break;
          case 'network':
            errorMessage = 'Voice recognition network error. Please verify your connection.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone was found. Please check your audio settings.';
            break;
          case 'aborted':
            // Ignored when intentionally stopped
            return;
          default:
            errorMessage = `Voice recognition error: ${event.error || 'Please try again.'}`;
        }

        if (onError) onError(errorMessage);
      };

      this.recognition.onend = () => {
        this.isListeningActive = false;
        if (onEnd) onEnd();
      };

      this.recognition.start();
      return true;
    } catch (err) {
      this.isListeningActive = false;
      if (onError) {
        onError('Unable to start voice recognition. Please try again.');
      }
      return false;
    }
  }

  /**
   * Stops active speech recognition
   */
  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignored
      }
      this.recognition = null;
    }
    this.isListeningActive = false;
  }

  /**
   * Returns whether speech recognition is currently listening
   */
  isListening() {
    return this.isListeningActive;
  }

  /**
   * Gets available browser speech synthesis voices
   */
  getVoices() {
    if (!this.isSpeechSynthesisSupported()) return [];
    return window.speechSynthesis.getVoices() || [];
  }

  /**
   * Finds the best matching voice for a language
   */
  findVoice(language = 'en') {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    const targetCode = this.getSpeechLangCode(language).toLowerCase(); // e.g. "hi-in" or "en-us"
    const prefix = targetCode.split('-')[0]; // "hi" or "en"

    // 1. Exact match with preferred natural voices (Google / Microsoft / Natural)
    const exactMatch = voices.find(
      (v) => v.lang.toLowerCase().replace('_', '-') === targetCode && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Neural'))
    );
    if (exactMatch) return exactMatch;

    // 2. Any exact language-region match
    const langRegionMatch = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === targetCode);
    if (langRegionMatch) return langRegionMatch;

    // 3. Fallback: match by language prefix
    const prefixMatch = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (prefixMatch) return prefixMatch;

    return null;
  }

  /**
   * Speaks the provided text using SpeechSynthesis
   *
   * @param {string} text - Text to speak
   * @param {string} language - 'en' | 'hi'
   * @param {Object} callbacks
   * @param {Function} callbacks.onStart - Callback when speech starts
   * @param {Function} callbacks.onEnd - Callback when speech finishes
   * @param {Function} callbacks.onError - Callback on error
   */
  speakText(text, language = 'en', { onStart, onEnd, onError } = {}) {
    if (!this.isSpeechSynthesisSupported()) {
      if (onError) onError('Text-to-speech is not supported in this browser.');
      return false;
    }

    if (!text || !text.trim()) return false;

    // Cancel any current utterance
    this.stopSpeaking();

    // Clean text of markdown, asterisks, bullet emojis for clean acoustic output
    const cleanText = text
      .replace(/[*#_~`]/g, '')
      .replace(/🌿|✨|⚠️|ℹ️|🩺/g, '')
      .trim();

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const targetCode = this.getSpeechLangCode(language);
      utterance.lang = targetCode;

      const voice = this.findVoice(language);
      if (voice) {
        utterance.voice = voice;
      }

      // Natural cadence for medical questions
      utterance.rate = language === 'hi' ? 0.92 : 0.95;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        if (onStart) onStart();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        if (event.error !== 'canceled' && onError) {
          onError(`Speech synthesis error: ${event.error}`);
        }
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      if (onError) onError('Unable to speak text.');
      return false;
    }
  }

  /**
   * Stops any currently playing speech
   */
  stopSpeaking() {
    if (this.isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignored
      }
      this.currentUtterance = null;
    }
  }

  /**
   * Checks if speech is currently speaking
   */
  isSpeaking() {
    if (!this.isSpeechSynthesisSupported()) return false;
    return window.speechSynthesis.speaking;
  }
}

const speechService = new SpeechService();
export default speechService;
