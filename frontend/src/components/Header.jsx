// src/components/Header.jsx — Top navigation bar with theme toggle

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Zap, LogOut, UploadCloud, Calculator, LayoutDashboard, Menu, X, Sun, Moon, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const { isAuthenticated, logout, userEmail } = useAuth();
  const { theme, toggle, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = isAuthenticated
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
        { to: '/upload',    label: 'Upload Bill', icon: <UploadCloud size={16} /> },
        { to: '/calculator',label: 'Calculator',  icon: <Calculator size={16} /> },
        { to: '/chat',      label: 'BillBot',     icon: <MessageCircle size={16} /> },
      ]
    : [];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 glass-panel px-6 py-4 flex items-center justify-between mb-8 rounded-none md:rounded-2xl md:mx-6 md:mt-4">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 shrink-0">
        <div className="p-2 bg-indigo-600 rounded-xl shadow-glow">
          <Zap size={22} className="text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-heading)' }}>
          Bill<span className="text-indigo-400">Analyzer</span>
        </span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1">
        {navLinks.map(({ to, label, icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive(to)
                ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/40'
                : 'hover:bg-slate-700/50'
            }`}
            style={{ color: isActive(to) ? undefined : 'var(--text-secondary)' }}
          >
            {icon}
            {label}
          </Link>
        ))}
      </nav>

      {/* Right side: Theme toggle + auth */}
      <div className="hidden md:flex items-center gap-3">
        {/* ── Theme Toggle Button ── */}
        <motion.button
          onClick={toggle}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="relative w-14 h-7 rounded-full flex items-center px-1 cursor-pointer transition-all duration-500 border"
          style={{
            background: isDark
              ? 'rgba(79,70,229,0.3)'
              : 'rgba(251,191,36,0.2)',
            borderColor: isDark
              ? 'rgba(99,102,241,0.5)'
              : 'rgba(251,191,36,0.5)',
          }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Track icons */}
          <Moon size={11} className="absolute left-1.5 text-indigo-400" style={{ opacity: isDark ? 1 : 0.3 }} />
          <Sun  size={11} className="absolute right-1.5 text-amber-400" style={{ opacity: isDark ? 0.3 : 1 }} />

          {/* Thumb */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 700, damping: 30 }}
            className="w-5 h-5 rounded-full shadow-md flex items-center justify-center z-10"
            style={{
              marginLeft: isDark ? 0 : 'auto',
              background: isDark
                ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                : 'linear-gradient(135deg, #f59e0b, #fbbf24)',
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={theme}
                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0,   opacity: 1, scale: 1 }}
                exit={{   rotate:  90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                {isDark
                  ? <Moon size={10} className="text-white" />
                  : <Sun  size={10} className="text-white" />
                }
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.button>

        {/* Auth */}
        {isAuthenticated ? (
          <>
            <Link
              to="/profile"
              title={userEmail}
              style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #6366f1, #38bdf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.8rem', color: '#fff',
                boxShadow: '0 0 14px rgba(99,102,241,0.45)',
                border: '2px solid rgba(255,255,255,0.12)',
                textDecoration: 'none', transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 24px rgba(99,102,241,0.7)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 14px rgba(99,102,241,0.45)'}
            >
              {userEmail ? userEmail[0].toUpperCase() : 'U'}
            </Link>
            <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4">
              <LogOut size={16} /> Log Out
            </button>
          </>
        ) : (
          <>
            <Link to="/login"    className="btn-secondary text-sm py-2 px-4">Log In</Link>
            <Link to="/register" className="btn-primary  text-sm py-2 px-4">Sign Up</Link>
          </>
        )}
      </div>

      {/* Mobile hamburger */}
      <div className="md:hidden flex items-center gap-2">
        {/* Mobile theme toggle */}
        <motion.button
          onClick={toggle}
          className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
          style={{
            background: isDark ? 'rgba(79,70,229,0.2)' : 'rgba(251,191,36,0.15)',
            borderColor: isDark ? 'rgba(99,102,241,0.4)' : 'rgba(251,191,36,0.4)',
          }}
          whileTap={{ scale: 0.9 }}
        >
          {isDark ? <Moon size={14} className="text-indigo-400" /> : <Sun size={14} className="text-amber-400" />}
        </motion.button>

        <button
          style={{ color: 'var(--text-secondary)' }}
          className="hover:text-white transition-colors"
          onClick={() => setMobileOpen(o => !o)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 glass-panel px-4 py-4 flex flex-col gap-2 md:hidden"
          >
            {navLinks.map(({ to, label, icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-4 py-3 rounded-lg hover:bg-slate-700/50 transition-all"
                style={{ color: 'var(--text-secondary)' }}
              >
                {icon} {label}
              </Link>
            ))}
            <div className="border-t pt-3 mt-1 flex flex-col gap-2" style={{ borderColor: 'var(--border-card)' }}>
              {isAuthenticated ? (
                <button onClick={handleLogout} className="btn-secondary text-sm">
                  <LogOut size={16} /> Log Out
                </button>
              ) : (
                <>
                  <Link to="/login"    onClick={() => setMobileOpen(false)} className="btn-secondary text-sm">Log In</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary  text-sm">Sign Up</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
