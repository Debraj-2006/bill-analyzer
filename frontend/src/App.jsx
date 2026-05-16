// src/App.jsx — Root router with AuthProvider + all routes

import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Header         from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import SplashScreen   from './components/SplashScreen';

// Pages
import Landing             from './pages/Landing';
import Login               from './pages/Login';
import Register            from './pages/Register';
import UploadBill          from './pages/UploadBill';
import BillAnalysis        from './pages/BillAnalysis';
import ApplianceCalculator from './pages/ApplianceCalculator';
import DisputeLetter       from './pages/DisputeLetter';
import Dashboard           from './pages/Dashboard';
import Profile             from './pages/Profile';
import Chat               from './pages/Chat';

// Page-level fade transition
const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.25 }}
  >
    {children}
  </motion.div>
);

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {/* ── Splash Screen (shown once on load) ── */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onFinish={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      {/* ── Main App (fades in after splash) ── */}
      <AnimatePresence>
        {!showSplash && (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
          <ThemeProvider>
            <AuthProvider>
              <Router>
                <div className="min-h-screen text-white">
                  <Header />
                  <main>
                    <Routes>
                      {/* ── Public routes ── */}
                      <Route path="/"         element={<PageWrapper><Landing /></PageWrapper>} />
                      <Route path="/login"    element={<PageWrapper><Login /></PageWrapper>} />
                      <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />

                      {/* ── Protected routes ── */}
                      <Route
                        path="/dashboard"
                        element={<ProtectedRoute><PageWrapper><Dashboard /></PageWrapper></ProtectedRoute>}
                      />
                      <Route
                        path="/upload"
                        element={<ProtectedRoute><PageWrapper><UploadBill /></PageWrapper></ProtectedRoute>}
                      />
                      <Route
                        path="/bills/:id"
                        element={<ProtectedRoute><PageWrapper><BillAnalysis /></PageWrapper></ProtectedRoute>}
                      />
                      <Route
                        path="/bills/:id/dispute"
                        element={<ProtectedRoute><PageWrapper><DisputeLetter /></PageWrapper></ProtectedRoute>}
                      />
                      <Route
                        path="/calculator"
                        element={<ProtectedRoute><PageWrapper><ApplianceCalculator /></PageWrapper></ProtectedRoute>}
                      />
                      <Route
                        path="/profile"
                        element={<ProtectedRoute><PageWrapper><Profile /></PageWrapper></ProtectedRoute>}
                      />
                      <Route
                        path="/chat"
                        element={<ProtectedRoute><PageWrapper><Chat /></PageWrapper></ProtectedRoute>}
                      />

                      {/* ── Fallback ── */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                </div>
              </Router>
            </AuthProvider>
          </ThemeProvider>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
