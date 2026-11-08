import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Send, RefreshCw } from 'lucide-react';
import type { ReceiptData, VoiceMessage } from '../types';
import { sendVoiceQuery } from '../services/api';

interface VoiceInterfaceProps {
  documentData: ReceiptData;
  languageCode: string;
  speaker: string;
}

const createMessage = (
  role: 'user' | 'assistant',
  text: string,
  audioBase64?: string
): VoiceMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  role,
  text,
  audioBase64,
  timestamp: new Date(),
});

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  documentData,
  languageCode,
  speaker,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [statusText, setStatusText] = useState('Hold or click mic to ask about this receipt');
  const [messages, setMessages] = useState<VoiceMessage[]>(() => [
    createMessage(
      'assistant',
      `Hello! I'm ready to answer any questions about the receipt from "${documentData.vendor_name || 'this vendor'}". You can ask about the total, specific items, date, or anything else!`
    ),
  ]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Timer for recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Unified Spoken Audio Output (Bulbul V4 with browser speech synthesis fallback)
  const speakAnswer = (text: string, audioBase64?: string) => {
    try {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      if (audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        activeAudioRef.current = audio;
        setIsPlayingAudio(true);
        setStatusText('Bulbul V4 Flash Speaking...');

        audio.onended = () => {
          setIsPlayingAudio(false);
          setStatusText('Ready for next question');
        };
        audio.onerror = () => {
          setIsPlayingAudio(false);
          setStatusText('Ready for next question');
        };

        audio.play().catch((err) => {
          console.warn('Audio autoplay blocked or failed:', err);
          setIsPlayingAudio(false);
        });
      } else if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = languageCode || 'en-IN';
        setIsPlayingAudio(true);
        setStatusText('Speaking answer...');

        utterance.onend = () => {
          setIsPlayingAudio(false);
          setStatusText('Ready for next question');
        };
        utterance.onerror = () => {
          setIsPlayingAudio(false);
          setStatusText('Ready for next question');
        };

        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error('Audio playback error:', e);
      setIsPlayingAudio(false);
    }
  };

  // Start Audio Recording
  const startRecording = async () => {
    if (isRecording || isProcessing) return;

    try {
      setRecordingDuration(0);
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        await processQuery(audioBlob, null);
      };

      recorder.start(100);
      setIsRecording(true);
      setStatusText('Listening to your query...');
    } catch (err: any) {
      console.error('Microphone error:', err);
      setStatusText('Microphone access blocked. Use text input below.');
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    setStatusText('Transcribing speech via Saaras...');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Process query through backend
  const processQuery = async (audioBlob: Blob | null, textQuery: string | null) => {
    setIsProcessing(true);
    setStatusText('Processing document query with Sarvam AI...');

    try {
      const response = await sendVoiceQuery(
        audioBlob,
        textQuery,
        documentData,
        languageCode,
        speaker
      );

      // Add user message
      const userMsg = createMessage(
        'user',
        response.transcript || textQuery || 'Voice query'
      );

      // Add assistant response
      const assistantMsg = createMessage(
        'assistant',
        response.answer,
        response.audio_base64
      );

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      // Automatically speak the response
      speakAnswer(response.answer, response.audio_base64);
    } catch (err: any) {
      console.error('Query processing error:', err);
      const errMsg = createMessage(
        'assistant',
        `Sorry, I encountered an error: ${err.message || 'Could not process query'}.`
      );
      setMessages((prev) => [...prev, errMsg]);
      setStatusText('Error processing query');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    const query = textInput.trim();
    setTextInput('');
    processQuery(null, query);
  };

  const handleChipClick = (queryText: string) => {
    if (isProcessing) return;
    processQuery(null, queryText);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const suggestionChips = [
    'What is the total amount?',
    'Who is the vendor?',
    'What is the transaction date?',
    'List all items bought',
    "What's the most expensive item?",
  ];

  return (
    <div className="flex flex-col bg-slate-900/60 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Voice & Conversation Interface</h2>
            <p className="text-[11px] text-slate-400">Saaras Speech-to-Text & Bulbul V4 Flash Voice</p>
          </div>
        </div>

        {/* Live Audio Indicator */}
        {isPlayingAudio && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>Speaking...</span>
          </div>
        )}
      </div>

      {/* Conversation Feed */}
      <div className="p-4 h-52 overflow-y-auto space-y-3 bg-slate-950/60 flex flex-col">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[85%] ${
              msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'
            }`}
          >
            <div
              className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-teal-600 text-white rounded-br-none shadow-sm'
                  : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none shadow-sm'
              }`}
            >
              {msg.text}
            </div>

            {/* Replay voice button for assistant messages */}
            {msg.role === 'assistant' && (
              <button
                onClick={() => speakAnswer(msg.text, msg.audioBase64)}
                className="mt-1 flex items-center gap-1 text-[10px] text-teal-400 hover:text-teal-300 transition"
              >
                <Volume2 className="w-3 h-3" />
                <span>Replay audio</span>
              </button>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="self-start flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs text-slate-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
            <span>Interrogating receipt with Sarvam AI...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Chips */}
      <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/30 flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[10px] font-medium text-slate-500 shrink-0">Ask:</span>
        {suggestionChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleChipClick(chip)}
            disabled={isProcessing}
            className="px-2.5 py-1 rounded-full bg-slate-800/70 hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white border border-slate-700/60 shrink-0 transition"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Bottom Voice Control Section */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-col items-center gap-3">
        {/* Status Text & Visualizer */}
        <div className="flex items-center justify-between w-full text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isRecording
                  ? 'bg-rose-500 animate-ping'
                  : isProcessing
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-teal-400'
              }`}
            />
            <span className="text-slate-300 font-medium">{statusText}</span>
          </div>
          {isRecording && (
            <span className="font-mono text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              {formatTimer(recordingDuration)}
            </span>
          )}
        </div>

        {/* Big Tactile Push-to-Talk Mic Button */}
        <div className="flex items-center justify-center py-1">
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isProcessing}
            className={`relative group w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 select-none ${
              isRecording
                ? 'bg-rose-600 text-white scale-110 shadow-lg shadow-rose-500/40 ring-4 ring-rose-500/30'
                : 'bg-gradient-to-tr from-teal-600 to-cyan-500 hover:from-teal-500 hover:to-cyan-400 text-white shadow-lg shadow-teal-500/30 hover:scale-105'
            }`}
            title="Press and hold to talk (or click)"
          >
            {isRecording ? (
              <MicOff className="w-7 h-7 animate-pulse" />
            ) : (
              <Mic className="w-7 h-7" />
            )}

            {isRecording && (
              <span className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping opacity-75" />
            )}
          </button>
        </div>
        <span className="text-[11px] text-slate-400 select-none">
          {isRecording ? 'Release to send query' : 'Press & Hold (or Click) to Speak'}
        </span>

        {/* Text Input Fallback Bar */}
        <form onSubmit={handleTextSubmit} className="w-full flex items-center gap-2 pt-1">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a question (e.g. What is the total amount?)..."
            disabled={isProcessing}
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || isProcessing}
            className="p-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white transition"
            title="Send query"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
