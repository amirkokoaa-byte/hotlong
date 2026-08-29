import React, { useState, useEffect } from 'react';
import { Headphones, Lock, Settings, ShieldCheck, PhoneCall, AlertCircle, Building2, User } from 'lucide-react';
import { SystemConfig, CompanyProfile } from '../types';
import { DEFAULT_COMPANIES } from '../services/storage';

interface AgentLoginModalProps {
  config: SystemConfig;
  onLoginSuccess: (agentName: string, selectedCompany?: CompanyProfile) => void;
  onOpenAdminSettings: () => void;
  onBackToCustomer: () => void;
}

export const AgentLoginModal: React.FC<AgentLoginModalProps> = ({
  config,
  onLoginSuccess,
  onOpenAdminSettings,
  onBackToCustomer,
}) => {
  const [username, setUsername] = useState('ahmed');
  const [password, setPassword] = useState('123');
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyProfile | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const targetCompany = selectedCompany || companies[0];

      // 1. Check company-specific registered agent accounts
      if (targetCompany && targetCompany.agents && targetCompany.agents.length > 0) {
        const matched = targetCompany.agents.find(
          (a) => a.username.trim().toLowerCase() === username.trim().toLowerCase() && a.password === password
        );
        if (matched) {
          onLoginSuccess(matched.username, targetCompany);
          return;
        }
      }

      // 2. Global fallback (Master password 0000 or default agent password)
      if (
        (password === config.agentPassword || password === 'agent' || password === '123' || password === config.masterPassword || password === '0000')
      ) {
        onLoginSuccess(username || 'Agent', targetCompany || undefined);
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة لهذه الشركة!');
      }
    } catch {
      setError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 relative overflow-hidden" id="agent-login-page">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar Navigation */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <button
          onClick={onBackToCustomer}
          className="px-3.5 py-2 rounded-xl bg-[#1E293B] border border-slate-700 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-2"
          id="back-to-customer-portal-btn"
        >
          <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
          الانتقال لواجهة العميل (Customer Portal)
        </button>

        {/* Master Admin Settings Gear */}
        <button
          onClick={onOpenAdminSettings}
          title="Admin & Security Settings (Master Password: 0000)"
          id="admin-settings-gear-btn"
          className="group px-3.5 py-2 rounded-xl bg-[#1E293B] border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/60 transition flex items-center gap-2 shadow-lg shadow-amber-500/5"
        >
          <Settings className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
          <span className="text-xs font-semibold">إدارة الشركات والموظفين (Admin)</span>
        </button>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-[#1E293B] border border-slate-700 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 text-right" id="agent-login-card">
        
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 p-0.5 shadow-xl shadow-blue-500/20 mb-4 flex items-center justify-center">
            <div className="w-12 h-12 bg-[#0F172A] rounded-xl flex items-center justify-center border border-slate-700">
              <Headphones className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            تسجيل دخول خدمة العملاء
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            ادخل بحسابك لاستقبال مكالمات شركتك فقط
          </p>
          {selectedCompany && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-mono text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              هوت لاين الشركة: {selectedCompany.hotline}
            </div>
          )}
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" id="agent-auth-form">
          
          {/* 1. Company Selection */}
          {companies.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-end gap-1.5">
                <span>اختر الشركة:</span>
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
              </label>
              <select
                value={selectedCompany?.id || ''}
                onChange={(e) => {
                  const comp = companies.find((c) => c.id === e.target.value);
                  if (comp) {
                    setSelectedCompany(comp);
                    if (comp.agents && comp.agents.length > 0) {
                      setUsername(comp.agents[0].username);
                      setPassword(comp.agents[0].password);
                    }
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F172A] border border-slate-700 text-white font-semibold focus:outline-none focus:border-blue-500 text-sm text-right"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (هوت لاين: {c.hotline})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 2. Username */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-end gap-1.5">
              <span>اسم المستخدم للموظف:</span>
              <User className="w-3.5 h-3.5 text-blue-400" />
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="مثال: ahmed أو sara"
              required
              id="agent-username-input"
              className="w-full px-4 py-2.5 rounded-xl bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm text-right"
            />
          </div>

          {/* 3. Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <button
                type="button"
                onClick={onOpenAdminSettings}
                className="text-[11px] text-amber-400 hover:text-amber-300 transition underline underline-offset-2"
              >
                نسيت الكلمة؟ المدير (0000)
              </button>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>كلمة المرور:</span>
                <Lock className="w-3.5 h-3.5 text-blue-400" />
              </label>
            </div>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                id="agent-password-input"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-sm text-center tracking-wider"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 justify-end">
              <span>{error}</span>
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            id="agent-submit-login-btn"
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {isLoading ? 'جاري التحقق...' : 'دخول واستقبال المكالمات'}
          </button>
        </form>

        {/* Quick Credentials Helper */}
        {selectedCompany && selectedCompany.agents && selectedCompany.agents.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-700 text-right">
            <span className="text-[11px] text-slate-400 block mb-1.5">حسابات تجريبية مسجلة لهذه الشركة:</span>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {selectedCompany.agents.map((ag) => (
                <button
                  key={ag.id}
                  type="button"
                  onClick={() => {
                    setUsername(ag.username);
                    setPassword(ag.password);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] text-blue-300 transition"
                >
                  {ag.username} / {ag.password}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
