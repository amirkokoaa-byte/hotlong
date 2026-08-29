// WebRTC Service for Peer-to-Peer Browser Audio Calling with STUN and Web Audio Analyser

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  
  // Audio Analysers for UI Waveforms
  private audioContext: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalyser: AnalyserNode | null = null;
  private localSourceNode: MediaStreamAudioSourceNode | null = null;
  private remoteSourceNode: MediaStreamAudioSourceNode | null = null;

  // Callbacks
  public onIceCandidate: ((candidate: RTCIceCandidate) => void) | null = null;
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onConnectionStateChange: ((state: RTCPeerConnectionState) => void) | null = null;
  public onIceConnectionStateChange: ((state: RTCIceConnectionState) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.remoteAudioElement = new Audio();
      this.remoteAudioElement.autoplay = true;
      // Some browsers require explicit play on user action
    }
  }

  // Initialize Web Audio Context for visualizer
  private initAudioContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  // Acquire local microphone
  async getLocalUserMedia(): Promise<MediaStream> {
    if (this.localStream && this.localStream.active) {
      return this.localStream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
        video: false,
      });

      this.localStream = stream;
      this.setupLocalAnalyser(stream);
      return stream;
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error accessing microphone:', error);
      throw new Error(`Microphone access failed: ${error.message || 'Permission denied'}`);
    }
  }

  private setupLocalAnalyser(stream: MediaStream) {
    try {
      this.initAudioContext();
      if (!this.audioContext) return;

      if (this.localSourceNode) {
        this.localSourceNode.disconnect();
      }

      this.localAnalyser = this.audioContext.createAnalyser();
      this.localAnalyser.fftSize = 64;
      this.localAnalyser.smoothingTimeConstant = 0.8;

      this.localSourceNode = this.audioContext.createMediaStreamSource(stream);
      this.localSourceNode.connect(this.localAnalyser);
    } catch (e) {
      console.warn('Could not setup local audio visualizer', e);
    }
  }

  private setupRemoteAnalyser(stream: MediaStream) {
    try {
      this.initAudioContext();
      if (!this.audioContext) return;

      if (this.remoteSourceNode) {
        this.remoteSourceNode.disconnect();
      }

      this.remoteAnalyser = this.audioContext.createAnalyser();
      this.remoteAnalyser.fftSize = 64;
      this.remoteAnalyser.smoothingTimeConstant = 0.8;

      this.remoteSourceNode = this.audioContext.createMediaStreamSource(stream);
      this.remoteSourceNode.connect(this.remoteAnalyser);
    } catch (e) {
      console.warn('Could not setup remote audio visualizer', e);
    }
  }

  // Create Peer Connection
  createPeerConnection(): RTCPeerConnection {
    this.closePeerConnection();

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnection = pc;
    this.remoteStream = new MediaStream();

    pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        event.track && this.remoteStream?.addTrack(event.track);
      }

      if (this.remoteAudioElement && this.remoteStream) {
        this.remoteAudioElement.srcObject = this.remoteStream;
        this.remoteAudioElement.play().catch((err) => {
          console.warn('Autoplay prevented on audio element:', err);
        });
      }

      if (this.remoteStream) {
        this.setupRemoteAnalyser(this.remoteStream);
      }

      if (this.onRemoteStream && this.remoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.onConnectionStateChange && pc) {
        this.onConnectionStateChange(pc.connectionState);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (this.onIceConnectionStateChange && pc) {
        this.onIceConnectionStateChange(pc.iceConnectionState);
      }
    };

    // Add local tracks if available
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    return pc;
  }

  // Create Call Offer (Caller / Customer)
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    await this.getLocalUserMedia();
    const pc = this.createPeerConnection();

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });

    await pc.setLocalDescription(offer);
    return offer;
  }

  // Create Call Answer (Callee / Agent)
  async createAnswer(offerSdp: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.getLocalUserMedia();
    const pc = this.createPeerConnection();

    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    return answer;
  }

  // Set Remote Answer
  async setRemoteAnswer(answerSdp: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      if (this.peerConnection.signalingState !== 'stable') {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));
      }
    }
  }

  // Add ICE Candidate
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      if (this.peerConnection && candidate) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.warn('Error adding ICE candidate:', err);
    }
  }

  // Mute / Unmute Local Mic
  setMute(mute: boolean): boolean {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !mute;
      });
      return mute;
    }
    return false;
  }

  // Toggle Speaker / Audio Output
  setSpeaker(enabled: boolean) {
    if (this.remoteAudioElement) {
      this.remoteAudioElement.muted = !enabled;
    }
  }

  // Get live audio frequency data for visualizer (returns 0-1 volume level or frequency byte array)
  getAudioLevels(): { localLevel: number; remoteLevel: number; localFrequencies: number[]; remoteFrequencies: number[] } {
    let localLevel = 0;
    let remoteLevel = 0;
    const localFreqs: number[] = [];
    const remoteFreqs: number[] = [];

    if (this.localAnalyser) {
      const dataArray = new Uint8Array(this.localAnalyser.frequencyBinCount);
      this.localAnalyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
        if (i < 16) localFreqs.push(dataArray[i] / 255);
      }
      localLevel = sum / (dataArray.length * 255);
    }

    if (this.remoteAnalyser) {
      const dataArray = new Uint8Array(this.remoteAnalyser.frequencyBinCount);
      this.remoteAnalyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
        if (i < 16) remoteFreqs.push(dataArray[i] / 255);
      }
      remoteLevel = sum / (dataArray.length * 255);
    }

    return {
      localLevel,
      remoteLevel,
      localFrequencies: localFreqs.length > 0 ? localFreqs : [0, 0, 0, 0, 0, 0, 0, 0],
      remoteFrequencies: remoteFreqs.length > 0 ? remoteFreqs : [0, 0, 0, 0, 0, 0, 0, 0],
    };
  }

  // End Call & Cleanup
  closePeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.remoteAudioElement) {
      this.remoteAudioElement.pause();
      this.remoteAudioElement.srcObject = null;
    }
  }

  cleanupCall(stopMic = true) {
    this.closePeerConnection();

    if (stopMic && this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.localSourceNode) {
      this.localSourceNode.disconnect();
      this.localSourceNode = null;
    }
    if (this.remoteSourceNode) {
      this.remoteSourceNode.disconnect();
      this.remoteSourceNode = null;
    }
    this.localAnalyser = null;
    this.remoteAnalyser = null;
  }
}

export const webrtcService = new WebRTCService();
