// src/pages/Chat.jsx — BillBot AI Chat with Audio Mode

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, User, Zap, Trash2, Sparkles,
  Mic, MicOff, Volume2, VolumeX, Radio, MessageSquare,
} from 'lucide-react';
import api from '../api';

// ── Constants ─────────────────────────────────────────────────────────────────
const WELCOME_MESSAGE = {
  role: 'assistant',
  content: `👋 **Hi! I'm BillBot**, your WBSEDCL electricity bill expert!\n\nI can help you with:\n• 📊 Understanding tariff slabs & rates\n• ⚠️ Identifying billing errors\n• 📝 Filing dispute letters\n• 💡 Tips to reduce your electricity bill\n\nWhat would you like to know?`,
};

const SUGGESTIONS = [
  'What are the current tariff slabs?',
  'How do I dispute a wrong bill?',
  'Tips to reduce my electricity bill',
  'What is FSC charge?',
];

// ── Markdown-lite renderer ────────────────────────────────────────────────────
function renderContent(text) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const formatted = parts.map((part, j) =>
      j % 2 === 1
        ? <strong key={j} className="font-semibold text-indigo-300">{part}</strong>
        : part
    );
    if (line.trim().startsWith('•')) {
      return (
        <div key={i} className="flex gap-2 ml-1">
          <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
          <span>{formatted}</span>
        </div>
      );
    }
    return <div key={i} className={line === '' ? 'h-2' : ''}>{formatted}</div>;
  });
}

