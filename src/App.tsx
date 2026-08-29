import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SystemConfig, ActiveCallState } from './types';
import { storageService, DEFAULT_CONFIG } from './services/storage';
import { socketService } from './services/socket';
import { webrtcService } from './services/webrtc';
import { peerService } from './services/peerService';
import { soundEffects } from './services/soundEffects';

import CustomerPage from './pages/Customer';
import AgentDashboardPage from './pages/AgentDashboard';
import { AdminSettingsModal } from './components/AdminSettingsModal';
import { SplitViewTesting } from './components/SplitViewTesting';

function HotlineAppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  // Configuration State
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [isSplitViewOpen, setIsSplitViewOpen] = useState(false);

  // Agent Authentication State
  const [isAgentLoggedIn, setIsAgentLoggedIn] = useState(false);
  const [agentName, setAgentName] = useState('Agent #01');
  const [onlineAgentsCount, setOnlineAgentsCount] = useState(1);

  // Active VoIP Call States
  const [customerCall, setCustomerCall] = useState<ActiveCallState | null>(null);
  const [agentCall, setAgentCall] = useState<ActiveCallState | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    callerId: string;
    hotlineNumber: string;
    timestamp: number;
    offer?: RTCSessionDescriptionInit;
    peerCall?: any;
  } | null>(null);

  // Call Duration Timers
  const timerRef = useRef<number | null>(null);

  // Current hotline ID identifier for PeerJS (e.g. HOTLINE_12345 or sanitized hotlineDisplayNumber)
  const hotlineId = useMemo(() => {
    return 'HOTLINE_' + (config.hotlineDisplayNumber ? config.hotlineDisplayNumber.replace(/[^a-zA-Z0-9]/g, '') : '12345');
  }, [config.hotlineDisplayNumber]);

  // Load initial config from REST API and Local Storage
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const remoteConfig = await res.json();
          const localConfig = await storageService.getConfig();
          const merged = { ...DEFAULT_CONFIG, ...localConfig, ...remoteConfig };
          setConfig(merged);
          await storageService.saveConfig(merged);
        } else {
          const localConfig = await storageService.getConfig();
          setConfig(localConfig);
        }
      } catch {
        const localConfig = await storageService.getConfig();
        setConfig(localConfig);
      }
    };

    loadConfig();
  }, []);

  // Sync PeerJS on role / route
  useEffect(() => {
    const isAgent = location.pathname.startsWith('/agent') || isSplitViewOpen;

    if (isAgent) {
      // Initialize PeerJS for Agent on the fixed Hotline ID
      peerService.initializePeer(hotlineId).catch((err) => {
        console.warn('Agent PeerJS initialization note:', err);
      });

      peerService.setCallbacks({
        onIncomingCall: (mediaConn) => {
          const callId = 'peer_call_' + Date.now();
          const callerId = 'Caller ' + mediaConn.peer.slice(0, 6);
          setIncomingCall({
            callId,
            callerId,
            hotlineNumber: config.hotlineDisplayNumber,
            timestamp: Date.now(),
            peerCall: mediaConn,
          });
          soundEffects.playIncomingRingtone();
        },
        onCallClosed: () => {
          soundEffects.stopAll();
          soundEffects.playCallEnded();
          setAgentCall(null);
          setCustomerCall(null);
          setIncomingCall(null);
        },
      });
    } else {
      // Customer PeerJS init
      peerService.initializePeer().catch(() => {});
    }
  }, [location.pathname, isSplitViewOpen, hotlineId, config.hotlineDisplayNumber]);

  // Setup Real-time Signaling via Socket.io / BroadcastChannel
  useEffect(() => {
    const socket = socketService.getSocket();
    const isAgent = location.pathname.startsWith('/agent') || isSplitViewOpen;
    const activeRole = isAgent ? 'agent' : 'customer';

    socketService.setRole(activeRole, { name: agentName, hotline: config.hotlineDisplayNumber });

    // Handle System Status
    socket.on('system-status', (status: { onlineAgents: number; hotlineNumber: string; companyName: string }) => {
      setOnlineAgentsCount(status.onlineAgents || 1);
      if (status.hotlineNumber) {
        setConfig((prev) => ({
          ...prev,
          hotlineDisplayNumber: status.hotlineNumber,
          companyName: status.companyName || prev.companyName,
        }));
      }
    });

    // Handle Incoming Call on Agent
    socket.on('incoming-call', (payload: { callId: string; callerId: string; hotlineNumber: string; offer: RTCSessionDescriptionInit; timestamp: number }) => {
      setIncomingCall((prev) => prev || payload);
      soundEffects.playIncomingRingtone();
    });

    // Handle Call Answered by another agent
    socket.on('call-answered-by-other', () => {
      setIncomingCall(null);
      soundEffects.stopIncomingRingtone();
    });

    // Handle Call Accepted on Customer side
    socket.on('call-accepted', async (payload: { callId: string; answer: RTCSessionDescriptionInit }) => {
      soundEffects.stopRingbackTone();
      soundEffects.playCallConnected();

      try {
        await webrtcService.setRemoteAnswer(payload.answer);
      } catch (err) {
        console.error('Error applying remote answer SDP:', err);
      }

      setCustomerCall((prev) => (prev ? { ...prev, status: 'connected', startTime: Date.now() } : null));
    });

    // Handle Call Rejected
    socket.on('call-rejected', (payload: { reason?: string }) => {
      soundEffects.stopRingbackTone();
      soundEffects.playCallEnded();
      alert(payload.reason || 'The call could not be completed at this time.');
      webrtcService.cleanupCall();
      peerService.endCall();
      setCustomerCall(null);
    });

    // Handle ICE Candidate relay
    socket.on('ice-candidate', async (payload: { candidate: RTCIceCandidateInit }) => {
      if (payload.candidate) {
        await webrtcService.addIceCandidate(payload.candidate);
      }
    });

    // Handle Call Ended from peer
    socket.on('call-ended', () => {
      soundEffects.stopAll();
      soundEffects.playCallEnded();
      webrtcService.cleanupCall();
      peerService.endCall();
      setCustomerCall(null);
      setAgentCall(null);
      setIncomingCall(null);
    });

    // Relay local ICE candidates to socket
    webrtcService.onIceCandidate = (candidate) => {
      const callId = customerCall?.callId || agentCall?.callId || incomingCall?.callId;
      if (callId && candidate) {
        socket.emit('ice-candidate', {
          callId,
          candidate: candidate.toJSON(),
        });
      }
    };

    return () => {
      socket.off('system-status');
      socket.off('incoming-call');
      socket.off('call-answered-by-other');
      socket.off('call-accepted');
      socket.off('call-rejected');
      socket.off('ice-candidate');
      socket.off('call-ended');
    };
  }, [location.pathname, isSplitViewOpen, agentName, customerCall?.callId, agentCall?.callId, incomingCall?.callId, config.hotlineDisplayNumber]);

  // Call Duration Interval Timer
  useEffect(() => {
    if ((customerCall && customerCall.status === 'connected') || (agentCall && agentCall.status === 'connected')) {
      timerRef.current = window.setInterval(() => {
        setCustomerCall((prev) => (prev && prev.status === 'connected' ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : prev));
        setAgentCall((prev) => (prev && prev.status === 'connected' ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : prev));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [customerCall?.status, agentCall?.status]);

  // ==========================================
  // CUSTOMER CALL ACTIONS
  // ==========================================
  const handleCustomerInitiateCall = async (customHotline?: string) => {
    try {
      const callId = 'call_' + Date.now();
      const callerId = 'Caller #' + Math.floor(1000 + Math.random() * 9000);
      const targetHotlineNumber = customHotline || config.hotlineDisplayNumber;
      const targetHotlinePeerId = 'HOTLINE_' + (targetHotlineNumber ? targetHotlineNumber.replace(/[^a-zA-Z0-9]/g, '') : '12345');

      const initialCallState: ActiveCallState = {
        callId,
        direction: 'outgoing',
        callerId,
        hotlineNumber: targetHotlineNumber,
        status: 'ringing',
        startTime: null,
        durationSeconds: 0,
        isMuted: false,
        isSpeakerOn: true,
        isHold: false,
        audioQuality: 'Excellent',
      };

      setCustomerCall(initialCallState);
      soundEffects.playRingbackTone();

      // Get local microphone stream
      const localStream = await webrtcService.getLocalUserMedia();

      // Initiate PeerJS cloud call to hotline target ID
      peerService.makeCall(targetHotlinePeerId, localStream).then((pCall) => {
        pCall.on('stream', () => {
          soundEffects.stopRingbackTone();
          soundEffects.playCallConnected();
          setCustomerCall((prev) => (prev ? { ...prev, status: 'connected', startTime: Date.now() } : null));
        });
        pCall.on('close', () => {
          handleCustomerEndCall();
        });
      }).catch((err) => {
        console.warn('PeerJS call fallback to socket signaling:', err);
      });

      // Also create WebRTC Offer with local microphone for socket/broadcast fallback
      const offer = await webrtcService.createOffer();
      const socket = socketService.getSocket();
      socket.emit('call-initiate', {
        callId,
        callerId,
        hotlineNumber: targetHotlineNumber,
        offer,
      });
    } catch (err: unknown) {
      const error = err as Error;
      soundEffects.stopRingbackTone();
      alert(`Could not start voice call: ${error.message || 'Check microphone permissions'}`);
      setCustomerCall(null);
    }
  };

  const handleCustomerEndCall = () => {
    if (customerCall) {
      const socket = socketService.getSocket();
      socket.emit('call-end', { callId: customerCall.callId });
    }
    soundEffects.stopAll();
    soundEffects.playCallEnded();
    webrtcService.cleanupCall();
    peerService.endCall();
    setCustomerCall(null);
  };

  const handleCustomerToggleMute = () => {
    if (customerCall) {
      const nextMuted = !customerCall.isMuted;
      webrtcService.setMute(nextMuted);
      setCustomerCall({ ...customerCall, isMuted: nextMuted });
    }
  };

  const handleCustomerToggleSpeaker = () => {
    if (customerCall) {
      const nextSpeaker = !customerCall.isSpeakerOn;
      webrtcService.setSpeaker(nextSpeaker);
      setCustomerCall({ ...customerCall, isSpeakerOn: nextSpeaker });
    }
  };

  // ==========================================
  // AGENT CALL ACTIONS
  // ==========================================
  const handleAcceptIncomingCall = async () => {
    if (!incomingCall) return;

    soundEffects.stopIncomingRingtone();
    soundEffects.playCallConnected();

    try {
      // Get microphone stream
      const localStream = await webrtcService.getLocalUserMedia();

      // If incoming call came from PeerJS
      if (incomingCall.peerCall) {
        peerService.answerCall(incomingCall.peerCall, localStream);
      }

      // If incoming call came with SDP offer
      if (incomingCall.offer) {
        const answer = await webrtcService.createAnswer(incomingCall.offer);
        const socket = socketService.getSocket();
        socket.emit('call-accept', {
          callId: incomingCall.callId,
          answer,
        });
      }

      const activeState: ActiveCallState = {
        callId: incomingCall.callId,
        direction: 'incoming',
        callerId: incomingCall.callerId,
        hotlineNumber: incomingCall.hotlineNumber || config.hotlineDisplayNumber,
        status: 'connected',
        startTime: Date.now(),
        durationSeconds: 0,
        isMuted: false,
        isSpeakerOn: true,
        isHold: false,
        audioQuality: 'Excellent',
      };

      setAgentCall(activeState);
      setIncomingCall(null);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error answering call:', error);
      alert(`Failed to connect incoming call: ${error.message}`);
      handleRejectIncomingCall();
    }
  };

  const handleRejectIncomingCall = () => {
    if (!incomingCall) return;
    soundEffects.stopIncomingRingtone();

    if (incomingCall.peerCall) {
      incomingCall.peerCall.close();
    }

    const socket = socketService.getSocket();
    socket.emit('call-reject', {
      callId: incomingCall.callId,
      reason: 'Agent was busy or declined the call.',
    });

    setIncomingCall(null);
  };

  const handleAgentEndCall = () => {
    if (agentCall) {
      const socket = socketService.getSocket();
      socket.emit('call-end', { callId: agentCall.callId });
    }
    soundEffects.stopAll();
    soundEffects.playCallEnded();
    webrtcService.cleanupCall();
    peerService.endCall();
    setAgentCall(null);
  };

  const handleAgentToggleMute = () => {
    if (agentCall) {
      const nextMuted = !agentCall.isMuted;
      webrtcService.setMute(nextMuted);
      setAgentCall({ ...agentCall, isMuted: nextMuted });
    }
  };

  const handleAgentToggleSpeaker = () => {
    if (agentCall) {
      const nextSpeaker = !agentCall.isSpeakerOn;
      webrtcService.setSpeaker(nextSpeaker);
      setAgentCall({ ...agentCall, isSpeakerOn: nextSpeaker });
    }
  };

  const handleSaveConfig = async (newConfig: SystemConfig) => {
    setConfig(newConfig);
    await storageService.saveConfig(newConfig);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] font-sans antialiased text-slate-100 selection:bg-blue-500 selection:text-white" id="cloud-hotline-app-root">
      {/* If Dual Screen Split View is enabled */}
      {isSplitViewOpen ? (
        <SplitViewTesting
          config={config}
          agentName={agentName}
          customerCall={customerCall}
          agentCall={agentCall}
          incomingCall={incomingCall}
          onCustomerCall={handleCustomerInitiateCall}
          onCustomerEndCall={handleCustomerEndCall}
          onCustomerToggleMute={handleCustomerToggleMute}
          onCustomerToggleSpeaker={handleCustomerToggleSpeaker}
          onAcceptIncomingCall={handleAcceptIncomingCall}
          onRejectIncomingCall={handleRejectIncomingCall}
          onAgentEndCall={handleAgentEndCall}
          onAgentToggleMute={handleAgentToggleMute}
          onAgentToggleSpeaker={handleAgentToggleSpeaker}
          onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
          onCloseSplitView={() => setIsSplitViewOpen(false)}
          onlineAgentsCount={onlineAgentsCount}
        />
      ) : (
        <Routes>
          {/* Customer Page Route / */}
          <Route
            path="/"
            element={
              <CustomerPage
                config={config}
                activeCall={customerCall}
                onInitiateCall={handleCustomerInitiateCall}
                onEndCall={handleCustomerEndCall}
                onToggleMute={handleCustomerToggleMute}
                onToggleSpeaker={handleCustomerToggleSpeaker}
                onSwitchToAgent={() => navigate('/agent')}
                onOpenSplitView={() => setIsSplitViewOpen(true)}
                onlineAgentsCount={onlineAgentsCount}
              />
            }
          />

          {/* Agent Page Route /agent */}
          <Route
            path="/agent"
            element={
              <AgentDashboardPage
                config={config}
                agentName={agentName}
                isAgentLoggedIn={isAgentLoggedIn}
                activeCall={agentCall}
                incomingCall={incomingCall}
                onLoginSuccess={(name, company) => {
                  setAgentName(name);
                  if (company) {
                    setConfig((prev) => ({
                      ...prev,
                      companyName: company.name,
                      hotlineDisplayNumber: company.hotline,
                      whatsappNumber: company.whatsapp,
                    }));
                  }
                  setIsAgentLoggedIn(true);
                }}
                onAcceptIncomingCall={handleAcceptIncomingCall}
                onRejectIncomingCall={handleRejectIncomingCall}
                onEndCall={handleAgentEndCall}
                onToggleMute={handleAgentToggleMute}
                onToggleSpeaker={handleAgentToggleSpeaker}
                onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
                onLogout={() => {
                  setIsAgentLoggedIn(false);
                  navigate('/');
                }}
                onBackToCustomer={() => navigate('/')}
                onOpenSplitView={() => setIsSplitViewOpen(true)}
              />
            }
          />

          {/* Fallback route back to / */}
          <Route
            path="*"
            element={
              <CustomerPage
                config={config}
                activeCall={customerCall}
                onInitiateCall={handleCustomerInitiateCall}
                onEndCall={handleCustomerEndCall}
                onToggleMute={handleCustomerToggleMute}
                onToggleSpeaker={handleCustomerToggleSpeaker}
                onSwitchToAgent={() => navigate('/agent')}
                onOpenSplitView={() => setIsSplitViewOpen(true)}
                onlineAgentsCount={onlineAgentsCount}
              />
            }
          />
        </Routes>
      )}

      {/* Admin Settings Modal (Master Password: 0000) */}
      <AdminSettingsModal
        isOpen={isAdminSettingsOpen}
        onClose={() => setIsAdminSettingsOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
      />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <HotlineAppContent />
    </Router>
  );
}
