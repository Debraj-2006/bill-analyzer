// src/components/SplashScreen.jsx
// Multi-phase cinematic intro — ~6 seconds of animation

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Activity, Cpu } from 'lucide-react';

// ── Config ──────────────────────────────────────────────────────
const BOOT_LINES = [
  'WBSEDCL Intelligence System v3.1.0',
  'Loading cryptographic modules............... OK',
  'Initializing tariff database................ OK',
  'Connecting to WBERC rate engine............. OK',
  'Mounting AI analysis pipeline.............. OK',
  'Verifying slab coefficients................ OK',
  'System integrity check..................... PASSED',
  'All subsystems nominal. Launching UI...',
];

const NUM_PARTICLES = 40;
const PARTICLES = Array.from({ length: NUM_PARTICLES }, (_, i) => ({
  id: i,
  angle: (i / NUM_PARTICLES) * Math.PI * 2,
  radius: 250 + Math.random() * 180,
  size: Math.random() * 4 + 1,
  color: ['#6366f1', '#38bdf8', '#a78bfa', '#34d399', '#f59e0b'][i % 5],
}));

const GRID = 16;

// ── Boot Terminal ────────────────────────────────────────────────
function BootTerminal({ visible }) {
  const [lines, setLines] = useState([]);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    if (!visible) return;
    let idx = 0;
    const add = () => {
      if (idx >= BOOT_LINES.length) return;
      setLines(l => [...l, BOOT_LINES[idx]]);
      idx++;
      setTimeout(add, 180 + Math.random() * 120);
    };
    add();
    const blink = setInterval(() => setCursor(c => !c), 500);
    return () => clearInterval(blink);
  }, [visible]);

  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="font-mono text-xs text-left w-full max-w-lg px-2"
    >
      <div className="mb-2 text-indigo-400 font-bold text-[10px] tracking-widest uppercase">
        ◉ SYSTEM BOOT SEQUENCE
      </div>
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
          className="leading-6"
        >
          <span className="text-emerald-400 mr-2">&gt;</span>
          <span className={i === lines.length - 1 ? 'text-white' : 'text-slate-400'}>{line}</span>
          {i === lines.length - 1 && (
            <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 align-middle"
              style={{ opacity: cursor ? 1 : 0 }} />
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── Orbiting Particles ───────────────────────────────────────────
function OrbitParticles({ active, converging }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {PARTICLES.map(p => {
        const startX = Math.cos(p.angle) * p.radius;
        const startY = Math.sin(p.angle) * p.radius;
        return (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{ width: p.size, height: p.size, background: p.color }}
            initial={{ x: startX, y: startY, opacity: 0, scale: 0 }}
            animate={
              converging
                ? { x: 0, y: 0, opacity: [1, 0], scale: [1, 3, 0] }
                : active
                ? {
                    x: [startX, Math.cos(p.angle + 0.3) * p.radius, startX],
                    y: [startY, Math.sin(p.angle + 0.3) * p.radius, startY],
                    opacity: 1,
                    scale: 1,
                  }
                : { x: startX, y: startY, opacity: 0, scale: 0 }
            }
            transition={
              converging
                ? { duration: 0.8, ease: 'easeIn', delay: p.id * 0.01 }
                : {
                    duration: 3,
                    repeat: Infinity,
                    repeatType: 'loop',
                    delay: p.id * 0.05,
                    ease: 'easeInOut',
                  }
            }
          />
        );
      })}
    </div>
  );
}

// ── Ripple Rings ─────────────────────────────────────────────────
function ExplosionRings({ active }) {
  const colors = ['#6366f1', '#38bdf8', '#a78bfa', '#34d399'];
  if (!active) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {colors.map((color, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2"
          style={{ borderColor: color }}
          initial={{ width: 10, height: 10, opacity: 1 }}
          animate={{ width: 900, height: 900, opacity: 0 }}
          transition={{ duration: 1.2, delay: i * 0.15, ease: 'easeOut' }}
        />
      ))}
      {/* Flash */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 60%)' }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
      />
    </div>
  );
}

