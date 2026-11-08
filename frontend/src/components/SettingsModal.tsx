import React, { useState } from 'react';
import { X, Key, Mic, Globe, Check, AlertCircle, Sparkles } from 'lucide-react';
import { updateApiKey } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasApiKey: boolean;
  onApiKeyUpdated: () => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  selectedSpeaker: string;
  onSpeakerChange: (speaker: string) => void;
}

import { SPEAKER_OPTIONS, LANGUAGE_OPTIONS } from '../constants';

export { SPEAKER_OPTIONS, LANGUAGE_OPTIONS };

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  hasApiKey,
  onApiKeyUpdated,
  selectedLanguage,
  onLanguageChange,
  selectedSpeaker,
  onSpeakerChange,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    setIsSaving(true);
    setErrorMsg('');
    try {
      await updateApiKey(apiKeyInput.trim());
      setSaveSuccess(true);
      onApiKeyUpdated();
      setApiKeyInput('');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Sarvam AI Configuration</h3>
              <p className="text-xs text-slate-400">Manage API keys and regional voice parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* API Key Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                <Key className="w-4 h-4 text-teal-400" />
                Sarvam AI API Subscription Key
              </label>
              {hasApiKey ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Check className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <AlertCircle className="w-3 h-3" /> Mock / Demo Mode
                </span>
              )}
            </div>
            <form onSubmit={handleSaveApiKey} className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={hasApiKey ? '••••••••••••••••••••••••••••••••' : 'Enter your Sarvam API Key'}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              />
              <button
                type="submit"
                disabled={isSaving || !apiKeyInput.trim()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5"
              >
                {isSaving ? 'Saving...' : 'Update'}
              </button>
            </form>
            {saveSuccess && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> API Key updated and Sarvam client initialized!
              </p>
            )}
            {errorMsg && (
              <p className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
              </p>
            )}
            <p className="text-xs text-slate-400">
              Your API key unlocks live calls to Sarvam Vision 1.5, Saaras STT, and Bulbul V4 Flash. Without a key, the app runs in interactive demo mode using regional sample templates.
            </p>
          </div>

          <div className="border-t border-slate-800" />

          {/* Regional Language Preference */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Globe className="w-4 h-4 text-teal-400" />
              Default Regional Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition"
            >
              {LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.code})
                </option>
              ))}
            </select>
          </div>

          {/* Bulbul V4 Speaker Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Mic className="w-4 h-4 text-teal-400" />
              Bulbul V4 Voice Persona
            </label>
            <select
              value={selectedSpeaker}
              onChange={(e) => onSpeakerChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition"
            >
              {SPEAKER_OPTIONS.map((spk) => (
                <option key={spk.id} value={spk.id}>
                  {spk.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400">
              Bulbul V4 Flash supports high-fidelity Indian language conversational voices with low latency.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
