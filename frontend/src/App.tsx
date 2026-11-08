import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DocumentViewer } from './components/DocumentViewer';
import { DataEditor } from './components/DataEditor';
import { VoiceInterface } from './components/VoiceInterface';
import { SettingsModal } from './components/SettingsModal';
import type { ReceiptData, SampleReceipt } from './types';
import { getSampleReceipts, selectSampleReceipt, uploadReceipt, getConfig } from './services/api';
import { AlertCircle, X } from 'lucide-react';

const EMPTY_RECEIPT: ReceiptData = {
  vendor_name: '',
  total_amount: 0,
  transaction_date: '',
  items: [],
};

export const App: React.FC = () => {
  const [receiptData, setReceiptData] = useState<ReceiptData>(EMPTY_RECEIPT);
  const [originalReceiptData, setOriginalReceiptData] = useState<ReceiptData>(EMPTY_RECEIPT);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [sampleReceipts, setSampleReceipts] = useState<SampleReceipt[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

  // Settings & Configuration state
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('hi-IN');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('kavya_hi_conversational');

  // Error alert state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        const config = await getConfig();
        setHasApiKey(config.has_api_key);
        if (config.default_speaker) setSelectedSpeaker(config.default_speaker);

        const samples = await getSampleReceipts();
        setSampleReceipts(samples);

        // Auto-load first regional sample (Kirana Hindi store)
        if (samples.length > 0) {
          const firstSample = samples[0];
          setSelectedSampleId(firstSample.id);
          setCurrentImageUrl(firstSample.image_url);
          setCurrentFileName(firstSample.title);
          setReceiptData(firstSample.data);
          setOriginalReceiptData(firstSample.data);
          if (firstSample.language_code) setSelectedLanguage(firstSample.language_code);
        }
      } catch (err) {
        console.warn('Initial data load warning:', err);
      }
    };
    init();
  }, []);

  const handleSelectSample = async (id: string) => {
    setSelectedSampleId(id);
    const sample = sampleReceipts.find((s) => s.id === id);
    if (sample) {
      setCurrentImageUrl(sample.image_url);
      setCurrentFileName(sample.title);
      if (sample.language_code) setSelectedLanguage(sample.language_code);
    }

    setIsExtracting(true);
    setErrorMessage(null);
    try {
      const res = await selectSampleReceipt(id);
      setReceiptData(res.data);
      setOriginalReceiptData(res.data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load sample receipt');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setCurrentImageUrl(previewUrl);
    setCurrentFileName(file.name);
    setSelectedSampleId(null);
    setIsExtracting(true);
    setErrorMessage(null);

    try {
      const res = await uploadReceipt(file);
      setReceiptData(res.data);
      setOriginalReceiptData(res.data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Document extraction failed. Please check document quality.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleResetData = () => {
    setReceiptData({ ...originalReceiptData });
  };

  const refreshConfig = async () => {
    try {
      const config = await getConfig();
      setHasApiKey(config.has_api_key);
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Platform Header */}
      <Header
        hasApiKey={hasApiKey}
        onOpenSettings={() => setIsSettingsOpen(true)}
        selectedLanguage={selectedLanguage}
      />

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2 max-w-7xl mx-auto flex-1">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Split-Screen Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 items-start">
          {/* Left Panel: Document Ingestion & High-Res Viewer */}
          <div className="h-full min-h-[600px] flex flex-col">
            <DocumentViewer
              currentImageUrl={currentImageUrl}
              currentFileName={currentFileName}
              isExtracting={isExtracting}
              onFileUpload={handleFileUpload}
              sampleReceipts={sampleReceipts}
              selectedSampleId={selectedSampleId}
              onSelectSample={handleSelectSample}
            />
          </div>

          {/* Right Panel: Structured Data Form + Persistent Voice Interface */}
          <div className="h-full flex flex-col space-y-6">
            {/* Upper: Editable Extracted Fields */}
            <DataEditor
              data={receiptData}
              onChange={setReceiptData}
              onReset={handleResetData}
            />

            {/* Lower: Persistent Voice Interface */}
            <VoiceInterface
              documentData={receiptData}
              languageCode={selectedLanguage}
              speaker={selectedSpeaker}
            />
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        hasApiKey={hasApiKey}
        onApiKeyUpdated={refreshConfig}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        selectedSpeaker={selectedSpeaker}
        onSpeakerChange={setSelectedSpeaker}
      />
    </div>
  );
};

export default App;
