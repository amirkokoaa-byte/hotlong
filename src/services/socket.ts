import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private role: 'agent' | 'customer' | null = null;
  private isConnecting = false;

  getSocket(): Socket {
    if (!this.socket) {
      // Connect to same origin
      this.socket = io({
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        if (this.role) {
          this.socket?.emit('register-role', { role: this.role });
        }
      });
    }

    return this.socket;
  }

  setRole(role: 'agent' | 'customer', meta?: { name?: string; hotline?: string }) {
    this.role = role;
    const s = this.getSocket();
    if (s.connected) {
      s.emit('register-role', { role, ...meta });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.role = null;
  }
}

export const socketService = new SocketService();
