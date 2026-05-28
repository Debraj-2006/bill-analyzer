// src/pages/Register.jsx — Simplified single-step registration

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Lock, Mail, AlertCircle, Loader2, Zap,
  CheckCircle2, Phone, ArrowRight, MapPin
} from 'lucide-react';
import api from '../api';

export default function Register() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  /* form fields */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [district, setDistrict] = useState('');

  const districtsOfWB = [
    'North 24 Parganas',
    'South 24 Parganas',
    'Howrah',
    'Hooghly',
    'Purba Medinipur',
    'Paschim Medinipur',
    'Purba Bardhaman',
    'Paschim Bardhaman',
    'Nadia',
    'Murshidabad',
    'Malda',
    'Darjeeling',
    'Jalpaiguri',
    'Cooch Behar',
    'Birbhum',
    'Bankura',
    'Purulia'
  ];




  /* ── Register account ────────────────────────────────── */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    
    setIsLoading(true);
    try {
      await api.post('/api/v1/auth/register', {
        name,
        email,
        password,
        mobile_number: mobile,
        district,
      });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    'Analyze unlimited WBSEDCL bills',
    'Save bill history and track trends',
    'Generate dispute letters instantly',
    'Appliance consumption calculator',
  ];

  return (
    <div className="flex justify-center items-start min-h-[80vh] px-4 py-10 gap-12">
      {/* Benefits panel */}
      <div className="hidden lg:flex flex-col justify-center max-w-sm mt-10">
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
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 mb-4">
            <Zap size={28} className="text-indigo-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-1">Create Account</h2>
          <p className="text-slate-400 text-sm">Join BillAnalyzer — it's free forever</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-5 flex items-center gap-2 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="space-y-5">
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
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
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
            <label htmlFor="reg-mobile" className="block text-sm font-medium text-slate-300 mb-2">
              Mobile Number
            </label>
            <div className="relative group">
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
          </div>

          <div>
            <label htmlFor="reg-district" className="block text-sm font-medium text-slate-300 mb-2">
              District
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <MapPin size={18} />
              </div>
              <select
                id="reg-district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="glass-input w-full !pl-11 pr-8 appearance-none text-slate-300 bg-slate-900/60"
                required
              >
                <option value="" disabled className="bg-slate-900 text-slate-400">Select your District</option>
                {districtsOfWB.map((d) => (
                  <option key={d} value={d} className="bg-slate-900 text-slate-200">
                    {d}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
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
            className="btn-primary w-full py-3 mt-4 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Create My Account <ArrowRight size={16} /></>}
          </button>
        </form>

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
