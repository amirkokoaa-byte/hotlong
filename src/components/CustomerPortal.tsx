import React, { useState, useEffect } from 'react';
import { Phone, MessageSquare, ExternalLink, Headphones, ShieldCheck, Clock, Radio, ChevronRight, Sparkles, Building2, CheckCircle2, Shield, ArrowRight, Mic, RefreshCw } from 'lucide-react';
import { SystemConfig, ActiveCallState, CompanyProfile } from '../types';
import { DEFAULT_COMPANIES } from '../services/storage';
import { VoiceCallModal } from './VoiceCallModal';
import { LiveChatBox } from './LiveChatBox';

interface CustomerPortalProps {
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

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  config,
  activeCall,
  onInitiateCall,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
  onSwitchToAgent,
  onOpenSplitView,
  onlineAgentsCount,
}) => {
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyProfile | null>(null);

  // Audio Device Selection
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');

  const fetchAudioDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const microphones = devices.filter((d) => d.kind === 'audioinput');
        setAudioDevices(microphones);
        if (microphones.length > 0 && !selectedMicrophone) {
          setSelectedMicrophone(microphones[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Error fetching audio devices in customer view:', err);
    }
  };

  // Load companies from LocalStorage
  useEffect(() => {
    fetchAudioDevices();
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', fetchAudioDevices);
    }

    try {
      const saved = JSON.parse(localStorage.getItem('app_companies') || '[]');
      if (saved.length > 0) {
        setCompanies(saved);
        setSelectedCompany(saved[0]);
      } else {
        localStorage.setItem('app_companies', JSON.stringify(DEFAULT_COMPANIES));
        setCompanies(DEFAULT_COMPANIES);
        setSelectedCompany(DEFAULT_COMPANIES[0]);
      }
    } catch {
      setCompanies(DEFAULT_COMPANIES);
      setSelectedCompany(DEFAULT_COMPANIES[0]);
    }

    return () => {
      if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', fetchAudioDevices);
      }
    };
  }, []);

  const currentHotline = selectedCompany?.hotline || config?.hotlineDisplayNumber || DEFAULT_COMPANIES[0].hotline;
  const currentCompanyName = selectedCompany?.name || config?.companyName || DEFAULT_COMPANIES[0].name;
  const currentWhatsApp = selectedCompany?.whatsapp || config?.whatsappNumber || DEFAULT_COMPANIES[0].whatsapp;

  // Dynamic WhatsApp Direct link
  const whatsappUrl = `https://wa.me/${currentWhatsApp}?text=${encodeURIComponent(config?.whatsappDefaultMsg || `مرحباً، أود الاستفسار من خدمة عملاء ${currentCompanyName}.`)}`;

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-between relative overflow-hidden" id="customer-portal-view">
      {/* Background VoIP Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-b from-blue-500/15 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      {/* Top Navbar */}
      <header className="relative z-20 h-16 bg-[#1E293B] border-b border-slate-700 flex items-center justify-between px-6 shrink-0">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          
          {/* Company Branding */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-slate-200 flex items-center gap-1.5">
                <span>{currentCompanyName}</span>
                <span className="text-blue-400 font-bold text-xs bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Hotline Cloud</span>
              </h1>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span>رقم الخط المباشر:</span>
                <span className="text-blue-400 font-mono font-bold">{currentHotline}</span>
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Online Status Badge */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${onlineAgentsCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-xs uppercase font-medium tracking-widest text-emerald-400 hidden sm:inline">
                {onlineAgentsCount > 0 ? `${onlineAgentsCount} موظف متاح الآن` : 'الخط جاهز للاتصال'}
              </span>
            </div>

            <div className="hidden sm:block h-6 w-[1px] bg-slate-700" />

            {/* Split View Quick Tester Button */}
            {onOpenSplitView && (
              <button
                onClick={onOpenSplitView}
                title="فتح شاشة الاختبار المزدوجة (عميل وموظف جنباً إلى جنب)"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-blue-500/30 text-blue-300 hover:bg-blue-600/20 transition text-xs font-semibold"
                id="split-view-quick-btn"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>شاشة المحاكاة المزدوجة</span>
              </button>
            )}

            {/* Switch to Agent Console Button */}
            <button
              onClick={onSwitchToAgent}
              id="switch-to-agent-portal-btn"
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 hover:text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <Headphones className="w-3.5 h-3.5 text-blue-400" />
              <span>لوحة تحكم الموظف (Agent)</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-12 flex-1 flex flex-col items-center justify-center w-full">
        
        {/* If Active Voice Call is in progress, display the Voice Call Screen */}
        {activeCall && activeCall.status !== 'idle' && activeCall.status !== 'ended' ? (
          <div className="w-full max-w-xl animate-fadeIn">
            <VoiceCallModal
              activeCall={activeCall}
              config={{
                ...config,
                companyName: currentCompanyName,
                hotlineDisplayNumber: currentHotline,
              }}
              role="customer"
              onEndCall={onEndCall}
              onToggleMute={onToggleMute}
              onToggleSpeaker={onToggleSpeaker}
            />
          </div>
        ) : (
          <div className="w-full max-w-4xl flex flex-col items-center">
            
            {/* Hero Greeting */}
            <div className="text-center max-w-2xl mx-auto mb-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-4 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>اتصال سحابي فوري WebRTC • صوت فائق الدقة بدون تكلفة شبكة</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
                مركز الاتصال والتواصل المباشر
              </h2>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-sans">
                اختر الشركة والجهة المطلوبة وتواصل مباشرة مع موظفي خدمة العملاء عبر الصوت، المحادثة، أو الواتساب.
              </p>
            </div>

            {/* Multi-Company Selector Card */}
            {companies.length > 0 && (
              <div className="w-full max-w-xl bg-[#1E293B] border border-slate-700/90 rounded-2xl p-4 sm:p-5 mb-8 shadow-xl">
                <div className="flex items-center justify-between mb-3 text-right">
                  <span className="text-xs text-slate-400">توجيه المكالمة للخط المخصص</span>
                  <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    <span>اختر الشركة أو الجهة المراد الاتصال بها:</span>
                  </label>
                </div>

                <select
                  value={selectedCompany?.id || ''}
                  onChange={(e) => {
                    const comp = companies.find((c) => c.id === e.target.value);
                    if (comp) setSelectedCompany(comp);
                  }}
                  id="company-selector-dropdown"
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3 text-white font-semibold focus:outline-none focus:border-blue-500 transition text-right text-sm"
                >
                  {companies.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} — هوت لاين: ({comp.hotline})
                    </option>
                  ))}
                </select>

                {selectedCompany && (
                  <div className="mt-3.5 pt-3 border-t border-slate-700/60 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>الخط الساخن متصل ومستعد للاستقبال</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono font-bold bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                        <span>رقم الهوت لاين:</span>
                        <span className="text-blue-400">{selectedCompany.hotline}</span>
                      </div>
                    </div>

                    {/* Microphone input selection */}
                    {audioDevices.length > 0 && (
                      <div className="flex items-center justify-between bg-slate-800/60 p-2 rounded-xl border border-slate-700/80">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Mic className="w-3.5 h-3.5 text-blue-400" />
                          <span>الميكروفون المستخدم:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedMicrophone}
                            onChange={(e) => setSelectedMicrophone(e.target.value)}
                            className="bg-[#0F172A] text-slate-200 text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none max-w-[200px] truncate"
                          >
                            {audioDevices.map((dev, idx) => (
                              <option key={dev.deviceId || idx} value={dev.deviceId}>
                                {dev.label || `ميكروفون ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={fetchAudioDevices}
                            title="تحديث الأجهزة المتصلة"
                            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* The 3 Core Required Contact Options */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5" id="customer-contact-channels">
              
              {/* Option A: Voice Call (اتصال صوتي) */}
              <div
                onClick={() => onInitiateCall(currentHotline)}
                id="voice-call-card-btn"
                className="group relative bg-[#1E293B] hover:bg-[#1e293b]/90 border border-slate-700/80 hover:border-blue-500/60 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer overflow-hidden text-right"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
                
                <div>
                  <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 mb-5 shadow-lg shadow-blue-500/10 ml-auto">
                    <Phone className="w-7 h-7" />
                  </div>

                  <div className="space-y-1 mb-2">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">الخيار الأول (سحابي)</span>
                    <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-blue-300 transition">
                      اتصال صوتي مباشر (Voice Call)
                    </h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    إجراء مكالمة صوتية عالية النقاء مباشرة عبر المتصفح بتقنية WebRTC بدون الحاجة لرصيد أو شريحة هاتفية.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between flex-row-reverse">
                  <div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold font-mono">
                    <span>الهوت لاين: {currentHotline}</span>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-lg bg-blue-600 group-hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-blue-600/30 transition">
                    <Phone className="w-3.5 h-3.5" />
                    اتصل الآن
                  </span>
                </div>
              </div>

              {/* Option B: Live Chat (محادثة نصية) */}
              <div
                onClick={() => setShowLiveChat(true)}
                id="live-chat-card-btn"
                className="group relative bg-[#1E293B] hover:bg-[#1e293b]/90 border border-slate-700/80 hover:border-indigo-500/60 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer overflow-hidden text-right"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
                
                <div>
                  <div className="w-14 h-14 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 mb-5 shadow-lg shadow-indigo-500/10 ml-auto">
                    <MessageSquare className="w-7 h-7" />
                  </div>

                  <div className="space-y-1 mb-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">الخيار الثاني (محادثة)</span>
                    <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-indigo-300 transition">
                      محادثة نصية فورية (Live Chat)
                    </h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    فتح شات فوري تفاعلي مع فريق الدعم الفني والمبيعات مع إشعارات القراءة والكتابة اللحظية.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between flex-row-reverse">
                  <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    <span>شات فوري</span>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-lg bg-indigo-600 group-hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-indigo-600/30 transition">
                    <MessageSquare className="w-3.5 h-3.5" />
                    بدء الشات
                  </span>
                </div>
              </div>

              {/* Option C: WhatsApp (توجيه للواتس آب) */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="whatsapp-card-btn"
                className="group relative bg-[#1E293B] hover:bg-[#1e293b]/90 border border-slate-700/80 hover:border-emerald-500/60 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer overflow-hidden text-right"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
                
                <div>
                  <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300 mb-5 shadow-lg shadow-emerald-500/10 ml-auto">
                    <ExternalLink className="w-7 h-7" />
                  </div>

                  <div className="space-y-1 mb-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">الخيار الثالث (مباشر)</span>
                    <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-emerald-300 transition">
                      التوجه للواتس آب (WhatsApp)
                    </h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    الانتقال فوراً لتطبيق ومحادثة الواتس آب الرسمية الموثقة مع رسالة بداية مجهزة تلقائياً.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between flex-row-reverse">
                  <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                    <span>+{currentWhatsApp}</span>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-lg bg-emerald-600 group-hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-600/30 transition">
                    <ExternalLink className="w-3.5 h-3.5" />
                    فتح التطبيق
                  </span>
                </div>
              </a>

            </div>

            {/* Bottom Service Assurance Badges */}
            <div className="mt-12 w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#1E293B] border border-slate-700/60 text-right">
                <Clock className="w-5 h-5 text-blue-400 shrink-0 ml-auto" />
                <div>
                  <span className="text-white font-semibold block">متاح على مدار الساعة</span>
                  <span className="text-[11px] text-slate-400">{config.workingHours || '24/7 جاهزية تامة'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#1E293B] border border-slate-700/60 text-right">
                <Shield className="w-5 h-5 text-emerald-400 shrink-0 ml-auto" />
                <div>
                  <span className="text-white font-semibold block">تشفير كامل TLS/DTLS</span>
                  <span className="text-[11px] text-slate-400">مكالمات آمنة ومشفرة</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#1E293B] border border-slate-700/60 text-right">
                <Radio className="w-5 h-5 text-indigo-400 shrink-0 ml-auto" />
                <div>
                  <span className="text-white font-semibold block">جودة صوت فائقة HD</span>
                  <span className="text-[11px] text-slate-400">عزل الضوضاء والصدى</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Floating Live Chat Box (When Opened) */}
      {showLiveChat && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm sm:max-w-md shadow-2xl animate-slideUp">
          <LiveChatBox
            role="customer"
            title={`شات خدمة العملاء — ${currentCompanyName}`}
            onClose={() => setShowLiveChat(false)}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500 bg-[#0B1120]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>نظام الاتصال السحابي وهوت لاين خدمة العملاء — {currentCompanyName}</span>
          <div className="flex items-center gap-4 text-[11px]">
            <span>الخط الساخن: <strong className="text-slate-300 font-mono">{currentHotline}</strong></span>
            <span>•</span>
            <span>دعم فني: {config.supportEmail || 'support@hotline.com'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
