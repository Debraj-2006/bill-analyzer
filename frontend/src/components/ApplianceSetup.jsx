// src/components/ApplianceSetup.jsx — Home appliance profile setup modal

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Wind, Flame, UtensilsCrossed, Tv, Lightbulb, Wrench,
  Minus, Plus, CheckCircle2, Loader2, Zap, Save
} from 'lucide-react';
import api from '../api';

const CATEGORY_META = {
  cooling:       { label: 'Cooling & Fans',     icon: Wind,           color: 'cyan' },
  heating:       { label: 'Water & Heating',     icon: Flame,          color: 'orange' },
  kitchen:       { label: 'Kitchen',             icon: UtensilsCrossed, color: 'emerald' },
  entertainment: { label: 'Entertainment & Work', icon: Tv,            color: 'violet' },
  lighting:      { label: 'Lighting',            icon: Lightbulb,      color: 'yellow' },
  other:         { label: 'Other Appliances',    icon: Wrench,         color: 'slate' },
};

const COLOR_MAP = {
  cyan:    'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  orange:  'text-orange-400 bg-orange-500/10 border-orange-500/30',
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  violet:  'text-violet-400 bg-violet-500/10 border-violet-500/30',
  yellow:  'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  slate:   'text-slate-400 bg-slate-800/60 border-slate-600/40',
};

function NumberInput({ value, onChange, min = 0, max = 24, step = 0.5 }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, parseFloat((value - step).toFixed(1))))}
        className="w-6 h-6 rounded-md bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 transition-colors shrink-0"
      >
        <Minus size={10} />
      </button>
      <span className="w-10 text-center text-sm font-bold text-white">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, parseFloat((value + step).toFixed(1))))}
        className="w-6 h-6 rounded-md bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 transition-colors shrink-0"
      >
        <Plus size={10} />
      </button>
    </div>
  );
}

