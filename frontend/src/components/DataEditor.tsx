import React, { useState } from 'react';
import { Building2, Calendar, IndianRupee, Plus, Trash2, Copy, Check, Download, RefreshCw, Sparkles } from 'lucide-react';
import type { ReceiptData, ReceiptItem } from '../types';

interface DataEditorProps {
  data: ReceiptData;
  onChange: (newData: ReceiptData) => void;
  onReset: () => void;
}

export const DataEditor: React.FC<DataEditorProps> = ({
  data,
  onChange,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);
  const [autoRecalculate, setAutoRecalculate] = useState(true);

  // Field updates
  const handleVendorChange = (vendor_name: string) => {
    onChange({ ...data, vendor_name });
  };

  const handleDateChange = (transaction_date: string) => {
    onChange({ ...data, transaction_date });
  };

  const handleTotalChange = (val: string) => {
    const total_amount = parseFloat(val) || 0;
    onChange({ ...data, total_amount });
  };

  // Item updates
  const handleItemChange = (index: number, field: keyof ReceiptItem, value: any) => {
    const updatedItems = [...data.items];
    const currentItem = { ...updatedItems[index] };

    if (field === 'price') {
      currentItem.price = parseFloat(value) || 0;
    } else {
      currentItem.item_name = value;
    }
    updatedItems[index] = currentItem;

    // Recalculate total if enabled
    let newTotal = data.total_amount;
    if (autoRecalculate) {
      newTotal = updatedItems.reduce((acc, it) => acc + (it.price || 0), 0);
    }

    onChange({
      ...data,
      items: updatedItems,
      total_amount: autoRecalculate ? Math.round(newTotal * 100) / 100 : data.total_amount,
    });
  };

  const handleAddItem = () => {
    const newItem: ReceiptItem = { item_name: 'New Item', price: 0 };
    const updatedItems = [...data.items, newItem];
    onChange({
      ...data,
      items: updatedItems,
    });
  };

  const handleDeleteItem = (index: number) => {
    const updatedItems = data.items.filter((_, i) => i !== index);
    let newTotal = data.total_amount;
    if (autoRecalculate) {
      newTotal = updatedItems.reduce((acc, it) => acc + (it.price || 0), 0);
    }
    onChange({
      ...data,
      items: updatedItems,
      total_amount: autoRecalculate ? Math.round(newTotal * 100) / 100 : data.total_amount,
    });
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${data.vendor_name.replace(/\s+/g, '_') || 'extracted'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col bg-slate-900/60 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Extracted Receipt Data</h2>
            <p className="text-[11px] text-slate-400">Editable structured fields extracted via Sarvam Vision 1.5</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyJson}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white border border-slate-700 transition"
            title="Copy structured JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'JSON'}</span>
          </button>
          <button
            onClick={handleDownloadJson}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Download JSON File"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Reset to Original Extraction"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Top 3 Core Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Vendor Name */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 focus-within:border-teal-500/80 transition">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              Vendor / Business Name
            </label>
            <input
              type="text"
              value={data.vendor_name || ''}
              onChange={(e) => handleVendorChange(e.target.value)}
              placeholder="e.g. Sri Balaji Bhavan"
              className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none"
            />
          </div>

          {/* Transaction Date */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 focus-within:border-teal-500/80 transition">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              Transaction Date (YYYY-MM-DD)
            </label>
            <input
              type="date"
              value={data.transaction_date || ''}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none"
            />
          </div>

          {/* Total Amount */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 focus-within:border-teal-500/80 transition">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <IndianRupee className="w-3.5 h-3.5 text-teal-400" />
                Total Amount (INR)
              </label>
              <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRecalculate}
                  onChange={(e) => setAutoRecalculate(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-teal-500 focus:ring-0 w-3 h-3"
                />
                Auto-sum
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-sm font-bold text-teal-400">₹</span>
              <input
                type="number"
                step="any"
                value={data.total_amount ?? ''}
                onChange={(e) => handleTotalChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent pl-4 text-sm font-bold text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
          <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">Purchased Items</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {data.items.length} items
              </span>
            </div>
            <button
              onClick={handleAddItem}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-medium border border-teal-500/30 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/50 text-slate-400 sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3 w-8 text-center">#</th>
                  <th className="py-2 px-3">Item Description</th>
                  <th className="py-2 px-3 w-32 text-right">Price (₹)</th>
                  <th className="py-2 px-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/30 transition group">
                    <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                        placeholder="Item name"
                        className="w-full bg-transparent text-slate-200 focus:outline-none focus:text-white"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-slate-500">₹</span>
                        <input
                          type="number"
                          step="any"
                          value={item.price ?? ''}
                          onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                          placeholder="0.00"
                          className="w-24 bg-transparent text-right font-mono font-medium text-slate-200 focus:outline-none focus:text-white"
                        />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleDeleteItem(idx)}
                        className="opacity-40 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 rounded transition"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500 text-xs">
                      No items extracted. Click "+ Add Item" to add manually.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
