import React, { useState, useEffect } from 'react';
import { X, Trash2, Download, Clock, Search, FileText } from 'lucide-react';

interface NoteItem {
  id: number | string;
  text: string;
  date: string;
  category?: string;
  priority?: string;
  status?: string;
}

interface NotesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotesHistoryModal({ isOpen, onClose }: NotesHistoryModalProps) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = JSON.parse(localStorage.getItem('customer_notes') || '[]');
        setNotes(saved);
      } catch {
        setNotes([]);
      }
    }
  }, [isOpen]);

  const clearAllNotes = () => {
    if (window.confirm('هل أنت متأكد من حذف جميع الملاحظات المسجلة من هذا الجهاز؟')) {
      localStorage.removeItem('customer_notes');
      setNotes([]);
    }
  };

  const exportNotesJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `customer_notes_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredNotes = notes.filter((n) =>
    (n.text || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (n.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="notes-history-modal">
      <div className="bg-[#1E293B] border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-700 pb-4 mb-4">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            id="close-notes-modal-btn"
          >
            <X size={20} />
          </button>
          <div className="text-right">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 justify-end">
              <span>سجل طلبات وملاحظات العملاء</span>
              <FileText className="w-5 h-5 text-blue-400" />
            </h3>
            <p className="text-xs text-slate-400">المحفوظة محلياً على هذا الجهاز (Local Storage / IndexedDB)</p>
          </div>
        </div>

        {/* Search Filter */}
        {notes.length > 0 && (
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              placeholder="البحث في الملاحظات والطلبات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 rounded-xl bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm text-right"
              id="search-notes-input"
            />
          </div>
        )}

        {/* Notes List */}
        <div className="flex-grow overflow-y-auto space-y-3 pr-1 text-right custom-scrollbar">
          {filteredNotes.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-60" />
              <p className="text-sm">لا توجد ملاحظات محفوظة تطابق البحث.</p>
            </div>
          ) : (
            filteredNotes.map((item) => (
              <div
                key={item.id}
                className="bg-[#0F172A] border border-slate-700/80 p-4 rounded-xl relative hover:border-slate-600 transition"
              >
                <div className="flex items-center justify-between text-xs text-blue-400 mb-2">
                  {item.category && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[11px] font-medium">
                      {item.category}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <span>{item.date}</span>
                    <Clock size={13} className="text-blue-400" />
                  </div>
                </div>
                <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {notes.length > 0 && (
          <div className="border-t border-slate-700 pt-4 mt-4 flex items-center justify-between">
            <button
              onClick={clearAllNotes}
              className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
              id="clear-all-notes-btn"
            >
              <Trash2 size={15} /> مسح السجل
            </button>
            <button
              onClick={exportNotesJSON}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition"
              id="export-notes-json-btn"
            >
              <Download size={15} /> تصدير الملاحظات (JSON)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
