import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { PhoneCall, UserCheck, Columns, Settings, Server, ShieldCheck } from 'lucide-react';
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
    const num = config?.hotlineDisplayNumber || DEFAULT_CONFIG.hotlineDisplayNumber;
    return 'HOTLINE_' + (num ? num.replace(/[^a-zA-Z0-9]/g, '') : '12345');
  }, [config?.hotlineDisplayNumber]);

  // Load initial config from REST API and Local Storage
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const remoteConfig = await res.json();
          const localConfig = await storageService.getConfig();
          const merged = { ...DEFAULT_CONFIG, ...(localConfig || {}), ...(remoteConfig || {}) };
          setConfig(merged);
          await storageService.saveConfig(merged);
        } else {
          const localConfig = await storageService.getConfig();
          setConfig(localConfig || DEFAULT_CONFIG);
        }
      } catch {
        const localConfig = await storageService.getConfig();
        setConfig(localConfig || DEFAULT_CONFIG);
      }
    };

    loadConfig();
  }, []);

  // Sync PeerJS on role / route
  useEffect(() => {
    if (config) {
      peerService.applyTurnConfig(config);
    }
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
            hotlineNumber: config?.hotlineDisplayNumber || DEFAULT_CONFIG.hotlineDisplayNumber,
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
  }, [location.pathname, isSplitViewOpen, hotlineId, config]);

  // Setup Real-time Signaling via Socket.io / BroadcastChannel
  useEffect(() => {
    const socket = socketService.getSocket();
    const isAgent = location.pathname.startsWith('/agent') || isSplitViewOpen;
    const activeRole = isAgent ? 'agent' : 'customer';

    socketService.setRole(activeRole, { name: agentName, hotline: config?.hotlineDisplayNumber || DEFAULT_CONFIG.hotlineDisplayNumber });

    // Handle System Status
    socket.on('system-status', (status: { onlineAgents: number; hotlineNumber: string; companyName: string }) => {
      setOnlineAgentsCount(status?.onlineAgents || 1);
      if (status?.hotlineNumber || status?.companyName) {
        setConfig((prev) => ({
          ...(prev || DEFAULT_CONFIG),
          hotlineDisplayNumber: status.hotlineNumber || prev?.hotlineDisplayNumber || DEFAULT_CONFIG.hotlineDisplayNumber,
          companyName: status.companyName || prev?.companyName || DEFAULT_CONFIG.companyName,
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
      alert(error.message || 'تعذر بدء المكالمة الصوتية: يرجى التأكد من صلاحية الميكروفون وتوصيله.');
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
      alert(error.message || 'فشل الرد على المكالمة الواردة: تعذر الوصول للميكروفون.');
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
    <div className="min-h-screen bg-[#0F172A] font-sans antialiased text-slate-100 selection:bg-blue-500 selection:text-white flex flex-col" id="cloud-hotline-app-root">
      
      {/* Top Global Navigation Bar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-4 sm:px-6 py-2.5 flex flex-wrap justify-between items-center gap-3 z-30 sticky top-0 shadow-lg" id="global-hotline-header">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <PhoneCall className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">سيرفر الهوت لاين السحابي (VoIP)</span>
              {config?.turnEnabled && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono flex items-center gap-1">
                  <Server className="w-2.5 h-2.5" /> Coturn TURN
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {config?.companyName || DEFAULT_CONFIG.companyName} | هوت لاين: <span className="font-mono text-blue-400 font-bold">{config?.hotlineDisplayNumber || DEFAULT_CONFIG.hotlineDisplayNumber}</span>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => {
                setIsSplitViewOpen(false);
                navigate('/');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                !isSplitViewOpen && location.pathname === '/'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="nav-customer-tab"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              واجهة العميل
            </button>

            <button
              onClick={() => {
                setIsSplitViewOpen(false);
                navigate('/agent');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                !isSplitViewOpen && location.pathname.startsWith('/agent')
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="nav-agent-tab"
            >
              <UserCheck className="w-3.5 h-3.5" />
              لوحة موظفي الخدمة
            </button>

            <button
              onClick={() => setIsSplitViewOpen(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                isSplitViewOpen
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="nav-splitview-tab"
            >
              <Columns className="w-3.5 h-3.5" />
              محاكاة مزدوجة (Split-View)
            </button>
          </div>

          {/* Admin & Coturn Settings Button */}
          <button
            onClick={() => setIsAdminSettingsOpen(true)}
            title="Admin & Coturn Settings (Master Password: 0000)"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-300 hover:text-amber-200 transition"
            id="nav-admin-settings-btn"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
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
      </main>

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