// Strip markdown for TTS so it reads naturally
function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[•*_`]/g, '')
    .replace(/📊|⚠️|📝|💡|👋|🚀|🤔|⌨️|🟢|🗑️|🎤|🔊/g, '')
    .trim();
}

// ── Waveform bars (shown while recording) ────────────────────────────────────
function WaveformBars() {
  const heights = [3, 6, 9, 12, 9, 14, 10, 6, 11, 8, 5, 9, 13, 7, 4];
  return (
    <div className="flex items-center gap-[3px] h-8">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-indigo-400"
          animate={{ scaleY: [1, 1.8, 0.6, 1.4, 1] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.06,
            ease: 'easeInOut',
          }}
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, onSpeak, isSpeaking }) {
  const isBot = msg.role === 'assistant';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`flex gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}
    >
      {isBot && (
        <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg mt-1">
          <Bot size={16} className="text-white" />
        </div>
      )}

      <div
        className={`max-w-[78%] md:max-w-[66%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-md relative group ${
          isBot ? 'rounded-tl-sm' : 'rounded-tr-sm'
        }`}
        style={{
          background: isBot
            ? 'rgba(99,102,241,0.12)'
            : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          border: isBot ? '1px solid rgba(99,102,241,0.25)' : 'none',
          color: isBot ? 'var(--text-primary)' : '#fff',
        }}
      >
        <div className="flex flex-col gap-0.5">{renderContent(msg.content)}</div>

        {/* Speak button on bot messages */}
        {isBot && (
          <button
            onClick={() => onSpeak(msg.content)}
            className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            style={{
              background: isSpeaking ? '#7c3aed' : 'rgba(99,102,241,0.7)',
            }}
            title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
          >
            {isSpeaking
              ? <VolumeX size={11} className="text-white" />
              : <Volume2 size={11} className="text-white" />
            }
          </button>
        )}
      </div>

      {!isBot && (
        <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg mt-1">
          <User size={16} className="text-white" />
        </div>
      )}
    </motion.div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex gap-3 justify-start"
    >
      <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg mt-1">
        <Bot size={16} className="text-white" />
      </div>
      <div
        className="px-5 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5"
        style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}
      >
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-indigo-400"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Audio Mode Panel ──────────────────────────────────────────────────────────
function AudioModePanel({ isRecording, transcript, onToggleRecording, supported }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center justify-center gap-6 py-8"
    >
      {/* Big mic button */}
      <div className="relative">
        {/* Ripple rings when recording */}
        {isRecording && (
          <>
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2 border-indigo-500"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 2.5 + i * 0.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
              />
            ))}
          </>
        )}

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onToggleRecording}
          disabled={!supported}
          className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: isRecording
              ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
              : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            boxShadow: isRecording
              ? '0 0 40px rgba(220,38,38,0.5)'
              : '0 0 30px rgba(99,102,241,0.5)',
          }}
          animate={isRecording ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={isRecording ? { duration: 1.2, repeat: Infinity } : {}}
        >
          {isRecording
            ? <MicOff size={36} className="text-white" />
            : <Mic size={36} className="text-white" />
          }
        </motion.button>
      </div>

      {/* Waveform or instruction */}
      <div className="h-10 flex items-center">
        {isRecording ? (
          <WaveformBars />
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {supported ? 'Tap the mic to speak' : '⚠️ Speech recognition not supported in this browser'}
          </p>
        )}
      </div>

      {/* Live transcript preview */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md px-5 py-3 rounded-xl text-sm text-center italic"
            style={{
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.25)',
              color: 'var(--text-secondary)',
            }}
          >
            "{transcript}"
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Chat Component ───────────────────────────────────────────────────────
export default function Chat() {
  const [messages, setMessages]       = useState([WELCOME_MESSAGE]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [audioMode, setAudioMode]     = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript]   = useState('');
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [autoSpeak, setAutoSpeak]     = useState(true);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState(null);

  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const recognitionRef = useRef(null);

  // Browser support check
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speechSupported = !!SpeechRecognition;

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  // ── TTS: speak a message ───────────────────────────────────────────────────
  const speak = useCallback((text, msgIdx = null) => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingMsgIdx(null);
      return;
    }

    const clean = stripMarkdown(text);
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang  = 'en-IN';
    utter.rate  = 0.95;
    utter.pitch = 1.05;

    // Prefer an Indian English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utter.voice = preferred;

    utter.onstart = () => { setIsSpeaking(true);  setSpeakingMsgIdx(msgIdx); };
    utter.onend   = () => { setIsSpeaking(false); setSpeakingMsgIdx(null); };
    utter.onerror = () => { setIsSpeaking(false); setSpeakingMsgIdx(null); };

    window.speechSynthesis.speak(utter);
  }, [isSpeaking]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    const userMsg   = { role: 'user', content };
    const newMsgs   = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setTranscript('');
    setLoading(true);

    try {
      const res = await api.post('/api/v1/chat/', { messages: newMsgs });
      const reply = res.data.reply;
      setMessages(prev => {
        const updated = [...prev, { role: 'assistant', content: reply }];
        // Auto-speak in audio mode
        if (autoSpeak && audioMode) {
          setTimeout(() => speak(reply, updated.length - 1), 200);
        }
        return updated;
      });
    } catch {
      const err = '⚠️ Sorry, I couldn\'t connect to the server. Please check that the backend is running.';
      setMessages(prev => [...prev, { role: 'assistant', content: err }]);
    } finally {
      setLoading(false);
      if (!audioMode) inputRef.current?.focus();
    }
  }, [input, loading, messages, autoSpeak, audioMode, speak]);

  // ── Speech Recognition ─────────────────────────────────────────────────────
  const toggleRecording = useCallback(() => {
    if (!speechSupported) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang        = 'en-IN';
    recognition.continuous  = false;
    recognition.interimResults = true;

    recognition.onstart  = () => setIsRecording(true);
    recognition.onend    = () => setIsRecording(false);
    recognition.onerror  = () => setIsRecording(false);

    recognition.onresult = (e) => {
      let interim = '';
      let final   = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (final += t) : (interim += t);
      }
      setTranscript(interim || final);
      if (final) {
        setTranscript('');
        sendMessage(final);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isRecording, speechSupported, sendMessage, SpeechRecognition]);

  const clearChat = () => {
    window.speechSynthesis?.cancel();
    setMessages([WELCOME_MESSAGE]);
    setInput('');
    setTranscript('');
    setIsSpeaking(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6">

      {/* ── Header card ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl mb-4"
      >
        <div
          className="glass-panel rounded-2xl px-6 py-4 flex items-center justify-between"
          style={{ border: '1px solid rgba(99,102,241,0.3)' }}
        >
          {/* Left: identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-glow">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg" style={{ color: 'var(--text-heading)' }}>
                BillBot <Sparkles size={14} className="inline text-indigo-400 mb-0.5" />
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                WBSEDCL Electricity Bill Expert
              </p>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2">
            {/* Online dot */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Online</span>
            </div>

            {/* Auto-speak toggle (only in audio mode) */}
            {audioMode && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setAutoSpeak(v => !v)}
                title={autoSpeak ? 'Mute auto-speak' : 'Enable auto-speak'}
                className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
                style={{
                  background: autoSpeak ? 'rgba(99,102,241,0.2)' : 'transparent',
                  borderColor: autoSpeak ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.2)',
                  color: autoSpeak ? '#818cf8' : 'var(--text-muted)',
                }}
              >
                {autoSpeak ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </motion.button>
            )}

            {/* Audio / Text mode toggle */}
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => {
                setAudioMode(v => !v);
                if (isRecording) recognitionRef.current?.stop();
                window.speechSynthesis?.cancel();
                setIsSpeaking(false);
              }}
              title={audioMode ? 'Switch to text mode' : 'Switch to audio mode'}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all"
              style={{
                background: audioMode ? 'rgba(168,85,247,0.2)' : 'rgba(99,102,241,0.1)',
                borderColor: audioMode ? 'rgba(168,85,247,0.5)' : 'rgba(99,102,241,0.25)',
                color: audioMode ? '#c084fc' : 'var(--text-secondary)',
              }}
            >
              {audioMode ? <><Radio size={13} /> Audio</> : <><MessageSquare size={13} /> Text</>}
            </motion.button>

            {/* Clear */}
            <button
              onClick={clearChat}
              title="Clear chat"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/15"
              style={{ color: 'var(--text-muted)' }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Chat window ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl flex flex-col glass-panel rounded-2xl overflow-hidden"
        style={{
          border: '1px solid rgba(99,102,241,0.2)',
          height: 'calc(100vh - 260px)',
          minHeight: '420px',
        }}
      >
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                msg={msg}
                onSpeak={(text) => speak(text, i)}
                isSpeaking={isSpeaking && speakingMsgIdx === i}
              />
            ))}
            {loading && <TypingIndicator key="typing" />}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Suggestions strip */}
        {messages.length === 1 && !audioMode && (
          <div className="px-4 md:px-6 pb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-full border transition-all hover:bg-indigo-600/20"
                style={{ borderColor: 'rgba(99,102,241,0.35)', color: 'var(--text-secondary)' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Audio mode panel OR text input bar ── */}
        <AnimatePresence mode="wait">
          {audioMode ? (
            <motion.div
              key="audio-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="px-4 md:px-6 py-2"
              style={{ borderTop: '1px solid rgba(168,85,247,0.2)' }}
            >
              <AudioModePanel
                isRecording={isRecording}
                transcript={transcript}
                onToggleRecording={toggleRecording}
                supported={speechSupported}
              />
              {/* Suggestion chips in audio mode */}
              {messages.length === 1 && (
                <div className="flex flex-wrap justify-center gap-2 pb-4">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-xs px-3 py-1.5 rounded-full border transition-all hover:bg-indigo-600/20"
                      style={{ borderColor: 'rgba(99,102,241,0.35)', color: 'var(--text-secondary)' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="text-input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="px-4 md:px-6 py-4 flex items-end gap-3"
              style={{ borderTop: '1px solid rgba(99,102,241,0.15)' }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your electricity bill…"
                className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  color: 'var(--text-primary)',
                  maxHeight: '120px',
                }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  boxShadow: input.trim() ? '0 0 16px rgba(99,102,241,0.4)' : 'none',
                }}
              >
                <Send size={16} className="text-white" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Footer */}
      <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <Zap size={11} className="inline mr-1 text-indigo-400" />
        Powered by Claude AI · WBSEDCL tariff data updated 2024
        {audioMode && (
          <span className="ml-2 text-violet-400">
            · <Radio size={10} className="inline" /> Audio mode active
          </span>
        )}
      </p>
    </div>
  );
}
