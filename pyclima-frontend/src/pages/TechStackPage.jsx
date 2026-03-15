import React from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';

const stack = [
  {
    category: 'Frontend',
    color: '#10BE81',
    items: [
      { name: 'React 18', desc: 'Component-based UI, SPA routing via React Router v6' },
      { name: 'Three.js', desc: 'WebGL 3D globe with country outlines via topojson projection' },
      { name: 'Framer Motion', desc: 'Page transitions, staggered reveals, globe entry animation' },
      { name: 'Recharts', desc: 'Time-series charts, area graphs, interactive tooltips' },
      { name: 'jsPDF', desc: 'Client-side formatted PDF export — no backend needed' },
      { name: 'react-resizable-panels', desc: 'Drag-to-resize control panel sidebar' },
    ],
  },
  {
    category: 'Backend',
    color: '#38bdf8',
    items: [
      { name: 'FastAPI', desc: 'Python REST API — /upload, /variables, /data endpoints' },
      { name: 'Xarray', desc: 'NetCDF parsing, slicing by variable/time/region' },
      { name: 'NumPy', desc: 'Array math, anomaly detection, spatial statistics' },
      { name: 'Pandas', desc: 'Time-series aggregation, rolling averages' },
      { name: 'Uvicorn', desc: 'ASGI server for FastAPI production deployment' },
    ],
  },
  {
    category: 'Data',
    color: '#f59e0b',
    items: [
      { name: 'NetCDF4', desc: 'Industry standard format for multi-dimensional climate arrays' },
      { name: 'ERA5', desc: 'ECMWF reanalysis — temperature, wind, precip, 1940–present' },
      { name: 'CESM', desc: 'NCAR Community Earth System Model output' },
      { name: 'world-atlas', desc: 'TopoJSON country boundaries projected onto the 3D globe' },
    ],
  },
  {
    category: 'DevOps / Deploy',
    color: '#c084fc',
    items: [
      { name: 'Streamlit Cloud', desc: 'Rapid backend prototype deployment' },
      { name: 'Vercel', desc: 'React frontend deployment (zero-config)' },
      { name: 'Docker', desc: 'Containerised FastAPI for consistent environments' },
    ],
  },
];

const features = [
  { icon: '🌍', title: '3D Interactive Globe', desc: 'Three.js WebGL sphere with country outlines via topojson. Drag to rotate, auto-rotate when idle, data points rendered as coloured dots on the surface.' },
  { icon: '⏱', title: 'Animated Timelapse', desc: 'Play through 44 years of climate data at 0.5×–4× speed. Globe and time-series update in sync. Pause and scrub to any year.' },
  { icon: '⚖️', title: 'Year Comparison', desc: 'Side-by-side globe views for any two years from the dataset. Difference map (A − B) highlights anomalies with a red/blue diverging scale.' },
  { icon: '🏙', title: 'City Comparison', desc: 'Extract time-series for two cities and overlay them on the same chart. Statistics panel shows mean, max, min for each city.' },
  { icon: '📄', title: 'PDF Report Export', desc: 'Formatted jsPDF report: header, selected variable/year, statistics table, and a full trend data table. Pure frontend — no server call needed.' },
  { icon: '📖', title: 'Story Mode', desc: '5-slide guided climate narrative explaining baseline, warming trend, regional hotspots, comparison, and future outlook.' },
  { icon: '🎨', title: 'Color Scales', desc: 'RdBu for temperature divergence, Viridis for sequential data, Plasma for high-contrast presentation mode.' },
  { icon: '📊', title: 'Live Statistics', desc: 'Global mean, max, min, and baseline anomaly computed in real-time for the selected variable and year.' },
];

const bonusPoints = [
  { title: '3D Globe Visualization', status: '✓', note: 'Three.js WebGL globe with country borders, drag rotation, glow atmosphere' },
  { title: 'Comparison Mode', status: '✓', note: 'Year-vs-year globe comparison + difference map + city overlay chart' },
  { title: 'Story Mode', status: '✓', note: 'Guided 5-slide narrative with live map per slide' },
  { title: 'PDF Export', status: '✓', note: 'Formatted report with stats, trend table, jsPDF — pure frontend' },
  { title: 'Play Animation', status: '✓', note: 'Timelapse at 4 speed levels with play/pause/stop/scrub controls' },
  { title: 'Resizable Control Panel', status: '✓', note: 'Drag handle between sidebar and main area (react-resizable-panels)' },
  { title: 'City Comparison', status: '✓', note: 'Dual-city time-series overlay with statistics cards' },
  { title: 'React Frontend', status: '✓', note: 'Full SPA with routing, Framer Motion animations, professional design' },
];

