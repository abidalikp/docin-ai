import React from 'react';
import { FileSpreadsheet, Settings, Eye, Volume2, Mic, CheckCircle2, AlertTriangle, Globe } from 'lucide-react';

interface HeaderProps {
  hasApiKey: boolean;
  onOpenSettings: () => void;
  selectedLanguage: string;
}

export const Header: React.FC<HeaderProps> = ({
  hasApiKey,
  onOpenSettings,
  selectedLanguage,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-teal-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-teal-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                Sarvam <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">FinVoice</span>
              </h1>
              <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                AI Document Suite
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Regional Document Digitization with Voice Intelligence
            </p>
          </div>
        </div>

        {/* Center Technology Badges */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <Eye className="w-3.5 h-3.5 text-teal-400" />
            <span>Vision 1.5 Doc AI</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>Saaras STT</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Bulbul V4 Flash</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs text-teal-300">
            <Globe className="w-3 h-3 text-teal-400" />
            <span>{selectedLanguage}</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              hasApiKey
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            {hasApiKey ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{hasApiKey ? 'Sarvam Key Active' : 'Demo Mode (Add Key)'}</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Settings & Audio Voices"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
