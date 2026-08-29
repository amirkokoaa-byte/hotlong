import React from 'react';
import { X, ExternalLink, HelpCircle, Radio, Sparkles } from 'lucide-react';
import { CustomerPortal } from './CustomerPortal';
import { AgentDashboard } from './AgentDashboard';
import { SystemConfig, ActiveCallState } from '../types';

interface SplitViewTestingProps {
  config: SystemConfig;
  agentName: string;
  customerCall: ActiveCallState | null;
  agentCall: ActiveCallState | null;
  incomingCall: { callId: string; callerId: string; hotlineNumber: string; timestamp: number } | null;
  onCustomerCall: () => void;
  onCustomerEndCall: () => void;
  onCustomerToggleMute: () => void;
  onCustomerToggleSpeaker: () => void;
  onAcceptIncomingCall: () => void;
  onRejectIncomingCall: () => void;
  onAgentEndCall: () => void;
  onAgentToggleMute: () => void;
  onAgentToggleSpeaker: () => void;
  onOpenAdminSettings: () => void;
  onCloseSplitView: () => void;
  onlineAgentsCount: number;
}

export const SplitViewTesting: React.FC<SplitViewTestingProps> = ({
  config,
  agentName,
  customerCall,
  agentCall,
  incomingCall,
  onCustomerCall,
  onCustomerEndCall,
  onCustomerToggleMute,
  onCustomerToggleSpeaker,
  onAcceptIncomingCall,
  onRejectIncomingCall,
  onAgentEndCall,
  onAgentToggleMute,
  onAgentToggleSpeaker,
  onOpenAdminSettings,
  onCloseSplitView,
  onlineAgentsCount,
}) => {
  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col" id="split-view-container">
      {/* Top Banner with Testing Guide */}
      <div className="bg-[#1E293B] border-b border-slate-700 px-6 py-2.5 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-wide">
              Dual Screen Simulator (المحاكي المزدوج: العميل & الموظف)
            </span>
            <span className="hidden sm:inline text-[11px] text-slate-400 ml-2">
              • Test WebRTC voice calling, incoming ringing, active call notepad, and real-time chat side-by-side.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCloseSplitView}
            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close Dual Mode</span>
          </button>
        </div>
      </div>

      {/* Side-by-side Grid */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-slate-700 overflow-y-auto">
        
        {/* Left Side: Customer Interface */}
        <div className="flex flex-col border-blue-500/20">
          <div className="bg-[#1E293B]/70 border-b border-slate-700 px-4 py-2 flex items-center justify-between text-xs">
            <span className="font-bold text-blue-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              1. Customer Screen (واجهة العميل العامة)
            </span>
            <span className="text-slate-400 text-[11px]">Click "Voice Call" to dial hotline</span>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <CustomerPortal
              config={config}
              activeCall={customerCall}
              onInitiateCall={onCustomerCall}
              onEndCall={onCustomerEndCall}
              onToggleMute={onCustomerToggleMute}
              onToggleSpeaker={onCustomerToggleSpeaker}
              onSwitchToAgent={() => {}}
              onlineAgentsCount={onlineAgentsCount}
            />
          </div>
        </div>

        {/* Right Side: Agent Interface */}
        <div className="flex flex-col border-blue-500/20">
          <div className="bg-[#1E293B]/70 border-b border-slate-700 px-4 py-2 flex items-center justify-between text-xs">
            <span className="font-bold text-blue-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              2. Agent Receiver Console (لوحة استقبال الموظف)
            </span>
            <span className="text-slate-400 text-[11px]">Answers incoming call & saves notes</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <AgentDashboard
              config={config}
              agentName={agentName}
              activeCall={agentCall}
              incomingCall={incomingCall}
              onAcceptIncomingCall={onAcceptIncomingCall}
              onRejectIncomingCall={onRejectIncomingCall}
              onEndCall={onAgentEndCall}
              onToggleMute={onAgentToggleMute}
              onToggleSpeaker={onAgentToggleSpeaker}
              onOpenAdminSettings={onOpenAdminSettings}
              onLogout={() => {}}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
