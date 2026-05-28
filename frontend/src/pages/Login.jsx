// src/pages/Login.jsx — Login page (uses AuthContext + shared api.js)

import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Loader2, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to where they came from, or /dashboard
  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    const handleMessage = async (event) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://loksetu-5d56c.web.app',
        import.meta.env.VITE_LOKSETU_URL
      ].filter(Boolean);
      if (!allowedOrigins.includes(event.origin)) return;

      const { data } = event;
      if (data && data.type === 'LOKSETU_SSO_SESSION') {
        const { email, name, phone, timestamp, hash } = data;
        setIsLoading(true);
        setError('');
        try {
          const response = await api.post('/api/v1/auth/sso-login', {
            email,
            name,
            phone,
            timestamp,
            hash
          });

          if (response.data.access_token) {
            login(response.data.access_token);
            navigate(from, { replace: true });
          }
        } catch (err) {
          console.error('Silent SSO login failed:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [login, navigate, from]);

  const handleLokSetuLogin = () => {
    const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const loksetuUrl = isLocalHost
      ? 'http://localhost:5173'
      : (import.meta.env.VITE_LOKSETU_URL || 'https://loksetu-5d56c.web.app');
    window.location.href = `${loksetuUrl}/sso-redirect?return_url=` + encodeURIComponent(window.location.origin + '/sso');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // FastAPI OAuth2 expects form-encoded body
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const response = await api.post('/api/v1/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (response.data.access_token) {
        login(response.data.access_token);
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to log in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-4">
      <div className="glass-panel-premium w-full max-w-md p-8 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 mb-4">
            <Zap size={28} className="text-indigo-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-slate-400">Log in to manage your electricity bills</p>
        </div>

        {/* Continue with LokSetu Option */}
        <button
          onClick={handleLokSetuLogin}
          type="button"
          className="w-full mb-6 inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-extrabold rounded-2xl border text-white transition-all duration-300 active:scale-95 bg-blue-600/15 border-blue-500/40 hover:bg-blue-600/25 hover:border-blue-500/60 shadow-lg shadow-blue-500/10 cursor-pointer"
        >
          <Zap size={16} className="text-blue-400 fill-blue-400" />
          Continue with LokSetu Account
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-px bg-slate-700/50 flex-1" />
          <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">or log in manually</span>
          <div className="h-px bg-slate-700/50 flex-1" />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 flex items-center gap-2 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <Mail size={18} />
              </div>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input w-full !pl-11"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <Lock size={18} />
              </div>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input w-full !pl-11"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            id="login-submit"
            disabled={isLoading}
            className="btn-primary w-full py-3 mt-2 disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Log In to BillAnalyzer'}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-400 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
            Sign up free
          </Link>
        </p>
      </div>
      <iframe
        src={window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:5173/sso-silent'
          : `${import.meta.env.VITE_LOKSETU_URL || 'https://loksetu-5d56c.web.app'}/sso-silent`}
        style={{ display: 'none' }}
        title="LokSetu SSO Silent Check"
      />
    </div>
  );
}
