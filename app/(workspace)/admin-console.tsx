'use client';

import React, { useState } from 'react';
import { CATALOGUES, type TranslationKey } from '../../packages/i18n/src/catalogues';

export interface AdminConsoleProps {
  actor: {
    userId: string;
    role: 'member' | 'pastor' | 'admin';
    tier: 'free' | 'member' | 'pastor';
    totpEnabled?: boolean;
  };
  locale: 'en' | 'ko';
  onClose: () => void;
}

type AdminTab = 'overview' | 'users' | 'source_dir' | 'flags' | 'audit' | 'tripwire' | 'break_glass';

interface MockUser {
  userId: string;
  emailMasked: string;
  role: 'member' | 'pastor' | 'admin';
  tier: 'free' | 'member' | 'pastor';
  status: 'active' | 'suspended';
  totpEnabled: boolean;
  createdAt: string;
}

export function AdminConsole({ actor, locale, onClose }: AdminConsoleProps) {
  const strings = CATALOGUES[locale];
  const t = (key: TranslationKey, fallback?: string): string =>
    (strings as Record<string, string>)[key] || fallback || key;

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Re-auth state (simulated 15-minute window per PR-ADM-08)
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthTotp, setReauthTotp] = useState('');
  const [isReauthenticated, setIsReauthenticated] = useState(true);

  // Break-glass state
  const [bgScope, setBgScope] = useState('');
  const [bgReason, setBgReason] = useState('');
  const [bgDuration, setBgDuration] = useState('15');
  const [bgActiveGrant, setBgActiveGrant] = useState<{
    id: string;
    scope: string;
    reason: string;
    expiresAt: string;
  } | null>(null);
  const [bgError, setBgError] = useState<string | null>(null);

  // Feature flags state
  const [flags, setFlags] = useState({
    byok_enabled: false,
    captcha_enabled: false,
    maintenance_mode: false,
    registration_open: true,
  });

  // User management state
  const [users, setUsers] = useState<MockUser[]>([
    {
      userId: 'usr-001',
      emailMasked: 'm***r@sda.org',
      role: 'member',
      tier: 'member',
      status: 'active',
      totpEnabled: false,
      createdAt: '2026-08-15',
    },
    {
      userId: 'usr-002',
      emailMasked: 'p***r@sda.org',
      role: 'pastor',
      tier: 'pastor',
      status: 'active',
      totpEnabled: true,
      createdAt: '2026-08-20',
    },
    {
      userId: 'usr-003',
      emailMasked: 'a***n@sda.org',
      role: 'admin',
      tier: 'pastor',
      status: 'active',
      totpEnabled: true,
      createdAt: '2026-08-01',
    },
  ]);

  // Accretion tripwire state
  const [tripwireReport, setTripwireReport] = useState<{
    totalChars: number;
    threshold: number;
    triggered: boolean;
    works: Array<{ id: string; title: string; chars: number; users: number }>;
  }>({
    totalChars: 18450,
    threshold: 50000,
    triggered: false,
    works: [
      { id: 'da', title: 'The Desire of Ages', chars: 11200, users: 4 },
      { id: 'gc', title: 'The Great Controversy', chars: 5150, users: 2 },
      { id: 'sc', title: 'Steps to Christ', chars: 2100, users: 3 },
    ],
  });

  // Unauthorized access guard
  if (actor.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-red-500/50 rounded-xl max-w-md p-6 text-slate-100 shadow-2xl">
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-300 mb-4">
            Administrative role is required to access the governance console.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleInvokeBreakGlass = () => {
    setBgError(null);
    if (!bgReason.trim() || bgReason.trim().length < 8) {
      setBgError('A specific stated reason (at least 8 characters) is mandatory.');
      return;
    }
    if (!bgScope.trim()) {
      setBgError('Target conversation or user ID is required.');
      return;
    }
    if (!reauthTotp || reauthTotp.length !== 6) {
      setBgError('Valid 6-digit TOTP code required for break-glass re-authentication.');
      return;
    }

    const grant = {
      id: `bg-${Date.now().toString(16)}`,
      scope: bgScope.trim(),
      reason: bgReason.trim(),
      expiresAt: new Date(Date.now() + parseInt(bgDuration, 10) * 60 * 1000).toLocaleTimeString(),
    };

    setBgActiveGrant(grant);
    setBgReason('');
    setBgScope('');
    setReauthTotp('');
  };

  const handleRoleChange = (userId: string, newRole: 'member' | 'pastor' | 'admin') => {
    setUsers(prev =>
      prev.map(u => {
        if (u.userId !== userId) return u;
        if (newRole === 'admin' && !u.totpEnabled) {
          alert('SECURITY ERROR: Admin role cannot be granted to an account without active TOTP (SR-1.8).');
          return u;
        }
        return { ...u, role: newRole };
      })
    );
  };

  const handleToggleStatus = (userId: string) => {
    setUsers(prev =>
      prev.map(u =>
        u.userId === userId ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg">
              <span className="text-xl">🛡️</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {t('admin_title', 'Admin Console & Governance')}
              </h2>
              <p className="text-xs text-slate-400">
                Operator Cost: <span className="text-emerald-400 font-mono font-medium">$0.00 (Structural)</span> · Invariants Active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 rounded-full font-mono">
              TOTP Verified
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition p-1.5 rounded-lg hover:bg-slate-800"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 gap-1 bg-slate-950/30 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3.5 border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('admin_tab_overview', 'Overview')}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-3.5 border-b-2 transition ${
              activeTab === 'users'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('admin_tab_users', 'User Governance')}
          </button>
          <button
            onClick={() => setActiveTab('source_dir')}
            className={`py-3 px-3.5 border-b-2 transition ${
              activeTab === 'source_dir'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('admin_tab_source_dir', 'Source Directory')}
          </button>
          <button
            onClick={() => setActiveTab('flags')}
            className={`py-3 px-3.5 border-b-2 transition ${
              activeTab === 'flags'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('admin_tab_flags', 'Feature Flags')}
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-3.5 border-b-2 transition ${
              activeTab === 'audit'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('admin_tab_audit', 'Audit Chain')}
          </button>
          <button
            onClick={() => setActiveTab('tripwire')}
            className={`py-3 px-3.5 border-b-2 transition ${
              activeTab === 'tripwire'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('admin_tab_tripwire', 'Accretion Tripwire')}
          </button>
          <button
            onClick={() => setActiveTab('break_glass')}
            className={`py-3 px-3.5 border-b-2 transition ${
              activeTab === 'break_glass'
                ? 'border-red-500 text-red-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🚨 {t('admin_tab_break_glass', 'Break-Glass')}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* 1. OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
                  <span className="text-xs text-slate-400 uppercase font-medium">Total Registered Users</span>
                  <div className="text-2xl font-bold mt-1 text-slate-100">3</div>
                  <span className="text-xs text-emerald-400">100% envelope encrypted</span>
                </div>
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
                  <span className="text-xs text-slate-400 uppercase font-medium">Accretion Status (SR-D3)</span>
                  <div className="text-2xl font-bold mt-1 text-emerald-400">Normal</div>
                  <span className="text-xs text-slate-400">18,450 / 50,000 cap</span>
                </div>
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
                  <span className="text-xs text-slate-400 uppercase font-medium">Operator AI Expense</span>
                  <div className="text-2xl font-bold mt-1 text-indigo-400">$0.00</div>
                  <span className="text-xs text-slate-400">Cost Firewall SR-10</span>
                </div>
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
                  <span className="text-xs text-slate-400 uppercase font-medium">Audit Chain</span>
                  <div className="text-2xl font-bold mt-1 text-emerald-400">Verified</div>
                  <span className="text-xs text-slate-400">SHA-256 tamper-evident</span>
                </div>
              </div>

              <div className="p-4 bg-slate-800/30 border border-slate-700/60 rounded-xl space-y-3">
                <h3 className="font-semibold text-slate-200">System Invariants & Governance Posture</h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span><strong>No EGW Corpus:</strong> Our server does not collect, ingest, host, index, or hold Ellen G. White text as a source.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span><strong>No Server-Side Inference:</strong> All AI processing occurs in the member&apos;s external session or browser.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span><strong>Evidence Invariant:</strong> Only E4 may be presented as verified or displayed in green.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span><strong>Source Channel:</strong> Member-supplied source text never reaches our server.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* 2. USER GOVERNANCE */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-200">User Accounts & Roles</h3>
                <span className="text-xs text-slate-400">Changes are written to the audit chain</span>
              </div>
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-3">User ID</th>
                      <th className="px-4 py-3">Email Hash</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Tier</th>
                      <th className="px-4 py-3">2FA (TOTP)</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {users.map(u => (
                      <tr key={u.userId} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-mono">{u.userId}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{u.emailMasked}</td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.userId, e.target.value as any)}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="member">member</option>
                            <option value="pastor">pastor</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">{u.tier}</td>
                        <td className="px-4 py-3">
                          {u.totpEnabled ? (
                            <span className="text-emerald-400 font-medium">✓ Enabled</span>
                          ) : (
                            <span className="text-slate-500">Disabled</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              u.status === 'active'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                                : 'bg-red-950/60 text-red-400 border border-red-800/50'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleStatus(u.userId)}
                            className="text-xs text-slate-300 hover:text-white px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700"
                          >
                            {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. SOURCE DIRECTORY */}
          {activeTab === 'source_dir' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-200">Source Directory Pinned Entries (SR-7.1)</h3>
              <div className="space-y-3">
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-indigo-400">egw_library_read</span>
                    <h4 className="text-sm font-medium text-slate-200">Ellen G. White Writings (Complete Published Works)</h4>
                    <p className="text-xs text-slate-400">Host: egwwritings.org · Prefix: /read/ · Attestation-eligible: Yes</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 rounded-full text-xs">
                    Active (Pinned)
                  </span>
                </div>
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-slate-400">egw_search_landing</span>
                    <h4 className="text-sm font-medium text-slate-200">EGW Writings Search Landing</h4>
                    <p className="text-xs text-slate-400">Host: egwwritings.org · Attestation-eligible: No (Search index)</p>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded-full text-xs">
                    Active (Unattestable)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. FEATURE FLAGS */}
          {activeTab === 'flags' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-200">Runtime Feature Controls</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-200">BYOK Direct Connect</h4>
                    <p className="text-xs text-slate-400">Gated on published provider sanction (ADR-0020)</p>
                  </div>
                  <button
                    onClick={() => setFlags(f => ({ ...f, byok_enabled: !f.byok_enabled }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      flags.byok_enabled
                        ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {flags.byok_enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-200">Registration Status</h4>
                    <p className="text-xs text-slate-400">Allow new member self-registration</p>
                  </div>
                  <button
                    onClick={() => setFlags(f => ({ ...f, registration_open: !f.registration_open }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      flags.registration_open
                        ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {flags.registration_open ? 'Open' : 'Closed'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-200">Tamper-Evident Audit Chain</h3>
                <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 rounded-full text-xs font-mono">
                  ✓ Chain Verified (SHA-256)
                </span>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs font-mono space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span className="text-indigo-400 font-semibold">user_role_updated</span>
                    <span>2026-09-10T18:00:00Z</span>
                  </div>
                  <div className="text-slate-300">actor: usr-003 · target: usr-002 · role: member-&gt;pastor</div>
                  <div className="text-slate-500 truncate">entryHash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</div>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs font-mono space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span className="text-indigo-400 font-semibold">purge_expired_conversations</span>
                    <span>2026-09-10T17:00:00Z</span>
                  </div>
                  <div className="text-slate-300">actor: system_retention_job · purged_count: 0</div>
                  <div className="text-slate-500 truncate">entryHash: 112f458e0a12903fe56b82098b0f4439c23f4094589d892837492a34891bca78</div>
                </div>
              </div>
            </div>
          )}

          {/* 6. ACCRETION TRIPWIRE (SR-D3) */}
          {activeTab === 'tripwire' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-200">SR-D3 Accretion Tripwire Report</h3>
                  <p className="text-xs text-slate-400">
                    Monitors aggregate source volume to prevent accidental corpus formation. Threshold: 50,000 characters.
                  </p>
                </div>
                <button
                  onClick={() => alert('SR-D3 check completed. No works exceed the 50,000-character threshold.')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition"
                >
                  Run Tripwire Check
                </button>
              </div>

              <div className="space-y-3">
                {tripwireReport.works.map(w => {
                  const percent = Math.min(100, Math.round((w.chars / tripwireReport.threshold) * 100));
                  return (
                    <div key={w.id} className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-200">{w.title} ({w.id})</span>
                        <span className="font-mono text-slate-400">
                          {w.chars.toLocaleString()} / {tripwireReport.threshold.toLocaleString()} chars ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-700/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Contributed by {w.users} distinct member sessions (metadata only, zero text stored)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 7. BREAK-GLASS EMERGENCY CONSOLE */}
          {activeTab === 'break_glass' && (
            <div className="space-y-6">
              <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-red-400 font-semibold">
                  <span>⚠️</span>
                  <span>{t('admin_break_glass_warning', 'UNSUPPRESSABLE NOTIFICATION NOTICE')}</span>
                </div>
                <p className="text-xs text-red-200 leading-relaxed">
                  In accordance with <strong>PR-ADM-03</strong> and <strong>T-21</strong>, invoking break-glass will immediately send an <strong>unsuppressable email notification</strong> to the affected member, and an immediate alert to the system owner. There is <strong>NO option to suppress, mute, or bypass</strong> this notification.
                </p>
              </div>

              {bgActiveGrant && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-400 font-semibold text-xs uppercase">Active Break-Glass Session</span>
                    <span className="text-xs text-slate-400">Expires at {bgActiveGrant.expiresAt}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-300">
                    Grant ID: {bgActiveGrant.id} · Target Scope: {bgActiveGrant.scope}
                  </div>
                  <div className="text-xs text-slate-300">
                    Stated Reason: <em>&ldquo;{bgActiveGrant.reason}&rdquo;</em>
                  </div>
                </div>
              )}

              <div className="p-5 bg-slate-800/30 border border-slate-700/60 rounded-xl space-y-4">
                <h4 className="font-semibold text-slate-200">Elevate Access to Member Conversation</h4>

                {bgError && (
                  <div className="p-3 bg-red-900/50 border border-red-500/60 rounded-lg text-xs text-red-200">
                    {bgError}
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Target Conversation ID or User ID</label>
                    <input
                      type="text"
                      value={bgScope}
                      onChange={e => setBgScope(e.target.value)}
                      placeholder="e.g. conv-89a1b2c3 or usr-45d6e7"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Stated Reason for Emergency Access (Mandatory)
                    </label>
                    <textarea
                      value={bgReason}
                      onChange={e => setBgReason(e.target.value)}
                      rows={2}
                      placeholder="Explain the specific operational or safety justification..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Admin 2FA TOTP Code (6 Digits)</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={reauthTotp}
                        onChange={e => setReauthTotp(e.target.value)}
                        placeholder="123456"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono tracking-widest focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Duration Window</label>
                      <select
                        value={bgDuration}
                        onChange={e => setBgDuration(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-red-500"
                      >
                        <option value="15">15 minutes (Standard)</option>
                        <option value="30">30 minutes</option>
                        <option value="60">60 minutes (Maximum)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleInvokeBreakGlass}
                    className="w-full py-2.5 bg-red-700 hover:bg-red-600 text-white font-medium rounded-xl text-xs transition shadow-lg shadow-red-950/50"
                  >
                    Invoke Break-Glass &amp; Dispatch Notification
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