// ── Animated Grid ────────────────────────────────────────────────
function Grid({ visible }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: GRID }).map((_, i) => (
        <motion.div
          key={`v-${i}`}
          className="absolute top-0 bottom-0 w-px"
          style={{ left: `${(i / GRID) * 100}%`, background: 'rgba(99,102,241,0.07)' }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.8, delay: i * 0.03 }}
        />
      ))}
      {Array.from({ length: GRID }).map((_, i) => (
        <motion.div
          key={`h-${i}`}
          className="absolute left-0 right-0 h-px"
          style={{ top: `${(i / GRID) * 100}%`, background: 'rgba(99,102,241,0.07)' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: i * 0.03 }}
        />
      ))}
    </div>
  );
}

// ── Logo ─────────────────────────────────────────────────────────
function Logo({ visible, flash }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14, duration: 0.6 }}
          className="relative"
        >
          {/* Multi-layer glow */}
          <motion.div
            className="absolute inset-0 rounded-3xl blur-3xl"
            style={{ background: 'rgba(99,102,241,0.9)' }}
            animate={{ scale: flash ? [1, 2.5, 1] : [1, 1.3, 1], opacity: flash ? [1, 1, 0.7] : [0.7, 1, 0.7] }}
            transition={{ duration: flash ? 0.4 : 2, repeat: flash ? 0 : Infinity }}
          />
          <motion.div
            className="absolute inset-0 rounded-3xl blur-xl"
            style={{ background: 'rgba(56,189,248,0.6)' }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
          />
          <div
            className="relative w-28 h-28 rounded-3xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 40%, #38bdf8 100%)',
              boxShadow: '0 0 60px rgba(99,102,241,1), 0 0 120px rgba(56,189,248,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            <Zap size={56} className="text-white drop-shadow-lg" fill="white" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Brand Text ───────────────────────────────────────────────────
function BrandText({ visible }) {
  const title = 'BILL ANALYZER';
  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="text-center mt-8 select-none">
          {/* Main title */}
          <div className="flex items-center justify-center gap-[2px] mb-3">
            {title.split('').map((char, i) => (
              <motion.span
                key={i}
                className="font-black text-4xl md:text-5xl tracking-widest"
                style={
                  i >= 5
                    ? {
                        background: 'linear-gradient(135deg, #818cf8 0%, #38bdf8 60%, #34d399 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }
                    : { color: 'white' }
                }
                initial={{ opacity: 0, y: 30, rotateX: -90 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: i * 0.055, duration: 0.4, type: 'spring', stiffness: 300 }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </div>

          {/* Tagline with typing effect */}
          <motion.p
            className="text-slate-400 text-sm font-medium tracking-[0.35em] uppercase"
            initial={{ opacity: 0, letterSpacing: '0.8em' }}
            animate={{ opacity: 1, letterSpacing: '0.35em' }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            WBSEDCL Intelligence Platform
          </motion.p>

          {/* Feature badges */}
          <motion.div
            className="flex items-center justify-center gap-4 mt-6 text-[10px] font-bold uppercase tracking-widest"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.4 }}
          >
            {[
              { icon: Shield, label: 'Secure', color: 'text-emerald-400' },
              { icon: Activity, label: 'Real-time', color: 'text-indigo-400' },
              { icon: Cpu, label: 'AI Powered', color: 'text-cyan-400' },
            ].map(({ icon: Icon, label, color }, i) => (
              <motion.div
                key={label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-700/60 bg-slate-900/60 ${color}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.6 + i * 0.1, type: 'spring', stiffness: 400 }}
              >
                <Icon size={10} />
                <span>{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Loading Bar ──────────────────────────────────────────────────
function LoadingBar({ visible, progress, status }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          className="w-72 mt-10"
        >
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-2">
            <span className="flex items-center gap-1.5">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-indigo-500"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              {status}
            </span>
            <span className="text-indigo-400">{progress}%</span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #4f46e5, #6366f1, #38bdf8)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          {/* Scanline effect under bar */}
          <motion.div
            className="mt-1 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)' }}
            animate={{ opacity: [0, 1, 0], x: ['-100%', '100%'] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Corner Brackets ──────────────────────────────────────────────
function CornerBrackets({ visible }) {
  const positions = [
    { cls: 'top-6 left-6', borderTop: true, borderLeft: true },
    { cls: 'top-6 right-6', borderTop: true, borderRight: true },
    { cls: 'bottom-6 left-6', borderBottom: true, borderLeft: true },
    { cls: 'bottom-6 right-6', borderBottom: true, borderRight: true },
  ];
  if (!visible) return null;
  return (
    <>
      {positions.map(({ cls, borderTop, borderLeft, borderBottom, borderRight }, i) => (
        <motion.div
          key={i}
          className={`absolute w-10 h-10 ${cls}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 * i, duration: 0.3 }}
          style={{
            borderTop: borderTop ? '2px solid rgba(99,102,241,0.7)' : 'none',
            borderLeft: borderLeft ? '2px solid rgba(99,102,241,0.7)' : 'none',
            borderBottom: borderBottom ? '2px solid rgba(99,102,241,0.7)' : 'none',
            borderRight: borderRight ? '2px solid rgba(99,102,241,0.7)' : 'none',
          }}
        />
      ))}
      {/* HUD data text */}
      <motion.div
        className="absolute top-6 right-20 text-[9px] font-mono text-slate-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        SYS.VER 3.1.0
      </motion.div>
      <motion.div
        className="absolute bottom-6 left-20 text-[9px] font-mono text-slate-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        WBERC_CERT_2025
      </motion.div>
      <motion.div
        className="absolute bottom-6 right-20 text-[9px] font-mono text-slate-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        ENC: AES-256
      </motion.div>
    </>
  );
}

// ── Main Splash ──────────────────────────────────────────────────

export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('grid');
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStatus, setLoadStatus] = useState('INITIALIZING CORE SYSTEMS...');

  const goPhase = (p, delay) => setTimeout(() => setPhase(p), delay);

  useEffect(() => {
    const timers = [
      goPhase('boot',     800),
      goPhase('orbit',    2600),
      goPhase('converge', 4200),
      goPhase('explode',  4900),
      goPhase('logo',     5100),
      goPhase('brand',    5500),
      goPhase('loading',  5900),
      goPhase('exit',     7800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Loading bar steps
  useEffect(() => {
    if (phase !== 'loading') return;
    const steps = [
      [300,  25, 'LOADING TARIFF TABLES...'],
      [700,  52, 'VERIFYING SLAB DATA...'],
      [1100, 78, 'MOUNTING AI ENGINE...'],
      [1600, 95, 'FINALIZING...'],
      [1900, 100, 'SYSTEM READY ✓'],
    ];
    const timers = steps.map(([delay, pct, status]) =>
      setTimeout(() => { setLoadProgress(pct); setLoadStatus(status); }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // Finish after exit
  useEffect(() => {
    if (phase === 'exit') {
      const t = setTimeout(onFinish, 900);
      return () => clearTimeout(t);
    }
  }, [phase, onFinish]);

  const isGrid     = ['grid','boot','orbit','converge','explode','logo','brand','loading'].includes(phase);
  const isBoot     = ['boot','orbit'].includes(phase);
  const isOrbit    = ['orbit'].includes(phase);
  const isConverge = phase === 'converge';
  const isExplode  = phase === 'explode';
  const isLogo     = ['logo','brand','loading'].includes(phase);
  const isBrand    = ['brand','loading'].includes(phase);
  const isLoading  = phase === 'loading';
  const isExit     = phase === 'exit';

  return (
    <AnimatePresence>
      {!isExit ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: '#050a14' }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          {/* Grid */}
          <Grid visible={isGrid} />

          {/* Corner HUD */}
          <CornerBrackets visible={isGrid} />

          {/* Orbiting particles */}
          <OrbitParticles active={isOrbit} converging={isConverge} />

          {/* Explosion rings */}
          <ExplosionRings active={isExplode} />

          {/* Vertical center column */}
          <div className="relative z-10 flex flex-col items-center w-full max-w-xl px-6">

            {/* Boot terminal */}
            <AnimatePresence>
              {isBoot && !isOrbit && (
                <motion.div exit={{ opacity: 0, y: -20 }} className="w-full">
                  <BootTerminal visible={isBoot} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Orbit hint text */}
            <AnimatePresence>
              {isOrbit && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <motion.p
                    className="text-indigo-400 text-xs font-mono tracking-widest uppercase"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    Charging Intelligence Core...
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Logo */}
            <Logo visible={isLogo} flash={isExplode} />

            {/* Brand text */}
            <BrandText visible={isBrand} />

            {/* Loading bar */}
            <LoadingBar visible={isLoading} progress={loadProgress} status={loadStatus} />
          </div>

          {/* Subtle vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,10,20,0.9) 100%)'
            }}
          />

          {/* Top scanline sweep */}
          <motion.div
            className="absolute left-0 right-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)' }}
            animate={{ top: ['0%', '100%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
