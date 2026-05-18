// src/pages/UploadBill.jsx — Drag-and-drop bill upload page (Premium Enhanced)

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, X, CheckCircle2, AlertCircle, Loader2, Info, Sparkles, Shield } from 'lucide-react';
import api from '../api';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function UploadBill() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const validateFile = (f) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return 'Only PDF, JPEG, PNG, and WebP files are supported.';
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File size must be under ${MAX_SIZE_MB} MB.`;
    }
    return null;
  };

  const handleFileSelect = useCallback((f) => {
    setError('');
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFile(f);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, [handleFileSelect]);

  const onInputChange = (e) => {
    const selected = e.target.files[0];
    if (selected) handleFileSelect(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError('');
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/v1/bills/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / (e.total || e.loaded));
          setProgress(pct);
        },
      });

      const billId = response.data._id;
      // Artificial delay for "premium" feeling of analysis if it was too fast
      setTimeout(() => {
        navigate(`/bills/${billId}`);
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Upload failed. Make sure the backend is running and try again.'
      );
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError('');
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileType = file?.type === 'application/pdf' ? 'PDF' : 'Image';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 py-10 relative"
    >
      <div className="grain-overlay" />
      
      <div className="mb-10 text-center">
        <motion.div 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-medium text-indigo-400 mb-4"
        >
          <Sparkles size={12} /> AI POWERED AUDIT
        </motion.div>
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Upload Your Bill</h1>
        <p className="text-slate-400">Our engine will extract every charge and slab for accuracy</p>
      </div>

      {/* Info notice */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-start gap-3 bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 mb-8 text-sm text-slate-300"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
          <Info size={16} className="text-indigo-400" />
        </div>
        <p className="leading-relaxed">
          Supports WBSEDCL and CESC bills in <span className="text-indigo-300 font-medium">PDF or Image</span> formats. 
          The analysis uses official state tariff structures to ensure 100% accuracy.
        </p>
      </motion.div>

      {/* Drop zone */}
      <div
        id="upload-dropzone"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !file && !isUploading && fileInputRef.current?.click()}
        className={`relative rounded-3xl border-2 border-dashed transition-all p-12 text-center mb-6 overflow-hidden
          ${isUploading ? 'cursor-wait border-indigo-500/40 bg-indigo-500/5' : ''}
          ${dragOver
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
            : file
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-slate-700 bg-slate-900/40 hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer'
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-input"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={onInputChange}
          disabled={isUploading}
        />

        {/* Scanning Laser Overlay (only during upload/analysis) */}
        <AnimatePresence>
          {isUploading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 pointer-events-none"
            >
              <div className="scan-laser" />
              <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        {!file ? (
          <div className="flex flex-col items-center gap-5">
            <motion.div 
              animate={dragOver ? { scale: 1.1, rotate: 10 } : { scale: 1, rotate: 0 }}
              className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${
                dragOver ? 'bg-indigo-600/30 shadow-glow' : 'bg-slate-800/80'
              }`}
            >
              <UploadCloud size={40} className={dragOver ? 'text-indigo-400' : 'text-slate-500'} />
            </motion.div>
            <div>
              <p className="text-white font-bold text-xl">
                {dragOver ? 'Drop the file now' : 'Select your bill'}
              </p>
              <p className="text-slate-500 text-sm mt-1">Drag & drop or <span className="text-indigo-400 font-medium">browse files</span></p>
            </div>
            <div className="flex gap-2 text-[10px] uppercase tracking-widest text-slate-600 font-bold">
              <span className="px-2 py-1 border border-slate-800 rounded">PDF</span>
              <span className="px-2 py-1 border border-slate-800 rounded">JPG</span>
              <span className="px-2 py-1 border border-slate-800 rounded">PNG</span>
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-5 text-left relative z-20"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${
              isUploading ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-emerald-500/10 border-emerald-500/20'
            }`}>
              {isUploading ? (
                <Loader2 size={28} className="text-indigo-400 animate-spin" />
              ) : (
                <FileText size={28} className="text-emerald-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold truncate text-lg">{file.name}</p>
              <p className="text-slate-400 text-sm font-medium">{fileType} · {formatBytes(file.size)}</p>
            </div>
            
            {!isUploading && (
              <div className="flex items-center gap-3">
                <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(); }}
                  className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-500/10 border border-red-500/30 text-red-400 p-5 rounded-2xl mb-6 flex items-center gap-4 text-sm overflow-hidden"
          >
            <AlertCircle size={20} className="shrink-0" />
            <p className="font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <AnimatePresence>
        {isUploading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                Deep Scanning & Analyzing…
              </span>
              <span className="text-indigo-400">{progress}%</span>
            </div>
            <div className="h-2.5 bg-slate-900 rounded-full p-0.5 border border-slate-800">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-600 via-cyan-500 to-indigo-600 rounded-full shimmer"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload button */}
      <button
        id="upload-submit"
        onClick={handleUpload}
        disabled={!file || isUploading}
        className={`btn-primary w-full py-5 text-lg font-bold shadow-glow relative overflow-hidden group
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <span className="relative z-10 flex items-center justify-center gap-3">
          {isUploading ? (
            <>Initializing AI Analysis...</>
          ) : (
            <><UploadCloud size={22} className="group-hover:-translate-y-1 transition-transform" /> Analyze This Bill</>
          )}
        </span>
        {/* Animated background on hover */}
        {!isUploading && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        )}
      </button>

      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-slate-600 mt-6 font-medium tracking-wide uppercase"
      >
        <Shield size={12} className="inline mr-1 mb-0.5 text-slate-700" /> 
        Bank-grade encryption · No personal data stored
      </motion.p>
      </motion.div>
  );
}
