// src/pages/ApplianceCalculator.jsx — Premium redesign with Chart, Tips & Solar ROI
import { useState, useCallback, useEffect } from 'react';
import { Plus, Trash2, Calculator, Loader2, CheckCircle2, Zap, Save, Lightbulb, Sun, TrendingDown, Leaf, Sliders, Layers, Receipt, AlertTriangle, Clock, Play, History } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import api from '../api';
ChartJS.register(ArcElement, Tooltip, Legend);

const SLABS = [
  { upto: 25,       rate: 3.45, label: '0–25 kWh'   },
  { upto: 100,      rate: 4.80, label: '26–100 kWh' },
  { upto: 300,      rate: 5.75, label: '101–300 kWh'},
  { upto: Infinity, rate: 6.80, label: '301+ kWh'  },
];
const CUSTOMER_CHARGE = 90;
const FSC_PER_UNIT    = 0.40;
const STATE_DUTY_PCT  = 0.05;

function calcBill(units) {
  if (!units || units <= 0) return null;
  let energyCharge = 0, remaining = units;
  const slabs = [];
  let prev = 0;
  for (const slab of SLABS) {
    const limit = slab.upto - prev;
    const used  = Math.min(remaining, limit);
    if (used <= 0) break;
    const charge = used * slab.rate;
    slabs.push({ label: slab.label, units: used, rate: slab.rate, charge });
    energyCharge += charge;
    remaining    -= used;
    prev          = slab.upto;
    if (remaining <= 0) break;
  }
  const fsc       = units * FSC_PER_UNIT;
  const subtotal  = energyCharge + CUSTOMER_CHARGE + fsc;
  const stateDuty = subtotal * STATE_DUTY_PCT;
  const total     = subtotal + stateDuty;
  return { slabs, energyCharge, customerCharge: CUSTOMER_CHARGE, fsc, stateDuty, total };
}


const PRESETS = [
  { name: 'LED Bulb',       wattage: 9,   hoursPerDay: 6,  daysPerMonth: 30, color: '#fbbf24' },
  { name: 'Ceiling Fan',    wattage: 75,  hoursPerDay: 8,  daysPerMonth: 30, color: '#38bdf8' },
  { name: 'Refrigerator',   wattage: 150, hoursPerDay: 24, daysPerMonth: 30, color: '#34d399' },
  { name: 'Television',     wattage: 80,  hoursPerDay: 5,  daysPerMonth: 30, color: '#a78bfa' },
];

const DEFAULTS = PRESETS.map((p, i) => ({ ...p, id: i + 1 }));
let nextId = DEFAULTS.length + 1;

