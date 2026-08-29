import React, { useState, useEffect } from 'react';
import { Settings, Key, Phone, Building2, MessageSquare, Check, X, ShieldAlert, Lock, RotateCcw, Plus, Trash2, Building, UserPlus, UserCheck } from 'lucide-react';
import { SystemConfig, CompanyProfile, AgentAccount } from '../types';
import { DEFAULT_CONFIG, DEFAULT_COMPANIES } from '../services/storage';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SystemConfig;
  onSaveConfig: (newConfig: SystemConfig) => Promise<void>;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  // Master password step vs config edit step
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState<SystemConfig>({ ...config });
  
  // Multi-Company Management
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [newCompName, setNewCompName] = useState('');
  const [newCompHotline, setNewCompHotline] = useState('');
  const [newCompWhatsapp, setNewCompWhatsapp] = useState('');

  // Agent Management State for Companies
  const [selectedCompIdForAgent, setSelectedCompIdForAgent] = useState('');
  const [newAgentUser, setNewAgentUser] = useState('');
  const [newAgentPass, setNewAgentPass] = useState('');

  useEffect(() => {
    try {
      const loaded = JSON.parse(localStorage.getItem('app_companies') || '[]');
      if (loaded.length > 0) {
        setCompanies(loaded);
      } else {
        setCompanies(DEFAULT_COMPANIES);
      }
    } catch {
      setCompanies(DEFAULT_COMPANIES);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerifyMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      const res = await fetch('/api/admin/verify-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterPassword: masterPasswordInput }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        if (data.config) {
          setFormData((prev) => ({ ...prev, ...data.config }));
        }
      } else {
        if (masterPasswordInput === config.masterPassword || masterPasswordInput === '0000') {
          setIsAuthenticated(true);
        } else {
          setAuthError('كلمة المرور الرئيسية غير صحيحة! (الافتراضي: "0000")');
        }
      }
    } catch {
      if (masterPasswordInput === config.masterPassword || masterPasswordInput === '0000') {
        setIsAuthenticated(true);
      } else {
        setAuthError('كلمة المرور الرئيسية غير صحيحة! (الافتراضي: "0000")');
      }
    }
  };

  const handleAddCompany = () => {
    if (!newCompName.trim() || !newCompHotline.trim()) {
      alert('يرجى إدخال اسم الشركة ورقم الهوت لاين');
      return;
    }
    const newComp: CompanyProfile = {
      id: Date.now().toString(),
      name: newCompName.trim(),
      hotline: newCompHotline.trim(),
      whatsapp: newCompWhatsapp.trim().replace(/[^0-9]/g, '') || '201000000000',
      agents: [
        { id: 'a_' + Date.now(), username: 'agent', password: '123' }
      ]
    };
    const updated = [...companies, newComp];
    setCompanies(updated);
    localStorage.setItem('app_companies', JSON.stringify(updated));
    setNewCompName('');
    setNewCompHotline('');
    setNewCompWhatsapp('');
  };

  const handleDeleteCompany = (id: string) => {
    if (companies.length <= 1) {
      alert('يجب الإبقاء على شركة واحدة على الأقل في النظام.');
      return;
    }
    const updated = companies.filter((c) => c.id !== id);
    setCompanies(updated);
    localStorage.setItem('app_companies', JSON.stringify(updated));
  };

  const handleAddAgentToCompany = (companyId: string) => {
    if (!newAgentUser.trim() || !newAgentPass.trim()) {
      alert('يرجى إدخال اسم المستخدم وكلمة المرور للموظف');
      return;
    }

    const updated = companies.map((c) => {
      if (c.id === companyId) {
        const existing = c.agents || [];
        if (existing.some((a) => a.username.toLowerCase() === newAgentUser.trim().toLowerCase())) {
          alert('اسم المستخدم هذا مسجل بالفعل لهذه الشركة');
          return c;
        }
        const newAccount: AgentAccount = {
          id: 'ag_' + Date.now(),
          username: newAgentUser.trim(),
          password: newAgentPass.trim(),
        };
        return {
          ...c,
          agents: [...existing, newAccount],
        };
      }
      return c;
    });

    setCompanies(updated);
    localStorage.setItem('app_companies', JSON.stringify(updated));
    setNewAgentUser('');
    setNewAgentPass('');
  };

  const handleDeleteAgent = (companyId: string, agentId: string) => {
    const updated = companies.map((c) => {
      if (c.id === companyId) {
        return {
          ...c,
          agents: (c.agents || []).filter((a) => a.id !== agentId),
        };
      }
      return c;
    });
    setCompanies(updated);
    localStorage.setItem('app_companies', JSON.stringify(updated));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      localStorage.setItem('app_companies', JSON.stringify(companies));

      await fetch('/api/admin/update-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterPassword: masterPasswordInput || '0000',
          newConfig: formData,
        }),
      });

      await onSaveConfig(formData);

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
        setIsAuthenticated(false);
        setMasterPasswordInput('');
      }, 1200);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('هل تريد استعادة الإعدادات الافتراضية للنظام وقائمة الشركات؟')) {
      setFormData({ ...DEFAULT_CONFIG });
      setCompanies(DEFAULT_COMPANIES);
      localStorage.setItem('app_companies', JSON.stringify(DEFAULT_COMPANIES));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" id="admin-settings-modal-overlay">
      <div className="relative w-full max-w-3xl bg-[#1E293B] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100" id="admin-settings-card">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-[#0F172A]/80">
          <button
            onClick={() => {
              onClose();
              setIsAuthenticated(false);
              setMasterPasswordInput('');
              setAuthError('');
            }}
            id="close-admin-settings-btn"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 text-right">
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                لوحة إعدادات المشرف وإدارة الموظفين (Admin)
              </h2>
              <p className="text-xs text-slate-400">
                إدارة الشركات، أرقام الهوت لاين، وحسابات موظفي خدمة العملاء
              </p>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Step 1: Master Password Prompt */}
        {!isAuthenticated ? (
          <form onSubmit={handleVerifyMasterPassword} className="p-6 space-y-5 text-right" id="master-password-form">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 flex-row-reverse">
              <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <span className="font-semibold text-amber-300 block mb-0.5">منطقة المشرفين المحمية:</span>
                تعديل إعدادات الهوت لاين وحسابات الموظفين يتطلب إدخال كلمة المرور الرئيسية (Master Password). كلمة المرور الافتراضية هي <code className="bg-[#0F172A] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-200 font-mono font-bold">0000</code>.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center justify-end gap-2">
                <span>أدخل كلمة المرور الرئيسية (Master Password):</span>
                <Lock className="w-4 h-4 text-blue-400" />
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={masterPasswordInput}
                  onChange={(e) => setMasterPasswordInput(e.target.value)}
                  placeholder="0000"
                  autoFocus
                  required
                  id="master-password-input"
                  className="w-full px-4 py-3 rounded-xl bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-center tracking-widest text-lg"
                />
              </div>
              {authError && (
                <p className="text-xs text-rose-400 mt-1 flex items-center justify-end gap-1.5">
                  <span>{authError}</span>
                  <ShieldAlert className="w-3.5 h-3.5" />
                </p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                id="verify-master-password-btn"
                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                فتح لوحة الإعدادات (Unlock)
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Settings Configuration Form */
          <form onSubmit={handleSaveSettings} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto text-right custom-scrollbar" id="admin-config-edit-form">
            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-end gap-2">
                <span>تم حفظ الإعدادات وقائمة الشركات وحسابات الموظفين بنجاح!</span>
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
            )}

            {/* Multi-Company Management Section */}
            <div className="space-y-4 bg-[#0F172A] p-4 rounded-xl border border-slate-700">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-end gap-1.5">
                <span>إدارة الشركات وحسابات الموظفين التابعة لها</span>
                <Building className="w-4 h-4" />
              </h3>

              {/* Add New Company Card */}
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 space-y-3">
                <span className="text-xs text-slate-300 font-semibold block">إضافة شركة وهووت لاين جديد:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="اسم الشركة (مثال: شركة النور)"
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-xs text-white text-right"
                  />
                  <input
                    type="text"
                    placeholder="الهوت لاين (مثال: 19003)"
                    value={newCompHotline}
                    onChange={(e) => setNewCompHotline(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-xs text-white font-mono text-center"
                  />
                  <input
                    type="text"
                    placeholder="واتساب (201000000000)"
                    value={newCompWhatsapp}
                    onChange={(e) => setNewCompWhatsapp(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-700 text-xs text-white font-mono text-center"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCompany}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  إضافة الشركة للنظام
                </button>
              </div>

              {/* Companies and their individual Agents List */}
              <div className="space-y-4">
                <span className="text-xs text-slate-300 block font-bold">الشركات وحسابات الموظفين المعتمدة:</span>
                {companies.map((comp) => (
                  <div key={comp.id} className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-3">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteCompany(comp.id)}
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition"
                        title="حذف الشركة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="text-right">
                        <span className="font-bold text-white text-sm block">{comp.name}</span>
                        <div className="flex items-center justify-end gap-3 text-xs text-slate-400 font-mono">
                          <span>هوت لاين: <strong className="text-blue-400">{comp.hotline}</strong></span>
                          <span>•</span>
                          <span>واتساب: <strong className="text-emerald-400">{comp.whatsapp}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Agent Accounts List for this company */}
                    <div>
                      <p className="text-[11px] font-semibold text-slate-300 mb-2 flex items-center justify-end gap-1">
                        <span>حسابات موظفي خدمة العملاء المسجلين:</span>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      </p>
                      
                      {(!comp.agents || comp.agents.length === 0) ? (
                        <p className="text-[11px] text-amber-400/80 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 text-right">
                          لا توجد حسابات موظفين مسجلة لهذه الشركة.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
                          {comp.agents.map((ag) => (
                            <div key={ag.id} className="flex items-center justify-between p-2 rounded-lg bg-[#0F172A] border border-slate-700 text-xs">
                              <button
                                type="button"
                                onClick={() => handleDeleteAgent(comp.id, ag.id)}
                                className="text-rose-400 hover:text-rose-300 p-1"
                                title="حذف حساب الموظف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <div className="text-right">
                                <span className="text-blue-300 font-semibold">{ag.username}</span>
                                <span className="text-slate-400 mr-2 text-[11px] font-mono">(كلمة السر: {ag.password})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Agent Form for this company */}
                      <div className="p-2.5 rounded-lg bg-[#0F172A]/70 border border-dashed border-slate-600 space-y-2 mt-2">
                        <span className="text-[11px] text-slate-300 font-medium flex items-center justify-end gap-1">
                          <span>إضافة موظف جديد لـ ({comp.name}):</span>
                          <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="اسم المستخدم للموظف"
                            value={selectedCompIdForAgent === comp.id ? newAgentUser : ''}
                            onChange={(e) => {
                              setSelectedCompIdForAgent(comp.id);
                              setNewAgentUser(e.target.value);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-850 border border-slate-700 text-xs text-white text-right"
                          />
                          <input
                            type="password"
                            placeholder="كلمة مرور الموظف"
                            value={selectedCompIdForAgent === comp.id ? newAgentPass : ''}
                            onChange={(e) => {
                              setSelectedCompIdForAgent(comp.id);
                              setNewAgentPass(e.target.value);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-850 border border-slate-700 text-xs text-white font-mono text-center"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompIdForAgent(comp.id);
                            handleAddAgentToCompany(comp.id);
                          }}
                          className="w-full py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          إضافة حساب الموظف
                        </button>
                      </div>

                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* General Security & Passwords */}
            <div className="space-y-3 pt-2 border-t border-slate-700">
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center justify-end gap-1.5">
                <span>كلمات المرور الرئيسية (Master Passwords)</span>
                <Key className="w-4 h-4" />
              </h3>
              
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  تغيير كلمة مرور المشرف العام (Master Password):
                </label>
                <input
                  type="text"
                  value={formData.masterPassword}
                  onChange={(e) => setFormData({ ...formData, masterPassword: e.target.value })}
                  required
                  id="master-password-change-input"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F172A] border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm text-center"
                  placeholder="0000"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-slate-700 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition flex items-center gap-1.5"
                id="reset-defaults-btn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                استعادة الافتراضي
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  id="save-admin-settings-btn"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-lg shadow-blue-600/25 transition flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات والتحديث'}
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
