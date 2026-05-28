// src/pages/Profile.jsx — Premium user profile page
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Shield, LogOut, CheckCircle2, Loader2, AlertCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Profile() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!token) { setTimeout(() => { setLoading(false); setError('Not authenticated'); }, 0); return; }
    api.get('/api/v1/auth/me')
      .then(res => setProfile(res.data))
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleLogout = () => { logout(); navigate('/'); };

  // Derive initials for avatar
  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const formatPhone = (p) => {
    if (!p) return null;
    const digits = p.replace(/\D/g, '');
    if (digits.length === 10) return `+91 ${digits.slice(0,5)} ${digits.slice(5)}`;
    return p;
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-indigo-500/15 border border-indigo-500/30 rounded-full px-4 py-1.5 mb-4 text-xs font-semibold text-indigo-500 tracking-wider">
          <Zap size={14} /> MY ACCOUNT
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2 bg-gradient-to-br from-indigo-400 to-sky-500 bg-clip-text text-transparent">
          Profile
        </h1>
        <p className="text-slate-400 text-sm md:text-base">Manage your account information</p>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex justify-center p-16">
          <Loader2 size={36} className="text-indigo-500 animate-spin" />
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 flex items-center gap-3 mb-6">
          <AlertCircle size={20} className="text-red-500 shrink-0" />
          <p className="text-red-500 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ── Profile Card ── */}
      {!loading && profile && (
        <div className="flex flex-col gap-6">
          {/* Avatar + Name banner */}
          <div className="glass-panel relative overflow-hidden p-10 text-center border-indigo-500/30">
            {/* Background glow */}
            <div className="absolute w-56 h-56 rounded-full bg-indigo-500/20 blur-3xl -top-20 left-1/2 -translate-x-1/2 pointer-events-none" />

            {/* Avatar */}
            <div className="relative w-24 h-24 mx-auto mb-5 rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 flex items-center justify-center text-3xl font-extrabold text-[#ffffff] shadow-[0_0_30px_rgba(99,102,241,0.5)] border-4 border-white/10">
              {initials}
              {/* Online dot */}
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>

            <h2 className="text-white font-extrabold text-2xl mb-2">
              {profile.name || 'User'}
            </h2>
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-3 py-1 text-xs font-semibold text-emerald-500">
              <CheckCircle2 size={14} /> Verified Member
            </div>
          </div>

          {/* Info cards */}
          <div className="glass-panel p-7">
            <h3 className="text-white font-bold text-sm mb-5 flex items-center gap-2">
              <span className="w-1 h-4 bg-indigo-500 rounded-sm inline-block" />
              Account Details
            </h3>

            <div className="flex flex-col gap-3.5">
              <InfoRow
                icon={<User size={18} />}
                iconBg="bg-indigo-500/20"
                iconColor="text-indigo-500"
                label="Full Name"
                value={profile.name || '—'}
              />
              <InfoRow
                icon={<Mail size={18} />}
                iconBg="bg-sky-500/15"
                iconColor="text-sky-500"
                label="Email Address"
                value={profile.email || '—'}
              />
              <InfoRow
                icon={<Phone size={18} />}
                iconBg="bg-emerald-500/15"
                iconColor="text-emerald-500"
                label="Registered Phone"
                value={formatPhone(profile.mobile_number) || 'Not added'}
                valueColor={profile.mobile_number ? 'text-white' : 'text-slate-500'}
                badge={profile.mobile_number ? { text: 'Verified', color: 'text-emerald-500', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' } : null}
              />
            </div>
          </div>

          {/* Security section */}
          <div className="glass-panel p-6">
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-500 rounded-sm inline-block" />
              Security
            </h3>
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <Shield size={18} className="text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-slate-400 text-xs mb-0.5 font-medium">Password</p>
                <p className="text-white text-sm font-semibold tracking-widest">••••••••••••</p>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 font-semibold">
                Protected
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full p-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm cursor-pointer border border-red-500/30 bg-red-500/10 text-red-500 transition-all hover:bg-red-500/20 hover:shadow-[0_0_20px_rgba(248,113,113,0.2)]"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

// ── Reusable info row ─────────────────────────────────────────
function InfoRow({ icon, iconBg, iconColor, label, value, valueColor = "text-white", badge }) {
  return (
    <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-900/40 border border-slate-700/50 transition-colors hover:border-indigo-500/30 group">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center ${iconColor} shrink-0 transition-transform group-hover:scale-105`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`${valueColor} text-[15px] font-semibold truncate`}>{value}</p>
      </div>
      {badge && (
        <span className={`text-[11px] px-2.5 py-1 rounded-full ${badge.bg} ${badge.color} border ${badge.border} font-bold flex items-center gap-1 shrink-0`}>
          <CheckCircle2 size={12} /> {badge.text}
        </span>
      )}
    </div>
  );
}