function getSlabColor(index) {
  const colors = ['#34d399', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa', '#ec4899'];
  return colors[index] || '#818cf8';
}

const SANDBOX_BOARDS = {
  WBSEDCL: {
    name: "WBSEDCL (State Electricity)",
    customerCharge: 40.0,
    dutyPct: 0.05,
    fscPerUnit: 0.0,
    slabs: [
      { limit: 102, rate: 5.30, label: "0–102 kWh Tier" },
      { limit: 180, rate: 5.97, label: "103–180 kWh Tier" },
      { limit: 300, rate: 6.97, label: "181–300 kWh Tier" },
      { limit: 600, rate: 7.31, label: "301–600 kWh Tier" },
      { limit: Infinity, rate: 8.18, label: "601+ kWh Tier" },
    ]
  },
  CESC: {
    name: "CESC (Kolkata Municipal)",
    customerCharge: 25.0, // Fixed 15 + Meter rent 10
    dutyPct: 0.05,
    fscPerUnit: 0.0,
    fppasPct: 0.082,
    slabs: [
      { limit: 60, rate: 6.57, label: "0–60 kWh Tier" },
      { limit: 100, rate: 7.24, label: "61–100 kWh Tier" },
      { limit: 150, rate: 7.45, label: "101–150 kWh Tier" },
      { limit: 300, rate: 7.62, label: "151–300 kWh Tier" },
      { limit: Infinity, rate: 9.21, label: "301+ kWh Tier" },
    ]
  },
  IPCL: {
    name: "IPCL (Asansol / Dishergarh)",
    customerCharge: 35.0,
    dutyPct: 0.05,
    fscPerUnit: 0.0,
    slabs: [
      { limit: 100, rate: 5.40, label: "0–100 kWh Tier" },
      { limit: 200, rate: 6.25, label: "101–200 kWh Tier" },
      { limit: 300, rate: 7.10, label: "201–300 kWh Tier" },
      { limit: Infinity, rate: 8.05, label: "301+ kWh Tier" },
    ]
  }
};

function calcSandboxBill(providerKey, units) {
  const board = SANDBOX_BOARDS[providerKey] || SANDBOX_BOARDS.WBSEDCL;
  if (!units || units <= 0) {
    return { slabs: [], energyCharge: 0, customerCharge: board.customerCharge, surcharges: 0, duty: 0, total: board.customerCharge };
  }

  let energyCharge = 0;
  let remaining = units;
  let prev = 0;
  const slabsBreakdown = [];

  for (const slab of board.slabs) {
    const limit = slab.limit - prev;
    const used = Math.min(remaining, limit);
    if (used <= 0) break;
    const charge = used * slab.rate;
    slabsBreakdown.push({
      label: slab.label,
      units: used,
      rate: slab.rate,
      charge: charge,
      maxLimit: slab.limit
    });
    energyCharge += charge;
    remaining -= used;
    prev = slab.limit;
    if (remaining <= 0) break;
  }

  const customerCharge = board.customerCharge;
  let surcharges = units * board.fscPerUnit;
  if (board.fppasPct) {
    surcharges += (energyCharge + customerCharge) * board.fppasPct;
  }
  
  let duty = energyCharge * board.dutyPct;
  if (providerKey === 'CESC' && units <= 25) {
    duty = 0.0;
  }

  const total = energyCharge + customerCharge + surcharges + duty;
  return {
    slabs: slabsBreakdown,
    energyCharge,
    customerCharge,
    surcharges,
    duty,
    total
  };
}

function getSandboxWarning(providerKey, units) {
  const board = SANDBOX_BOARDS[providerKey] || SANDBOX_BOARDS.WBSEDCL;
  if (!units || units <= 0) return null;

  if (providerKey === 'CESC' && units >= 20 && units <= 25) {
    return {
      type: 'lifeline',
      title: '⚡ Lifeline Tariff Cliff Alert',
      message: `You are at ${units} kWh, extremely close to the 25 kWh Lifeline threshold. Exceeding 25 kWh forfeits the flat ₹5.18 rate and 0% duty waiver, jumping to standard G tariff (₹6.57+ and 5% duty)!`,
      color: '#fbbf24'
    };
  }

  for (let i = 0; i < board.slabs.length - 1; i++) {
    const slab = board.slabs[i];
    const nextSlab = board.slabs[i + 1];
    if (units >= slab.limit - 15 && units <= slab.limit) {
      const excess = slab.limit - units + 1;
      return {
        type: 'slab_warning',
        title: '⚠️ Tier Threshold Boundary Alert',
        message: `You are currently consuming ${units} kWh, which is within ${slab.limit - units} units of the ${slab.limit} kWh tier boundary. Consuming ${excess} more unit${excess > 1 ? 's' : ''} will push your additional power into the higher ₹${nextSlab.rate}/unit bracket!`,
        color: '#f87171'
      };
    }
  }
  return null;
}

export default function ApplianceCalculator() {
  const [appliances, setAppliances] = useState(DEFAULTS);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [saveError,  setSaveError]  = useState('');
  const [hoveredId,  setHoveredId]  = useState(null);
  const [activeTab,  setActiveTab]  = useState('bill'); // 'bill' | 'solar' | 'sandbox'
  const [sandboxProvider, setSandboxProvider] = useState('WBSEDCL');
  const [sandboxUnits, setSandboxUnits] = useState(280);
  const [panelWatt,  setPanelWatt]  = useState(400);
  const [sunHours,   setSunHours]   = useState(5);
  const [costPerWatt,setCostPerWatt]= useState(50);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    if (activeTab === 'history') {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        setHistoryError('');
        try {
          const res = await api.get('/api/v1/calculator/');
          setHistory(res.data || []);
        } catch (err) {
          setHistoryError(err.response?.data?.detail || 'Failed to load history.');
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [activeTab]);

  const loadHistory = (item) => {
    const loaded = item.appliances.map((a, i) => ({
      id: nextId++,
      name: a.name,
      wattage: a.wattage,
      hoursPerDay: a.hours_per_day,
      daysPerMonth: a.days_per_month,
      color: PRESETS[i % PRESETS.length]?.color || '#818cf8'
    }));
    setAppliances(loaded);
    setActiveTab('bill');
  };

  const deleteHistory = async (id) => {
    if (!confirm('Delete this saved calculation?')) return;
    try {
      await api.delete(`/api/v1/calculator/${id}`);
      setHistory(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      alert('Failed to delete calculation.');
    }
  };

  const totalKWh = appliances.reduce((sum, a) => {
    return sum + ((parseFloat(a.wattage)||0) * (parseFloat(a.hoursPerDay)||0) * (parseFloat(a.daysPerMonth)||0)) / 1000;
  }, 0);

  const bill = calcBill(Math.round(totalKWh));

  // ── Smart Tips ──────────────────────────────────────────────
  const appliancesWithKwh = appliances.map(a => ({
    ...a,
    kwh: ((parseFloat(a.wattage)||0)*(parseFloat(a.hoursPerDay)||0)*(parseFloat(a.daysPerMonth)||0))/1000,
  })).filter(a => a.kwh > 0).sort((a,b) => b.kwh - a.kwh);

  const topHog = appliancesWithKwh[0];
  const smartTips = topHog ? (() => {
    const reducedKwh = ((parseFloat(topHog.wattage)||0) * 1 * (parseFloat(topHog.daysPerMonth)||30)) / 1000;
    const saving = reducedKwh * 5.75;
    const pct = totalKWh > 0 ? ((topHog.kwh / totalKWh) * 100).toFixed(0) : 0;
    return [
      { icon: <TrendingDown size={14}/>, color:'#f87171', text: `"${topHog.name || 'Top device'}" uses ${pct}% of total energy (${topHog.kwh.toFixed(1)} kWh). Reducing by 1 hr/day saves ≈ ₹${saving.toFixed(0)}/month.` },
      { icon: <Lightbulb size={14}/>, color:'#fbbf24', text: `Switch to inverter AC or 5-star rated appliances to cut energy use by 30–40%.` },
      { icon: <Leaf size={14}/>, color:'#34d399', text: `Your home generates ${(totalKWh * 0.82).toFixed(1)} kg of CO₂/month. Going solar can bring this to zero.` },
    ];
  })() : [];

  // ── Solar ROI ───────────────────────────────────────────────
  const kwhPerPanel    = (panelWatt / 1000) * sunHours * 30;
  const panelsNeeded   = totalKWh > 0 ? Math.ceil(totalKWh / kwhPerPanel) : 0;
  const systemCost     = panelsNeeded * panelWatt * costPerWatt;
  const monthlySavings = bill?.total || 0;
  const paybackYears   = monthlySavings > 0 ? (systemCost / (monthlySavings * 12)).toFixed(1) : '—';
  const co2PerYear     = (totalKWh * 0.82 * 12).toFixed(0);

  const addAppliance = () => {
    setAppliances(prev => [...prev, { id: nextId++, name: '', wattage: '', hoursPerDay: '', daysPerMonth: 30, color: '#818cf8' }]);
  };

  const removeAppliance = useCallback((id) => {
    setAppliances(prev => prev.filter(a => a.id !== id));
  }, []);

  const updateAppliance = useCallback((id, field, value) => {
    setAppliances(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaveError('');
    try {
      await api.post('/api/v1/calculator/', {
        appliances: appliances.map(({ name, wattage, hoursPerDay, daysPerMonth }) => ({
          name, wattage: parseFloat(wattage)||0,
          hours_per_day: parseFloat(hoursPerDay)||0,
          days_per_month: parseFloat(daysPerMonth)||30,
        })),
        total_estimated_units: totalKWh,
        estimated_monthly_cost: bill?.total || 0,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Failed to save calculation.');
    } finally {
      setSaving(false);
    }
  };

  // Slab gauge: which slab are we in?
  const slabIndex = totalKWh <= 25 ? 0 : totalKWh <= 100 ? 1 : totalKWh <= 300 ? 2 : 3;
  const slabMaxes = [25, 100, 300, 600];
  const gaugeMax  = slabMaxes[slabIndex];
  const gaugePct  = Math.min((totalKWh / gaugeMax) * 100, 100);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 1.25rem' }}>

      {/* ── Hero Header ── */}
      <div style={{ marginBottom: '2.5rem', position: 'relative' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '2rem', padding: '0.35rem 1rem', marginBottom: '1rem',
          fontSize: '0.75rem', fontWeight: 600, color: '#818cf8', letterSpacing: '0.05em',
        }}>
          <Zap size={12} /> WBSEDCL TARIFF ESTIMATOR
        </div>
        <h1 style={{
          fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, color: '#fff',
          lineHeight: 1.15, marginBottom: '0.6rem',
          background: 'linear-gradient(135deg, #e0e7ff 0%, #818cf8 40%, #38bdf8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Appliance Calculator
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: 520 }}>
          Add your home appliances and instantly estimate your monthly WBSEDCL electricity bill with slab-wise breakdown.
        </p>
      </div>

      {/* ── Tab Switcher ── */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.75rem', background:'rgba(15,23,42,0.6)', border:'1px solid rgba(71,85,105,0.35)', borderRadius:'1rem', padding:'0.3rem', width:'fit-content' }}>
        {[
          { id:'bill',  label:'⚡ Bill Calculator', },
          { id:'solar', label:'☀️ Solar ROI', },
          { id:'sandbox', label:'📊 Slab Sandbox', },
          { id:'history', label:'📚 History', },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding:'0.5rem 1.4rem', borderRadius:'0.75rem', border:'none', cursor:'pointer',
            fontSize:'0.85rem', fontWeight:600, transition:'all 0.25s',
            background: activeTab===t.id ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'transparent',
            color: activeTab===t.id ? '#fff' : '#64748b',
            boxShadow: activeTab===t.id ? '0 0 20px rgba(99,102,241,0.4)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'bill' && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: '1.5rem' }}
          className="calc-grid">

          {/* ── LEFT: Appliance Cards ── */}
          <div style={{
            background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(71,85,105,0.4)',
            borderRadius: '1.25rem', padding: '1.75rem',
            backdropFilter: 'blur(20px)', boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.15rem' }}>
                  Your Appliances
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.78rem' }}>{appliances.length} device{appliances.length !== 1 ? 's' : ''} added</p>
              </div>
              <button
                id="add-appliance-btn"
                onClick={addAppliance}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.5rem 1.1rem', borderRadius: '0.75rem', cursor: 'pointer',
                  fontSize: '0.82rem', fontWeight: 600, color: '#fff',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: 'none', boxShadow: '0 0 18px rgba(99,102,241,0.45)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 28px rgba(99,102,241,0.7)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 18px rgba(99,102,241,0.45)'}
              >
                <Plus size={15} /> Add Device
              </button>
            </div>

            {/* Column headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 0.8fr 0.6fr',
              gap: '0.75rem', padding: '0 0.5rem', marginBottom: '1rem',
              fontSize: '0.7rem', fontWeight: 600, color: '#475569', letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              <span style={{ paddingLeft: '1.4rem' }}>Appliance</span>
              <span style={{ textAlign: 'center' }}>Watts</span>
              <span style={{ textAlign: 'center' }}>Hrs/Day</span>
              <span style={{ textAlign: 'center' }}>Days/Mo</span>
              <span style={{ textAlign: 'center' }}>kWh</span>
              <span />
            </div>

            {/* Appliance rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {appliances.map((app) => {
                const kwh = ((parseFloat(app.wattage)||0)*(parseFloat(app.hoursPerDay)||0)*(parseFloat(app.daysPerMonth)||0)/1000);
                const accentColor = app.color || '#818cf8';
                const isHovered = hoveredId === app.id;
                return (
                  <div
                    key={app.id}
                    onMouseEnter={() => setHoveredId(app.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 0.8fr 0.6fr',
                      gap: '0.75rem', alignItems: 'center', padding: '0.6rem 0.2rem 0.6rem 0.5rem',
                      borderRadius: '0.75rem', transition: 'all 0.2s',
                      background: isHovered ? 'rgba(99,102,241,0.08)' : 'transparent',
                      border: `1px solid ${isHovered ? 'rgba(99,102,241,0.2)' : 'transparent'}`,
                    }}
                  >
                    {/* Name with color dot */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor, flexShrink: 0, boxShadow: `0 0 6px ${accentColor}` }} />
                      <input
                        className="glass-input"
                        style={{ flex: 1, fontSize: '0.82rem', padding: '0.45rem 0.6rem', borderRadius: '0.5rem' }}
                        placeholder="e.g. AC"
                        value={app.name}
                        onChange={e => updateAppliance(app.id, 'name', e.target.value)}
                      />
                    </div>

                    {[
                      { field: 'wattage',     placeholder: 'W',  min: 0 },
                      { field: 'hoursPerDay', placeholder: 'h',  min: 0, max: 24, step: 0.5 },
                      { field: 'daysPerMonth',placeholder: 'd',  min: 1, max: 31 },
                    ].map(({ field, placeholder, ...rest }) => (
                      <input
                        key={field}
                        type="number"
                        className="glass-input"
                        style={{ fontSize: '0.82rem', padding: '0.45rem 0.4rem', textAlign: 'center', borderRadius: '0.5rem' }}
                        placeholder={placeholder}
                        value={app[field]}
                        onChange={e => updateAppliance(app.id, field, e.target.value)}
                        {...rest}
                      />
                    ))}

                    {/* kWh badge */}
                    <div style={{
                      textAlign: 'center', fontSize: '0.82rem', fontWeight: 700,
                      color: accentColor, background: `${accentColor}18`,
                      borderRadius: '0.5rem', padding: '0.3rem 0.2rem',
                    }}>
                      {kwh.toFixed(1)}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => removeAppliance(app.id)}
                      onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'none'; }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                        padding: '0.3rem', borderRadius: '0.4rem', transition: 'all 0.2s',
                        justifySelf: 'end'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            {appliances.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#475569' }}>
                <Zap size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                <p style={{ fontSize: '0.9rem' }}>No appliances yet. Click "Add Device" to start.</p>
              </div>
            )}

            {/* ── Consumption Gauge ── */}
            <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(2,6,23,0.5)', borderRadius: '1rem', border: '1px solid rgba(71,85,105,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.6rem' }}>
                <div>
                  <p style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.2rem' }}>Total Monthly Consumption</p>
                  <p style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800 }}>
                    {totalKWh.toFixed(1)} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#818cf8' }}>kWh</span>
                  </p>
                </div>
                <div style={{
                  fontSize: '0.72rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '2rem',
                  background: `${getSlabColor(slabIndex)}20`, color: getSlabColor(slabIndex),
                  border: `1px solid ${getSlabColor(slabIndex)}40`,
                }}>
                  {SLABS[slabIndex].label} Slab
                </div>
              </div>
              {/* Progress track */}
              <div style={{ height: 8, background: 'rgba(71,85,105,0.3)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${gaugePct}%`,
                  background: `linear-gradient(90deg, ${getSlabColor(slabIndex)}, ${getSlabColor(Math.min(slabIndex+1,3))})`,
                  borderRadius: '99px', transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                  boxShadow: `0 0 12px ${getSlabColor(slabIndex)}80`,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.68rem', color: '#475569' }}>
                <span>0</span><span>25</span><span>100</span><span>300+</span>
              </div>
            </div>

            {/* Save button */}
            <div style={{ marginTop: '1rem' }}>
              {saveError && <p style={{ color: '#f87171', fontSize: '0.78rem', marginBottom: '0.5rem' }}>{saveError}</p>}
              <button
                id="save-calc-btn"
                onClick={handleSave}
                disabled={saving || totalKWh === 0}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '0.75rem',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  fontWeight: 600, fontSize: '0.9rem', cursor: totalKWh === 0 ? 'not-allowed' : 'pointer',
                  border: '1px solid rgba(99,102,241,0.4)',
                  background: saved
                    ? 'rgba(52,211,153,0.15)'
                    : 'rgba(99,102,241,0.15)',
                  color: saved ? '#34d399' : '#818cf8',
                  transition: 'all 0.3s', opacity: totalKWh === 0 ? 0.4 : 1,
                }}
              >
                {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                  : saved ? <><CheckCircle2 size={16} /> Saved!</>
                  : <><Save size={16} /> Save Calculation</>}
              </button>
            </div>
          </div>

          {/* ── RIGHT: Bill Summary ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Big bill card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(56,189,248,0.1) 100%)',
              border: '1px solid rgba(99,102,241,0.35)', borderRadius: '1.25rem',
              padding: '2rem 1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden',
              backdropFilter: 'blur(20px)',
            }}>
              {/* Glow blob */}
              <div style={{
                position: 'absolute', width: 180, height: 180, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%)',
                top: -60, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none',
              }} />
              <div style={{
                width: 52, height: 52, borderRadius: '1rem', margin: '0 auto 1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
              }}>
                <Calculator size={24} color="#818cf8" />
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '0.5rem' }}>Estimated Monthly Bill</p>
              <p style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1,
                background: 'linear-gradient(135deg, #fff 0%, #818cf8 60%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: '0.5rem',
              }}>
                ₹{bill ? bill.total.toFixed(0) : '—'}
              </p>
              <p style={{ color: '#64748b', fontSize: '0.75rem' }}>Based on {Math.round(totalKWh)} kWh</p>

              {/* Per-day cost */}
              {bill && (
                <div style={{
                  display: 'inline-block', marginTop: '1rem', padding: '0.35rem 1rem',
                  background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)',
                  borderRadius: '2rem', fontSize: '0.78rem', color: '#38bdf8',
                }}>
                  ≈ ₹{(bill.total / 30).toFixed(1)} / day
                </div>
              )}
            </div>

            {/* Charge Breakdown */}
            {bill && (
              <div style={{
                background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(71,85,105,0.4)',
                borderRadius: '1.25rem', padding: '1.5rem',
                backdropFilter: 'blur(20px)', boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
              }}>
                <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 3, height: 16, background: '#818cf8', borderRadius: '2px', display: 'inline-block' }} />
                  Charge Breakdown
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {bill.slabs.map((s, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: '#94a3b8' }}>{s.label} × ₹{s.rate}/unit</span>
                        <span style={{ color: getSlabColor(i), fontWeight: 600 }}>₹{s.charge.toFixed(2)}</span>
                      </div>
                      <div style={{ height: 3, background: 'rgba(71,85,105,0.25)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min((s.charge / bill.total) * 100 * 2, 100)}%`,
                          background: getSlabColor(i), borderRadius: '99px',
                          boxShadow: `0 0 6px ${getSlabColor(i)}60`,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid rgba(71,85,105,0.3)', marginTop: '1rem', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { label: 'Customer Charge', value: bill.customerCharge, color: '#94a3b8' },
                    { label: 'Fuel Surcharge', value: bill.fsc, color: '#94a3b8' },
                    { label: 'State Duty (5%)', value: bill.stateDuty, color: '#94a3b8' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: '#64748b' }}>{label}</span>
                      <span style={{ color }}>₹{value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div style={{
                  marginTop: '1rem', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                  background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ color: '#c7d2fe', fontWeight: 700, fontSize: '0.9rem' }}>Total</span>
                  <span style={{
                    fontWeight: 800, fontSize: '1.15rem',
                    background: 'linear-gradient(135deg, #818cf8, #38bdf8)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    ₹{bill.total.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* ── Dynamic Smart Tips ── */}
            {smartTips.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                <h3 style={{ color:'#fff', fontWeight:700, fontSize:'0.85rem', marginBottom:'0.25rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                  <span style={{ width:3, height:14, background:'#fbbf24', borderRadius:'2px', display:'inline-block' }} />
                  Smart Tips
                </h3>
                {smartTips.map((tip,i) => (
                  <div key={i} style={{ background:`${tip.color}0d`, border:`1px solid ${tip.color}30`, borderRadius:'0.75rem', padding:'0.7rem 0.9rem', display:'flex', gap:'0.6rem', alignItems:'flex-start' }}>
                    <span style={{ color:tip.color, flexShrink:0, marginTop:1 }}>{tip.icon}</span>
                    <p style={{ color:'#94a3b8', fontSize:'0.76rem', lineHeight:1.5 }}>{tip.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Appliance Donut Chart ── */}
            {appliancesWithKwh.length > 0 && (
              <div style={{ background:'rgba(15,23,42,0.75)', border:'1px solid rgba(71,85,105,0.4)', borderRadius:'1.25rem', padding:'1.25rem', backdropFilter:'blur(20px)' }}>
                <h3 style={{ color:'#fff', fontWeight:700, fontSize:'0.85rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                  <span style={{ width:3, height:14, background:'#38bdf8', borderRadius:'2px', display:'inline-block' }} />
                  Consumption Breakdown
                </h3>
                <div style={{ maxWidth:180, margin:'0 auto' }}>
                  <Doughnut
                    data={{
                      labels: appliancesWithKwh.map(a => a.name || 'Unnamed'),
                      datasets: [{
                        data: appliancesWithKwh.map(a => +a.kwh.toFixed(2)),
                        backgroundColor: appliancesWithKwh.map(a => a.color || '#818cf8'),
                        borderColor: 'rgba(15,23,42,0.8)',
                        borderWidth: 2,
                        hoverOffset: 6,
                      }],
                    }}
                    options={{
                      cutout:'68%', plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label: ctx => ` ${ctx.label}: ${ctx.parsed} kWh` } } },
                      animation:{ animateRotate:true, duration:700 },
                    }}
                  />
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', marginTop:'0.85rem', justifyContent:'center' }}>
                  {appliancesWithKwh.map(a => (
                    <span key={a.id} style={{ fontSize:'0.7rem', padding:'0.2rem 0.55rem', borderRadius:'99px', background:`${a.color||'#818cf8'}18`, color:a.color||'#818cf8', border:`1px solid ${a.color||'#818cf8'}35`, fontWeight:600 }}>
                      {a.name||'?'} {a.kwh.toFixed(1)} kWh
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ── Progressive Tariff Slab Sandbox Simulator (shown when sandbox tab active) ── */}
      {activeTab === 'sandbox' && (() => {
        const warning = getSandboxWarning(sandboxProvider, sandboxUnits);
        const simBill = calcSandboxBill(sandboxProvider, sandboxUnits);
        const board = SANDBOX_BOARDS[sandboxProvider] || SANDBOX_BOARDS.WBSEDCL;
        
        return (
          <div style={{ marginTop:'1.5rem', display:'flex', flexDirection:'column', gap:'1.5rem' }}>
            {/* Header & Board Selector */}
            <div style={{ background:'rgba(15,23,42,0.75)', border:'1px solid rgba(71,85,105,0.4)', borderRadius:'1.25rem', padding:'1.75rem', backdropFilter:'blur(20px)' }}>
              <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'1rem', marginBottom:'1.5rem' }}>
                <div>
                  <h2 style={{ color:'#fff', fontWeight:700, fontSize:'1.25rem', marginBottom:'0.3rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <Sliders size={20} color="#38bdf8" /> Progressive Tariff Slab Sandbox Simulator
                  </h2>
                  <p style={{ color:'#94a3b8', fontSize:'0.85rem', maxWidth:650 }}>
                    Adjust simulated monthly consumption to explore tiered pricing structures, fixed surcharges, and threshold cliffs across West Bengal utility boards.
                  </p>
                </div>
                
                {/* Board Selector */}
                <div style={{ display:'flex', gap:'0.4rem', background:'rgba(2,6,23,0.5)', padding:'0.35rem', borderRadius:'0.85rem', border:'1px solid rgba(71,85,105,0.3)' }}>
                  {Object.keys(SANDBOX_BOARDS).map(bKey => (
                    <button
                      key={bKey}
                      onClick={() => setSandboxProvider(bKey)}
                      style={{
                        padding:'0.5rem 1rem', borderRadius:'0.65rem', border:'none', cursor:'pointer',
                        fontSize:'0.8rem', fontWeight:600, transition:'all 0.2s',
                        background: sandboxProvider === bKey ? 'linear-gradient(135deg, #38bdf8, #0284c7)' : 'transparent',
                        color: sandboxProvider === bKey ? '#fff' : '#64748b',
                        boxShadow: sandboxProvider === bKey ? '0 0 15px rgba(56,189,248,0.4)' : 'none',
                      }}
                    >
                      {bKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider & Presets */}
              <div style={{ background:'rgba(2,6,23,0.5)', border:'1px solid rgba(71,85,105,0.3)', borderRadius:'1rem', padding:'1.5rem', marginBottom:'1.5rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'1rem' }}>
                  <div>
                    <span style={{ color:'#64748b', fontSize:'0.78rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>Simulated Monthly Consumption</span>
                    <div style={{ fontSize:'2.2rem', fontWeight:800, color:'#fff', lineHeight:1.1, marginTop:'0.2rem' }}>
                      {sandboxUnits} <span style={{ fontSize:'1rem', fontWeight:600, color:'#38bdf8' }}>kWh</span>
                    </div>
                  </div>
                  <div style={{ color:'#94a.3b8', fontSize:'0.8rem' }}>
                    Board: <strong style={{ color:'#38bdf8' }}>{board.name}</strong>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="5"
                  value={sandboxUnits}
                  onChange={e => setSandboxUnits(+e.target.value)}
                  style={{ width:'100%', accentColor:'#38bdf8', cursor:'pointer', height:8, background:'rgba(71,85,105,0.3)', borderRadius:4, marginBottom:'1.25rem' }}
                />

                {/* Quick Presets */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', alignItems:'center' }}>
                  <span style={{ fontSize:'0.75rem', color:'#64748b', fontWeight:600, marginRight:'0.5rem' }}>Quick Presets:</span>
                  {[
                    { label: '50 kWh (Lifeline)', value: 50 },
                    { label: '150 kWh (Eco)', value: 150 },
                    { label: '280 kWh (Mid)', value: 280 },
                    { label: '450 kWh (High)', value: 450 },
                    { label: '750 kWh (Heavy)', value: 750 },
                  ].map(p => (
                    <button
                      key={p.value}
                      onClick={() => setSandboxUnits(p.value)}
                      style={{
                        padding:'0.35rem 0.8rem', borderRadius:'0.5rem', border:'1px solid rgba(71,85,105,0.4)',
                        background: sandboxUnits === p.value ? 'rgba(56,189,248,0.15)' : 'rgba(15,23,42,0.5)',
                        color: sandboxUnits === p.value ? '#38bdf8' : '#94a3b8',
                        fontSize:'0.75rem', fontWeight:600, cursor:'pointer', transition:'all 0.2s',
                        borderColor: sandboxUnits === p.value ? '#38bdf8' : 'rgba(71,85,105,0.4)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#38bdf8'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = sandboxUnits === p.value ? '#38bdf8' : 'rgba(71,85,105,0.4)'}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Warning Alert */}
              {warning && (
                <div style={{
                  background: `${warning.color}15`, border: `1px solid ${warning.color}40`,
                  borderRadius: '1rem', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start',
                  boxShadow: `0 0 20px ${warning.color}10`,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: '0.75rem', background: `${warning.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: warning.color, flexShrink: 0 }}>
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h4 style={{ color: warning.color, fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{warning.title}</h4>
                    <p style={{ color: '#cbd5e1', fontSize: '0.82rem', lineHeight: 1.5 }}>{warning.message}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Slabs Stack & Receipt Grid */}
            <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.6fr) minmax(0,1fr)', gap:'1.5rem' }} className="calc-grid">
              
              {/* LEFT: Slabs Stack */}
              <div style={{ background:'rgba(15,23,42,0.75)', border:'1px solid rgba(71,85,105,0.4)', borderRadius:'1.25rem', padding:'1.75rem', backdropFilter:'blur(20px)' }}>
                <h3 style={{ color:'#fff', fontWeight:700, fontSize:'1.05rem', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  <Layers size={18} color="#a78bfa" /> Tariff Tiers Breakdown
                </h3>

                <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                  {board.slabs.map((slab, i) => {
                    const prevLimit = i === 0 ? 0 : board.slabs[i-1].limit;
                    const span = slab.limit === Infinity ? `${prevLimit+1}+ kWh` : `${prevLimit+1}–${slab.limit} kWh`;
                    
                    const item = simBill.slabs.find(s => s.label === slab.label);
                    const isActive = item && item.units > 0;
                    const isFull = item && item.units === (slab.limit - prevLimit);
                    const color = getSlabColor(i);

                    const capacity = slab.limit === Infinity ? 500 : (slab.limit - prevLimit);
                    const pct = item ? Math.min((item.units / capacity) * 100, 100) : 0;

                    return (
                      <div
                        key={slab.label}
                        style={{
                          background: isActive ? `${color}0c` : 'rgba(2,6,23,0.4)',
                          border: `1px solid ${isActive ? `${color}40` : 'rgba(71,85,105,0.25)'}`,
                          borderRadius: '1rem', padding: '1.25rem', transition: 'all 0.3s',
                          boxShadow: isActive ? `0 0 20px ${color}10` : 'none',
                        }}
                      >
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                          <div>
                            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                              <span style={{ width:10, height:10, borderRadius:'50%', background: isActive ? color : '#475569', boxShadow: isActive ? `0 0 8px ${color}` : 'none' }} />
                              <h4 style={{ color: isActive ? '#fff' : '#94a3b8', fontWeight:700, fontSize:'0.95rem' }}>{slab.label}</h4>
                            </div>
                            <p style={{ color:'#64748b', fontSize:'0.75rem', marginTop:'0.15rem', paddingLeft:'0.9rem' }}>{span} @ ₹{slab.rate.toFixed(2)}/unit</p>
                          </div>

                          <div style={{ textAlign:'right' }}>
                            <span style={{
                              fontSize:'0.7rem', fontWeight:600, padding:'0.25rem 0.65rem', borderRadius:'2rem',
                              background: isFull ? `${color}20` : isActive ? 'rgba(56,189,248,0.15)' : 'rgba(71,85,105,0.15)',
                              color: isFull ? color : isActive ? '#38bdf8' : '#64748b',
                              border: `1px solid ${isFull ? `${color}40` : isActive ? 'rgba(56,189,248,0.3)' : 'rgba(71,85,105,0.3)'}`,
                            }}>
                              {isFull ? 'Tier Maxed' : isActive ? 'Active Tier' : 'Inactive'}
                            </span>
                            {isActive && (
                              <div style={{ fontSize:'1.1rem', fontWeight:800, color:'#fff', marginTop:'0.3rem' }}>
                                ₹{item.charge.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ height:6, background:'rgba(71,85,105,0.25)', borderRadius:'99px', overflow:'hidden', marginBottom:'0.5rem' }}>
                          <div style={{
                            height:'100%', width:`${pct}%`, background: color, borderRadius:'99px',
                            transition:'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow:`0 0 10px ${color}`,
                          }} />
                        </div>

                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'#64748b' }}>
                          <span>{item ? `${item.units} units used` : '0 units'}</span>
                          <span>{slab.limit === Infinity ? 'No limit' : `${capacity} max`}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: Itemized Glass Receipt */}
              <div style={{ background:'rgba(15,23,42,0.75)', border:'1px solid rgba(71,85,105,0.4)', borderRadius:'1.25rem', padding:'1.75rem', backdropFilter:'blur(20px)', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div>
                  <h3 style={{ color:'#fff', fontWeight:700, fontSize:'1.05rem', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <Receipt size={18} color="#34d399" /> Simulated Itemized Receipt
                  </h3>

                  <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'0.85rem', borderBottom:'1px solid rgba(71,85,105,0.3)' }}>
                      <div>
                        <p style={{ color:'#cbd5e1', fontWeight:600, fontSize:'0.85rem' }}>Base Energy Charge</p>
                        <p style={{ color:'#64748b', fontSize:'0.75rem' }}>Sum of active tariff tiers</p>
                      </div>
                      <span style={{ color:'#fff', fontWeight:700, fontSize:'0.95rem' }}>₹{simBill.energyCharge.toFixed(2)}</span>
                    </div>

                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'0.85rem', borderBottom:'1px solid rgba(71,85,105,0.3)' }}>
                      <div>
                        <p style={{ color:'#cbd5e1', fontWeight:600, fontSize:'0.85rem' }}>Fixed Customer Charge / Rent</p>
                        <p style={{ color:'#64748b', fontSize:'0.75rem' }}>Monthly board maintenance fee</p>
                      </div>
                      <span style={{ color:'#94a3b8', fontWeight:600, fontSize:'0.9rem' }}>₹{simBill.customerCharge.toFixed(2)}</span>
                    </div>

                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'0.85rem', borderBottom:'1px solid rgba(71,85,105,0.3)' }}>
                      <div>
                        <p style={{ color:'#cbd5e1', fontWeight:600, fontSize:'0.85rem' }}>Fixed Surcharges (FPPAS / FSC)</p>
                        <p style={{ color:'#64748b', fontSize:'0.75rem' }}>{board.fppasPct ? `${(board.fppasPct*100).toFixed(1)}% fuel adjustment` : 'Standard fuel surcharge'}</p>
                      </div>
                      <span style={{ color:'#38bdf8', fontWeight:600, fontSize:'0.9rem' }}>₹{simBill.surcharges.toFixed(2)}</span>
                    </div>

                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'0.85rem', borderBottom:'1px solid rgba(71,85,105,0.3)' }}>
                      <div>
                        <p style={{ color:'#cbd5e1', fontWeight:600, fontSize:'0.85rem' }}>Electricity Duty (5%)</p>
                        <p style={{ color:'#64748b', fontSize:'0.75rem' }}>{sandboxProvider === 'CESC' && sandboxUnits <= 25 ? 'Waived under Lifeline' : 'Government tax'}</p>
                      </div>
                      <span style={{ color:'#a78bfa', fontWeight:600, fontSize:'0.9rem' }}>₹{simBill.duty.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Grand Total */}
                <div style={{
                  marginTop: '2rem', padding: '1.5rem', borderRadius: '1rem',
                  background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(16,185,129,0.05))',
                  border: '1px solid rgba(52,211,153,0.3)', textAlign: 'center',
                }}>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Estimated Grand Total</p>
                  <p style={{
                    fontSize: '2.5rem', fontWeight: 900, color: '#34d399', lineHeight: 1,
                    textShadow: '0 0 20px rgba(52,211,153,0.4)',
                  }}>
                    ₹{simBill.total.toFixed(2)}
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>Includes all applicable taxes and board surcharges</p>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── Solar ROI Panel (shown when solar tab active) ── */}
      {activeTab === 'solar' && (
        <div style={{ marginTop:'1.5rem', display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:'1.5rem' }} className="calc-grid">

          {/* Inputs */}
          <div style={{ background:'rgba(15,23,42,0.75)', border:'1px solid rgba(71,85,105,0.4)', borderRadius:'1.25rem', padding:'1.75rem', backdropFilter:'blur(20px)' }}>
            <h2 style={{ color:'#fff', fontWeight:700, fontSize:'1.05rem', marginBottom:'0.25rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <Sun size={18} color="#fbbf24" /> Solar ROI Calculator
            </h2>
            <p style={{ color:'#64748b', fontSize:'0.78rem', marginBottom:'1.5rem' }}>Based on {totalKWh.toFixed(1)} kWh/month consumption</p>

            {[
              { label:'Panel Wattage (W)', value:panelWatt, setter:setPanelWatt, min:100, max:700, step:50 },
              { label:'Daily Sun Hours', value:sunHours, setter:setSunHours, min:1, max:12, step:0.5 },
              { label:'Install Cost (₹/W)', value:costPerWatt, setter:setCostPerWatt, min:20, max:120, step:5 },
            ].map(({label,value,setter,min,max,step}) => (
              <div key={label} style={{ marginBottom:'1.1rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.35rem' }}>
                  <label style={{ color:'#94a3b8', fontSize:'0.8rem', fontWeight:500 }}>{label}</label>
                  <span style={{ color:'#818cf8', fontWeight:700, fontSize:'0.85rem' }}>{value}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={value} onChange={e=>setter(+e.target.value)}
                  style={{ width:'100%', accentColor:'#6366f1', cursor:'pointer' }} />
              </div>
            ))}
          </div>

          {/* Results */}
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {[
              { label:'Panels Needed', value:`${panelsNeeded}`, unit:'panels', color:'#818cf8', icon:<Sun size={18}/> },
              { label:'System Cost', value:`₹${(systemCost/100000).toFixed(2)}L`, unit:'estimated', color:'#fbbf24', icon:<Calculator size={18}/> },
              { label:'Monthly Savings', value:`₹${monthlySavings.toFixed(0)}`, unit:'per month', color:'#34d399', icon:<TrendingDown size={18}/> },
              { label:'Payback Period', value:`${paybackYears}`, unit:'years', color:'#38bdf8', icon:<Zap size={18}/> },
              { label:'CO₂ Offset/Year', value:`${co2PerYear}`, unit:'kg saved', color:'#a78bfa', icon:<Leaf size={18}/> },
            ].map(({label,value,unit,color,icon}) => (
              <div key={label} style={{ background:`${color}10`, border:`1px solid ${color}30`, borderRadius:'1rem', padding:'1rem 1.25rem', display:'flex', alignItems:'center', gap:'1rem' }}>
                <div style={{ width:40, height:40, borderRadius:'0.75rem', background:`${color}20`, display:'flex', alignItems:'center', justifyContent:'center', color, flexShrink:0 }}>{icon}</div>
                <div>
                  <p style={{ color:'#64748b', fontSize:'0.72rem', marginBottom:'0.15rem' }}>{label}</p>
                  <p style={{ color:'#fff', fontWeight:800, fontSize:'1.25rem', lineHeight:1 }}>{value} <span style={{ fontSize:'0.75rem', color, fontWeight:500 }}>{unit}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── History Panel ── */}
      {activeTab === 'history' && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2 style={{ color:'#fff', fontWeight:700, fontSize:'1.25rem', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <History size={20} color="#818cf8" /> Saved Calculations
          </h2>
          
          {loadingHistory ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'3rem', color:'#94a3b8' }}>
              <Loader2 className="animate-spin" size={32} />
            </div>
          ) : historyError ? (
            <div style={{ padding:'2rem', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'1rem', textAlign:'center' }}>
              <AlertTriangle size={32} color="#f87171" style={{ margin:'0 auto 1rem' }} />
              <p style={{ color:'#f87171', fontWeight:600 }}>{historyError}</p>
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding:'3rem', background:'rgba(15,23,42,0.6)', border:'1px solid rgba(71,85,105,0.3)', borderRadius:'1rem', textAlign:'center' }}>
              <Save size={48} color="#475569" style={{ margin:'0 auto 1rem' }} />
              <p style={{ color:'#94a3b8', fontSize:'1rem' }}>No saved calculations yet.</p>
              <p style={{ color:'#64748b', fontSize:'0.8rem', marginTop:'0.5rem' }}>Save a calculation from the Bill Calculator tab to see it here.</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'1.25rem' }}>
              {history.map((item) => (
                <div key={item._id} style={{ background:'rgba(15,23,42,0.75)', border:'1px solid rgba(71,85,105,0.4)', borderRadius:'1.25rem', padding:'1.5rem', backdropFilter:'blur(20px)', position: 'relative' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem' }}>
                    <div>
                      <p style={{ color:'#94a3b8', fontSize:'0.75rem', marginBottom:'0.25rem' }}>
                        {new Date(item.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </p>
                      <h3 style={{ color:'#fff', fontWeight:800, fontSize:'1.25rem' }}>
                        ₹{item.estimated_monthly_cost?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0'} <span style={{ fontSize:'0.8rem', fontWeight:500, color:'#64748b' }}>/mo</span>
                      </h3>
                    </div>
                    <button onClick={() => deleteHistory(item._id)} style={{ padding:'0.5rem', background:'rgba(239,68,68,0.1)', color:'#f87171', borderRadius:'0.5rem', border:'1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div style={{ display:'flex', gap:'1rem', marginBottom:'1.5rem' }}>
                    <div style={{ flex:1, background:'rgba(71,85,105,0.15)', padding:'0.75rem', borderRadius:'0.75rem' }}>
                      <p style={{ color:'#64748b', fontSize:'0.7rem', marginBottom:'0.15rem' }}>Total Units</p>
                      <p style={{ color:'#38bdf8', fontWeight:700 }}>{item.total_estimated_units?.toFixed(1) || 0} kWh</p>
                    </div>
                    <div style={{ flex:1, background:'rgba(71,85,105,0.15)', padding:'0.75rem', borderRadius:'0.75rem' }}>
                      <p style={{ color:'#64748b', fontSize:'0.7rem', marginBottom:'0.15rem' }}>Appliances</p>
                      <p style={{ color:'#a78bfa', fontWeight:700 }}>{item.appliances?.length || 0} items</p>
                    </div>
                  </div>
                  
                  <button onClick={() => loadHistory(item)} className="btn-primary hover-lift" style={{ width:'100%', padding:'0.75rem', display:'flex', justifyContent:'center', alignItems:'center', gap:'0.5rem', background:'rgba(99,102,241,0.1)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.3)' }}>
                    <Play size={16} /> Load Calculation
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .calc-grid { grid-template-columns: 1fr !important; }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
}
