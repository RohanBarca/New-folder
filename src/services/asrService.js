export const ASR_LANGUAGE_NAMES = {
  'en-IN': 'English',
  'hi-IN': 'Hindi',
  'bn-IN': 'Bengali',
  'gu-IN': 'Gujarati',
  'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam',
  'mr-IN': 'Marathi',
  'od-IN': 'Odia',
  'pa-IN': 'Punjabi',
  'ta-IN': 'Tamil',
  'te-IN': 'Telugu',
  'ur-IN': 'Urdu',
  'as-IN': 'Assamese',
  'ne-IN': 'Nepali',
  'kok-IN': 'Konkani',
  'ks-IN': 'Kashmiri',
  'sd-IN': 'Sindhi',
  'sa-IN': 'Sanskrit',
  'sat-IN': 'Santali',
  'mni-IN': 'Manipuri',
  'brx-IN': 'Bodo',
  'mai-IN': 'Maithili',
  'doi-IN': 'Dogri',
};

import { API_BASE } from './api';

const asrService = {
  async transcribe(audioBlob, language = 'en') {
    const formData = new FormData();
    formData.append('file', audioBlob, 'medsync-recording.webm');
    formData.append('language', language);

    const response = await fetch(`${API_BASE}/api/asr/transcribe`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Speech transcription failed.');
    }
    return data;
  },
};

export default asrService;