export interface ReceiptItem {
  item_name: string;
  price: number;
}

export interface ReceiptData {
  vendor_name: string;
  total_amount: number;
  transaction_date: string;
  items: ReceiptItem[];
}

export interface SampleReceipt {
  id: string;
  title: string;
  region_language: string;
  language_code: string;
  description: string;
  image_url: string;
  data: ReceiptData;
}

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  audioBase64?: string;
  timestamp: Date;
  intent?: string;
}

export interface ConfigStatus {
  has_api_key: boolean;
  default_tts_model: string;
  default_speech_model: string;
  default_vision_model: string;
  default_speaker: string;
}
