import React from 'react';
import { CustomerPortal } from '../components/CustomerPortal';
import { SystemConfig, ActiveCallState } from '../types';

interface CustomerPageProps {
  config: SystemConfig;
  activeCall: ActiveCallState | null;
  onInitiateCall: (customHotline?: string) => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onSwitchToAgent: () => void;
  onOpenSplitView?: () => void;
  onlineAgentsCount: number;
}

export default function CustomerPage(props: CustomerPageProps) {
  return <CustomerPortal {...props} />;
}
