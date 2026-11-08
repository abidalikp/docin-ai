import type { ReceiptData, SampleReceipt, ConfigStatus } from '../types';

const API_BASE = '/api';

export async function uploadReceipt(file: File): Promise<{ success: boolean; data: ReceiptData; message: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload failed with status ${res.status}`);
  }

  return res.json();
}

export async function getSampleReceipts(): Promise<SampleReceipt[]> {
  const res = await fetch(`${API_BASE}/sample-receipts`);
  if (!res.ok) {
    throw new Error('Failed to load sample receipts');
  }
  return res.json();
}

export async function selectSampleReceipt(id: string): Promise<{ success: boolean; data: ReceiptData; message: string }> {
  const res = await fetch(`${API_BASE}/sample-receipts/${id}/select`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error('Failed to select sample receipt');
  }
  return res.json();
}

export async function sendVoiceQuery(
  audioBlob: Blob | null,
  textQuery: string | null,
  documentData: ReceiptData,
  languageCode: string = 'en-IN',
  speaker: string = 'kavya_hi_conversational'
): Promise<{
  success: boolean;
  transcript: string;
  answer: string;
  audio_base64?: string;
  language_code: string;
}> {
  const formData = new FormData();
  if (audioBlob) {
    formData.append('audio', audioBlob, 'voice_query.webm');
  }
  if (textQuery) {
    formData.append('text_query', textQuery);
  }
  formData.append('document_data', JSON.stringify(documentData));
  formData.append('language_code', languageCode);
  formData.append('speaker', speaker);

  const res = await fetch(`${API_BASE}/voice-query`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Voice query processing failed');
  }

  return res.json();
}

export async function sendTTS(
  text: string,
  languageCode: string = 'hi-IN',
  speaker: string = 'kavya_hi_conversational'
): Promise<{ success: boolean; audio_base64: string; message?: string }> {
  const res = await fetch(`${API_BASE}/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      language_code: languageCode,
      speaker,
      model: 'bulbul:v4-flash',
    }),
  });

  if (!res.ok) {
    throw new Error('TTS synthesis failed');
  }

  return res.json();
}

export async function getConfig(): Promise<ConfigStatus> {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) {
    throw new Error('Failed to fetch config');
  }
  return res.json();
}

export async function updateApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/config/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update API key');
  }
  return res.json();
}
