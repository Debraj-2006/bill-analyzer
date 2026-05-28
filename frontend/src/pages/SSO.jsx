import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Zap, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Stage-based SSO verification ─────────────────────────────────────────────
// Progress is tied to actual backend response lifecycle, not a fake timer.
// ──────────────────────────────────────────────────────────────────────────────

const STAGES = {
  initiating:  { label: 'VALIDATING PARAMETERS',       target: 15  },
  verifying:   { label: 'AUTHENTICATING WITH SERVER',   target: 45  },
  coldWait:    { label: 'WAKING UP SECURE ENGINES',     target: 60  },
  syncing:     { label: 'SYNCHRONIZING PROFILE',        target: 85  },
  redirecting: { label: 'PREPARING DASHBOARD',          target: 100 },
};

export default function SSO() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [error, setError] = useState('');
  const [stage, setStage] = useState('initiating');
  const [progress, setProgress] = useState(0);
  const [ssoUser, setSsoUser] = useState(null);
  const [verified, setVerified] = useState(false);
  const [statusHint, setStatusHint] = useState('Parsing LokSetu security token...');
  const coldTimerRef = useRef(null);

  const email = searchParams.get('email');
  const name  = searchParams.get('name') || 'Citizen';
  const phone = searchParams.get('phone') || '';
  const timestamp = searchParams.get('timestamp');
  const hash  = searchParams.get('hash');

  useEffect(() => {
    if (name) setSsoUser(name);
  }, [name]);

  // ── Smooth progress animation toward the current stage target ──────────────
  useEffect(() => {
    const target = STAGES[stage]?.target ?? 0;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= target) { clearInterval(interval); return target; }
        // Ease toward target: faster when far, slower when close
        const step = Math.max(1, Math.round((target - prev) * 0.18));
        return Math.min(prev + step, target);
      });
    }, 120);
    return () => clearInterval(interval);
  }, [stage]);

  // ── Main SSO lifecycle ─────────────────────────────────────────────────────
  useEffect(() => {
    const performSSO = async () => {
      // ── Stage 1: Validate parameters ────────────────────────────────────────
      setStage('initiating');
      setStatusHint('Parsing LokSetu security token...');

      if (!email || !name || !timestamp || !hash) {
        setError('Missing SSO parameters in URL. Please try the link from LokSetu again.');
        return;
      }

      // Small delay so user sees Stage 1
      await new Promise((r) => setTimeout(r, 600));

      // ── Stage 2: Call backend ───────────────────────────────────────────────
      setStage('verifying');
      setStatusHint('Validating LokSetu security signature...');

      // Start a cold-start timer: if request takes >4s, show a helpful hint
      coldTimerRef.current = setTimeout(() => {
        setStage('coldWait');
        setStatusHint('Waking up secure analytical engines — this may take up to 45 seconds on first boot...');
      }, 4000);

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/v1/auth/sso-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, phone, timestamp, hash }),
        });

        // Clear the cold-start timer since we got a response
        if (coldTimerRef.current) clearTimeout(coldTimerRef.current);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const detail = typeof errorData.detail === 'string'
            ? errorData.detail
            : Array.isArray(errorData.detail)
              ? errorData.detail.map((d) => d.msg).join(', ')
              : 'SSO authentication failed on the server.';
          setError(detail);
          return;
        }

        const data = await response.json();

        // ── Stage 3: Sync session ─────────────────────────────────────────────
        setStage('syncing');
        setStatusHint('Synchronizing your profile and bill databases...');
        login(data.access_token);
        setVerified(true);

        // Let syncing animation breathe for a moment
        await new Promise((r) => setTimeout(r, 900));

        // ── Stage 4: Redirect ─────────────────────────────────────────────────
        setStage('redirecting');
        setStatusHint('Redirecting to your dashboard...');

        await new Promise((r) => setTimeout(r, 800));
        navigate('/dashboard', { replace: true });

      } catch (err) {
        if (coldTimerRef.current) clearTimeout(coldTimerRef.current);
        console.error('SSO error:', err);
        setError('Could not connect to Bill Analyzer server. Please check your connection or try logging in manually.');
      }
    };

    performSSO();

    return () => {
      if (coldTimerRef.current) clearTimeout(coldTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentLabel = STAGES[stage]?.label || 'PROCESSING';

  return (
    <div className="flex justify-center items-center min-h-[90vh] px-4 relative overflow-hidden bg-slate-950">
      {/* Abstract Glowing Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />

      <div className="glass-panel-premium w-full max-w-lg p-10 relative overflow-hidden text-center rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-xl">
        {/* Shiny Top Gradient border overlay */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

        {error ? (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <AlertCircle size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">SSO Authentication Failed</h2>
              <p className="text-slate-400 text-sm">{error}</p>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="btn-primary w-full py-3.5 rounded-xl font-medium tracking-wide shadow-lg shadow-indigo-600/15"
            >
              Back to Manual Login
            </button>
          </div>
        ) : (
          <div className="space-y-8 py-4">
            {/* Identity Cross-Over Graphic */}
            <div className="flex items-center justify-center gap-6 mb-2">
              <div className="w-14 h-14 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/5">
                <Sparkles className="text-amber-400 animate-pulse" size={24} />
              </div>
              
              <div className="flex flex-col items-center">
                <div className="h-[2px] w-12 bg-gradient-to-r from-amber-500 to-indigo-500 relative">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full animate-ping" />
                </div>
              </div>

              <div className="w-14 h-14 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/5">
                <Zap className="text-indigo-400 animate-pulse [animation-delay:1s]" size={24} />
              </div>
            </div>

            {/* Greeting Card */}
            <div className="space-y-3">
              <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase bg-indigo-500/10 px-3.5 py-1.5 rounded-full border border-indigo-500/20">
                LokSetu Authenticated
              </span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight mt-3">
                Welcome back, {ssoUser}!
              </h2>
              <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
                {statusHint}
              </p>
            </div>

            {/* Verification Tag — only shows after real backend success */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border mx-auto text-xs transition-all duration-500 ${
              verified
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-900/60 border-slate-800 text-slate-500'
            }`}>
              {verified ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>Verified SSO Handshake Complete</span>
                </>
              ) : (
                <>
                  <Loader2 size={16} className="shrink-0 animate-spin" />
                  <span>Verifying SSO handshake...</span>
                </>
              )}
            </div>

            {/* Animated Progress Bar */}
            <div className="space-y-2 max-w-sm mx-auto pt-2">
              <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>{currentLabel}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-medium pt-2 border-t border-slate-900/60 max-w-xs mx-auto">
              <Loader2 className="animate-spin text-slate-500" size={14} />
              <span>{stage === 'redirecting' ? 'Launching dashboard...' : 'Redirecting to Bill Analyzer...'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
