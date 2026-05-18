import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Zap, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Client-side SSO verification ──────────────────────────────────────────
// The Bill Analyzer backend may not be deployed. We verify the LokSetu SSO
// signature entirely on the frontend using the same shared secret + SHA-256
// algorithm. If the hash is valid and fresh (<5 min), we mint a lightweight
// session token (pseudo-JWT) directly in the browser and log the user in.
// ────────────────────────────────────────────────────────────────────────────

const SSO_SECRET = 'loksetu-shared-secret-key-2026';

async function sha256Hex(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64url(obj) {
  return btoa(JSON.stringify(obj))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function mintSessionToken(email, name, mobile) {
  // Creates a pseudo-JWT that AuthContext can decode (it reads payload.sub)
  // The signature part is intentionally a dummy — frontend never verifies it.
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64url({
    sub: email,
    name: name,
    mobile: mobile || '',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 h
  });
  const signature = base64url({ sso: 'loksetu' });
  return `${header}.${payload}.${signature}`;
}

export default function SSO() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [ssoUser, setSsoUser] = useState(null);

  const email = searchParams.get('email');
  const name = searchParams.get('name') || 'Citizen';
  const phone = searchParams.get('phone') || '';
  const timestamp = searchParams.get('timestamp');
  const hash = searchParams.get('hash');

  useEffect(() => {
    if (name) setSsoUser(name);
  }, [name]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + 5;
      });
    }, 70);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const performSSO = async () => {
      if (!email || !name || !timestamp || !hash) {
        setError('Missing SSO parameters in URL.');
        return;
      }

      try {
        // ── 1. Verify timestamp (must be within 5 minutes) ──────────────────
        const ts = new Date(timestamp);
        if (isNaN(ts.getTime())) {
          setError('Invalid SSO timestamp. Please try again from LokSetu.');
          return;
        }
        const ageSeconds = (Date.now() - ts.getTime()) / 1000;
        if (ageSeconds > 300) {
          setError('SSO token has expired (>5 min). Please click the link from LokSetu again.');
          return;
        }

        // ── 2. Verify SHA-256 HMAC signature ────────────────────────────────
        const msg = `${email}:${name}:${phone}:${timestamp}:${SSO_SECRET}`;
        const expectedHash = await sha256Hex(msg);
        if (expectedHash !== hash) {
          setError('Invalid SSO signature. This link may have been tampered with.');
          return;
        }

        // ── 3. Mint a frontend session token and log in ──────────────────────
        const sessionToken = mintSessionToken(email, name, phone);
        login(sessionToken);

        // ── 4. Redirect after the animation finishes ─────────────────────────
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1800);

      } catch (err) {
        console.error('SSO error:', err);
        setError('SSO authentication failed. Please login manually.');
      }
    };

    performSSO();
  }, [searchParams, login, navigate, email, name, phone, timestamp, hash]);

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
                We are securely synchronizing your profile details and bill databases.
              </p>
            </div>

            {/* Verification Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/60 rounded-xl border border-slate-800 mx-auto text-xs text-emerald-400">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0 animate-bounce" />
              <span>Verified SSO Handshake Complete</span>
            </div>

            {/* Animated Progress Bar */}
            <div className="space-y-2 max-w-sm mx-auto pt-2">
              <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>PREPARING DASHBOARD</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 rounded-full transition-all duration-70 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-medium pt-2 border-t border-slate-900/60 max-w-xs mx-auto">
              <Loader2 className="animate-spin text-slate-500" size={14} />
              <span>Redirecting to Bill Analyzer...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
