import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SUGGESTIONS = [
  'Explain global temperature trends since 1920',
  'What causes precipitation patterns in Asia?',
  'How do trade winds affect climate?',
  'What was different about the 1998 El Niño year?',
  'Compare Arctic warming to global average',
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row',
               gap: '12px', alignItems: 'flex-start', marginBottom: '20px' }}
    >
      <div className="glass-panel" style={{
        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'var(--aurora-cyan-dim)' : 'var(--aurora-magenta-dim)',
        border: `1px solid ${isUser ? 'var(--aurora-cyan)' : 'var(--aurora-magenta)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
        boxShadow: isUser ? '0 0 10px rgba(0,240,255,0.2)' : '0 0 10px rgba(255,0,255,0.2)'
      }}>
        {isUser ? '👤' : '🤖'}
      </div>
      <div className="glass-panel" style={{
        maxWidth: '85%',
        background: isUser ? 'rgba(0,0,0,0.3)' : 'rgba(11,11,19,0.5)',
        border: `1px solid ${isUser ? 'var(--aurora-cyan)' : 'var(--border-subtle)'}`,
        borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        padding: '12px 16px',
        boxShadow: isUser ? '0 4px 20px rgba(0,240,255,0.05)' : 'none'
      }}>
        <p style={{ fontSize: '14px', color: isUser ? '#fff' : 'var(--text-main)',
                    lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-display)', opacity: 0.9 }}>
          {msg.content}
        </p>
        {msg.error && msg.error !== 'no_key' && (
          <p style={{ fontSize: '11px', color: 'var(--aurora-magenta)', marginTop: '8px',
                      fontFamily: 'var(--font-mono)', fontWeight: 600 }}>⚠ SIGNAL ERROR: {msg.error.toUpperCase()}</p>
        )}
      </div>
    </motion.div>
  );
}

export default function AIChatPanel({
  onClose, sendChat, chatMessages, chatLoading,
  groqConfigured, currentContext,
}) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || chatLoading) return;
    setInput('');
    sendChat(msg, currentContext);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="noise"
      style={{
        position: 'fixed', top: '80px', right: '20px', bottom: '20px', width: '400px', zIndex: 100,
        background: 'rgba(11, 11, 19, 0.85)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '24px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 0 60px rgba(0,0,0,0.6)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'rgba(0,0,0,0.2)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="pulse" style={{ width: 8, height: 8, borderRadius: '50%',
                          background: groqConfigured ? 'var(--aurora-cyan)' : 'var(--aurora-magenta)',
                          boxShadow: `0 0 10px ${groqConfigured ? 'var(--aurora-cyan)' : 'var(--aurora-magenta)'}` }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '16px', color: '#fff', letterSpacing: '0.02em' }}>
              NEURAL ANALYST
            </span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px', letterSpacing: '0.05em' }}>
            {groqConfigured ? 'LINK ESTABLISHED: GROQ/LLAMA-3.3' : 'OFFLINE: SYSTEM KEY MISSING'}
          </div>
        </div>
        <button onClick={onClose} className="btn-aurora"
          style={{ width: '30px', height: '30px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {chatMessages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px', filter: 'drop-shadow(0 0 20px rgba(0,240,255,0.3))' }}>🌍</div>
            <p style={{ color: 'var(--text-main)', fontSize: '15px', lineHeight: 1.6, fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Initiate Climate Deep-Scan
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>
              Inquire about anomalies, temporal shifts, or atmospheric dynamics.
            </p>
            {!groqConfigured && (
              <div className="aurora-tag" style={{ margin: '20px 0', padding: '12px', fontSize: '11px', color: 'var(--aurora-magenta)', borderColor: 'var(--aurora-magenta-dim)', display: 'block' }}>
                SYSTEM ALERT: GROQ_API_KEY REQUIRED FOR ANALYTICS
              </div>
            )}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="glass-panel"
                  style={{ padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                           border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)',
                           color: 'var(--text-muted)', fontSize: '12px', textAlign: 'left', transition: 'all 0.2s', fontFamily: 'var(--font-display)' }}
                  onMouseEnter={e => { e.target.style.color='#fff'; e.target.style.borderColor='var(--aurora-cyan)'; e.target.style.background='var(--aurora-cyan-dim)'; }}
                  onMouseLeave={e => { e.target.style.color='var(--text-muted)'; e.target.style.borderColor='var(--border-subtle)'; e.target.style.background='rgba(255,255,255,0.03)'; }}
                >{s}</button>
              ))}
            </div>
          </div>
        )}
        <AnimatePresence>
          {chatMessages.map(msg => <Message key={msg.id} msg={msg} />)}
        </AnimatePresence>
        {chatLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 0' }}>
            <div className="glass-panel" style={{ width: '32px', height: '32px', borderRadius: '50%',
                          background: 'var(--aurora-magenta-dim)', border: '1px solid var(--aurora-magenta)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🤖</div>
            <div className="glass-panel" style={{ display: 'flex', gap: '6px', padding: '12px 16px',
                          background: 'rgba(11,11,19,0.5)', border: '1px solid var(--border-subtle)',
                          borderRadius: '4px 16px 16px 16px' }}>
              {[0, 0.15, 0.3].map((delay, i) => (
                <motion.div key={i}
                  animate={{ scale: [1,1.5,1], opacity: [0.4,1,0.4] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay }}
                  style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--aurora-cyan)' }} />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0, background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <textarea ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Interrogate data core..."
            rows={2}
            className="aurora-input"
            style={{ flex: 1, resize: 'none', padding: '12px 16px',
                     background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)',
                     borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none',
                     fontFamily: 'var(--font-display)', lineHeight: 1.5, transition: 'all 0.2s' }}
            onFocus={e => e.target.style.borderColor = 'var(--aurora-cyan)'}
            onBlur={e  => e.target.style.borderColor = 'var(--border-subtle)'}
          />
          <button onClick={handleSend} disabled={!input.trim() || chatLoading}
            className="btn-aurora"
            style={{ width: '48px', height: '48px', borderRadius: '12px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
            🚀
          </button>
        </div>
        <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textAlign: 'center' }}>
          SHIFT+ENTER FOR MULTILINE · LLaMA-3.3 OVER-DRIVE
        </div>
      </div>
    </motion.div>
  );
}
