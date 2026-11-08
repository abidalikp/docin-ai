import React, { useState, useRef } from 'react';
import { Upload, FileText, ZoomIn, ZoomOut, RotateCcw, Sparkles, RefreshCw, Layers } from 'lucide-react';
import type { SampleReceipt } from '../types';

interface DocumentViewerProps {
  currentImageUrl: string | null;
  currentFileName: string;
  isExtracting: boolean;
  onFileUpload: (file: File) => void;
  sampleReceipts: SampleReceipt[];
  selectedSampleId: string | null;
  onSelectSample: (id: string) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  currentImageUrl,
  currentFileName,
  isExtracting,
  onFileUpload,
  sampleReceipts,
  selectedSampleId,
  onSelectSample,
}) => {
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Panel Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Document Viewer</h2>
            <p className="text-[11px] text-slate-400">
              {currentFileName || 'Upload or select regional receipt'}
            </p>
          </div>
        </div>

        {/* Zoom Controls */}
        {currentImageUrl && (
          <div className="flex items-center gap-1 bg-slate-950/70 rounded-lg p-1 border border-slate-800">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-1.5">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Sample Quick Selectors */}
      <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 shrink-0">
          <Layers className="w-3 h-3 text-teal-400" />
          Sample Receipts:
        </span>
        {sampleReceipts.map((sample) => (
          <button
            key={sample.id}
            onClick={() => onSelectSample(sample.id)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition shrink-0 border ${
              selectedSampleId === sample.id
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm shadow-teal-500/10'
                : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {sample.region_language}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-auto p-4 flex items-center justify-center bg-slate-950/80">
        {currentImageUrl ? (
          <div className="relative max-w-full max-h-full transition-transform duration-150" style={{ transform: `scale(${zoom})` }}>
            {/* Document Image */}
            <img
              src={currentImageUrl}
              alt="Receipt Preview"
              className="max-h-[640px] w-auto object-contain rounded-lg shadow-2xl border border-slate-700/50"
            />

            {/* Scanning Laser Overlay when processing */}
            {isExtracting && (
              <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none bg-teal-500/10 backdrop-blur-[1px] border border-teal-400/40">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_15px_#2dd4bf] animate-[bounce_2s_infinite]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/60">
                  <div className="p-3 rounded-full bg-teal-500/20 text-teal-300 animate-pulse">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                  <span className="text-xs font-semibold tracking-wide text-teal-300 uppercase px-3 py-1 rounded-full bg-slate-900/90 border border-teal-500/30">
                    Sarvam Vision 1.5 Extracting...
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Applying custom receipt schema via Document AI
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-full max-h-[500px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition ${
              isDragging
                ? 'border-teal-400 bg-teal-500/10 text-teal-300'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/30 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              Upload Financial Receipt
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mb-4">
              Drag & drop any messy, handwritten, or regional-language receipt (PNG, JPG, PDF) or click to browse.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">PNG</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">JPG</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">PDF</span>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/*,application/pdf"
          className="hidden"
        />
      </div>

      {/* Footer / Re-upload button */}
      <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Powered by Sarvam Vision 1.5 (`sarvam-vision-v1`)</span>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white transition flex items-center gap-1.5 border border-slate-700"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload New Image
        </button>
      </div>
    </div>
  );
};
