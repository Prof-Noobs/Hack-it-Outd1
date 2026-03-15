import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { REGION_NAMES } from '../utils/regions';

export default function Navbar({ region, onRegion }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [regionOpen, setRegionOpen] = useState(false);

  const links = [
    { label: 'Home', path: '/' },
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Tech Stack', path: '/tech' },
  ];

  const isDashboard = loc.pathname === '/dashboard';

  // Staggered animation wrapper for nav items
  const navContainerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.8, 
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div style={{
      position: 'fixed', top: 20, left: 0, right: 0, zIndex: 200,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none'
    }}>
      <motion.nav
        variants={navContainerVariants}
        initial="hidden"
        animate="visible"
        className="glass-pill"
        style={{
          display: 'flex', alignItems: 'center', gap: '24px',
          padding: '8px 24px', pointerEvents: 'auto',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Logo */}
        <motion.div variants={itemVariants} onClick={() => nav('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--aurora-cyan), var(--aurora-green))',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)',
          }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '16px', letterSpacing: '-0.02em' }}>
            <span className="cyan">Py</span>
            <span style={{ color: '#fff' }}>Clima</span>
          </span>
        </motion.div>

        {/* Separator */}
        <motion.div variants={itemVariants} style={{ width: 1, height: 20, background: 'var(--border-subtle)' }} />

        {/* Center: region selector — only on dashboard */}
        {isDashboard && onRegion && (
          <motion.div variants={itemVariants} style={{ position: 'relative' }}>
            <button
              onClick={() => setRegionOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: regionOpen ? 'rgba(0,240,255,0.1)' : 'transparent',
                border: 'none', padding: '6px 12px', borderRadius: '100px',
                color: regionOpen ? 'var(--aurora-cyan)' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '12px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
              onMouseLeave={e => { if(!regionOpen) e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <span>🌐</span>
              {region}
              <span style={{ fontSize: '9px', opacity: 0.6 }}>{regionOpen ? '▲' : '▼'}</span>
            </button>

            <AnimatePresence>
              {regionOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="glass-panel"
                  style={{
                    position: 'absolute', top: 'calc(100% + 12px)', left: '50%',
                    transform: 'translateX(-50%)', padding: '8px',
                    minWidth: '180px', zIndex: 300,
                  }}
                >
                  {REGION_NAMES.map(r => (
                    <button
                      key={r}
                      onClick={() => { onRegion(r); setRegionOpen(false); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 16px', borderRadius: '6px',
                        background: r === region ? 'var(--aurora-cyan-dim)' : 'transparent',
                        border: 'none', color: r === region ? 'var(--aurora-cyan)' : 'var(--text-muted)',
                        cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-mono)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { if (r !== region) e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                      onMouseLeave={e => { if (r !== region) e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      {r}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {isDashboard && onRegion && (
            <motion.div variants={itemVariants} style={{ width: 1, height: 20, background: 'var(--border-subtle)' }} />
        )}

        {/* Right: nav links */}
        <motion.div variants={itemVariants} style={{ display: 'flex', gap: '4px' }}>
          {links.map(({ label, path }) => {
            const active = loc.pathname === path;
            return (
              <button key={path} onClick={() => nav(path)} style={{
                background: active ? 'var(--aurora-cyan-dim)' : 'transparent',
                color: active ? 'var(--aurora-cyan)' : 'var(--text-muted)',
                border: 'none', borderRadius: '100px',
                fontSize: '13px', padding: '8px 16px',
                fontFamily: 'var(--font-display)', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if(!active) e.currentTarget.style.color = 'var(--text-main)' }}
              onMouseLeave={e => { if(!active) e.currentTarget.style.color = 'var(--text-muted)' }}>
                {label}
              </button>
            );
          })}
        </motion.div>
      </motion.nav>
    </div>
  );
}
