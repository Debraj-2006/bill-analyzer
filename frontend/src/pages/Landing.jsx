import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, UploadCloud, CheckCircle2, FileText, TrendingDown, ArrowRight, Shield, AlertTriangle, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import heroImg from '../assets/hero.png';
import api from '../api';

// Animated stat bubble
function StatBubble({ value, label, delay }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.05, translateY: -5 }}
      className="flex flex-col items-center glass-panel px-6 py-4 transition-all"
    >
      <span className="text-3xl font-extrabold text-indigo-400">{value}</span>
      <span className="text-xs text-slate-400 mt-1 text-center">{label}</span>
    </motion.div>
  );
}

function FeatureCard({ icon, title, desc, accent, delay }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -10 }}
      className={`glass-panel-premium p-7 flex flex-col gap-4 group border-t-2 ${accent} transition-all duration-300`}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800 group-hover:scale-110 group-hover:bg-indigo-600/20 transition-all">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function StepCard({ step, title, desc, delay }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="flex gap-4 items-start"
    >
      <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-sm font-bold shadow-glow">
        {step}
      </div>
      <div>
        <h4 className="font-semibold text-white mb-1">{title}</h4>
        <p className="text-slate-400 text-sm">{desc}</p>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) return;

    const handleMessage = async (event) => {
      if (event.origin !== 'http://localhost:5173') return;

      const { data } = event;
      if (data && data.type === 'LOKSETU_SSO_SESSION') {
        const { email, name, phone, timestamp, hash } = data;
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
            navigate('/dashboard', { replace: true });
          }
        } catch (err) {
          console.error('Silent SSO login failed from landing:', err);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isAuthenticated, login, navigate]);

  return (
    <div className="max-w-6xl mx-auto px-4 relative">
      <div className="grain-overlay" />

      {/* ── Hero Section ── */}
      <section className="relative flex flex-col lg:flex-row items-center gap-12 py-20 overflow-hidden">
        {/* Decorative orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        
        <div className="flex-1 text-left relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 border border-indigo-500/40 rounded-full text-sm text-indigo-300 mb-6 font-medium"
          >
            <Zap size={14} className="text-indigo-400" />
            WBSEDCL Bill Intelligence Platform
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-5xl md:text-7xl font-extrabold mb-6 leading-[1.1]"
          >
            Stop{' '}
            <span className="gradient-text">Overpaying</span>
            <br />
            Electricity Bills
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-xl text-slate-300 max-w-xl mb-10 leading-relaxed"
          >
            Upload your WBSEDCL bill and get instant AI-powered analysis. Detect billing errors, 
            incorrect tariff slabs, and overcharges in seconds.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            {isAuthenticated ? (
              <Link to="/upload" className="btn-primary text-lg px-10 py-4">
                <UploadCloud size={20} /> Upload Your Bill
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary text-lg px-10 py-4">
                  Get Started Free <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn-secondary text-lg px-10 py-4">
                  Log In
                </Link>
              </>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex items-center gap-6 mt-12 text-sm text-slate-400"
          >
            <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-400"/> Accurate Slabs</div>
            <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-400"/> Instant Letters</div>
            <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-400"/> Secure</div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1, type: 'spring' }}
          className="flex-1 relative group"
        >
          {/* Main Hero Image */}
          <div className="relative z-10 glass-panel-premium p-4 rotate-3 group-hover:rotate-0 transition-transform duration-700">
            <img 
              src={heroImg} 
              alt="AI Bill Analysis" 
              className="rounded-2xl shadow-2xl w-full h-auto brightness-110"
            />
            {/* Animated Laser Overlay */}
            <div className="absolute inset-4 overflow-hidden rounded-2xl pointer-events-none">
              <div className="scan-laser" />
            </div>
          </div>
          
          {/* Floating elements behind image */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl" />
        </motion.div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-24">
        <StatBubble value="₹2,400+" label="Avg. Savings Found" delay={0.3} />
        <StatBubble value="40%" label="Error Detection Rate" delay={0.4} />
        <StatBubble value="< 30s" label="Analysis Time" delay={0.5} />
        <StatBubble value="100%" label="WBSEDCL Tariff Accurate" delay={0.6} />
      </section>

      {/* ── Features ── */}
      <section className="mb-24">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-white mb-4"
          >
            The Intelligence You Need
          </motion.h2>
          <p className="text-slate-400 max-w-lg mx-auto">Four precision tools to protect your wallet and ensure billing transparency</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            delay={0.1}
            accent="border-indigo-500"
            icon={<UploadCloud size={24} className="text-indigo-400" />}
            title="Instant Parsing"
            desc="Deep extraction of units, slabs, and meter readings from PDFs or photos."
          />
          <FeatureCard
            delay={0.2}
            accent="border-cyan-500"
            icon={<BarChart3 size={24} className="text-cyan-400" />}
            title="Slab Verification"
            desc="Automated recalculation using official WBERC rates to catch errors."
          />
          <FeatureCard
            delay={0.3}
            accent="border-emerald-500"
            icon={<FileText size={24} className="text-emerald-400" />}
            title="Legal Disputes"
            desc="Generate professional letters formatted for your local WBSEDCL office."
          />
          <FeatureCard
            delay={0.4}
            accent="border-violet-500"
            icon={<TrendingDown size={24} className="text-violet-400" />}
            title="Usage Predictor"
            desc="Estimate consumption based on your appliances and compare with reality."
          />
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="mb-24 flex flex-col lg:flex-row gap-16 items-center">
        <div className="flex-1">
          <h2 className="text-4xl font-bold text-white mb-8">How It Works</h2>
          <div className="flex flex-col gap-10">
            <StepCard delay={0.1} step="1" title="Secure Upload" desc="Upload your bill PDF or clear photo. We process everything locally in your browser context." />
            <StepCard delay={0.2} step="2" title="AI Verification" desc="Our engine breaks down every slab and tax to ensure they match the latest governmental rates." />
            <StepCard delay={0.3} step="3" title="Take Action" desc="Found an error? Download a pre-filled legal dispute letter in one click and stop overpaying." />
          </div>
        </div>

        {/* ── Live Audit Preview Card ── */}
        <div className="flex-1 w-full">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-panel-premium p-6 relative overflow-hidden"
          >
            {/* Animated top accent line */}
            <motion.div
              className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500"
              initial={{ width: 0 }}
              whileInView={{ width: '100%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-0.5">Live Audit Preview</p>
                <p className="text-white font-bold text-lg">Bill Report — Jun 2025</p>
              </div>
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Scanning
              </motion.span>
            </div>

            {/* Tariff rows */}
            <div className="space-y-2 mb-5">
              {[
                { label: 'First 100 units × ₹5.00', billed: '₹500', ok: true },
                { label: 'Next 200 units × ₹6.50', billed: '₹1,300', ok: true },
                { label: 'Above 300 units × ₹7.25', billed: '₹1,233', ok: false },
                { label: 'Fuel Surcharge (FSC)', billed: '₹189', ok: true },
                { label: 'State Duty 5%', billed: '₹161', ok: false },
              ].map((row, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.1, duration: 0.35 }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm ${
                    row.ok ? 'bg-slate-800/50' : 'bg-red-500/10 border border-red-500/20'
                  }`}
                >
                  <span className={row.ok ? 'text-slate-300' : 'text-red-300'}>{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold font-mono ${row.ok ? 'text-white' : 'text-red-400'}`}>{row.billed}</span>
                    {row.ok
                      ? <CheckCircle2 size={14} className="text-emerald-400" />
                      : <AlertTriangle size={14} className="text-red-400" />
                    }
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-700/60 pt-4 space-y-2 mb-5">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Expected Total</span>
                <span className="text-white font-bold font-mono">₹3,214</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Billed Amount</span>
                <span className="text-red-400 font-bold font-mono">₹3,572</span>
              </div>
            </div>

            {/* Savings badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8, type: 'spring', stiffness: 300 }}
              className="flex items-center justify-between bg-gradient-to-r from-indigo-600/20 to-cyan-600/20 border border-indigo-500/30 rounded-2xl px-5 py-4"
            >
              <div>
                <p className="text-xs text-slate-400 mb-0.5 font-medium">Overcharge Detected</p>
                <p className="text-2xl font-extrabold text-white">₹358 <span className="text-sm text-red-400">excess</span></p>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="btn-primary text-sm px-5 py-2.5 cursor-default select-none"
              >
                Get Letter →
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="mb-24 glass-panel-premium p-16 text-center bg-gradient-to-br from-indigo-900/40 to-cyan-900/20 border-indigo-500/30 overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
        <Shield size={48} className="text-indigo-400 mx-auto mb-6" />
        <h2 className="text-4xl font-bold text-white mb-4">Protect Your Wallet</h2>
        <p className="text-slate-400 mb-10 max-w-lg mx-auto text-lg">
          Join thousands of WBSEDCL consumers who have audited their bills for accuracy.
        </p>
        <Link to="/register" className="btn-primary px-12 py-5 text-xl group">
          Start Your Audit <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.section>
      
      <footer className="py-12 border-t border-slate-800 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} WBSEDCL Bill Intelligence Platform. Built for Consumers.
      </footer>
      <iframe
        src={window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:5173/sso-silent'
          : `http://${window.location.hostname}:5173/sso-silent`}
        style={{ display: 'none' }}
        title="LokSetu SSO Silent Check"
      />
    </div>
  );
}
