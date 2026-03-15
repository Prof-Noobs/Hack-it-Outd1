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

const ChartTip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(11, 11, 19, 0.95)',
      border: '1px solid rgba(0,240,255,0.3)',
      borderRadius: '10px', padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
    }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '11px', marginBottom: '8px', letterSpacing: '0.08em' }}>
        YEAR {label}
      </div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>
          {p.name}: <span style={{ color: '#fff' }}>{typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</span>
          {unit && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginLeft: '4px' }}>{unit}</span>}
        </div>
      ))}
    </div>
  );
};

// ─── Fallback: generate mock series so the chart always renders ───────────────
function mockSeries(cityA, cityB, varId, timeSteps) {
  const years = timeSteps?.length
    ? timeSteps
    : Array.from({ length: 50 }, (_, i) => 1970 + i);

  const seedA = (cityA.lat * 1000 + cityA.lon * 100) % 37;
  const seedB = (cityB.lat * 1000 + cityB.lon * 100) % 41;

  const base = { temperature: 15, precipitation: 2.5, wind: 5 }[varId] ?? 10;
  const amp  = { temperature: 8,  precipitation: 1.2, wind: 2 }[varId] ?? 3;

  let vA = base + seedA * 0.1;
  let vB = base + seedB * 0.1;

  return years.map((year) => {
    vA += (Math.random() - 0.49) * amp * 0.3;
    vB += (Math.random() - 0.49) * amp * 0.3;
    return { year, cityA: parseFloat(vA.toFixed(3)), cityB: parseFloat(vB.toFixed(3)) };
  });
}

function computeStats(series, key) {
  const vals = series.map(d => d[key]).filter(v => v != null);
  if (!vals.length) return null;
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  return { mean, min: Math.min(...vals), max: Math.max(...vals) };
}

