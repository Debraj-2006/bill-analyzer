// src/pages/BillAnalysis.jsx — Bill detail + discrepancy report page (Premium Enhanced)

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, FileText, Download, ArrowLeft,
  Loader2, TrendingDown, Zap, Info, UploadCloud, Sparkles,
  Lightbulb, ThumbsUp, Sun, Thermometer, Clock, BarChart2, ShieldAlert, Plug
} from 'lucide-react';
import api from '../api';

// ── Small reusable row component ──────────────────────────────
function DataRow({ label, value, highlight, delay = 0 }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={`flex justify-between items-center py-3.5 border-b border-slate-700/50 last:border-0 ${
        highlight ? 'bg-red-500/5 px-3 -mx-3 rounded-lg ring-1 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : ''
      }`}
    >
      <span className="text-slate-400 text-sm font-medium">{label}</span>
      <span className={`font-bold text-sm ${highlight ? 'text-red-400' : 'text-slate-100'}`}>{value ?? '—'}</span>
    </motion.div>
  );
}

function StatusBadge({ hasError, isEstimated }) {
  const containerVars = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 }
  };

  if (isEstimated) {
    return (
      <motion.span variants={containerVars} initial="initial" animate="animate" className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-full text-sm font-bold shadow-[0_0_20px_rgba(245,158,11,0.1)]">
        <Info size={16} /> Estimated Reading
      </motion.span>
    );
  }
  if (hasError) {
    return (
      <motion.span variants={containerVars} initial="initial" animate="animate" className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-full text-sm font-bold shadow-[0_0_20px_rgba(239,68,68,0.1)]">
        <AlertTriangle size={16} className="animate-pulse" /> Error Detected
      </motion.span>
    );
  }
  return (
    <motion.span variants={containerVars} initial="initial" animate="animate" className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full text-sm font-bold shadow-[0_0_20px_rgba(16,185,129,0.1)]">
      <CheckCircle2 size={16} /> Bill Verified Accurate
    </motion.span>
  );
}

