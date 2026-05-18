// src/pages/Dashboard.jsx — User dashboard with bill history, charts, and stats

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, UploadCloud, FileText, Download, Trash2,
  AlertTriangle, CheckCircle2, Loader2, TrendingDown, BarChart3, Zap, Plus,
  MapPin, Calculator
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '../api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// ── Animation Variants ────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 }
  }
};

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ icon, label, value, color, sub, glowClass }) {
  return (
    <motion.div 
      variants={itemVariants}
      className={`glass-panel-premium p-6 flex items-start gap-4 border-l-4 ${color} hover-lift ${glowClass}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center shrink-0 shadow-inner">
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">{label}</p>
        <p className="text-3xl font-extrabold text-white mt-1 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 font-medium">
          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
          {sub}
        </p>}
      </div>
    </motion.div>
  );
}

// ── Bill Row ──────────────────────────────────────────────────
function BillRow({ bill, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this bill? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/api/v1/bills/${bill._id}`);
      onDelete(bill._id);
    } catch {
      alert('Could not delete bill. Try again.');
      setDeleting(false);
    }
  };

  return (
    <motion.tr 
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -20 }}
      className="border-b border-slate-700/40 hover:bg-slate-800/40 transition-colors group"
    >
      <td className="py-5 px-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-base">{bill.bill_month || 'Unknown'}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider ${
              bill.provider === 'CESC'
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
            }`}>
              {bill.provider || 'WBSEDCL'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono tracking-tighter mt-0.5">ID: {bill._id?.slice(-12)}</span>
        </div>
      </td>
      <td className="py-5 px-6">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-amber-400" />
          <span className="text-slate-300 font-medium">{bill.units_consumed ? `${bill.units_consumed} kWh` : '—'}</span>
        </div>
      </td>
      <td className="py-5 px-6">
        <span className="text-white font-bold">
          {bill.total_amount ? `₹${bill.total_amount.toLocaleString('en-IN')}` : '—'}
        </span>
      </td>
      <td className="py-5 px-6">
        <span className="text-indigo-300 font-medium">
          {bill.expected_amount ? `₹${bill.expected_amount.toLocaleString('en-IN')}` : '—'}
        </span>
      </td>
      <td className="py-5 px-6">
        {bill.is_estimated ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[11px] font-bold uppercase tracking-wider">
            <AlertTriangle size={12} /> Estimated
          </span>
        ) : bill.has_error ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[11px] font-bold uppercase tracking-wider">
            <AlertTriangle size={12} /> Discrepancy
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[11px] font-bold uppercase tracking-wider">
            <CheckCircle2 size={12} /> Verified
          </span>
        )}
      </td>
      <td className="py-5 px-6 text-right">
        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            to={`/bills/${bill._id}`}
            className="p-2 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 rounded-lg transition-all"
            title="View Analysis"
          >
            <FileText size={16} />
          </Link>
          {(bill.has_error || bill.is_estimated) && (
            <Link
              to={`/bills/${bill._id}/dispute`}
              className="p-2 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 text-amber-300 rounded-lg transition-all"
              title="Generate Dispute"
            >
              <Download size={16} />
            </Link>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
            title="Delete Bill"
          >
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function Dashboard() {
  const [bills,   setBills]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [isOffline, setIsOffline] = useState(false);
  const [isColdStart, setIsColdStart] = useState(false);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const res = await api.get('/api/v1/bills/');
        setBills(res.data || []);
      } catch (err) {
        // Render free tier cold start = timeout / network error with no response
        const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
        const isNetworkError = !err.response;

        if (isTimeout) {
          setIsColdStart(true);
          // Auto-retry after 15 seconds
          setTimeout(() => window.location.reload(), 15000);
        } else if (isNetworkError || err.response?.status >= 500) {
          setIsOffline(true);
        } else {
          setError(err.response?.data?.detail || 'Failed to load bills.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, []);


  const removeBill = useCallback((id) => {
    setBills((prev) => prev.filter((b) => b._id !== id));
  }, []);

  // ── Derived stats ──
  const totalBills    = bills.length;
  const errorBills    = bills.filter((b) => b.has_error || b.is_estimated).length;
  const totalSavings  = bills.reduce((sum, b) => {
    if (b.has_error && b.total_amount && b.expected_amount) {
      return sum + Math.max(0, b.total_amount - b.expected_amount);
    }
    return sum;
  }, 0);

  // ── Chart data ──
  const chartLabels = bills.map((b) => b.bill_month || 'N/A').reverse();
  const barData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Billed Amount (₹)',
        data: bills.map((b) => b.total_amount || 0).reverse(),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
        borderRadius: 8,
        barThickness: 24,
      },
      {
        label: 'Expected Amount (₹)',
        data: bills.map((b) => b.expected_amount || 0).reverse(),
        backgroundColor: 'rgba(34, 211, 238, 0.5)',
        borderColor: 'rgba(34, 211, 238, 1)',
        borderWidth: 1,
        borderRadius: 8,
        barThickness: 24,
      },
    ],
  };

  const doughnutData = {
    labels: ['Accurate', 'Issues'],
    datasets: [{
      data: [totalBills - errorBills, errorBills],
      backgroundColor: ['rgba(34, 197, 94, 0.6)', 'rgba(239, 68, 68, 0.6)'],
      borderColor: ['rgba(34, 197, 94, 1)', 'rgba(239, 68, 68, 1)'],
      borderWidth: 2,
      hoverOffset: 15,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11, weight: '600' }, padding: 20 } },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 12,
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
      }
    },
    scales: {
      x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
      y: { ticks: { color: '#64748b', font: { size: 10 }, callback: (v) => `₹${v}` }, grid: { color: 'rgba(148,163,184,0.05)' } },
    },
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-7xl mx-auto px-6 py-12"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
              <LayoutDashboard size={28} />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              Dashboard
            </h1>
          </div>
          <p className="text-slate-400 text-lg max-w-lg">
            Monitor your electricity consumption patterns and detect billing discrepancies automatically.
          </p>
        </div>
        <Link to="/upload" className="btn-primary py-4 px-8 text-base group overflow-hidden relative">
          <span className="relative z-10 flex items-center gap-2">
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" /> 
            Upload New Bill
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </motion.div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard
          icon={<FileText size={24} className="text-indigo-400" />}
          label="Bills Analyzed"
          value={totalBills}
          color="border-indigo-500"
          glowClass="glow-primary-drop"
          sub="Total history"
        />
        <StatCard
          icon={<AlertTriangle size={24} className="text-red-400" />}
          label="Billing Issues"
          value={errorBills}
          color="border-red-500"
          glowClass="glow-red-drop"
          sub={`${totalBills > 0 ? Math.round((errorBills / totalBills) * 100) : 0}% requiring attention`}
        />
        <StatCard
          icon={<TrendingDown size={24} className="text-emerald-400" />}
          label="Potential Savings"
          value={`₹${totalSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          color="border-emerald-500"
          glowClass="glow-emerald-drop"
          sub="Verified overcharges"
        />
      </div>

      {/* ── Quick Utilities ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="glass-panel-premium p-6 flex items-center justify-between hover-lift glow-primary-drop">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Nearby Office Locator</h3>
              <p className="text-slate-400 text-sm mt-1">Locate your nearest physical WBSEDCL or CESC customer care office on our interactive map.</p>
            </div>
          </div>
          <Link to="/locator" className="btn-primary py-2.5 px-5 text-sm shrink-0">
            Open Map
          </Link>
        </div>

        <div className="glass-panel-premium p-6 flex items-center justify-between hover-lift glow-emerald-drop">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Calculator size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Appliance Calculator</h3>
              <p className="text-slate-400 text-sm mt-1">Estimate and optimize your monthly electricity consumption of domestic appliances.</p>
            </div>
          </div>
          <Link to="/calculator" className="btn-primary py-2.5 px-5 text-sm shrink-0 bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]">
            Calculate
          </Link>
        </div>
      </motion.div>

      {/* ── Charts ── */}
      {bills.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
          <motion.div variants={itemVariants} className="glass-panel-premium p-8 lg:col-span-3">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <BarChart3 size={24} className="text-indigo-400" /> Consumption Trends
              </h2>
              <div className="flex gap-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" /> Billed
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400" /> Expected
                </div>
              </div>
            </div>
            <div className="h-80">
              <Bar data={barData} options={chartOptions} />
            </div>
          </motion.div>
          <motion.div variants={itemVariants} className="glass-panel-premium p-8 flex flex-col items-center justify-center">
            <h2 className="text-lg font-bold text-white mb-8 flex items-center gap-3">
              <Zap size={22} className="text-cyan-400" /> Health
            </h2>
            <div className="w-full aspect-square max-w-[200px]">
              <Doughnut
                data={doughnutData}
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { display: false } 
                  },
                  cutout: '75%'
                }}
              />
            </div>
            <div className="mt-8 text-center">
              <p className="text-3xl font-black text-white">{totalBills > 0 ? Math.round(((totalBills - errorBills) / totalBills) * 100) : 100}%</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Accuracy Score</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Bill History Table ── */}
      <motion.div variants={itemVariants} className="glass-panel-premium overflow-hidden">
        <div className="p-8 border-b border-slate-700/30 bg-slate-800/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <FileText size={24} className="text-indigo-400" /> Analysis History
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
            <Loader2 size={40} className="animate-spin text-indigo-500" />
            <span className="font-medium tracking-wide">Syncing with server…</span>
          </div>
        ) : isColdStart ? (
          <div className="text-center py-16 px-6">
            <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Loader2 size={36} className="text-indigo-400 animate-spin" />
            </div>
            <h3 className="text-white font-bold text-xl mb-3">Server is Waking Up…</h3>
            <p className="text-slate-400 max-w-sm mx-auto mb-2 text-sm leading-relaxed">
              The Bill Analyzer server is starting up (Render free tier has a ~30 second cold start).
              The page will automatically reload in a few seconds.
            </p>
            <p className="text-slate-500 text-xs max-w-xs mx-auto mt-4 animate-pulse">
              Auto-refreshing in 15 seconds…
            </p>
          </div>
        ) : isOffline ? (
          <div className="text-center py-16 px-6">
            <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Zap size={36} className="text-amber-400" />
            </div>
            <h3 className="text-white font-bold text-xl mb-3">Bill Analysis Server is Offline</h3>
            <p className="text-slate-400 max-w-sm mx-auto mb-2 text-sm leading-relaxed">
              The bill upload &amp; analysis backend is not yet deployed to the cloud.
              Features like uploading bills, AI chat, and bill history need the server running.
            </p>
            <p className="text-slate-500 text-xs max-w-xs mx-auto mb-8">
              The <span className="text-indigo-400 font-semibold">Office Locator</span> and <span className="text-emerald-400 font-semibold">Appliance Calculator</span> below work completely offline.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/locator" className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2">
                <MapPin size={16} /> Open Office Locator
              </Link>
              <Link to="/calculator" className="py-2.5 px-6 text-sm flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Calculator size={16} /> Appliance Calculator
              </Link>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Failed to load data</h3>
            <p className="text-slate-400 max-w-xs mx-auto mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-secondary">
              Try Again
            </button>
          </div>
        ) : bills.length === 0 ? (
          <div className="text-center py-24 px-6">
            <div className="w-24 h-24 bg-slate-800/40 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700/50">
              <UploadCloud size={48} className="text-slate-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No bills found</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto">Upload your first electricity bill (WBSEDCL or CESC) to see advanced analytics and savings detection.</p>
            <Link to="/upload" className="btn-primary py-4 px-10">
              <UploadCloud size={20} /> Get Started
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700/50 text-left bg-slate-800/20">
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px]">Month Period</th>
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px]">Consumption</th>
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px]">Billed Amount</th>
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px]">Fair Estimate</th>
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px]">Status</th>
                  <th className="py-4 px-6 font-bold uppercase tracking-widest text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                <AnimatePresence mode="popLayout">
                  {bills.map((bill) => (
                    <BillRow key={bill._id} bill={bill} onDelete={removeBill} />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