export default function CityCompareModal({
  onClose, timeSteps, selVar, colorScale,
  heatData, fetchCityCompare, explainGraph, is3D,
}) {
  const [mapMode,     setMapMode]     = useState(is3D ? '3d' : '2d');
  const [step,        setStep]        = useState('pickA');
  const [cityA,       setCityA]       = useState(null);
  const [cityB,       setCityB]       = useState(null);
  const [variable,    setVariable]    = useState(selVar || 'temperature');
  const [series,      setSeries]      = useState([]);
  const [statsA,      setStatsA]      = useState(null);
  const [statsB,      setStatsB]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [explaining,  setExplaining]  = useState(false);
  const [explanation, setExplanation] = useState('');
  const [usingMock,   setUsingMock]   = useState(false);

  const varMeta = VARIABLES.find(v => v.id === variable) || VARIABLES[0];

  // ── Run comparison, fall back to mock if API returns nothing ─────────────
  const runCompare = useCallback(async (ca, cb, varId) => {
    if (!ca || !cb) return;
    setLoading(true);
    setSeries([]);
    setStatsA(null);
    setStatsB(null);
    setUsingMock(false);
    setExplanation('');

    try {
      let s = [], sA = null, sB = null;

      if (typeof fetchCityCompare === 'function') {
        const result = await fetchCityCompare(ca, cb, varId);
        if (result?.series?.length) {
          s  = result.series;
          sA = result.stats_a ?? computeStats(s, 'cityA');
          sB = result.stats_b ?? computeStats(s, 'cityB');
        }
      }

      // Fall back to mock so the chart is never empty
      if (!s.length) {
        s  = mockSeries(ca, cb, varId, timeSteps);
        sA = computeStats(s, 'cityA');
        sB = computeStats(s, 'cityB');
        setUsingMock(true);
      }

      setSeries(s);
      setStatsA(sA);
      setStatsB(sB);
    } catch (err) {
      console.error('fetchCityCompare error:', err);
      const s = mockSeries(ca, cb, varId, timeSteps);
      setSeries(s);
      setStatsA(computeStats(s, 'cityA'));
      setStatsB(computeStats(s, 'cityB'));
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, [fetchCityCompare, timeSteps]);

  const handleMapClick = useCallback(async ({ lat, lon }) => {
    if (step === 'pickA') {
      const ca = { lat, lon, label: `${lat.toFixed(1)}°, ${lon.toFixed(1)}°` };
      setCityA(ca);
      setStep('pickB');
    } else if (step === 'pickB') {
      const cb = { lat, lon, label: `${lat.toFixed(1)}°, ${lon.toFixed(1)}°` };
      setCityB(cb);
      setStep('done');
      // cityA from state isn't updated yet — capture via the setter callback
      setCityA(prev => {
        runCompare(prev, cb, variable);
        return prev;
      });
    }
  }, [step, variable, runCompare]);

  const handleVariableChange = useCallback(async (newVar) => {
    setVariable(newVar);
    setExplanation('');
    if (cityA && cityB) await runCompare(cityA, cityB, newVar);
  }, [cityA, cityB, runCompare]);

  const reset = () => {
    setStep('pickA'); setCityA(null); setCityB(null);
    setSeries([]); setStatsA(null); setStatsB(null);
    setExplanation(''); setUsingMock(false);
  };

  const handleExplain = async () => {
    setExplaining(true);
    try {
      const text = await explainGraph?.(
        variable, null,
        statsA ? { mean: statsA.mean, min: statsA.min, max: statsA.max } : null,
        `${cityA?.label} vs ${cityB?.label}`, 'timeseries'
      );
      setExplanation(text || '');
    } finally {
      setExplaining(false);
    }
  };

  const markers = [
    cityA && { ...cityA, color: CITY_A_COLOR },
    cityB && { ...cityB, color: CITY_B_COLOR },
  ].filter(Boolean);

  const instruction = step === 'pickA' ? 'Click on the map to select City A'
    : step === 'pickB' ? 'Now click to select City B'
    : null;

  const showChart = step === 'done' && series.length > 0;

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="glass-panel"
        style={{
          width: '94vw', maxWidth: '1100px', maxHeight: '93vh',
          overflowY: 'auto', padding: '32px', borderRadius: '24px',
          border: '1px solid var(--border-subtle)',
          background: 'rgba(11,11,19,0.95)',
          boxShadow: '0 0 100px rgba(0,0,0,0.8)'
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--aurora-cyan)', boxShadow: '0 0 10px var(--aurora-cyan)' }} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '0.02em' }}>
                COORDINATE COMPARISON
              </h2>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
              Select two points to analyze temporal divergence
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* 2D / 3D toggle */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              {['2d', '3d'].map(m => (
                <button key={m} onClick={() => setMapMode(m)} style={{
                  padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
                  border: 'none',
                  background: mapMode === m ? 'var(--aurora-cyan-dim)' : 'transparent',
                  color: mapMode === m ? 'var(--aurora-cyan)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)', transition: 'all 0.2s'
                }}>{m.toUpperCase()}</button>
              ))}
            </div>
            {step === 'done' && (
              <button className="btn-aurora" style={{ fontSize: '11px', padding: '6px 14px' }} onClick={reset}>
                ↺ RESET
              </button>
            )}
            <button onClick={onClose} className="btn-aurora"
              style={{ width: '32px', height: '32px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
              ✕
            </button>
          </div>
        </div>

        {/* ── Variable selector ── */}
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
                <span style={{ fontSize: '10px', color: active ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{v.unit}</span>
              </button>
            );
          })}
        </div>

        {/* ── City labels ── */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          {[
            { city: cityA, color: CITY_A_COLOR, label: 'POINT ALPHA', pending: 'Click map to pick City A' },
            { city: cityB, color: CITY_B_COLOR, label: 'POINT BETA',  pending: cityA ? 'Click map to pick City B' : 'Pick City A first' },
          ].map(({ city, color, label, pending }) => (
            <div key={label} className="glass-panel" style={{
              flex: 1, padding: '16px 20px',
              background: city ? `${color}12` : 'rgba(0,0,0,0.2)',
              border: `1px solid ${city ? color + '55' : 'var(--border-subtle)'}`,
              borderRadius: '16px', transition: 'all 0.3s'
            }}>
              <div style={{ color, fontSize: '10px', fontFamily: 'var(--font-mono)', marginBottom: '8px', letterSpacing: '0.1em', fontWeight: 700 }}>{label}</div>
              {city ? (
                <div style={{ fontSize: '18px', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 400, marginRight: '4px' }}>LAT/LON:</span>
                  {city.lat.toFixed(3)}°, {city.lon.toFixed(3)}°
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontStyle: 'italic' }}>{pending}</div>
              )}
            </div>
          ))}
        </div>

        {/* ── Instruction banner ── */}
        <AnimatePresence>
          {instruction && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{
                padding: '12px 14px', marginBottom: '16px', fontSize: '13px', textAlign: 'center',
                background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.25)',
                borderRadius: '10px', color: 'var(--aurora-cyan)',
                fontFamily: 'var(--font-mono)', letterSpacing: '0.05em'
              }}>
              🛰️ {instruction.toUpperCase()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Map ── */}
        <div className="glass-panel" style={{
          height: '280px', background: 'rgba(0,0,0,0.4)',
          border: '1px solid var(--border-subtle)', borderRadius: '16px',
          overflow: 'hidden', marginBottom: '28px', position: 'relative'
        }}>
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
            <div style={{
              position: 'absolute', top: '14px', right: '14px',
              background: 'rgba(11,11,19,0.85)', border: '1px solid var(--aurora-cyan)',
              borderRadius: '100px', padding: '6px 16px',
              color: 'var(--aurora-cyan)', fontSize: '11px', fontFamily: 'var(--font-mono)',
              pointerEvents: 'none', letterSpacing: '0.08em',
              boxShadow: '0 0 20px rgba(0,240,255,0.15)'
            }}>
              SCANNING: {step === 'pickA' ? 'POINT ALPHA' : 'POINT BETA'}
            </div>
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{
            textAlign: 'center', padding: '40px',
            color: CITY_A_COLOR, fontFamily: 'var(--font-mono)', fontSize: '13px',
            letterSpacing: '0.08em'
          }}>
            <div style={{ marginBottom: '8px', fontSize: '20px' }}>⏳</div>
            FETCHING TEMPORAL DATA…
          </div>
        )}

        {/* ── Time-series chart ── */}
        {showChart && !loading && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            {/* Section title + mock notice */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ color: 'var(--aurora-cyan)', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', fontWeight: 700 }}>
                TEMPORAL VARIANCE — {varMeta.label.toUpperCase()} ({varMeta.unit})
              </div>
              {usingMock && (
                <div style={{ color: '#f59e0b', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '100px', padding: '3px 10px' }}>
                  ⚠ SIMULATED DATA
                </div>
              )}
            </div>

            {/* Chart card */}
            <div className="glass-panel" style={{
              padding: '24px 20px 16px', borderRadius: '18px',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(0,0,0,0.25)', marginBottom: '24px'
            }}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={series} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CITY_A_COLOR} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={CITY_A_COLOR} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CITY_B_COLOR} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={CITY_B_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="year"
                    stroke="rgba(255,255,255,0.15)"
                    tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'monospace' }}
                    interval={Math.max(0, Math.floor(series.length / 8) - 1)}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.15)"
                    tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'monospace' }}
                    axisLine={false} tickLine={false}
                    width={48}
                  />
                  <Tooltip content={<ChartTip unit={varMeta.unit} />} />
                  <Legend
                    verticalAlign="top" height={40}
                    formatter={(value) => (
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                        {value}
                      </span>
                    )}
                  />
                  <Line
                    type="monotone" dataKey="cityA"
                    stroke={CITY_A_COLOR} strokeWidth={2.5}
                    dot={false} connectNulls
                    name={cityA?.label || 'ALPHA'}
                    activeDot={{ r: 6, fill: CITY_A_COLOR, stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone" dataKey="cityB"
                    stroke={CITY_B_COLOR} strokeWidth={2.5}
                    dot={false} connectNulls
                    name={cityB?.label || 'BETA'}
                    activeDot={{ r: 6, fill: CITY_B_COLOR, stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ── Stats ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: cityA?.label, data: statsA, color: CITY_A_COLOR, tag: 'ALPHA STATISTICS' },
                { label: cityB?.label, data: statsB, color: CITY_B_COLOR, tag: 'BETA STATISTICS' },
              ].map(({ label, data, color, tag }) => (
                <div key={tag} className="glass-panel" style={{
                  background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}33`,
                  borderRadius: '16px', padding: '18px 22px'
                }}>
                  <div style={{ color, fontSize: '10px', fontFamily: 'var(--font-mono)', marginBottom: '14px', letterSpacing: '0.12em', fontWeight: 700 }}>{tag}</div>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    {[['MEAN', data?.mean], ['MAX', data?.max], ['MIN', data?.min]].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', marginBottom: '4px' }}>{k}</div>
                        <div style={{ color: '#fff', fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                          {v != null ? v.toFixed(2) : '—'}
                          {v != null && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginLeft: '3px' }}>{varMeta.unit}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* ── AI Explain ── */}
            {typeof explainGraph === 'function' && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '24px' }}>
                <button className="btn-aurora" onClick={handleExplain} disabled={explaining}
                  style={{ padding: '12px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {explaining ? '⏳ COMPUTING INSIGHTS...' : '🧠 ANALYZE SHIFT'}
                </button>
                <AnimatePresence>
                  {explanation && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      style={{
                        marginTop: '16px', padding: '20px',
                        background: 'rgba(96,165,250,0.05)',
                        border: '1px solid rgba(96,165,250,0.2)',
                        borderRadius: '16px'
                      }}>
                      <div style={{ color: '#60a5fa', fontSize: '10px', fontFamily: 'var(--font-mono)', marginBottom: '10px', letterSpacing: '0.15em', fontWeight: 700 }}>
                        NEURAL INTERPRETATION
                      </div>
                      <p style={{ color: '#fff', fontSize: '14px', lineHeight: 1.7, margin: 0, opacity: 0.9, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-display)' }}>
                        {explanation}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}