import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Globe3D from './Globe3D';
import Map2D   from './Map2D';

const CITY_A_COLOR = '#10BE81';
const CITY_B_COLOR = '#f59e0b';

const VARIABLES = [
  { id: 'temperature',   label: 'Temperature',   unit: '°C',   icon: '🌡' },
  { id: 'precipitation', label: 'Precipitation', unit: 'mm/d', icon: '🌧' },
  { id: 'wind',          label: 'Wind',          unit: 'm/s',  icon: '💨' },
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
      <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px', marginBottom: '4px', letterSpacing: '0.05em' }}>
        YEAR: {label}
      </div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
        </div>
      ))}
    </div>
  );
};

export default function CityCompareModal({
  onClose, timeSteps, selVar, colorScale,
  heatData, fetchCityCompare, explainGraph, is3D,
}) {
  const [mapMode,    setMapMode]    = useState(is3D ? '3d' : '2d');
  const [step,       setStep]       = useState('pickA');
  const [cityA,      setCityA]      = useState(null);
  const [cityB,      setCityB]      = useState(null);
  const [variable,   setVariable]   = useState(selVar || 'temperature');
  const [series,     setSeries]     = useState([]);
  const [statsA,     setStatsA]     = useState(null);
  const [statsB,     setStatsB]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [explanation,setExplanation]= useState('');

  const handleMapClick = useCallback(async ({ lat, lon }) => {
    if (step === 'pickA') {
      setCityA({ lat, lon, label: `City A (${lat.toFixed(1)}°, ${lon.toFixed(1)}°)` });
      setStep('pickB');
    } else if (step === 'pickB') {
      const cb = { lat, lon, label: `City B (${lat.toFixed(1)}°, ${lon.toFixed(1)}°)` };
      setCityB(cb);
      setStep('done');
      await runCompare(cityA, cb, variable);
    }
  }, [step, cityA, variable]);

  const runCompare = async (ca, cb, varId) => {
    if (!ca || !cb) return;
    setLoading(true);
    setSeries([]);
    try {
      const result = await fetchCityCompare(ca, cb, varId);
      if (result) {
        setSeries(result.series || []);
        setStatsA(result.stats_a);
        setStatsB(result.stats_b);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVariableChange = async (newVar) => {
    setVariable(newVar);
    setExplanation('');
    if (cityA && cityB) {
      await runCompare(cityA, cityB, newVar);
    }
  };

  const reset = () => {
    setStep('pickA'); setCityA(null); setCityB(null);
    setSeries([]); setStatsA(null); setStatsB(null); setExplanation('');
  };

  const handleExplain = async () => {
    setExplaining(true);
    const text = await explainGraph(variable, null,
      statsA ? { mean: statsA.mean, min: statsA.min, max: statsA.max } : null,
      `${cityA?.label} vs ${cityB?.label}`, 'timeseries');
    setExplanation(text);
    setExplaining(false);
  };

  const markers = [
    cityA && { ...cityA, color: CITY_A_COLOR },
    cityB && { ...cityB, color: CITY_B_COLOR },
  ].filter(Boolean);

  const instruction = step === 'pickA' ? 'Click on the map to select City A'
    : step === 'pickB' ? 'Click on the map to select City B'
    : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        className="glass-panel"
        style={{ width: '94vw', maxWidth: '1100px', maxHeight: '93vh', overflow: 'auto', padding: '32px', borderRadius: '24px', border: '1px solid var(--border-subtle)', background: 'rgba(11,11,19,0.95)', boxShadow: '0 0 100px rgba(0,0,0,0.8)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--aurora-cyan)', boxShadow: '0 0 10px var(--aurora-cyan)' }} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '0.02em' }}>
                COORDINATE COMPARISON
              </h2>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
              Select points of interest to analyze temporal divergence
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* 2D/3D toggle */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              {['2d','3d'].map(m => (
                <button key={m} onClick={() => setMapMode(m)} style={{
                  padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
                  border: 'none',
                  background: mapMode===m?'var(--aurora-cyan-dim)':'transparent',
                  color: mapMode===m?'var(--aurora-cyan)':'var(--text-muted)', fontFamily: 'var(--font-mono)',
                  transition: 'all 0.2s'
                }}>{m.toUpperCase()}</button>
              ))}
            </div>
            {step === 'done' && (
              <button className="btn-aurora" style={{ fontSize: '11px', padding: '6px 14px' }} onClick={reset}>
                ↺ CALIBRATE
              </button>
            )}
            <button onClick={onClose} className="btn-aurora" style={{ width: '32px', height: '32px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>✕</button>
          </div>
        </div>

        {/* Variable selector */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          {VARIABLES.map(v => {
            const active = variable === v.id;
            return (
              <button key={v.id} onClick={() => handleVariableChange(v.id)} style={{
                flex: 1, padding: '14px', borderRadius: '12px', cursor: 'pointer',
                border: `1px solid ${active ? 'var(--aurora-cyan)' : 'var(--border-subtle)'}`,
                background: active ? 'var(--aurora-cyan-dim)' : 'rgba(0,0,0,0.2)',
                color: active ? '#fff' : 'var(--text-muted)',
                fontFamily: 'var(--font-display)', fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: 'all 0.2s',
                boxShadow: active ? '0 0 20px rgba(0,240,255,0.1)' : 'none'
              }}>
                <span style={{ fontSize: '18px', filter: active ? 'drop-shadow(0 0 5px #fff)' : 'grayscale(1)' }}>{v.icon}</span>
                <span style={{ fontWeight: 700 }}>{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* City labels */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          {[{ city: cityA, color: CITY_A_COLOR, label: 'DATASET ALPHA' },
            { city: cityB, color: CITY_B_COLOR, label: 'DATASET BETA' }].map(({ city, color, label }) => (
            <div key={label} className="glass-panel" style={{
              flex: 1, padding: '16px 20px',
              background: city ? `${color}10` : 'rgba(0,0,0,0.2)',
              border: `1px solid ${city ? color + '44' : 'var(--border-subtle)'}`,
              borderRadius: '16px',
            }}>
              <div style={{ color, fontSize: '10px', fontFamily: 'var(--font-mono)', marginBottom: '8px', letterSpacing: '0.1em', fontWeight: 700 }}>{label}</div>
              {city ? (
                <div style={{ fontSize: '18px', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 400, marginRight: '4px' }}>LOC:</span>
                  {city.lat.toFixed(3)}°, {city.lon.toFixed(3)}°
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TARGET ACQUISITION PENDING...</div>
              )}
            </div>
          ))}
        </div>

        {/* Instruction banner */}
        <AnimatePresence>
          {instruction && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="aurora-tag"
              style={{ padding: '12px 14px', marginBottom: '16px', fontSize: '13px', textAlign: 'center', display: 'block', width: 'auto', color: 'var(--aurora-cyan)', textShadow: '0 0 10px var(--aurora-cyan-dim)' }}>
              🛰️ GPS INITIALIZED: {instruction.toUpperCase()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map */}
        <div className="glass-panel" style={{ height: '280px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                      borderRadius: '16px', overflow: 'hidden', marginBottom: '24px', position: 'relative' }}>
          {mapMode === '3d' ? (
            <Globe3D dataPoints={heatData?.points || []} showHeatmap={!!heatData}
              colorScale={colorScale} autoRotate={false} cityMarkers={markers}
              onPointClick={step !== 'done' ? handleMapClick : undefined} />
          ) : (
            <Map2D gridData={heatData?.grid || null} showHeatmap={!!heatData}
              colorScale={colorScale} vmin={heatData?.vmin} vmax={heatData?.vmax}
              cityMarkers={markers}
              onPointClick={step !== 'done' ? handleMapClick : undefined} />
          )}
          {step !== 'done' && (
            <div className="glass-panel" style={{ position: 'absolute', top: '16px', right: '16px',
                          background: 'rgba(11,11,19,0.8)', border: '1px solid var(--aurora-cyan)',
                          borderRadius: '100px', padding: '6px 16px',
                          color: 'var(--aurora-cyan)', fontSize: '11px', fontFamily: 'var(--font-mono)', pointerEvents: 'none', letterSpacing: '0.1em', boxShadow: '0 0 20px rgba(0,240,255,0.2)' }}>
              SCANNING: {step === 'pickA' ? 'POINT ALPHA' : 'POINT BETA'}
            </div>
          )}
        </div>

        {/* Time series chart */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '24px', color: '#10BE81',
                        fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
            Loading city time series data…
          </div>
        )}

        {step === 'done' && !loading && series.length > 0 && (
          <>
            <div style={{ color: 'var(--aurora-cyan)', fontFamily: 'var(--font-mono)', fontSize: '10px',
                          letterSpacing: '0.12em', marginBottom: '16px', fontWeight: 700 }}>
              TEMPORAL VARIANCE — {variable.toUpperCase()} INTERSECTION
            </div>
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)', marginBottom: '24px' }}>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={series} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="year" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                         interval={Math.floor(series.length / 8)} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Legend verticalAlign="top" height={36} formatter={(value) => <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{value.toUpperCase()}</span>} />
                  <Line type="monotone" dataKey="cityA" stroke={CITY_A_COLOR} strokeWidth={3}
                    dot={false} name={cityA?.label || 'ALPHA'}
                    activeDot={{ r: 6, fill: CITY_A_COLOR, stroke: '#fff', strokeWidth: 2 }} connectNulls />
                  <Line type="monotone" dataKey="cityB" stroke={CITY_B_COLOR} strokeWidth={3}
                    dot={false} name={cityB?.label || 'BETA'}
                    activeDot={{ r: 6, fill: CITY_B_COLOR, stroke: '#fff', strokeWidth: 2 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {[{ label: cityA?.label, data: statsA, color: CITY_A_COLOR, tag: 'ALPHA' },
                { label: cityB?.label, data: statsB, color: CITY_B_COLOR, tag: 'BETA' }].map(({ label, data, color, tag }) => (
                <div key={label} className="glass-panel" style={{ 
                  background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}33`,
                  borderRadius: '16px', padding: '16px 20px' 
                }}>
                  <div style={{ color, fontSize: '11px', fontFamily: 'var(--font-mono)', marginBottom: '12px', letterSpacing: '0.1em', fontWeight: 700 }}>{tag} CORE STATISTICS</div>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    {[['MEAN', data?.mean], ['MAX', data?.max], ['MIN', data?.min]].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>{k}</div>
                        <div style={{ color: '#fff', fontSize: '18px', fontWeight: 800,
                                      fontFamily: 'var(--font-display)', marginTop: '4px' }}>
                          {v !== undefined ? v.toFixed(3) : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Explain AI */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '24px' }}>
              <button className="btn-aurora" onClick={handleExplain} disabled={explaining}
                style={{ padding: '12px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {explaining ? '⏳ COMPUTING INSIGHTS...' : '🧠 ANALYZE SHIFT'}
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
