import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Grid, Radio, Activity, ShieldCheck } from 'lucide-react';
import { ActiveCallState, SystemConfig } from '../types';
import { AudioWaveform } from './AudioWaveform';
import { soundEffects } from '../services/soundEffects';
import { webrtcService } from '../services/webrtc';

interface VoiceCallModalProps {
  activeCall: ActiveCallState;
  config: SystemConfig;
  role: 'customer' | 'agent';
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  activeCall,
  config,
  role,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
}) => {
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadInput, setKeypadInput] = useState('');

  // Format call duration MM:SS
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleKeyPress = (key: string) => {
    setKeypadInput((prev) => prev + key);
    soundEffects.playDtmfKey(key);
  };

  const dialpadKeys = [
    { num: '1', sub: '' },
    { num: '2', sub: 'ABC' },
    { num: '3', sub: 'DEF' },
    { num: '4', sub: 'GHI' },
    { num: '5', sub: 'JKL' },
    { num: '6', sub: 'MNO' },
    { num: '7', sub: 'PQRS' },
    { num: '8', sub: 'TUV' },
    { num: '9', sub: 'WXYZ' },
    { num: '*', sub: '' },
    { num: '0', sub: '+' },
    { num: '#', sub: '' },
  ];

  return (
    <div className="w-full bg-[#1E293B] border border-slate-700/80 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden" id="voice-call-screen">
      {/* Dynamic Background VoIP Ambient Glow */}
      <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-15 animate-pulse pointer-events-none" />

      {/* Top Status & Codec Stats */}
      <div className="w-full flex items-center justify-between z-10 mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${
            activeCall.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-400 animate-ping'
          }`} />
          <span className="text-xs uppercase font-medium tracking-widest text-emerald-400">
            {activeCall.status === 'connected'
              ? 'Connected • Active Hotline'
              : activeCall.status === 'ringing'
              ? 'Ringing Line (جاري الرنين...)'
              : 'Connecting WebRTC...'}
          </span>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0F172A] border border-slate-700 text-[11px] font-mono text-blue-400">
          <Activity className="w-3 h-3 text-blue-400" />
          <span>Opus HD • 48kHz</span>
        </div>
      </div>

      {/* Center Caller & Concentric Rings Information */}
      <div className="flex flex-col items-center text-center my-4 z-10">
        
        {/* Sleek Concentric Ring Avatar */}
        <div className="relative mb-6">
          <div className="relative w-44 h-44 rounded-full border-2 border-blue-500/20 flex items-center justify-center">
            <div className="w-36 h-36 rounded-full border-4 border-blue-500/40 flex items-center justify-center">
              <div className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${
                activeCall.status === 'connected'
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30'
                  : 'bg-gradient-to-br from-blue-600 to-cyan-500 animate-pulse'
              }`}>
                <Phone className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Prominent Caller ID */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold">
            {role === 'customer' ? 'Connecting to Hotline' : 'Designated Hotline Line'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-1">
            {activeCall.hotlineNumber || config.hotlineDisplayNumber}
          </h2>
          <div className="text-xl font-mono text-slate-400">
            {activeCall.status === 'connected' ? formatDuration(activeCall.durationSeconds) : 'Connecting...'}
          </div>
        </div>

        {/* Audio Waveform */}
        <div className="w-full max-w-xs mt-4">
          <AudioWaveform
            isActive={activeCall.status === 'connected'}
            isMuted={activeCall.isMuted}
            color={activeCall.isMuted ? 'rose' : 'blue'}
            height={40}
            barsCount={24}
          />
        </div>
      </div>

      {/* Interactive In-Call Keypad */}
      {showKeypad && (
        <div className="w-full max-w-xs bg-[#0F172A] border border-slate-700 p-4 rounded-2xl mb-4 z-20 animate-fadeIn" id="call-keypad-panel">
          <div className="text-center font-mono text-lg font-bold text-white mb-3 h-8 tracking-widest bg-[#1E293B] border border-slate-700 rounded-lg flex items-center justify-center">
            {keypadInput || '—'}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {dialpadKeys.map((k) => (
              <button
                key={k.num}
                type="button"
                onClick={() => handleKeyPress(k.num)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-mono font-bold text-sm flex flex-col items-center justify-center transition border border-slate-700"
              >
                <span>{k.num}</span>
                {k.sub && <span className="text-[9px] text-slate-500 font-sans tracking-tight">{k.sub}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Controls Bar */}
      <div className="w-full max-w-sm flex items-center justify-center gap-4 pt-4 border-t border-slate-700/80 z-10">
        
        {/* Mute Mic */}
        <button
          type="button"
          onClick={onToggleMute}
          title={activeCall.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          id="call-mute-toggle-btn"
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors border ${
            activeCall.isMuted
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-lg shadow-rose-500/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          {activeCall.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Speaker Toggle */}
        <button
          type="button"
          onClick={onToggleSpeaker}
          title={activeCall.isSpeakerOn ? 'Speaker On' : 'Mute Speaker'}
          id="call-speaker-toggle-btn"
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors border ${
            !activeCall.isSpeakerOn
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          {activeCall.isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </button>

        {/* Keypad Toggle */}
        <button
          type="button"
          onClick={() => setShowKeypad(!showKeypad)}
          title="Dialpad"
          id="call-keypad-toggle-btn"
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors border ${
            showKeypad
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          <Grid className="w-6 h-6" />
        </button>

        {/* End Call (Red Button) */}
        <button
          type="button"
          onClick={onEndCall}
          title="End Call (إنهاء المكالمة)"
          id="call-hangup-btn"
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-all shadow-lg shadow-red-500/20 active:scale-95"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>

      {/* Telemetry Bar */}
      <div className="mt-6 w-full pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs font-mono text-slate-400 z-10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>TLSv1.3 DTLS-SRTP</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">● WebRTC Stable</span>
        </div>
      </div>
    </div>
  );
};
