import React, { useState, useEffect } from 'react';
import { FileText, Save, CheckCircle2, Clock, Phone, AlertCircle, Plus, Trash2, Tag, ShieldAlert } from 'lucide-react';
import { CallRecord, ActiveCallState, SystemConfig } from '../types';
import { storageService } from '../services/storage';

interface ActiveCallSidebarProps {
  activeCall: ActiveCallState | null;
  config: SystemConfig;
  agentName: string;
  onNoteSaved?: (record: CallRecord) => void;
  className?: string;
}

export const ActiveCallSidebar: React.FC<ActiveCallSidebarProps> = ({
  activeCall,
  config,
  agentName,
  onNoteSaved,
  className = '',
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [category, setCategory] = useState<CallRecord['category']>('Technical');
  const [priority, setPriority] = useState<CallRecord['priority']>('Medium');
  const [status, setStatus] = useState<CallRecord['status']>('Open');
  const [notes, setNotes] = useState('');
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [newActionItem, setNewActionItem] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Auto-fill caller reference if active call changes
  useEffect(() => {
    if (activeCall) {
      setNotes((prev) => prev || `Customer connected on Hotline ${activeCall.hotlineNumber || config.hotlineDisplayNumber}.\nCaller Reference: ${activeCall.callerId}\n\nRequest Details:\n- `);
    }
  }, [activeCall?.callId]);

  const handleAddActionItem = () => {
    if (newActionItem.trim()) {
      setActionItems([...actionItems, newActionItem.trim()]);
      setNewActionItem('');
    }
  };

  const handleRemoveActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  const handleInsertTimestamp = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setNotes((prev) => prev + `\n[${timeStr}] `);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const recordId = 'call_rec_' + (activeCall?.callId || Date.now());
    const now = Date.now();
    const duration = activeCall?.durationSeconds || 0;
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const durationFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const record: CallRecord = {
      id: recordId,
      timestamp: now,
      dateFormatted: new Date(now).toLocaleString(),
      hotlineNumber: activeCall?.hotlineNumber || config.hotlineDisplayNumber,
      callerId: activeCall?.callerId || 'Unknown Caller',
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      category,
      priority,
      status,
      durationSeconds: duration,
      durationFormatted,
      notes: notes.trim() || 'No detailed notes provided.',
      actionItems,
      agentName: agentName || 'Agent',
    };

    try {
      await storageService.saveCallRecord(record);
      setSaveSuccess(true);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      if (onNoteSaved) onNoteSaved(record);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);
    } catch (err) {
      console.error('Error saving call record:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`w-full bg-[#1E293B] border border-slate-700/80 rounded-2xl flex flex-col shadow-xl overflow-hidden ${className}`}
      id="active-call-sidebar"
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-700 bg-[#0F172A]/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Active Call Notepad (مفكرة المكالمة الحالية)
            </h3>
            <p className="text-[11px] text-slate-400">
              Hotline: <span className="font-mono text-blue-400 font-semibold">{activeCall?.hotlineNumber || config.hotlineDisplayNumber}</span>
            </p>
          </div>
        </div>

        {activeCall && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-300 font-mono">
            <Clock className="w-3 h-3 text-blue-400" />
            <span>
              {Math.floor((activeCall.durationSeconds || 0) / 60).toString().padStart(2, '0')}:
              {((activeCall.durationSeconds || 0) % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Form Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-280px)] text-slate-200 text-xs">
        
        {/* Caller Reference Bar */}
        <div className="p-2.5 rounded-xl bg-[#0F172A] border border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Caller ID:</span>
            <span className="font-mono font-bold text-white">{activeCall?.callerId || 'Guest Hotline Caller'}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            WebRTC HD
          </span>
        </div>

        {/* Customer Basic Info */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Customer Name (اسم العميل):
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Ahmed Salem"
              id="sidebar-customer-name"
              className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Contact / Phone (رقم التواصل):
            </label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. +20 100 123 4567"
              id="sidebar-customer-phone"
              className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>
        </div>

        {/* Category & Priority */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-blue-400" />
              Category (نوع الطلب):
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CallRecord['category'])}
              id="sidebar-category-select"
              className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-white focus:outline-none focus:border-blue-500 text-xs"
            >
              <option value="Technical">Technical Support (دعم فني)</option>
              <option value="Billing">Billing & Payments (فواتير ودفع)</option>
              <option value="Sales">Sales Inquiry (استفسار مبيعات)</option>
              <option value="Complaint">Complaint (شكوى ومتابعة)</option>
              <option value="General">General Inquiry (استفسار عام)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              Priority (درجة الأهمية):
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as CallRecord['priority'])}
              id="sidebar-priority-select"
              className="w-full px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-white focus:outline-none focus:border-amber-500 text-xs font-semibold"
            >
              <option value="Low">Low (منخفضة)</option>
              <option value="Medium">Medium (متوسطة)</option>
              <option value="High">High (مرتفعة)</option>
              <option value="Urgent">Urgent (طارئة جداً)</option>
            </select>
          </div>
        </div>

        {/* Notes Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
              <FileText className="w-3 h-3 text-blue-400" />
              Customer Request & Notes (تفاصيل طلب العميل):
            </label>
            <button
              type="button"
              onClick={handleInsertTimestamp}
              className="text-[10px] text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 transition flex items-center gap-1"
            >
              <Clock className="w-2.5 h-2.5" />
              + Timestamp
            </button>
          </div>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write notes during the voice call..."
            id="sidebar-call-notes-textarea"
            className="w-full p-3 rounded-xl bg-[#0F172A] border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-xs font-sans leading-relaxed resize-none"
          />
        </div>

        {/* Follow-up Action Items */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
            Action Items / Follow-ups (إجراءات المتابعة):
          </label>
          
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newActionItem}
              onChange={(e) => setNewActionItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddActionItem())}
              placeholder="e.g. Escalate ticket #402 to tier 2..."
              id="sidebar-new-action-input"
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#0F172A] border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-xs"
            />
            <button
              type="button"
              onClick={handleAddActionItem}
              id="sidebar-add-action-btn"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition text-xs flex items-center gap-1 border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {actionItems.length > 0 && (
            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {actionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-[#0F172A] border border-slate-700/80 text-[11px]"
                >
                  <span className="truncate text-slate-300">• {item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveActionItem(idx)}
                    className="text-slate-500 hover:text-rose-400 p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resolution Status */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Call Resolution Status (حالة المكالمة):
          </label>
          <div className="flex gap-2">
            {(['Open', 'Resolved', 'Follow-up Required'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatus(st)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-medium border transition ${
                  status === st
                    ? st === 'Resolved'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : st === 'Follow-up Required'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-blue-500/20 border-blue-500 text-blue-300'
                    : 'bg-[#0F172A] border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Save Button with Persistence */}
      <div className="p-4 border-t border-slate-700 bg-[#0F172A] flex items-center justify-between gap-3">
        <div className="text-[11px] text-slate-400">
          {saveSuccess ? (
            <span className="text-emerald-400 font-medium flex items-center gap-1 animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved to IndexedDB!
            </span>
          ) : lastSavedTime ? (
            <span>Last saved at {lastSavedTime}</span>
          ) : (
            <span>IndexedDB persistent</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          id="save-call-note-btn"
          className="px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-lg shadow-blue-600/30 transition flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Note (حفظ الملاحظة)'}
        </button>
      </div>
    </div>
  );
};
