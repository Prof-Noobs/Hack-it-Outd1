import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';
import Map2D   from './Map2D';
import Globe3D from './Globe3D';

const VARIABLES = [
  { id: 'temperature',   label: 'Temperature',   unit: '°C',   icon: '🌡' },
  { id: 'precipitation', label: 'Precipitation', unit: 'mm/d', icon: '🌧' },
  { id: 'wind',          label: 'Wind Speed',    unit: 'm/s',  icon: '💨' },
];

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel" style={{ 
      background: 'rgba(11, 11, 19, 0.9)', 
      border: '1px solid var(--border-subtle)',
      borderRadius: '8px', padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
    }}>
      <div style={{ color: 'var(--aurora-cyan)', fontFamily: 'var(--font-mono)', fontSize: '11px', marginBottom: '4px', letterSpacing: '0.05em' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          {p.name}: {p.value?.toFixed?.(3) ?? p.value}
        </div>
      ))}
    </div>
  );
};

export default function CompareModal({
  onClose, timeSteps, variables: availableVars,
  selVar, colorScale, fetchCompare, explainGraph
}) {
  const [variable,  setVariable]  = useState(selVar || 'temperature');
  const [idxA,      setIdxA]      = useState(0);
  const [idxB,      setIdxB]      = useState(Math.max(0, timeSteps.length - 1));
  const [dataA,     setDataA]     = useState(null);
  const [dataB,     setDataB]     = useState(null);
  const [diffData,  setDiffData]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [viewMode,  setViewMode]  = useState('2d');
  const [chartMode, setChartMode] = useState('map');  // map | bar | line
  const [explaining,setExplaining]= useState(false);
  const [explanation,setExplanation]=useState('');

  const load = useCallback(async () => {
    if (timeSteps.length === 0) return;
    setLoading(true);
    try {
      const result = await fetchCompare(variable, idxA, idxB, 3);
      if (result) {
        setDataA(result.data_a);
        setDataB(result.data_b);
        setDiffData(result.diff);
      }
    } finally {
      setLoading(false);
    }
  }, [variable, idxA, idxB, fetchCompare, timeSteps.length]);

  useEffect(() => { load(); }, [load]);

  const handleExplain = async () => {
    setExplaining(true);
    const yearA = timeSteps[idxA]?.year;
    const yearB = timeSteps[idxB]?.year;
    const stats = dataA ? { mean: dataA.vmean, min: dataA.vmin, max: dataA.vmax, units: dataA.units } : null;
    const text  = await explainGraph(variable,
      `${yearA} vs ${yearB}`, stats, 'Global', 'comparison');
    setExplanation(text);
    setExplaining(false);
  };

  const years  = timeSteps.map(t => t.year);
  const yearA  = years[idxA] || '—';
  const yearB  = years[idxB] || '—';

  // Build bar chart data from stats
  const barData = dataA && dataB ? [
    { name: 'Mean',  A: parseFloat(dataA.vmean?.toFixed(3)), B: parseFloat(dataB.vmean?.toFixed(3)) },
    { name: 'Max',   A: parseFloat(dataA.vmax?.toFixed(3)),  B: parseFloat(dataB.vmax?.toFixed(3)) },
    { name: 'Min',   A: parseFloat(dataA.vmin?.toFixed(3)),  B: parseFloat(dataB.vmin?.toFixed(3)) },
  ] : [];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="glass-panel"
        style={{ width: '94vw', maxWidth: '1100px', maxHeight: '92vh', overflow: 'auto', padding: '32px', borderRadius: '24px', border: '1px solid var(--border-subtle)', background: 'rgba(11,11,19,0.95)', boxShadow: '0 0 100px rgba(0,0,0,0.8)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--aurora-cyan)', boxShadow: '0 0 10px var(--aurora-cyan)' }} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '0.02em' }}>
                COMPARE MATRIX
              </h2>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
              {yearA} vs {yearB} · {variable.toUpperCase()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              {['map','bar','line'].map(m => (
                <button key={m} onClick={() => setChartMode(m)} style={{
                  padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
                  border: 'none',
                  background: chartMode===m?'var(--aurora-cyan-dim)':'transparent',
                  color: chartMode===m?'var(--aurora-cyan)':'var(--text-muted)', fontFamily: 'var(--font-mono)',
                  transition: 'all 0.2s'
                }}>{m.toUpperCase()}</button>
              ))}
            </div>
            {chartMode === 'map' && (
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                {['2d','3d'].map(v => (
                  <button key={v} onClick={() => setViewMode(v)} style={{
                    padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
                    border: 'none',
                    background: viewMode===v?'var(--aurora-magenta-dim)':'transparent',
                    color: viewMode===v?'var(--aurora-magenta)':'var(--text-muted)', fontFamily: 'var(--font-mono)',
                    transition: 'all 0.2s'
                  }}>{v.toUpperCase()}</button>
                ))}
              </div>
            )}
            <button onClick={onClose} className="btn-aurora" style={{ width: '32px', height: '32px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>✕</button>
          </div>
        </div>

        {/* Variable selector */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          {VARIABLES.map(v => {
            const active = variable === v.id;
            return (
              <button key={v.id} onClick={() => setVariable(v.id)} style={{
                flex: 1, padding: '16px', borderRadius: '12px', cursor: 'pointer',
                border: `1px solid ${active ? 'var(--aurora-cyan)' : 'var(--border-subtle)'}`,
                background: active ? 'var(--aurora-cyan-dim)' : 'rgba(0,0,0,0.2)',
                color: active ? '#fff' : 'var(--text-muted)',
                fontFamily: 'var(--font-display)', fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                transition: 'all 0.2s',
                boxShadow: active ? '0 0 20px rgba(0,240,255,0.1)' : 'none'
              }}>
                <span style={{ fontSize: '20px', filter: active ? 'drop-shadow(0 0 5px #fff)' : 'grayscale(1)' }}>{v.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700 }}>{v.label}</div>
                  <div style={{ fontSize: '10px', color: active ? 'var(--aurora-cyan)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{v.unit}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Year selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'DATASET ALPHA', val: idxA, setter: setIdxA, color: 'var(--aurora-cyan)' },
            { label: 'DATASET BETA', val: idxB, setter: setIdxB, color: 'var(--aurora-magenta)' }
          ].map(({ label, val, setter, color }) => (
            <div key={label} className="glass-panel" style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${color}33`, background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ color, fontSize: '10px', fontFamily: 'var(--font-mono)', marginBottom: '8px', letterSpacing: '0.1em', fontWeight: 700 }}>{label}</div>
              <select value={val} onChange={e => setter(Number(e.target.value))}
                className="aurora-select"
                style={{ width: '100%', background: 'transparent', color: '#fff', border: 'none', fontSize: '14px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                {timeSteps.map((t, i) => (
                  <option key={i} value={i} style={{ background: '#0b0b13' }}>{t.year}{t.month > 1 ? ` / ${t.month}` : ''}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="aurora-tag" style={{ fontSize: '14px', padding: '10px 20px', color: 'var(--aurora-cyan)' }}>
              SYNCHRONISING QUANTUM DATA...
            </div>
          </div>
        ) : (
          <>
            {/* Map view */}
            {chartMode === 'map' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  {[
                    { data: dataA, idx: idxA, color: 'var(--aurora-cyan)', lbl: 'ALPHA' },
                    { data: dataB, idx: idxB, color: 'var(--aurora-magenta)', lbl: 'BETA' }
                  ].map(({ data, idx, color, lbl }) => (
                    <div key={lbl} className="glass-panel" style={{ 
                      height: '240px', background: 'rgba(0,0,0,0.4)',
                      border: `1px solid ${color}33`, borderRadius: '16px',
                      overflow: 'hidden', position: 'relative' 
                    }}>
                      <div style={{ position: 'absolute', top: '12px', left: '16px', zIndex: 10,
                                    fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800,
                                    color, textShadow: `0 0 20px ${color}44`, pointerEvents: 'none' }}>
                        {years[idx]} <span style={{ fontSize: '10px', color: 'var(--text-muted)', verticalAlign: 'middle', letterSpacing: '0.1em' }}>{lbl}</span>
                      </div>
                      {data && (viewMode === '2d' ? (
                        <Map2D gridData={data.grid} showHeatmap vmin={data.vmin} vmax={data.vmax} colorScale={colorScale} />
                      ) : (
                        <Globe3D dataPoints={data.points || []} showHeatmap colorScale={colorScale} autoRotate={false} />
                      ))}
                    </div>
                  ))}
                </div>

                {/* Diff map */}
                {diffData && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ color: 'var(--aurora-cyan)', fontFamily: 'var(--font-mono)', fontSize: '10px',
                                  letterSpacing: '0.12em', marginBottom: '12px', fontWeight: 700 }}>
                      VARIANCE ANALYSIS (ALPHA − BETA)
                    </div>
                    <div className="glass-panel" style={{ height: '200px', background: 'rgba(0,0,0,0.4)',
                                  border: '1px solid var(--border-subtle)', borderRadius: '16px',
                                  overflow: 'hidden', position: 'relative' }}>
                      <Map2D gridData={diffData.grid} showHeatmap
                             vmin={diffData.vmin} vmax={diffData.vmax} colorScale="RdBu" />
                      <div className="glass-panel" style={{ position: 'absolute', bottom: '16px', left: '50%',
                                    transform: 'translateX(-50%)', background: 'rgba(11,11,19,0.8)',
                                    border: '1px solid var(--border-subtle)', borderRadius: '100px',
                                    padding: '6px 16px', fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap',
                                    fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                        <span style={{ color: '#ef4444' }}>🔴 HIGHER IN ALPHA</span> &nbsp;·&nbsp; <span style={{ color: '#3b82f6' }}>🔵 HIGHER IN BETA</span> &nbsp;·&nbsp; WHITE = STABLE
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Bar chart view */}
            {chartMode === 'bar' && barData.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ color: 'var(--aurora-cyan)', fontFamily: 'var(--font-mono)', fontSize: '10px',
                              letterSpacing: '0.12em', marginBottom: '16px', fontWeight: 700 }}>
                  QUANTITATIVE DATA COMPARISON
                </div>
                <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={barData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Legend verticalAlign="top" height={36} formatter={(value) => <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{value.toUpperCase()}</span>} />
                      <Bar dataKey="A" name={`Year ${yearA}`} fill="var(--aurora-cyan)" radius={[4,4,0,0]} />
                      <Bar dataKey="B" name={`Year ${yearB}`} fill="var(--aurora-magenta)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Line chart view */}
            {chartMode === 'line' && barData.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ color: 'var(--aurora-cyan)', fontFamily: 'var(--font-mono)', fontSize: '10px',
                              letterSpacing: '0.12em', marginBottom: '16px', fontWeight: 700 }}>
                  TREND LINE COMPARISON
                </div>
                <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={barData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTip />} />
                      <Legend verticalAlign="top" height={36} formatter={(value) => <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{value.toUpperCase()}</span>} />
                      <Line dataKey="A" name={`Year ${yearA}`} stroke="var(--aurora-cyan)" strokeWidth={3} dot={{ fill: 'var(--aurora-cyan)', r: 6, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                      <Line dataKey="B" name={`Year ${yearB}`} stroke="var(--aurora-magenta)" strokeWidth={3} dot={{ fill: 'var(--aurora-magenta)', r: 6, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Stats row */}
            {dataA && dataB && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { label: `MEAN Δ (${yearA}→${yearB})`, value: ((dataA.vmean ?? 0) - (dataB.vmean ?? 0)).toFixed(3) },
                  { label: 'MAXIMUM VARIANCE',   value: diffData ? diffData.vmax?.toFixed(3) : '—' },
                  { label: 'MINIMUM VARIANCE',   value: diffData ? diffData.vmin?.toFixed(3) : '—' },
                ].map(s => (
                  <div key={s.label} className="glass-panel" style={{ 
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px', padding: '16px 20px', textAlign: 'center' 
                  }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>{s.label}</div>
                    <div style={{ color: 'var(--aurora-cyan)', fontSize: '20px', fontWeight: 800,
                                  fontFamily: 'var(--font-display)', marginTop: '8px', textShadow: '0 0 15px rgba(0,240,255,0.2)' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Explain AI */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '24px' }}>
              <button className="btn-aurora" onClick={handleExplain} disabled={explaining || !dataA}
                style={{ padding: '12px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {explaining ? '⏳ ANALYSING DATA...' : '🧠 GENERATE AI INSIGHTS'}
              </button>
              <AnimatePresence>
                {explanation && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-panel"
                    style={{ marginTop: '16px', padding: '20px', background: 'rgba(96,165,250,0.05)',
                             border: '1px solid rgba(96,165,250,0.2)', borderRadius: '16px' }}>
                    <div style={{ color: '#60a5fa', fontSize: '10px', fontFamily: 'var(--font-mono)',
                                  marginBottom: '10px', letterSpacing: '0.15em', fontWeight: 700 }}>NEURAL INTERPRETATION</div>
                    <p style={{ color: '#fff', fontSize: '14px', lineHeight: 1.7, margin: 0,
                                opacity: 0.9, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-display)' }}>{explanation}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