export default function ApplianceSetup({ onClose, onSaved }) {
  const [catalogue, setCatalogue] = useState({});
  const [loadingCatalogue, setLoadingCatalogue] = useState(true);
  const [activeTab, setActiveTab] = useState('cooling');
  const [selections, setSelections] = useState({});  // { appliance_id: { qty, hours, months } }
  const [familyMembers, setFamilyMembers] = useState(4);
  const [homeType, setHomeType] = useState('apartment');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load catalogue + existing profile
  useEffect(() => {
    const load = async () => {
      try {
        const [catRes, profileRes] = await Promise.all([
          api.get('/api/v1/insights/appliances/catalogue'),
          api.get('/api/v1/insights/appliances'),
        ]);
        setCatalogue(catRes.data);

        if (profileRes.data?.has_profile && profileRes.data.appliances?.length > 0) {
          const existing = {};
          for (const a of profileRes.data.appliances) {
            existing[a.appliance_id] = {
              qty: a.quantity,
              hours: a.hours_per_day,
              months: a.months_active,
            };
          }
          setSelections(existing);
          setFamilyMembers(profileRes.data.family_members || 4);
          setHomeType(profileRes.data.home_type || 'apartment');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCatalogue(false);
      }
    };
    load();
  }, []);

  const toggleAppliance = (id) => {
    setSelections(prev => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { qty: 1, hours: 2, months: 12 } };
    });
  };

  const updateField = (id, field, value) => {
    setSelections(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  // Compute live estimated monthly units
  const estimatedTotal = Object.entries(selections).reduce((sum, [id, sel]) => {
    const allAppliances = Object.values(catalogue).flat();
    const spec = allAppliances.find(a => a.id === id);
    if (!spec) return sum;
    const units = (spec.watts * sel.hours * 30 / 1000) * sel.qty * (sel.months / 12);
    return sum + units;
  }, 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const appliances = Object.entries(selections).map(([id, sel]) => ({
        appliance_id: id,
        quantity: sel.qty,
        hours_per_day: sel.hours,
        months_active: sel.months,
      }));
      await api.post('/api/v1/insights/appliances', { appliances, family_members: familyMembers, home_type: homeType });
      setSaved(true);
      setTimeout(() => {
        onSaved?.();
        onClose?.();
      }, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = Object.keys(selections).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="glass-panel-premium w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/20">
              <Zap size={18} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Your Home Profile</h2>
              <p className="text-slate-500 text-xs">Tell us your appliances for personalized tips</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {loadingCatalogue ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
          </div>
        ) : (
          <>
            {/* Household info strip */}
            <div className="flex items-center gap-6 px-6 py-4 bg-slate-800/30 border-b border-slate-700/40 shrink-0 flex-wrap gap-y-3">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-sm">Family members:</span>
                <NumberInput value={familyMembers} onChange={setFamilyMembers} min={1} max={20} step={1} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-sm">Home type:</span>
                {['apartment', 'house', 'villa'].map(t => (
                  <button
                    key={t}
                    onClick={() => setHomeType(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${homeType === t ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-500">Est. monthly consumption</p>
                <p className="text-xl font-bold text-indigo-400">{Math.round(estimatedTotal)} <span className="text-sm font-normal text-slate-400">units</span></p>
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex overflow-x-auto gap-1 px-6 py-3 border-b border-slate-700/40 shrink-0 scrollbar-none">
              {Object.entries(CATEGORY_META).map(([cat, meta]) => {
                const Icon = meta.icon;
                const color = COLOR_MAP[meta.color];
                const hasSelected = catalogue[cat]?.some(a => selections[a.id]);
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                      activeTab === cat
                        ? `${color}`
                        : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <Icon size={12} />
                    {meta.label}
                    {hasSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                  </button>
                );
              })}
            </div>

            {/* Appliance grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(catalogue[activeTab] || []).map((appliance) => {
                  const selected = !!selections[appliance.id];
                  const sel = selections[appliance.id];
                  const cat = CATEGORY_META[activeTab];
                  const color = COLOR_MAP[cat?.color || 'slate'];
                  const estimatedUnits = sel
                    ? Math.round((appliance.watts * sel.hours * 30 / 1000) * sel.qty * (sel.months / 12))
                    : 0;

                  return (
                    <motion.div
                      key={appliance.id}
                      layout
                      className={`rounded-2xl border p-4 transition-all ${
                        selected ? color : 'bg-slate-800/40 border-slate-700/50'
                      }`}
                    >
                      {/* Appliance header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${selected ? 'text-white' : 'text-slate-300'}`}>
                            {appliance.label}
                          </p>
                          <p className="text-xs text-slate-500">{appliance.watts}W</p>
                        </div>
                        <button
                          onClick={() => toggleAppliance(appliance.id)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            selected ? 'bg-indigo-500 border-indigo-400' : 'border-slate-600 hover:border-indigo-500'
                          }`}
                        >
                          {selected && <CheckCircle2 size={12} className="text-white" />}
                        </button>
                      </div>

                      {/* Controls — shown only when selected */}
                      <AnimatePresence>
                        {selected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-2 pt-3 border-t border-slate-700/40">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">Quantity</span>
                                <NumberInput value={sel.qty} onChange={v => updateField(appliance.id, 'qty', Math.max(1, Math.round(v)))} min={1} max={10} step={1} />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">Hours/day</span>
                                <NumberInput value={sel.hours} onChange={v => updateField(appliance.id, 'hours', v)} min={0} max={24} step={0.5} />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">Months/year</span>
                                <NumberInput value={sel.months} onChange={v => updateField(appliance.id, 'months', Math.max(1, Math.min(12, Math.round(v))))} min={1} max={12} step={1} />
                              </div>
                              <div className="mt-1 pt-2 border-t border-slate-700/40 flex justify-between">
                                <span className="text-xs text-slate-500">Est. monthly</span>
                                <span className="text-xs font-bold text-indigo-400">{estimatedUnits} units</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-4 p-6 border-t border-slate-700/50 shrink-0">
              <p className="text-slate-500 text-sm">
                <span className="text-white font-bold">{selectedCount}</span> appliance{selectedCount !== 1 ? 's' : ''} selected
              </p>
              <button
                onClick={handleSave}
                disabled={saving || saved || selectedCount === 0}
                className="btn-primary px-8 py-3 disabled:opacity-50"
              >
                {saved ? (
                  <><CheckCircle2 size={18} className="text-emerald-400" /> Saved!</>
                ) : saving ? (
                  <><Loader2 size={18} className="animate-spin" /> Saving…</>
                ) : (
                  <><Save size={18} /> Save Profile</>
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
