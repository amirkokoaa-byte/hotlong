import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Search, Trash2, X, Phone, Clock, Tag, ShieldAlert, CheckCircle2, FileText } from 'lucide-react';
import { CallRecord } from '../types';
import { storageService } from '../services/storage';

interface CallHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CallHistoryModal: React.FC<CallHistoryModalProps> = ({ isOpen, onClose }) => {
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<CallRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const data = await storageService.getAllCallRecords();
      setRecords(data);
    } catch (err) {
      console.error('Failed to load call history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRecords();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this saved call record from local device?')) {
      await storageService.deleteCallRecord(id);
      if (selectedRecord?.id === id) setSelectedRecord(null);
      await loadRecords();
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = ['ID', 'Date', 'Hotline', 'Caller ID', 'Customer Name', 'Phone', 'Category', 'Priority', 'Status', 'Duration', 'Notes', 'Agent'];
    const rows = records.map((r) => [
      `"${r.id}"`,
      `"${r.dateFormatted}"`,
      `"${r.hotlineNumber}"`,
      `"${r.callerId}"`,
      `"${r.customerName || ''}"`,
      `"${r.customerPhone || ''}"`,
      `"${r.category}"`,
      `"${r.priority}"`,
      `"${r.status}"`,
      `"${r.durationFormatted}"`,
      `"${r.notes.replace(/"/g, '""')}"`,
      `"${r.agentName}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VoIP_Hotline_Call_Records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (records.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `VoIP_Hotline_Call_Records_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.callerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.customerName && r.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.customerPhone && r.customerPhone.includes(searchQuery));
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" id="call-history-modal">
      <div className="relative w-full max-w-4xl bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 bg-[#0F172A]/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Saved Call Records & Notes (سجل المكالمات المحفوظة)
              </h2>
              <p className="text-xs text-slate-400">
                IndexedDB / Local machine persistent storage ({records.length} records)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={records.length === 0}
              title="Export to CSV"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-blue-300 border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              onClick={handleExportJSON}
              disabled={records.length === 0}
              title="Export to JSON"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-blue-300 border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              JSON
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="p-4 border-b border-slate-700/80 bg-[#0F172A]/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, phone, caller ID, or notes..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#0F172A] border border-slate-700 text-white focus:outline-none focus:border-blue-500 text-xs"
            >
              <option value="all">All Categories (جميع التصنيفات)</option>
              <option value="Technical">Technical Support</option>
              <option value="Billing">Billing & Payments</option>
              <option value="Sales">Sales Inquiry</option>
              <option value="Complaint">Complaint</option>
              <option value="General">General Inquiry</option>
            </select>
          </div>
        </div>

        {/* Main Content Area (List + Detail View) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* List Column */}
          <div className="md:col-span-6 border-r border-slate-700/80 overflow-y-auto p-4 space-y-2.5 max-h-[55vh]">
            {isLoading ? (
              <div className="text-center py-10 text-slate-500 text-xs">Loading local database records...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 text-slate-700" />
                <span>No call records found. Active call notes saved during calls will appear here.</span>
              </div>
            ) : (
              filteredRecords.map((r) => {
                const isSelected = selectedRecord?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-slate-800/90 border-blue-500/60 shadow-lg'
                        : 'bg-[#0F172A]/70 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-blue-400" />
                        <span className="font-bold text-white text-xs font-mono">{r.callerId}</span>
                        {r.customerName && (
                          <span className="text-slate-300 text-xs font-medium">({r.customerName})</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-blue-300">
                          {r.durationFormatted}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(r.id, e)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                      {r.notes}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {r.category}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded border ${
                          r.priority === 'Urgent'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : r.priority === 'High'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {r.priority}
                        </span>
                      </div>
                      <span>{r.dateFormatted}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Details Column */}
          <div className="md:col-span-6 p-5 overflow-y-auto max-h-[55vh] bg-[#0F172A]/30 text-xs">
            {selectedRecord ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedRecord.callerId}</h3>
                    <p className="text-[11px] text-slate-400">Hotline: {selectedRecord.hotlineNumber}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[11px]">
                    {selectedRecord.durationFormatted} Duration
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-[#0F172A] p-3 rounded-xl border border-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Customer Name:</span>
                    <span className="text-slate-200 font-medium">{selectedRecord.customerName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Customer Phone:</span>
                    <span className="text-slate-200 font-mono">{selectedRecord.customerPhone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Category:</span>
                    <span className="text-blue-400 font-medium">{selectedRecord.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Priority:</span>
                    <span className="text-amber-400 font-medium">{selectedRecord.priority}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    Agent Call Notes (ملاحظات وتفاصيل المكالمة):
                  </h4>
                  <div className="p-3.5 rounded-xl bg-[#0F172A] border border-slate-700 text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedRecord.notes}
                  </div>
                </div>

                {selectedRecord.actionItems && selectedRecord.actionItems.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-slate-300 mb-1.5">
                      Action Items (إجراءات المتابعة):
                    </h4>
                    <ul className="space-y-1 bg-[#0F172A] p-2.5 rounded-xl border border-slate-700">
                      {selectedRecord.actionItems.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-700 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Logged by: {selectedRecord.agentName}</span>
                  <span>{selectedRecord.dateFormatted}</span>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 text-xs">
                <FileSpreadsheet className="w-10 h-10 text-slate-700 mb-2" />
                <p>Select any call record from the list to inspect full details, duration, and notes.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
