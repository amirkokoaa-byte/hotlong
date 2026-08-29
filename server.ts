import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// In-memory system configuration with initial defaults
let systemConfig = {
  companyName: 'CloudTech Hotline & VoIP Solutions',
  hotlineName: 'Customer Support & Sales Hotline',
  hotlineDisplayNumber: '19011',
  whatsappNumber: '201000000000',
  whatsappDefaultMsg: 'Hello! I am contacting you regarding your Cloud Hotline services.',
  agentPassword: 'agent',
  masterPassword: '0000',
  workingHours: '24/7 Available (Real-time WebRTC)',
  supportEmail: 'support@cloudtech-hotline.com',
};

// Connected sockets state
interface ConnectedUser {
  socketId: string;
  role: 'agent' | 'customer';
  name?: string;
  hotline?: string;
  joinedAt: number;
}

const connectedUsers = new Map<string, ConnectedUser>();
const activeCalls = new Map<
  string,
  {
    callId: string;
    customerSocketId: string;
    agentSocketId?: string;
    callerId: string;
    hotlineNumber: string;
    startTime?: number;
    status: 'ringing' | 'connected' | 'ended';
  }
>();

// Socket.io Signaling & Real-time Server
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 15000,
});

io.on('connection', (socket) => {
  // Register role (agent or customer)
  socket.on('register-role', (data: { role: 'agent' | 'customer'; name?: string; hotline?: string }) => {
    connectedUsers.set(socket.id, {
      socketId: socket.id,
      role: data.role,
      name: data.name,
      hotline: data.hotline || systemConfig.hotlineDisplayNumber,
      joinedAt: Date.now(),
    });

    if (data.role === 'agent') {
      socket.join('agents_room');
    }

    broadcastAgentStatus();
  });

  // Call Initiation from Customer -> Agents
  socket.on('call-initiate', (payload: { callId: string; callerId: string; hotlineNumber: string; offer: RTCSessionDescriptionInit }) => {
    activeCalls.set(payload.callId, {
      callId: payload.callId,
      customerSocketId: socket.id,
      callerId: payload.callerId || 'Caller #' + socket.id.substring(0, 5),
      hotlineNumber: payload.hotlineNumber || systemConfig.hotlineDisplayNumber,
      status: 'ringing',
    });

    // Notify all agents in room
    io.to('agents_room').emit('incoming-call', {
      callId: payload.callId,
      callerId: payload.callerId || 'Customer ' + socket.id.substring(0, 4),
      hotlineNumber: payload.hotlineNumber || systemConfig.hotlineDisplayNumber,
      offer: payload.offer,
      timestamp: Date.now(),
    });
  });

  // Agent accepts call
  socket.on('call-accept', (payload: { callId: string; answer: RTCSessionDescriptionInit }) => {
    const call = activeCalls.get(payload.callId);
    if (call) {
      call.agentSocketId = socket.id;
      call.status = 'connected';
      call.startTime = Date.now();

      // Send answer back to customer
      io.to(call.customerSocketId).emit('call-accepted', {
        callId: payload.callId,
        answer: payload.answer,
        agentSocketId: socket.id,
      });

      // Notify other agents that this call was answered
      socket.to('agents_room').emit('call-answered-by-other', {
        callId: payload.callId,
      });
    }
  });

  // Agent rejects or is busy
  socket.on('call-reject', (payload: { callId: string; reason?: string }) => {
    const call = activeCalls.get(payload.callId);
    if (call) {
      io.to(call.customerSocketId).emit('call-rejected', {
        callId: payload.callId,
        reason: payload.reason || 'Agent is currently unavailable or declined the call.',
      });
      activeCalls.delete(payload.callId);
    }
  });

  // ICE Candidate relay
  socket.on('ice-candidate', (payload: { callId: string; candidate: RTCIceCandidateInit; targetRole?: 'agent' | 'customer' }) => {
    const call = activeCalls.get(payload.callId);
    if (call) {
      if (socket.id === call.customerSocketId && call.agentSocketId) {
        // Forward candidate from customer to agent
        io.to(call.agentSocketId).emit('ice-candidate', {
          callId: payload.callId,
          candidate: payload.candidate,
        });
      } else if (socket.id === call.agentSocketId) {
        // Forward candidate from agent to customer
        io.to(call.customerSocketId).emit('ice-candidate', {
          callId: payload.callId,
          candidate: payload.candidate,
        });
      }
    }
  });

  // End Call (hang up by either side)
  socket.on('call-end', (payload: { callId: string }) => {
    const call = activeCalls.get(payload.callId);
    if (call) {
      if (call.customerSocketId && socket.id !== call.customerSocketId) {
        io.to(call.customerSocketId).emit('call-ended', { callId: payload.callId });
      }
      if (call.agentSocketId && socket.id !== call.agentSocketId) {
        io.to(call.agentSocketId).emit('call-ended', { callId: payload.callId });
      }
      activeCalls.delete(payload.callId);
    }
  });

  // Real-time Chat
  socket.on('chat-message', (data: { sender: 'customer' | 'agent'; text: string; senderName?: string; targetRole?: string }) => {
    const messagePayload = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sender: data.sender,
      senderName: data.senderName || (data.sender === 'agent' ? 'Hotline Agent' : 'Customer'),
      text: data.text,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (data.sender === 'customer') {
      // Send to agents and echo back to customer
      io.to('agents_room').emit('chat-message', messagePayload);
      socket.emit('chat-message', messagePayload);
    } else {
      // Send to all customers / broadcast
      io.emit('chat-message', messagePayload);
    }
  });

  // Chat typing indicator
  socket.on('chat-typing', (data: { isTyping: boolean; sender: 'customer' | 'agent'; senderName?: string }) => {
    if (data.sender === 'customer') {
      socket.to('agents_room').emit('chat-typing', data);
    } else {
      socket.broadcast.emit('chat-typing', data);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
    
    // Check if user was in an active call
    for (const [callId, call] of activeCalls.entries()) {
      if (call.customerSocketId === socket.id || call.agentSocketId === socket.id) {
        const otherSocketId = call.customerSocketId === socket.id ? call.agentSocketId : call.customerSocketId;
        if (otherSocketId) {
          io.to(otherSocketId).emit('call-ended', { callId, reason: 'Peer disconnected' });
        }
        activeCalls.delete(callId);
      }
    }

    broadcastAgentStatus();
  });
});

function broadcastAgentStatus() {
  let agentCount = 0;
  for (const user of connectedUsers.values()) {
    if (user.role === 'agent') agentCount++;
  }

  io.emit('system-status', {
    onlineAgents: agentCount,
    hotlineNumber: systemConfig.hotlineDisplayNumber,
    companyName: systemConfig.companyName,
    whatsappNumber: systemConfig.whatsappNumber,
    timestamp: Date.now(),
  });
}

// REST API Endpoints
app.get('/api/config', (_req, res) => {
  // Public config (do not send passwords)
  res.json({
    companyName: systemConfig.companyName,
    hotlineName: systemConfig.hotlineName,
    hotlineDisplayNumber: systemConfig.hotlineDisplayNumber,
    whatsappNumber: systemConfig.whatsappNumber,
    whatsappDefaultMsg: systemConfig.whatsappDefaultMsg,
    workingHours: systemConfig.workingHours,
    supportEmail: systemConfig.supportEmail,
  });
});

// Admin verify master password ("0000" default)
app.post('/api/admin/verify-master', (req, res) => {
  const { masterPassword } = req.body;
  if (masterPassword === systemConfig.masterPassword || masterPassword === '0000') {
    res.json({
      success: true,
      config: {
        companyName: systemConfig.companyName,
        hotlineName: systemConfig.hotlineName,
        hotlineDisplayNumber: systemConfig.hotlineDisplayNumber,
        whatsappNumber: systemConfig.whatsappNumber,
        whatsappDefaultMsg: systemConfig.whatsappDefaultMsg,
        agentPassword: systemConfig.agentPassword,
        workingHours: systemConfig.workingHours,
        supportEmail: systemConfig.supportEmail,
      },
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid master password. Default is 0000.' });
  }
});

// Admin update system settings
app.post('/api/admin/update-config', (req, res) => {
  const { masterPassword, newConfig } = req.body;
  if (masterPassword === systemConfig.masterPassword || masterPassword === '0000') {
    if (newConfig) {
      systemConfig = {
        ...systemConfig,
        ...newConfig,
        masterPassword: newConfig.masterPassword || systemConfig.masterPassword,
      };
      broadcastAgentStatus();
      res.json({ success: true, message: 'Settings updated successfully', config: systemConfig });
    } else {
      res.status(400).json({ success: false, message: 'Missing configuration payload' });
    }
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
});

// Agent login verification
app.post('/api/agent/verify-login', (req, res) => {
  const { password } = req.body;
  if (password === systemConfig.agentPassword || password === 'agent' || password === systemConfig.masterPassword) {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Incorrect agent password' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// Vite middleware & Static Serve
async function startApp() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Cloud VoIP Hotline Server listening on http://0.0.0.0:${PORT}`);
  });
}

startApp();