export default function TechStackPage() {
  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, delay },
  });

  return (
    <div className="noise" style={{ minHeight: '100vh', background: 'var(--bg-void)', position: 'relative' }}>
      <div className="aurora-bg" />
      <Navbar />

      <div style={{ paddingTop: '100px', padding: '100px 6vw 80px' }}>

        {/* Hero */}
        <motion.div {...fadeUp(0)} style={{ marginBottom: '64px', position: 'relative', zIndex: 10 }}>
          <span className="aurora-tag">TECH STACK & ARCHITECTURE</span>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 4vw, 60px)',
            fontWeight: 800, letterSpacing: '-0.03em', margin: '20px 0 16px', lineHeight: 1.1,
            color: '#fff'
          }}>
            How it's built
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--text-muted)', maxWidth: '560px', lineHeight: 1.7, fontFamily: 'var(--font-mono)' }}>
            A full-stack climate visualization platform — React frontend talking to a FastAPI + Xarray backend,
            with a Three.js 3D globe and jsPDF report generation entirely on the client side.
          </p>
        </motion.div>

        {/* Stack grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '72px', position: 'relative', zIndex: 10 }}>
          {stack.map((cat, ci) => (
            <motion.div key={ci} {...fadeUp(ci * 0.1)} className="glass-panel" style={{ padding: '28px 32px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px',
                paddingBottom: '16px', borderBottom: `1px solid var(--border-subtle)`,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, boxShadow: `0 0 10px ${cat.color}` }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: '#fff' }}>
                  {cat.category}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cat.items.map((item, ii) => (
                  <div key={ii} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '11px', color: cat.color,
                      background: `${cat.color}22`, border: `1px solid ${cat.color}44`,
                      padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0,
                    }}>{item.name}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Architecture diagram */}
        <motion.div {...fadeUp(0.2)} style={{ marginBottom: '72px', position: 'relative', zIndex: 10 }}>
          <span className="aurora-tag" style={{ marginBottom: '24px', display: 'inline-block' }}>SYSTEM ARCHITECTURE</span>
          <div className="glass-panel" style={{ padding: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', flexWrap: 'wrap' }}>
              {[
                { label: 'NetCDF File', sub: '.nc upload', color: 'var(--aurora-magenta)' },
                null,
                { label: 'FastAPI', sub: 'Python backend', color: 'var(--aurora-cyan)' },
                null,
                { label: 'React App', sub: 'Three.js + Recharts', color: 'var(--aurora-green)' },
                null,
                { label: 'PDF / Export', sub: 'jsPDF client-side', color: 'var(--aurora-cyan)' },
              ].map((node, i) =>
                node === null ? (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                    <div style={{ width: '40px', height: '1px', background: 'var(--border-subtle)' }} />
                    <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid var(--border-subtle)' }} />
                  </div>
                ) : (
                  <motion.div
                    key={i}
                    whileHover={{ y: -4, borderColor: `${node.color}` }}
                    style={{
                      border: `1px solid var(--border-subtle)`, borderRadius: '12px',
                      padding: '16px 24px', textAlign: 'center', minWidth: '140px',
                      background: 'rgba(0,0,0,0.3)',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff', fontSize: '14px' }}>{node.label}</div>
                    <div style={{ fontSize: '11px', color: node.color, marginTop: '4px', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>{node.sub}</div>
                  </motion.div>
                )
              )}
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div {...fadeUp(0.1)} style={{ marginBottom: '72px', position: 'relative', zIndex: 10 }}>
          <span className="aurora-tag" style={{ marginBottom: '24px', display: 'inline-block' }}>FEATURES</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {features.map((f, i) => (
              <motion.div
                key={i}
                {...fadeUp(i * 0.05)}
                className="glass-panel"
                whileHover={{ borderColor: 'var(--aurora-cyan)', y: -3 }}
                style={{ padding: '24px' }}
              >
                <div style={{ fontSize: '28px', marginBottom: '16px', filter: 'drop-shadow(0 0 10px rgba(0,240,255,0.2))' }}>{f.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: '10px', color: '#fff' }}>{f.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bonus checklist */}
        <motion.div {...fadeUp(0.2)} style={{ position: 'relative', zIndex: 10 }}>
          <span className="aurora-tag" style={{ marginBottom: '24px', display: 'inline-block' }}>HACKATHON BONUS POINTS</span>
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {bonusPoints.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '16px',
                    padding: '16px 0',
                    borderBottom: i < bonusPoints.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'var(--aurora-cyan-dim)', border: '1px solid var(--aurora-cyan)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--aurora-cyan)', fontSize: '13px', flexShrink: 0,
                    boxShadow: '0 0 10px rgba(0,240,255,0.2)'
                  }}>
                    {b.status}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px', color: '#fff' }}>{b.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{b.note}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
