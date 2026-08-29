import React, { useState, useEffect } from 'react';
import {
  Headphones,
  PhoneIncoming,
  PhoneOff,
  PhoneCall,
  Settings,
  FileSpreadsheet,
  MessageSquare,
  Radio,
  Power,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Activity,
  Maximize2
} from 'lucide-react';
import { SystemConfig, ActiveCallState, CallRecord } from '../types';
import { VoiceCallModal } from './VoiceCallModal';
import { ActiveCallSidebar } from './ActiveCallSidebar';
import { LiveChatBox } from './LiveChatBox';
import { CallHistoryModal } from './CallHistoryModal';
import NotesHistoryModal from './NotesHistoryModal';
import { AudioWaveform } from './AudioWaveform';

interface IncomingCallOffer {
  callId: string;
  callerId: string;
  hotlineNumber: string;
  timestamp: number;
}

interface AgentDashboardProps {
  config: SystemConfig;
  agentName: string;
  activeCall: ActiveCallState | null;
  incomingCall: IncomingCallOffer | null;
  onAcceptIncomingCall: () => void;
  onRejectIncomingCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onOpenAdminSettings: () => void;
  onLogout: () => void;
  onOpenSplitView?: () => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  config,
  agentName,
  activeCall,
  incomingCall,
  onAcceptIncomingCall,
  onRejectIncomingCall,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
  onOpenAdminSettings,
  onLogout,
  onOpenSplitView,
}) => {
  const [isReady, setIsReady] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'chat'>('console');
  const [lastSavedRecord, setLastSavedRecord] = useState<CallRecord | null>(null);

  const isCallActive = activeCall && (activeCall.status === 'connected' || activeCall.status === 'dialing' || activeCall.status === 'ringing');

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-between" id="agent-dashboard-view">
      
      {/* Top Agent Bar / Header with Company Branding & Line ID */}
      <header className="h-16 bg-[#1E293B] border-b border-slate-700 px-6 sticky top-0 z-30 flex items-center shrink-0">
        <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-4">
          
          {/* Company Branding & Designated Line */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              <Headphones className="w-4 h-4 text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-slate-200 tracking-tight flex items-center gap-1.5">
                  <span>{config?.companyName || 'CloudTech Hotline'}</span>
                  <span className="text-blue-400 font-bold">Hotline Pro</span>
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-mono font-bold">
                  Line: {config?.hotlineDisplayNumber || '19011'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Agent Console • Logged in as <span className="text-slate-200 font-semibold">{agentName}</span>
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-3">
            
            {/* Agent Status Toggle */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
              <button
                type="button"
                onClick={() => setIsReady(!isReady)}
                className={`text-xs uppercase font-medium tracking-widest transition ${
                  isReady ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                {isReady ? 'Agent Online (جاهز)' : 'Paused (إيقاف مؤقت)'}
              </button>
            </div>

            <div className="h-6 w-[1px] bg-slate-700 hidden sm:block" />

            {/* Call History / Saved Notes Button */}
            <button
              type="button"
              onClick={() => setShowNotesModal(true)}
              id="view-customer-notes-btn"
              className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-xs font-semibold text-blue-300 transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
              <span>ملاحظات العملاء (Notes)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              id="view-call-records-btn"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">سجل المكالمات (Logs)</span>
            </button>

            {/* Split View Tester button */}
            {onOpenSplitView && (
              <button
                type="button"
                onClick={onOpenSplitView}
                title="Split View for Testing Dual Calling"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-blue-500/30 text-blue-300 text-xs transition"
              >
                <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Dual Mode</span>
              </button>
            )}

            {/* Admin Settings Gear Icon */}
            <button
              type="button"
              onClick={onOpenAdminSettings}
              title="Admin Settings (Master: 0000)"
              id="dashboard-admin-settings-btn"
              className="p-2 rounded-full hover:bg-slate-700 transition-colors group text-slate-400"
            >
              <Settings className="w-5 h-5 group-hover:text-blue-400 transition-transform group-hover:rotate-45" />
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={onLogout}
              title="Logout from Receiver Console"
              id="agent-logout-btn"
              className="p-2 rounded-full hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition"
            >
              <Power className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full relative">
        
        {/* ========================================================= */}
        {/* INCOMING CALL RINGING OVERLAY / NOTIFICATION */}
        {/* ========================================================= */}
        {incomingCall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn" id="incoming-call-ringing-overlay">
            <div className="relative w-full max-w-md bg-[#1E293B] border border-blue-500/60 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center overflow-hidden animate-bounce-short">
              
              {/* Pulsing Concentric Rings Animation */}
              <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
              <div className="relative w-36 h-36 rounded-full border-2 border-blue-500/30 flex items-center justify-center mb-6">
                <div className="w-28 h-28 rounded-full border-4 border-blue-500/50 flex items-center justify-center animate-ping opacity-50 absolute" />
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/40">
                  <PhoneIncoming className="w-10 h-10 animate-bounce" />
                </div>
              </div>

              {/* Designated Caller ID / Hotline Line */}
              <div className="space-y-1 mb-6">
                <span className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold">
                  Incoming VoIP Call (مكالمة واردة)
                </span>
                <h2 className="text-3xl font-bold text-white font-mono tracking-tight">
                  {incomingCall.hotlineNumber || config?.hotlineDisplayNumber || '19011'}
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  {config?.companyName || 'Hotline Center'}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F172A] border border-slate-700 text-[11px] text-slate-300">
                  <span>Line Tag:</span>
                  <span className="font-mono text-blue-400 font-bold">{incomingCall.callerId}</span>
                </div>
              </div>

              {/* Action Buttons: Decline (Red) and Accept (Blue/Green) */}
              <div className="w-full flex items-center justify-center gap-4 pt-4 border-t border-slate-700">
                {/* Decline Button */}
                <button
                  type="button"
                  onClick={onRejectIncomingCall}
                  id="decline-incoming-call-btn"
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-400 hover:text-rose-300 font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Decline (رفض)</span>
                </button>

                {/* Accept Button */}
                <button
                  type="button"
                  onClick={onAcceptIncomingCall}
                  id="accept-incoming-call-btn"
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-600/40 transition animate-pulse"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Answer (رد)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs for Agent Console */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('console')}
            id="tab-agent-call-center"
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'console'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-[#1E293B] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>VoIP Calling & Notepad (مركز المكالمات والمفكرة)</span>
            {isCallActive && (
              <span className="w-2 h-2 rounded-full bg-blue-300 animate-ping ml-1" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            id="tab-agent-live-chat"
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-[#1E293B] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Live Customer Chats (المحادثات النصية)</span>
          </button>
        </div>

        {/* Tab 1: VoIP Calling Console + Active Call Sidebar Notepad */}
        {activeTab === 'console' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left / Center Column: Call Control Panel */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              
              {isCallActive && activeCall ? (
                /* Full Active Voice Call Screen with Audio Waveforms and Controls */
                <VoiceCallModal
                  activeCall={activeCall}
                  config={config}
                  role="agent"
                  onEndCall={onEndCall}
                  onToggleMute={onToggleMute}
                  onToggleSpeaker={onToggleSpeaker}
                />
              ) : (
                /* Idle Receiver Waiting State */
                <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[420px] shadow-xl relative overflow-hidden" id="agent-idle-screen">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Concentric Idle Rings */}
                  <div className="relative w-36 h-36 rounded-full border-2 border-blue-500/20 flex items-center justify-center mb-6">
                    <div className="w-28 h-28 rounded-full border-4 border-blue-500/40 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg text-white">
                        <Radio className="w-8 h-8 animate-pulse" />
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold mb-1">
                    Receiver Online • Waiting for Calls
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight mb-2">
                    Line Ready: {config?.hotlineDisplayNumber || '19011'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6 font-sans">
                    Receiver is active and listening for incoming customer WebRTC calls. When a customer dials the hotline, a ringing window will appear with one-click answer.
                  </p>

                  <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                    <div className="p-3 rounded-xl bg-[#0F172A] border border-slate-700 text-left">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Protocol</span>
                      <span className="text-xs font-semibold text-blue-400">WebRTC Audio HD</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0F172A] border border-slate-700 text-left">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Hotline Number</span>
                      <span className="text-xs font-mono font-bold text-white">{config?.hotlineDisplayNumber || '19011'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Info Telemetry Bar */}
              <div className="p-4 rounded-xl bg-[#1E293B] border border-slate-700 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Audio encryption: DTLS-SRTP WebRTC</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span>60ms</span>
                  <span className="text-slate-600">|</span>
                  <span>TLSv1.3</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-emerald-400 font-semibold">WebRTC Stable</span>
                </div>
              </div>
            </div>

            {/* Right Column: Active Call Sidebar Notepad & Form */}
            <div className="lg:col-span-5">
              <ActiveCallSidebar
                activeCall={isCallActive ? activeCall : null}
                config={config}
                agentName={agentName}
                onNoteSaved={(rec) => setLastSavedRecord(rec)}
              />
            </div>

          </div>
        )}

        {/* Tab 2: Live Chat Console */}
        {activeTab === 'chat' && (
          <div className="max-w-3xl mx-auto h-[600px]">
            <LiveChatBox
              config={config}
              role="agent"
              agentName={agentName}
            />
          </div>
        )}

      </main>

      {/* Call History Modal */}
      <CallHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />

      {/* Local Customer Notes Modal */}
      <NotesHistoryModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800 py-3.5 px-6 text-center text-xs text-slate-500 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span>{config.companyName || 'CloudLine Pro'} • VoIP Cloud Hotline Operations</span>
          <span className="font-mono text-[11px] text-blue-400">
            System Online • Local Sync Enabled
          </span>
        </div>
      </footer>
    </div>
  );
};
