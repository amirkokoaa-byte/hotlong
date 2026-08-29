import React from 'react';
import { AgentDashboard as AgentDashboardComponent } from '../components/AgentDashboard';
import { AgentLoginModal } from '../components/AgentLoginModal';
import { SystemConfig, ActiveCallState, CompanyProfile } from '../types';

interface AgentPageProps {
  config: SystemConfig;
  agentName: string;
  isAgentLoggedIn: boolean;
  activeCall: ActiveCallState | null;
  incomingCall: {
    callId: string;
    callerId: string;
    hotlineNumber: string;
    timestamp: number;
  } | null;
  onLoginSuccess: (name: string, company?: CompanyProfile) => void;
  onAcceptIncomingCall: () => void;
  onRejectIncomingCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onOpenAdminSettings: () => void;
  onLogout: () => void;
  onBackToCustomer: () => void;
  onOpenSplitView?: () => void;
}

export default function AgentDashboardPage({
  config,
  agentName,
  isAgentLoggedIn,
  activeCall,
  incomingCall,
  onLoginSuccess,
  onAcceptIncomingCall,
  onRejectIncomingCall,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
  onOpenAdminSettings,
  onLogout,
  onBackToCustomer,
  onOpenSplitView,
}: AgentPageProps) {
  if (!isAgentLoggedIn) {
    return (
      <AgentLoginModal
        config={config}
        onLoginSuccess={onLoginSuccess}
        onOpenAdminSettings={onOpenAdminSettings}
        onBackToCustomer={onBackToCustomer}
      />
    );
  }

  return (
    <AgentDashboardComponent
      config={config}
      agentName={agentName}
      activeCall={activeCall}
      incomingCall={incomingCall}
      onAcceptIncomingCall={onAcceptIncomingCall}
      onRejectIncomingCall={onRejectIncomingCall}
      onEndCall={onEndCall}
      onToggleMute={onToggleMute}
      onToggleSpeaker={onToggleSpeaker}
      onOpenAdminSettings={onOpenAdminSettings}
      onLogout={onLogout}
      onOpenSplitView={onOpenSplitView}
    />
  );
}
