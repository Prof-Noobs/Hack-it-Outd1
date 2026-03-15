// components/AIChatPanel.jsx
// Added: onRegionChange prop — fires whenever the AI response or user message
// mentions a region, so the dashboard map updates automatically.

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRegionFromMessage } from '../utils/regionDetector';

export default function AIChatPanel({
  onClose, sendChat, chatMessages, chatLoading,
  groqConfigured, currentContext,
  onRegionChange,   // NEW: (regionId: string) => void
  onYearChange,     // NEW (optional): (year: number) => void
  onVariableChange, // NEW (optional): (variable: string) => void
}) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    setInput('');

    // ── Detect region in USER message immediately ─────────────────────────
    // This gives instant feedback — map switches as soon as you type "India"
    const userRegion = getRegionFromMessage(text);
    if (userRegion && onRegionChange) {
      onRegionChange(userRegion);
    }

    // Send to AI
    const reply = await sendChat(text, currentContext);

    // ── Detect region in AI RESPONSE ──────────────────────────────────────
    // AI may include a context block like {"region":"India",...}
    if (reply?.content) {
      const aiRegion = getRegionFromMessage(reply.content);
      if (aiRegion && onRegionChange) {
        onRegionChange(aiRegion);
      }

      // Optional: also sync year and variable if the AI specifies them
      const ctx = reply.content.match(/\{[^{}]+\}/)?.[0];
      if (ctx) {
        try {
          const parsed = JSON.parse(ctx);
          if (parsed.year && onYearChange) onYearChange(Number(parsed.year));
          if (parsed.variable && onVariableChange) onVariableChange(parsed.variable);
        } catch { /* ignore malformed JSON */ }
      }
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      style={{
        position: 'fixed', top: '90px', right: '20px', bottom: '20px',
        width: '360px', zIndex: 400,
        display: 'flex', flexDirection: 'column',
        background: 'rgba(11,11,19,0.97)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '20px',
        boxShadow: '0 0 60px rgba(0,0,0,0.7)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '20px' }}>🤖</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: '#fff' }}>
              AI CLIMATE ASSISTANT
            </div>
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              {groqConfigured ? '● GROQ ONLINE' : '○ NO API KEY'} · MAP-AWARE
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: '18px', padding: '4px',
        }}>✕</button>
      </div>

      {/* Region hint banner */}
      <div style={{
        padding: '8px 16px',
        background: 'rgba(0,240,255,0.04)',
        borderBottom: '1px solid var(--border-subtle)',
        fontSize: '11px', color: 'var(--aurora-cyan)',
        fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
      }}>
        💡 Mention a region (e.g. "India", "Arctic") to auto-focus the map
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {chatMessages.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)', textAlign: 'center', marginTop: '32px', lineHeight: 1.8 }}>
            Ask me about climate data,<br />regions, or trends.<br /><br />
            <span style={{ color: 'var(--aurora-cyan)', fontSize: '11px' }}>
              Try: "Show me temperature in India"
            </span>
          </div>
        )}

        {chatMessages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                padding: '10px 14px',
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isUser ? 'var(--aurora-cyan-dim)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isUser ? 'var(--aurora-cyan)' : 'var(--border-subtle)'}`,
                color: '#fff', fontSize: '13px', lineHeight: 1.6,
                fontFamily: 'var(--font-display)',
              }}>
              {msg.content}
              {msg.error && (
                <div style={{ color: '#f87171', fontSize: '11px', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                  ⚠ {msg.error}
                </div>
              )}
            </motion.div>
          );
        })}

        {chatLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              alignSelf: 'flex-start', padding: '10px 14px',
              borderRadius: '16px 16px 16px 4px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-subtle)',
              display: 'flex', gap: '6px', alignItems: 'center',
            }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--aurora-cyan)',
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid var(--border-subtle)',
        display: 'flex', gap: '8px', flexShrink: 0,
        background: 'rgba(0,0,0,0.3)',
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about climate data or type a region..."
          rows={2}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-subtle)', borderRadius: '10px',
            color: '#fff', fontSize: '13px', padding: '10px 12px',
            fontFamily: 'var(--font-display)', resize: 'none', outline: 'none',
            lineHeight: 1.5,
          }}
        />
        <button onClick={handleSend} disabled={chatLoading || !input.trim()}
          className="btn-aurora"
          style={{
            padding: '0 16px', borderRadius: '10px', flexShrink: 0,
            opacity: (!input.trim() || chatLoading) ? 0.4 : 1,
            fontSize: '18px',
          }}>
          ↑
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </motion.div>
  );
}