// src/pages/Dashboard.jsx — User dashboard with bill history, charts, and stats

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, UploadCloud, FileText, Download, Trash2,
  AlertTriangle, CheckCircle2, Loader2, TrendingDown, BarChart3, Zap
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '../api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ icon, label, value, color, sub }) {
  return (
    <div className={`glass-panel-premium p-6 flex items-start gap-4 border-l-4 ${color}`}>
      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
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
    <tr className="border-b border-slate-700/40 hover:bg-slate-800/40 transition-colors group">
      <td className="py-4 px-4">
        <span className="text-white font-medium">{bill.bill_month || 'Unknown'}</span>
        <br />
        <span className="text-xs text-slate-500 font-mono">{bill._id?.slice(-8)}</span>
      </td>
      <td className="py-4 px-4 text-slate-300 text-sm">
        {bill.units_consumed ? `${bill.units_consumed} kWh` : '—'}
      </td>
      <td className="py-4 px-4 text-slate-300 text-sm">
        {bill.total_amount ? `₹${bill.total_amount.toFixed(2)}` : '—'}
      </td>
      <td className="py-4 px-4 text-sm">
        {bill.expected_amount ? `₹${bill.expected_amount.toFixed(2)}` : '—'}
      </td>
      <td className="py-4 px-4">
        {bill.is_estimated ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs">
            Estimated
          </span>
        ) : bill.has_error ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded-full text-xs">
            <AlertTriangle size={11} /> Error
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs">
            <CheckCircle2 size={11} /> OK
          </span>
        )}
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <Link
            to={`/bills/${bill._id}`}
            className="text-xs px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 rounded-lg transition-all"
          >
            <FileText size={13} className="inline mr-1" /> View
          </Link>
          {(bill.has_error || bill.is_estimated) && (
            <Link
              to={`/bills/${bill._id}/dispute`}
              className="text-xs px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 text-amber-300 rounded-lg transition-all"
            >
              <Download size={13} className="inline mr-1" /> Dispute
            </Link>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function Dashboard() {
  const [bills,   setBills]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const res = await api.get('/api/v1/bills/');
        setBills(res.data || []);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load bills.');
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
        borderRadius: 6,
      },
      {
        label: 'Expected Amount (₹)',
        data: bills.map((b) => b.expected_amount || 0).reverse(),
        backgroundColor: 'rgba(34, 211, 238, 0.5)',
        borderColor: 'rgba(34, 211, 238, 1)',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const doughnutData = {
    labels: ['Correct Bills', 'Error / Estimated'],
    datasets: [{
      data: [totalBills - errorBills, errorBills],
      backgroundColor: ['rgba(34, 197, 94, 0.7)', 'rgba(239, 68, 68, 0.7)'],
      borderColor: ['rgba(34, 197, 94, 1)', 'rgba(239, 68, 68, 1)'],
      borderWidth: 2,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 12 } } },
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
      y: { ticks: { color: '#94a3b8', callback: (v) => `₹${v}` }, grid: { color: 'rgba(148,163,184,0.1)' } },
    },
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <LayoutDashboard size={28} className="text-indigo-400" /> Dashboard
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Your bill history and billing health overview</p>
        </div>
        <Link to="/upload" className="btn-primary py-3 px-6">
          <UploadCloud size={18} /> Upload New Bill
        </Link>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<FileText size={20} className="text-indigo-400" />}
          label="Total Bills Analyzed"
          value={totalBills}
          color="border-indigo-500"
          sub="Uploaded this account"
        />
        <StatCard
          icon={<AlertTriangle size={20} className="text-red-400" />}
          label="Bills with Errors"
          value={errorBills}
          color="border-red-500"
          sub={`${totalBills > 0 ? Math.round((errorBills / totalBills) * 100) : 0}% of all bills`}
        />
        <StatCard
          icon={<TrendingDown size={20} className="text-emerald-400" />}
          label="Total Savings Identified"
          value={`₹${totalSavings.toFixed(0)}`}
          color="border-emerald-500"
          sub="Based on overcharge detection"
        />
      </div>

      {/* ── Charts ── */}
      {bills.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="glass-panel-premium p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-indigo-400" /> Billed vs Expected Amounts
            </h2>
            <Bar data={barData} options={chartOptions} />
          </div>
          <div className="glass-panel-premium p-6 flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap size={20} className="text-cyan-400" /> Bill Status
            </h2>
            <div className="w-48 h-48">
              <Doughnut
                data={doughnutData}
                options={{ responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } } }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Bill History Table ── */}
      <div className="glass-panel-premium p-6">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <FileText size={20} className="text-indigo-400" /> Bill History
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
            <span>Loading bills…</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">
            <AlertTriangle size={32} className="mx-auto mb-3" />
            <p>{error}</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="text-center py-16">
            <UploadCloud size={40} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No bills uploaded yet</p>
            <p className="text-slate-500 text-sm mb-6">Upload your first WBSEDCL bill to get started</p>
            <Link to="/upload" className="btn-primary">
              <UploadCloud size={16} /> Upload Your First Bill
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700 text-left">
                  <th className="pb-3 px-4 font-medium">Bill Month</th>
                  <th className="pb-3 px-4 font-medium">Units</th>
                  <th className="pb-3 px-4 font-medium">Billed</th>
                  <th className="pb-3 px-4 font-medium">Expected</th>
                  <th className="pb-3 px-4 font-medium">Status</th>
                  <th className="pb-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <BillRow key={bill._id} bill={bill} onDelete={removeBill} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
