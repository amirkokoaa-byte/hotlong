import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bot, User, Headphones, CheckCheck, Sparkles } from 'lucide-react';
import { ChatMessage, SystemConfig } from '../types';
import { socketService } from '../services/socket';
import { soundEffects } from '../services/soundEffects';

interface LiveChatBoxProps {
  config: SystemConfig;
  role: 'customer' | 'agent';
  agentName?: string;
  onClose?: () => void;
}

export const LiveChatBox: React.FC<LiveChatBoxProps> = ({
  config,
  role,
  agentName = 'Agent',
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'system',
      senderName: 'System',
      text: `Welcome to ${config.companyName || 'Cloud Hotline Support'}! You are connected to our real-time customer service channel.`,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, remoteTyping]);

  useEffect(() => {
    const socket = socketService.getSocket();

    const handleIncomingMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // Play chime if message came from other party
      if ((role === 'customer' && msg.sender === 'agent') || (role === 'agent' && msg.sender === 'customer')) {
        soundEffects.playMessageBeep();
      }
    };

    const handleTyping = (data: { isTyping: boolean; sender: 'customer' | 'agent'; senderName?: string }) => {
      if (data.sender !== role) {
        setRemoteTyping(data.isTyping ? data.senderName || 'Representative' : null);
      }
    };

    socket.on('chat-message', handleIncomingMessage);
    socket.on('chat-typing', handleTyping);

    return () => {
      socket.off('chat-message', handleIncomingMessage);
      socket.off('chat-typing', handleTyping);
    };
  }, [role]);

  const handleInputChange = (text: string) => {
    setInputMessage(text);

    const socket = socketService.getSocket();
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      socket.emit('chat-typing', {
        isTyping: true,
        sender: role,
        senderName: role === 'agent' ? agentName : 'Customer',
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
      socket.emit('chat-typing', {
        isTyping: false,
        sender: role,
        senderName: role === 'agent' ? agentName : 'Customer',
      });
    }, 1500);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text) return;

    const socket = socketService.getSocket();
    socket.emit('chat-message', {
      sender: role,
      senderName: role === 'agent' ? agentName : 'Customer',
      text,
    });

    setInputMessage('');
    setIsTyping(false);
    socket.emit('chat-typing', { isTyping: false, sender: role, senderName: role === 'agent' ? agentName : 'Customer' });
  };

  const quickPills = [
    'Inquire about services (استفسار عن الخدمات)',
    'Speak with technical support (التحدث مع الدعم الفني)',
    'Request price quotation (طلب عرض أسعار)',
  ];

  return (
    <div className="w-full h-full bg-[#1E293B] border border-slate-700 rounded-2xl flex flex-col shadow-2xl overflow-hidden" id="live-chat-box">
      
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-slate-700 bg-[#0F172A]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              {role === 'customer' ? 'Live Support Chat (محادثة مباشرة)' : 'Customer Chat Console'}
            </h3>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Real-time WebSockets Connected
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            id="close-chat-btn"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[380px] bg-[#0F172A]/40 text-xs">
        {messages.map((m) => {
          const isMe = (role === 'customer' && m.sender === 'customer') || (role === 'agent' && m.sender === 'agent');
          const isSys = m.sender === 'system';

          if (isSys) {
            return (
              <div key={m.id} className="text-center my-2">
                <span className="inline-block px-3 py-1 rounded-full bg-[#0F172A] border border-slate-700 text-[10px] text-slate-400">
                  {m.text}
                </span>
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {!isMe && (
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                  {m.sender === 'agent' ? <Headphones className="w-3.5 h-3.5 text-blue-400" /> : <User className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
              )}

              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-md ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-[#0F172A] border border-slate-700 text-slate-200 rounded-bl-none'
                }`}
              >
                {!isMe && (
                  <div className="text-[10px] font-semibold text-blue-400 mb-0.5">
                    {m.senderName}
                  </div>
                )}
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.text}</p>
                <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-70">
                  <span>{m.timeFormatted}</span>
                  {isMe && <CheckCheck className="w-3 h-3 text-blue-200" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Remote Typing Indicator */}
        {remoteTyping && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400 italic">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>{remoteTyping} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Customer Quick Suggestions */}
      {role === 'customer' && messages.length <= 3 && (
        <div className="px-3 py-2 border-t border-slate-700 bg-[#0F172A]/70 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          {quickPills.map((pill, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setInputMessage(pill);
              }}
              className="px-2.5 py-1 rounded-full bg-[#0F172A] hover:bg-slate-800 border border-slate-700 text-slate-300 whitespace-nowrap transition shrink-0"
            >
              {pill}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-700 bg-[#0F172A]/90 flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={role === 'customer' ? 'Type your message to hotline agent...' : 'Reply to customer...'}
          id="chat-message-input"
          className="flex-1 px-3.5 py-2 rounded-xl bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          id="chat-send-btn"
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white shadow-md shadow-blue-600/30 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
