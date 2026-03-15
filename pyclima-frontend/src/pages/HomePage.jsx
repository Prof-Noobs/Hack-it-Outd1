import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Globe3D from '../components/Globe3D';

const stats = [
  { value: '1.5°C', label: 'Avg global warming since 1900' },
  { value: '44+', label: 'Years of climate data supported' },
  { value: '3', label: 'Visualization modes' },
  { value: '∞', label: 'NetCDF datasets compatible' },
];

const team = [
  { initials: 'AR', name: 'Arnav', role: 'Full Stack & Visualization' },
  { initials: 'YA', name: 'Yash', role: 'Data Engineering' },
  { initials: 'MA', name: 'Madhur', role: 'ML & Insights' },
  { initials: 'VI', name: 'Vikhyat', role: 'Frontend & Design' },
];

function Typewriter({ text }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayed((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [text]);
  return <span>{displayed}<span className="cyan" style={{ animation: 'blink 1s step-end infinite' }}>_</span></span>;
}

export default function HomePage() {
  const nav = useNavigate();

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
    transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] },
  });

  return (
    <div className="noise" style={{ minHeight: '100vh', background: 'var(--bg-void)', position: 'relative' }}>
      <div className="aurora-bg" />
      <Navbar />

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '0 5vw',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Left content */}
        <div style={{ flex: '0 0 45%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '40px' }}>
          <motion.div {...fadeUp(0.2)}>
            <div className="glass-pill" style={{ display: 'inline-flex', padding: '6px 16px', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--aurora-magenta)', boxShadow: '0 0 10px var(--aurora-magenta)' }} />
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-main)', letterSpacing: '0.1em' }}>TECHNEX '26 · IIT (BHU)</span>
            </div>
          </motion.div>

          <motion.h1 {...fadeUp(0.3)} style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(48px, 6vw, 84px)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            color: '#fff',
          }}>
            Climate data,<br />
            <span className="gradient-text glow-text">finally visible.</span>
          </motion.h1>

          <motion.div {...fadeUp(0.4)} style={{
            fontSize: '16px',
            lineHeight: 1.8,
            color: 'var(--text-muted)',
            maxWidth: '520px',
            fontFamily: 'var(--font-mono)'
          }}>
            <p style={{ marginBottom: '16px' }}>
              Raw NetCDF output is locked behind dimensions that only specialists can read. 
              <span className="cyan"> PyClimaExplorer </span> 
              breaks that barrier: upload any .nc file and instantly explore decades of climate change on an interactive 3D globe.
            </p>
            <p style={{ fontSize: '14px', opacity: 0.7 }}>
              Built for researchers, students, and policymakers.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.5)} style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button
              className="btn-aurora btn-aurora-solid"
              onClick={() => nav('/dashboard')}
              style={{ fontSize: '15px', padding: '14px 32px' }}
            >
              Launch Dashboard 🚀
            </button>
            <button
              className="glass-panel btn-aurora"
              onClick={() => nav('/tech')}
              style={{ fontSize: '14px', padding: '14px 28px' }}
            >
              View Tech Stack
            </button>
          </motion.div>
        </div>

        {/* Right — Globe */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            position: 'absolute',
            right: '-5%',
            top: 0,
            width: '60%',
            pointerEvents: 'none'
          }}
        >
          {/* Intense glow behind globe */}
          <div style={{
            position: 'absolute',
            width: '80%', height: '80%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,240,255,0.15) 0%, transparent 60%)',
            filter: 'blur(40px)',
          }} />
          <div style={{ width: '800px', height: '800px', pointerEvents: 'auto', transform: 'translateX(10%)' }}>
            <Globe3D autoRotate={true} />
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 1 }}
          style={{
            position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
            color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.2em',
          }}
        >
          <span>SCROLL</span>
          <motion.div
            animate={{ height: [0, 40, 0], opacity: [0, 1, 0], y: [0, 20, 40] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            style={{ width: 1, background: 'linear-gradient(var(--aurora-cyan), transparent)' }}
          />
        </motion.div>
      </section>

      {/* ── QUOTE DIVIDER ── */}
      <motion.section
        {...fadeUp(0.1)}
        style={{
          padding: '60px 5vw',
          position: 'relative',
          zIndex: 2,
          display: 'flex', justifyContent: 'center'
        }}
      >
        <div className="glass-panel" style={{ padding: '40px 60px', textAlign: 'center', maxWidth: '800px' }}>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(18px, 2.5vw, 26px)',
            color: 'var(--text-main)',
            lineHeight: 1.6,
            fontWeight: 300
          }}>
            "The Earth does not belong to us. We belong to the Earth."
          </p>
          <div className="mono cyan" style={{ marginTop: '20px', fontSize: '12px', letterSpacing: '0.1em' }}>
            — Chief Seattle
          </div>
        </div>
      </motion.section>

      {/* ── STATS ── */}
      <section style={{ padding: '60px 5vw', position: 'relative', zIndex: 2 }}>
        <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', overflow: 'hidden' }}>
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              style={{
                padding: '48px 32px',
                borderRight: i < 3 ? '1px solid var(--border-subtle)' : 'none',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.01)'
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '52px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                {s.value}
              </div>
              <div className="mono cyan" style={{ marginTop: '16px', fontSize: '11px', lineHeight: 1.5, letterSpacing: '0.05em' }}>
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section style={{ padding: '100px 5vw', position: 'relative', zIndex: 2 }}>
        <motion.div {...fadeUp(0.1)} style={{ marginBottom: '60px', textAlign: 'center' }}>
          <span className="aurora-tag">ABOUT THE PROJECT</span>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 4vw, 56px)',
            fontWeight: 800,
            marginTop: '24px',
            letterSpacing: '-0.03em',
          }}>
            Built in 24 hours at <span className="gradient-text">Technex '26</span>
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '80px' }}>
          {[
            { title: 'The Problem', body: 'Climate model output (NetCDF files from ERA5, CESM, and similar) contains multi-dimensional arrays that are impossible to interpret without specialized tools. Most scientists rely on ad-hoc scripts; the public has no access at all.' },
            { title: 'Our Solution', body: 'An interactive web dashboard — upload any NetCDF file and immediately see spatial heatmaps, temporal trends, comparison views, and auto-generated insights. No coding required.' },
            { title: 'Who It\'s For', body: 'Climate researchers who need quick exploratory views. Students learning about climate change. Policymakers who need visual evidence. Educators building climate literacy.' },
            { title: 'What Makes It Different', body: 'A real Three.js 3D globe with country outlines, animated timelapse, side-by-side comparison, story mode, city comparisons, and a formatted PDF export — all in one visually stunning tool.' },
          ].map((card, i) => (
            <motion.div
              key={i}
              className="glass-panel"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              style={{ padding: '40px 48px', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, background: 'var(--aurora-cyan-dim)', filter: 'blur(50px)', borderRadius: '50%' }} />
              
              <div className="mono cyan" style={{ fontSize: '13px', letterSpacing: '0.2em', marginBottom: '16px' }}>
                {String(i + 1).padStart(2, '0')} //
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>
                {card.title}
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                {card.body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Team */}
        <motion.div {...fadeUp(0.2)} style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span className="aurora-tag">THE TEAM</span>
        </motion.div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {team.map((member, i) => (
            <motion.div
              key={i}
              className="glass-panel"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              style={{
                padding: '24px 32px',
                display: 'flex', alignItems: 'center', gap: '16px',
                minWidth: '260px'
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--aurora-cyan)'
              }}>
                {member.initials}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{member.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{member.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
      
      {/* Footer */}
      <footer style={{ padding: '40px 5vw', borderTop: '1px solid var(--border-subtle)', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <p className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          © 2026 PyClimaExplorer. Open source for a better planet.
        </p>
      </footer>
    </div>
  );
}
