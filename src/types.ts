export interface AgentAccount {
  id: string;
  username: string;
  password: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  hotline: string;
  whatsapp: string;
  workingHours?: string;
  category?: string;
  agents?: AgentAccount[];
}

export interface SystemConfig {
  companyName: string;
  hotlineName: string;
  hotlineDisplayNumber: string;
  whatsappNumber: string;
  whatsappDefaultMsg: string;
  agentPassword: string;
  masterPassword: string;
  workingHours: string;
  supportEmail: string;
}

export interface CallRecord {
  id: string;
  timestamp: number;
  dateFormatted: string;
  hotlineNumber: string;
  callerId: string;
  customerName?: string;
  customerPhone?: string;
  category: 'Technical' | 'Billing' | 'Sales' | 'Complaint' | 'General';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'Resolved' | 'Follow-up Required';
  durationSeconds: number;
  durationFormatted: string;
  notes: string;
  actionItems: string[];
  agentName: string;
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'agent' | 'system';
  senderName: string;
  text: string;
  timestamp: number;
  timeFormatted: string;
  status?: 'sent' | 'delivered' | 'read';
}

export type CallStatus =
  | 'idle'
  | 'dialing'
  | 'ringing'
  | 'connected'
  | 'ended'
  | 'rejected'
  | 'busy'
  | 'error';

export interface ActiveCallState {
  callId: string;
  direction: 'incoming' | 'outgoing';
  callerId: string;
  hotlineNumber: string;
  status: CallStatus;
  startTime: number | null;
  durationSeconds: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isHold: boolean;
  audioQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface SignalingOfferPayload {
  callId: string;
  callerId: string;
  hotlineNumber: string;
  sdp: RTCSessionDescriptionInit;
}

export interface SignalingAnswerPayload {
  callId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface SignalingCandidatePayload {
  callId: string;
  candidate: RTCIceCandidateInit;
}
