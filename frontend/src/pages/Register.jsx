// src/pages/Register.jsx — Multi-step registration with phone OTP verification

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Lock, Mail, AlertCircle, Loader2, Zap,
  CheckCircle2, Phone, ShieldCheck, ArrowRight, RefreshCw,
} from 'lucide-react';
import api from '../api';

/* ─── step constants ─────────────────────────────────────────── */
const STEP_PHONE  = 1;   // enter mobile number
const STEP_OTP    = 2;   // enter OTP
const STEP_DETAIL = 3;   // enter name / email / password

export default function Register() {
  /* shared */
  const [step,        setStep]        = useState(STEP_PHONE);
  const [error,       setError]       = useState('');
  const [isLoading,   setIsLoading]   = useState(false);
  const navigate = useNavigate();

  /* step 1 – phone */
  const [mobile, setMobile] = useState('');

  /* step 2 – OTP */
  const [otp,         setOtp]         = useState('');
  const [otpSent,     setOtpSent]     = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  /* step 3 – account details */
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  /* ── helpers ─────────────────────────────────────────────────── */
  const startResendTimer = () => {
    setResendTimer(60);
    const id = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) { clearInterval(id); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  /* ── Step 1: send OTP ────────────────────────────────────────── */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    const digits = mobile.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/send-otp', {
        mobile_number: digits,
        purpose: 'register',
      });
      setOtpSent(true);
      setStep(STEP_OTP);
      startResendTimer();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Step 2: verify OTP ──────────────────────────────────────── */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) { setError('Enter the 6-digit OTP.'); return; }
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/verify-otp', {
        mobile_number: mobile.replace(/\D/g, ''),
        otp,
        purpose: 'register',
      });
      setStep(STEP_DETAIL);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/send-otp', {
        mobile_number: mobile.replace(/\D/g, ''),
        purpose: 'register',
      });
      startResendTimer();
      setOtp('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Step 3: register account ────────────────────────────────── */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/register', {
        name,
        email,
        password,
        mobile_number: mobile.replace(/\D/g, ''),
      });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── OTP digit input helper: auto-advance ────────────────────── */
  const handleOtpChange = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
  };

  const benefits = [
    'Analyze unlimited WBSEDCL bills',
    'Save bill history and track trends',
    'Generate dispute letters instantly',
    'Appliance consumption calculator',
  ];

  /* ── Step indicators ─────────────────────────────────────────── */
  const steps = [
    { id: STEP_PHONE,  label: 'Phone'   },
    { id: STEP_OTP,    label: 'Verify'  },
    { id: STEP_DETAIL, label: 'Details' },
  ];

  return (
    <div className="flex justify-center items-start min-h-[80vh] px-4 py-10 gap-12">
      {/* Benefits panel */}
      <div className="hidden lg:flex flex-col justify-center max-w-sm">
        <h2 className="text-3xl font-bold text-white mb-4">
          Start Saving on Your Electricity Bills
        </h2>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Create a free account and gain access to all the tools you need to
          fight billing errors.
        </p>
        <ul className="space-y-4">
          {benefits.map((b) => (
            <li key={b} className="flex items-center gap-3 text-slate-300 text-sm">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Registration card */}
      <div className="glass-panel-premium w-full max-w-md p-8 relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 mb-4">
            <Zap size={28} className="text-indigo-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-1">Create Account</h2>
          <p className="text-slate-400 text-sm">Join BillAnalyzer — it's free forever</p>
        </div>

        {/* Step progress bar */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                step === s.id
                  ? 'text-indigo-400'
                  : step > s.id
                  ? 'text-emerald-400'
                  : 'text-slate-600'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                  step > s.id
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : step === s.id
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                    : 'bg-slate-800 border-slate-600 text-slate-500'
                }`}>
                  {step > s.id ? <CheckCircle2 size={12} /> : s.id}
                </div>
                {s.label}
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-8 h-px transition-colors ${step > s.id ? 'bg-emerald-500/50' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-5 flex items-center gap-2 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP 1: Phone number ─────────────────────────────── */}
        {step === STEP_PHONE && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label htmlFor="reg-mobile" className="block text-sm font-medium text-slate-300 mb-2">
                Mobile Number
              </label>
              <div className="relative group">
                {/* +91 prefix */}
                <div className="absolute inset-y-0 left-3 flex items-center gap-1 pointer-events-none">
                  <Phone size={16} className="text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <span className="text-slate-500 text-sm font-medium group-focus-within:text-indigo-400 transition-colors">+91</span>
                </div>
                <input
                  id="reg-mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="glass-input w-full !pl-16"
                  placeholder="98765 43210"
                  required
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                We'll send a 6-digit OTP to verify your number.
              </p>
            </div>

            <button
              type="submit"
              id="send-otp-btn"
              disabled={isLoading || mobile.length !== 10}
              className="btn-primary w-full py-3 mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading
                ? <Loader2 className="animate-spin" size={20} />
                : <>Send OTP <ArrowRight size={16} /></>}
            </button>
          </form>
        )}

        {/* ── STEP 2: OTP verification ─────────────────────────── */}
        {step === STEP_OTP && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="text-center py-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-3">
                <ShieldCheck size={26} className="text-indigo-400" />
              </div>
              <p className="text-slate-300 text-sm">
                OTP sent to <span className="text-white font-semibold">+91 {mobile}</span>
              </p>
              <button
                type="button"
                onClick={() => { setStep(STEP_PHONE); setError(''); setOtp(''); }}
                className="text-indigo-400 text-xs underline mt-1 hover:text-indigo-300"
              >
                Change number
              </button>
            </div>

            <div>
              <label htmlFor="reg-otp" className="block text-sm font-medium text-slate-300 mb-2">
                Enter 6-digit OTP
              </label>
              {/* Large OTP input */}
              <input
                id="reg-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => handleOtpChange(e.target.value)}
                className="glass-input w-full text-center text-2xl tracking-[0.5em] font-mono !py-4"
                placeholder="------"
                required
                autoFocus
              />
              <p className="mt-2 text-xs text-slate-500 text-center">
                {resendTimer > 0
                  ? <>Resend OTP in <span className="text-indigo-400 font-medium">{resendTimer}s</span></>
                  : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Resend OTP
                    </button>
                  )}
              </p>
            </div>

            <button
              type="submit"
              id="verify-otp-btn"
              disabled={isLoading || otp.length !== 6}
              className="btn-primary w-full py-3 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading
                ? <Loader2 className="animate-spin" size={20} />
                : <>Verify OTP <ShieldCheck size={16} /></>}
            </button>
          </form>
        )}

        {/* ── STEP 3: Account details ──────────────────────────── */}
        {step === STEP_DETAIL && (
          <form onSubmit={handleRegister} className="space-y-5">
            {/* Phone verified badge */}
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-emerald-400">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Phone <span className="font-semibold">+91 {mobile}</span> verified ✓</span>
            </div>

            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <User size={18} />
                </div>
                <input
                  id="reg-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input w-full !pl-11"
                  placeholder="Debraj Manna"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  id="reg-email"
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
              <label htmlFor="reg-password" className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full !pl-11"
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              id="register-submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 mt-2 disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Create My Account'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-slate-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}