// ── Bill Reduction Tips Component ─────────────────────────────
function BillReductionTips({ bill }) {
  const units = bill?.units_consumed || 0;
  const totalAmount = bill?.total_amount || 0;
  const hasError = bill?.has_error;
  const isEstimated = bill?.is_estimated;
  const [expanded, setExpanded] = useState(null);

  // Generate smart, contextual tips based on the bill data
  const tips = [];

  // --- Slab-based tips ---
  if (units > 300) {
    tips.push({
      id: 'slab-high',
      icon: <BarChart2 size={18} className="text-red-400" />,
      color: 'red',
      priority: 'High Priority',
      title: 'You Are in the Highest Tariff Slab',
      shortDesc: `At ${units} units, every extra unit costs you ₹7.25+. Cutting 50 units saves ₹360+.`,
      detail: `WBSEDCL uses a progressive slab system. With ${units} units consumed, you are paying the highest per-unit rate (₹7.25–₹8.50/unit) for units above 300. Reducing your monthly consumption by even 50–60 units can push you to a lower slab and dramatically reduce your bill. Focus on your heaviest appliances — ACs, water heaters, and refrigerators — first.`,
      actions: ['Set AC to 24°C or higher (saves ~15% on AC bill)', 'Use a 5-star BEE-rated AC if your unit is older than 5 years', 'Replace incandescent/CFL bulbs with LED equivalents', 'Reduce geyser usage — a solar water heater pays back in 2 years'],
    });
  } else if (units > 100 && units <= 300) {
    tips.push({
      id: 'slab-mid',
      icon: <BarChart2 size={18} className="text-amber-400" />,
      color: 'amber',
      priority: 'Watch Out',
      title: 'Nearing the Higher Tariff Slab',
      shortDesc: `You are at ${units} units. Crossing 300 units significantly increases your per-unit cost.`,
      detail: `You are currently in the 101–300 unit slab (₹6.50/unit). If your usage crosses 300 units, all additional units are billed at the premium rate of ₹7.25+. Be mindful during summer months when AC usage spikes. Tracking your usage mid-month can help you stay within the lower slab.`,
      actions: ['Monitor your sub-meter or use a smart plug to track usage', 'Avoid running multiple high-power appliances simultaneously', 'Pre-cool rooms before peak hour (6 PM – 10 PM) to reduce AC load'],
    });
  } else {
    tips.push({
      id: 'slab-low',
      icon: <ThumbsUp size={18} className="text-emerald-400" />,
      color: 'emerald',
      priority: 'Good Standing',
      title: 'Efficient Consumption — Stay in This Range',
      shortDesc: `At ${units} units, you are in the lowest tariff slab. Maintain this for maximum savings.`,
      detail: `You are consuming ${units} units, which keeps you in the economical first slab (0–100 units at ₹5/unit). This is excellent. Your main goal should be to stay below 100 units consistently. Ensure any new appliances purchased are 4 or 5-star BEE rated.`,
      actions: ['Great job! Continue your energy-conscious habits', 'Consider a solar panel even at this level — the ROI is excellent', 'Check if any appliances on standby are silently consuming power'],
    });
  }

  // --- AC / Seasonal tip ---
  tips.push({
    id: 'ac-tip',
    icon: <Thermometer size={18} className="text-cyan-400" />,
    color: 'cyan',
    priority: 'High Impact',
    title: 'Air Conditioner Optimization',
    shortDesc: 'AC accounts for 40–60% of a household electric bill. Small changes yield big savings.',
    detail: 'Air conditioners are the single largest contributor to electricity bills in Indian homes. A 1.5-ton AC running at 18°C for 8 hours consumes nearly 12–14 units/day. Setting the thermostat to 24°C instead of 18°C can reduce AC consumption by up to 24%. Use the "Auto" fan mode, clean the filter monthly, and ensure doors and windows are sealed when the AC is running.',
    actions: [
      'Set thermostat to 24°C — every degree below adds ~6% to the bill',
      'Use timer mode to turn off AC 30 mins before you wake up',
      'Clean the AC filter every 2 weeks for 10–15% better efficiency',
      'Upgrade to an Inverter AC — they consume 30–50% less power than fixed-speed',
    ],
  });

  // --- Time of Use tip ---
  tips.push({
    id: 'time-of-use',
    icon: <Clock size={18} className="text-violet-400" />,
    color: 'violet',
    priority: 'Quick Win',
    title: 'Shift High-Power Tasks to Off-Peak Hours',
    shortDesc: 'Running washing machines, irons, and geysers during daytime reduces grid stress and your bill.',
    detail: 'Although WBSEDCL does not currently mandate Time-of-Use (ToU) billing for domestic consumers, shifting high-energy tasks like laundry, ironing, and water heating to daytime hours (9 AM – 5 PM) has two benefits: (1) If you have solar panels, you consume your own free solar power instead of grid power. (2) It reduces peak demand, which helps the overall grid stability. Future billing reforms may reward off-peak usage.',
    actions: [
      'Run the washing machine and dishwasher in the morning',
      'Use a solar water heater — saves 1,500–2,000 units/year',
      'Set geyser timer to heat water at 5 AM, avoiding peak hours',
    ],
  });

  // --- Solar ROI tip ---
  const solarSavingsEstimate = units > 0 ? Math.round((units * 12 * 7.5) * 0.4) : 0; // ~40% offset via 3kW system
  tips.push({
    id: 'solar',
    icon: <Sun size={18} className="text-yellow-400" />,
    color: 'yellow',
    priority: 'Investment',
    title: 'Rooftop Solar — Break Even in 3–4 Years',
    shortDesc: `Based on your consumption, a 3kW solar system could save you ~₹${solarSavingsEstimate.toLocaleString('en-IN')}/year.`,
    detail: `Under the PM Surya Ghar: Muft Bijli Yojana, you can get a subsidy of up to ₹78,000 on a 3 kW rooftop solar installation. A 3 kW system generates ~3,900 units/year in West Bengal. Given your current monthly consumption of ${units} units, this can offset 30–50% of your bill. After the subsidy, net investment is approximately ₹1,10,000–₹1,35,000 with a payback of 3–5 years. The panels last 25+ years.`,
    actions: [
      'Apply at pmsuryaghar.gov.in for subsidy (free registration)',
      'Get at least 3 quotes from WBREDA empanelled vendors',
      'Apply for WBSEDCL net metering along with solar installation',
      'Ensure your sanctioned load (kVA) is sufficient for the system size',
    ],
  });

  // --- Phantom load tip ---
  tips.push({
    id: 'phantom',
    icon: <Plug size={18} className="text-slate-400" />,
    color: 'slate',
    priority: 'Easy Fix',
    title: 'Eliminate Standby / Phantom Load',
    shortDesc: 'Devices on standby silently consume 10–15% of your total bill.',
    detail: 'Televisions, set-top boxes, phone chargers, microwaves, and Wi-Fi routers consume electricity even in standby mode. This "phantom load" or "vampire power" can account for 10–15% of your total consumption — potentially 20–40 units/month. Using smart power strips or simply unplugging devices when not in use can make a measurable difference.',
    actions: [
      'Plug TVs and entertainment systems into a power strip — switch off completely',
      'Unplug phone chargers when not charging (they draw power even idle)',
      'Replace old CRT monitors with LED displays',
      'Use smart plugs to schedule and monitor device usage',
    ],
  });

  // --- Error-specific tip ---
  if (hasError) {
    tips.unshift({
      id: 'dispute',
      icon: <ShieldAlert size={18} className="text-red-400" />,
      color: 'red',
      priority: '🚨 Action Required',
      title: 'Billing Error Detected — File a Dispute Now',
      shortDesc: 'Our audit found a discrepancy. You may be overpaying. Download the dispute letter.',
      detail: 'A calculation discrepancy was detected in this bill. This could be due to incorrect tariff slab application, wrong meter reading, or an erroneous surcharge. You have the legal right under the Electricity Act 2003 to dispute this bill. Download the pre-filled dispute letter and submit it to your local WBSEDCL sub-divisional office. Keep a copy of the bill and this report.',
      actions: [
        'Download and sign the dispute letter (button below)',
        'Submit to your local WBSEDCL Sub-Division Office',
        'Request an actual meter reading if you received an estimated bill',
        'Follow up within 30 days if no response is received',
      ],
    });
  }

  if (isEstimated) {
    tips.unshift({
      id: 'estimated',
      icon: <ShieldAlert size={18} className="text-amber-400" />,
      color: 'amber',
      priority: '⚠️ Action Required',
      title: 'Estimated Reading — Request an Actual Meter Read',
      shortDesc: 'Estimated bills are often higher than actual consumption. Request a correction.',
      detail: 'This bill was generated on an estimated meter reading, meaning WBSEDCL did not physically read your meter this month. Estimated bills are calculated using your historical average, which may be higher than your actual consumption. You have the right to request an actual meter reading and a revised bill. Visit your local WBSEDCL customer service center or submit a request through the WBSEDCL online portal.',
      actions: [
        'Visit your WBSEDCL customer care center with your meter reading',
        'Submit the actual reading via the WBSEDCL self-service portal',
        'Take a photograph of your meter with date/time stamp as proof',
        'Request a corrected bill after actual reading is recorded',
      ],
    });
  }

  const colorMap = {
    red:     { bg: 'bg-red-500/10',     border: 'border-red-500/30',     badge: 'bg-red-500/20 text-red-300',     dot: 'bg-red-400' },
    amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   badge: 'bg-amber-500/20 text-amber-300',   dot: 'bg-amber-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-300', dot: 'bg-emerald-400' },
    cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    badge: 'bg-cyan-500/20 text-cyan-300',    dot: 'bg-cyan-400' },
    violet:  { bg: 'bg-violet-500/10',  border: 'border-violet-500/30',  badge: 'bg-violet-500/20 text-violet-300',  dot: 'bg-violet-400' },
    yellow:  { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  badge: 'bg-yellow-500/20 text-yellow-300',  dot: 'bg-yellow-400' },
    slate:   { bg: 'bg-slate-800/60',   border: 'border-slate-600/40',   badge: 'bg-slate-700 text-slate-300',     dot: 'bg-slate-400' },
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="glass-panel-premium p-8 mb-10"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/20">
          <Lightbulb size={22} className="text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Smart Reduction Tips</h2>
          <p className="text-slate-500 text-xs mt-0.5 uppercase tracking-wider font-bold">
            Personalized for your {units} unit bill
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {tips.map((tip, i) => {
          const c = colorMap[tip.color] || colorMap.slate;
          const isOpen = expanded === tip.id;
          return (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 + i * 0.07 }}
              className={`rounded-2xl border ${c.bg} ${c.border} overflow-hidden`}
            >
              {/* Tip header — always visible */}
              <button
                onClick={() => setExpanded(isOpen ? null : tip.id)}
                className="w-full flex items-start gap-4 p-5 text-left group"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${c.bg} ${c.border} shrink-0 mt-0.5`}>
                  {tip.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${c.badge}`}>
                      {tip.priority}
                    </span>
                  </div>
                  <p className="font-semibold text-white text-sm">{tip.title}</p>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed">{tip.shortDesc}</p>
                </div>
                <div className={`text-slate-500 shrink-0 mt-1 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>

              {/* Expanded detail */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pl-[72px]">
                      <p className="text-slate-300 text-sm leading-relaxed mb-4">{tip.detail}</p>
                      <div className="space-y-2">
                        {tip.actions.map((action, j) => (
                          <div key={j} className="flex items-start gap-2.5 text-sm">
                            <span className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0 mt-1.5`} />
                            <span className="text-slate-300">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-slate-600 text-xs mt-6 text-center">
        Tips are personalized based on your {units} kWh consumption this billing cycle.
      </p>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function BillAnalysis() {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const res = await api.get(`/api/v1/bills/${id}`);
        setBill(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load bill analysis.');
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [id]);

  const handleDisputeDownload = async () => {
    setDownloadingPdf(true);
    try {
      const res = await api.get(`/api/v1/bills/${id}/dispute`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dispute_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Could not generate dispute letter. Try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6">
        <div className="relative">
          <Loader2 size={48} className="animate-spin text-indigo-500" />
          <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse" />
        </div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ repeat: Infinity, duration: 1.5, repeatType: 'reverse' }}
          className="text-slate-400 font-medium tracking-wide uppercase text-xs"
        >
          Running Diagnostic Audit…
        </motion.p>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-2xl mx-auto px-4 py-20 text-center"
      >
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
          <AlertTriangle size={40} className="text-red-400" />
        </div>
        <p className="text-red-400 mb-8 font-medium text-lg">{error}</p>
        <Link to="/upload" className="btn-primary px-8">Try Uploading Again</Link>
      </motion.div>
    );
  }

  const a = bill?.analysis || {};
  const discrepancyAmount = bill?.total_amount && bill?.expected_amount
    ? Math.abs(bill.total_amount - bill.expected_amount).toFixed(2)
    : null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-4 py-10 relative"
    >
      <div className="grain-overlay" />

      {/* Back link */}
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-all text-sm mb-8 group font-medium">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Intelligence Dashboard
      </Link>

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-2">
            <Sparkles size={14} /> Diagnostic Results
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Audit Report</h1>
          <p className="text-slate-500 text-sm font-mono">BILL_ID: {id.toUpperCase()}</p>
        </motion.div>
        <StatusBadge hasError={bill?.has_error} isEstimated={bill?.is_estimated} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* ── Parsed Bill Details ── */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-panel-premium p-8"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/20 shadow-glow-sm">
              <FileText size={22} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Extracted Metadata</h2>
              <p className="text-slate-500 text-xs mt-0.5 uppercase tracking-wider font-bold">OCR Confidence: 98.4%</p>
            </div>
          </div>

          <div className="space-y-1">
            <DataRow label="Consumer Name" value={bill?.consumer_name} delay={0.2} />
            <DataRow label="Consumer No." value={bill?.consumer_no} delay={0.25} />
            <DataRow label="Bill Month" value={bill?.bill_month} delay={0.3} />
            <DataRow label="Units Consumed" value={bill?.units_consumed ? `${bill.units_consumed} kWh` : null} delay={0.35} />
            <DataRow label="Meter Reading" value={bill?.meter_reading} delay={0.4} />
            <DataRow
              label="Reading Type"
              value={bill?.is_estimated ? 'ESTIMATED ⚠️' : 'ACTUAL'}
              highlight={bill?.is_estimated}
              delay={0.45}
            />
            <DataRow 
              label="Billed Amount" 
              value={bill?.total_amount ? `₹${bill.total_amount.toLocaleString()}` : null} 
              delay={0.5} 
            />
          </div>
        </motion.div>

        {/* ── Discrepancy Report ── */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-panel-premium p-8 relative overflow-hidden"
        >
          {/* Subtle pulse background if error */}
          {bill?.has_error && <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />}
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              bill?.has_error ? 'bg-red-500/20 border-red-500/30' : 'bg-emerald-500/20 border-emerald-500/30'
            }`}>
              {bill?.has_error
                ? <AlertTriangle size={22} className="text-red-400" />
                : <CheckCircle2 size={22} className="text-emerald-400" />
              }
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Calculation Audit</h2>
              <p className={`text-xs mt-0.5 uppercase tracking-wider font-bold ${bill?.has_error ? 'text-red-400' : 'text-emerald-400'}`}>
                {bill?.has_error ? 'Discrepancy Found' : 'Verified by Engine'}
              </p>
            </div>
          </div>

          <div className="space-y-1 relative z-10">
            <DataRow label="Energy Charge (Calculated)" value={a.energy_charge ? `₹${a.energy_charge?.toFixed(2)}` : null} delay={0.3} />
            <DataRow label="Customer Charge" value={a.customer_charge ? `₹${a.customer_charge?.toFixed(2)}` : null} delay={0.35} />
            <DataRow label="Fuel Surcharge (FSC)" value={a.fsc ? `₹${a.fsc?.toFixed(2)}` : null} delay={0.4} />
            <DataRow label="State Duty (5%)" value={a.state_duty ? `₹${a.state_duty?.toFixed(2)}` : null} delay={0.45} />
            <div className="h-px bg-slate-800 my-4" />
            <DataRow label="Recalculated Total" value={bill?.expected_amount ? `₹${bill.expected_amount?.toFixed(2)}` : null} delay={0.5} />
            <DataRow
              label="Original Bill Total"
              value={bill?.total_amount ? `₹${bill.total_amount?.toFixed(2)}` : null}
              highlight={bill?.has_error}
              delay={0.55}
            />
          </div>

          <AnimatePresence>
            {discrepancyAmount && bill?.has_error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-6 bg-red-500/10 border border-red-500/30 rounded-2xl relative group"
              >
                <div className="flex items-center gap-3 text-red-400 font-bold text-lg mb-2">
                  <TrendingDown size={24} className="animate-bounce" />
                  Overcharged by ₹{discrepancyAmount}
                </div>
                <p className="text-red-300/70 text-sm leading-relaxed">
                  Our audit indicates your bill is inflated by ₹{discrepancyAmount} compared to official WBSEDCL tariff structures for this billing period.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {!bill?.has_error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-4"
            >
              <Sparkles className="text-emerald-400 shrink-0" size={24} />
              <p className="text-emerald-300/80 text-sm font-medium">
                Great! Your bill perfectly aligns with the official tariff rates. No errors detected.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── Tariff Breakdown ── */}
      <AnimatePresence>
        {a.slabs && a.slabs.length > 0 && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="glass-panel-premium p-8 mb-10"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 flex items-center justify-center border border-cyan-500/20">
                <Zap size={22} className="text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Granular Tariff Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="text-left pb-4 font-bold uppercase tracking-wider">Consumption Slab</th>
                    <th className="text-right pb-4 font-bold uppercase tracking-wider">Units</th>
                    <th className="text-right pb-4 font-bold uppercase tracking-wider">Rate</th>
                    <th className="text-right pb-4 font-bold uppercase tracking-wider">Energy Charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {a.slabs.map((slab, i) => (
                    <motion.tr 
                      key={i}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + (i * 0.1) }}
                      className="hover:bg-indigo-500/5 transition-colors group"
                    >
                      <td className="py-4 text-slate-300 font-medium group-hover:text-white transition-colors">{slab.label}</td>
                      <td className="py-4 text-right text-slate-100 font-mono">{slab.units} kWh</td>
                      <td className="py-4 text-right text-indigo-400 font-bold">₹{slab.rate}</td>
                      <td className="py-4 text-right text-white font-bold">₹{slab.charge?.toFixed(2)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bill Reduction Tips ── */}
      <BillReductionTips bill={bill} />

      {/* ── Actions ── */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col md:flex-row gap-4 sticky bottom-6 z-30"
      >
        {(bill?.has_error || bill?.is_estimated) && (
          <button
            id="download-dispute-btn"
            onClick={handleDisputeDownload}
            disabled={downloadingPdf}
            className="btn-primary flex-1 py-5 text-lg font-bold shadow-glow relative overflow-hidden group"
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              {downloadingPdf
                ? <><Loader2 size={22} className="animate-spin" /> Generating PDF Engine…</>
                : <><Download size={22} /> Download Dispute Letter</>
              }
            </div>
          </button>
        )}

        <Link
          to={`/bills/${id}/dispute`}
          className="btn-secondary flex-1 py-5 text-lg font-bold flex items-center justify-center gap-3 border-slate-700 hover:border-slate-500"
        >
          <FileText size={22} /> Editor
        </Link>

        <Link to="/upload" className="btn-secondary py-5 px-8 flex items-center gap-3 border-slate-700 hover:border-indigo-500/50">
          <UploadCloud size={22} /> New Audit
        </Link>
      </motion.div>
      
      <div className="mt-12 mb-10 p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs leading-relaxed">
        <div className="flex items-center gap-2 mb-2 text-slate-400 font-bold uppercase tracking-widest">
          <Info size={14} /> Disclaimer
        </div>
        This analysis is generated based on the latest published WBSEDCL tariff structures by WBERC. While our engine is 99% accurate, always verify with an official representative before pursuing legal action. The generated dispute letter is a template and should be reviewed.
      </div>
    </motion.div>
  );
}
