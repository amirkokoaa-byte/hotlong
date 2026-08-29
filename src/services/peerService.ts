import Peer, { MediaConnection } from 'peerjs';

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface PeerConfiguration {
  config: {
    iceServers: IceServerConfig[];
    iceTransportPolicy?: 'all' | 'relay';
  };
}

// Default WebRTC STUN and TURN configurations for VoIP signaling
export const DEFAULT_PEER_CONFIG: PeerConfiguration = {
  config: {
    iceServers: [
      // 1. STUN Servers (Public IP discovery & NAT traversal)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ],
    iceTransportPolicy: 'all', // Attempt direct P2P first, fallback to TURN relay if configured
  },
};

export interface PeerCallbacks {
  onIncomingCall?: (call: MediaConnection) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onCallClosed?: () => void;
  onError?: (error: Error) => void;
}

export class PeerService {
  private peer: Peer | null = null;
  private currentCall: MediaConnection | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private callbacks: PeerCallbacks = {};
  private activeConfig: PeerConfiguration = DEFAULT_PEER_CONFIG;

  constructor() {
    if (typeof window !== 'undefined') {
      this.remoteAudioElement = new Audio();
      this.remoteAudioElement.autoplay = true;
    }
  }

  public setCustomConfiguration(customConfig: Partial<PeerConfiguration>) {
    this.activeConfig = {
      ...this.activeConfig,
      ...customConfig,
      config: {
        ...this.activeConfig.config,
        ...(customConfig.config || {}),
      },
    };
  }

  public setCallbacks(cb: PeerCallbacks) {
    this.callbacks = { ...this.callbacks, ...cb };
  }

  // Initialize PeerJS instance with STUN & TURN
  public async initializePeer(customId?: string): Promise<string> {
    if (this.peer && !this.peer.destroyed && this.peer.id) {
      if (!customId || this.peer.id === customId) {
        return this.peer.id;
      }
    }

    this.destroy();

    return new Promise((resolve) => {
      try {
        const cleanId = customId
          ? customId.replace(/[^a-zA-Z0-9_-]/g, '_')
          : undefined;

        const peerInstance = cleanId
          ? new Peer(cleanId, this.activeConfig)
          : new Peer(this.activeConfig);

        this.peer = peerInstance;

        peerInstance.on('open', (id) => {
          console.log('[PeerJS] Ready with ID:', id);
          resolve(id);
        });

        peerInstance.on('call', (mediaConnection) => {
          console.log('[PeerJS] Incoming call from:', mediaConnection.peer);
          this.currentCall = mediaConnection;
          if (this.callbacks.onIncomingCall) {
            this.callbacks.onIncomingCall(mediaConnection);
          }
        });

        peerInstance.on('error', (err) => {
          console.warn('[PeerJS] Notice:', err.type, err.message);
          if (this.callbacks.onError) {
            this.callbacks.onError(err);
          }
          resolve(customId || 'peer_' + Math.random().toString(36).slice(2, 8));
        });
      } catch (err) {
        console.warn('[PeerJS] Caught error:', err);
        resolve(customId || 'fallback_peer_id');
      }
    });
  }

  // Dial a hotline peer
  public async makeCall(targetPeerId: string, localStream: MediaStream): Promise<MediaConnection | null> {
    if (!this.peer || this.peer.destroyed) {
      await this.initializePeer();
    }
    if (!this.peer) return null;

    try {
      const cleanTargetId = targetPeerId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const mediaConnection = this.peer.call(cleanTargetId, localStream);
      this.currentCall = mediaConnection;

      mediaConnection.on('stream', (remoteStream) => {
        console.log('[PeerJS] Playing remote stream');
        this.playRemoteStream(remoteStream);
        if (this.callbacks.onRemoteStream) {
          this.callbacks.onRemoteStream(remoteStream);
        }
      });

      mediaConnection.on('close', () => {
        console.log('[PeerJS] Call ended');
        this.handleCallEnd();
      });

      return mediaConnection;
    } catch (err) {
      console.warn('[PeerJS] makeCall error:', err);
      return null;
    }
  }

  // Answer incoming call
  public answerCall(mediaConnection: MediaConnection, localStream: MediaStream) {
    this.currentCall = mediaConnection;
    try {
      mediaConnection.answer(localStream);

      mediaConnection.on('stream', (remoteStream) => {
        console.log('[PeerJS] Playing caller stream');
        this.playRemoteStream(remoteStream);
        if (this.callbacks.onRemoteStream) {
          this.callbacks.onRemoteStream(remoteStream);
        }
      });

      mediaConnection.on('close', () => {
        this.handleCallEnd();
      });
    } catch (err) {
      console.warn('[PeerJS] answerCall error:', err);
    }
  }

  private playRemoteStream(stream: MediaStream) {
    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = stream;
      this.remoteAudioElement.play().catch(() => {});
    }
  }

  public endCall() {
    if (this.currentCall) {
      try {
        this.currentCall.close();
      } catch {}
      this.currentCall = null;
    }
    this.handleCallEnd();
  }

  private handleCallEnd() {
    if (this.remoteAudioElement) {
      this.remoteAudioElement.pause();
      this.remoteAudioElement.srcObject = null;
    }
    if (this.callbacks.onCallClosed) {
      this.callbacks.onCallClosed();
    }
  }

  public destroy() {
    this.endCall();
    if (this.peer && !this.peer.destroyed) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
  }
}

export const peerService = new PeerService();
