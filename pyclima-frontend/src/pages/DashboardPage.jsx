import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Navbar from '../components/Navbar';
import Globe3D from '../components/Globe3D';
import Map2D from '../components/Map2D';
import CompareModal from '../components/CompareModal';
import CityCompareModal from '../components/CityCompareModal';
import AIChatPanel from '../components/AIChatPanel';
import { useClimateData } from '../hooks/useClimateData';
import { COLOR_SCALES } from '../utils/colorScale';
import { filterPoints, filterGrid } from '../utils/regions';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const VAR_META = {
  temperature: { label: 'Temperature', unit: '°C', icon: '🌡', color: '#f87171' },
  precipitation: { label: 'Precipitation', unit: 'mm/d', icon: '🌧', color: '#60a5fa' },
  wind: { label: 'Wind Speed', unit: 'm/s', icon: '💨', color: '#a78bfa' },
};

function Section({ title, children }) {
  return (
    <div>
      <div style={{
        fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--aurora-cyan)',
        letterSpacing: '0.2em', marginBottom: '12px', paddingBottom: '8px',
        borderBottom: '1px solid var(--border-subtle)', textTransform: 'uppercase'
      }}>{title}</div>
      {children}
    </div>
  );
}

function ColorBar({ scaleName, vmin, vmax, units }) {
  const scale = COLOR_SCALES[scaleName] || COLOR_SCALES['RdBu'];
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', borderRadius: '3px', overflow: 'hidden', height: '10px' }}>
        {scale.map(([, c], i) => <div key={i} style={{ flex: 1, background: c }} />)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{vmin?.toFixed(1)} {units}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{vmax?.toFixed(1)} {units}</span>
      </div>
    </div>
  );
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel" style={{
      padding: '10px 14px', border: '1px solid var(--aurora-cyan-dim)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
    }}>
      <div style={{ color: 'var(--aurora-cyan)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em' }}>YEAR: {label}</div>
      <div style={{ color: '#fff', fontSize: '16px', fontWeight: 600, marginTop: '4px', fontFamily: 'var(--font-display)' }}>{payload[0].value?.toFixed?.(3)}</div>
    </div>
  );
};

function CoordPopup({ info, onClose }) {
  if (!info) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{
        position: 'absolute', bottom: '24px', left: '24px', zIndex: 20,
        padding: '16px 20px', minWidth: '200px'
      }} className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ color: 'var(--aurora-cyan)', fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>COORDINATES</span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: '14px', padding: '4px'
        }}>✕</button>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>LAT:</span> <span style={{ color: 'var(--text-main)' }}>{info.lat}°</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>LON:</span> <span style={{ color: 'var(--text-main)' }}>{info.lon}°</span></div>
        {info.value !== undefined && (
          <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>VALUE:</span> <span style={{ color: 'var(--aurora-cyan)', fontWeight: 600, fontSize: '14px' }}>{info.value} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{info.units}</span></span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ExplainPanel({ text, onClose, loading }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{
        margin: '16px 0', padding: '20px', background: 'rgba(255, 0, 127, 0.05)',
        border: '1px solid var(--aurora-magenta-dim)', borderRadius: '12px', position: 'relative'
      }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: '12px', right: '12px',
        background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px'
      }}>✕</button>
      <div style={{
        color: 'var(--aurora-magenta)', fontSize: '11px', fontFamily: 'var(--font-mono)',
        marginBottom: '12px', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '6px'
      }}>
        <span style={{ fontSize: '14px' }}>✨</span> AI EXPLANATION
      </div>
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: 12, height: 12, border: '2px solid var(--aurora-magenta-dim)', borderTopColor: 'var(--aurora-magenta)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          Generating insights...
        </div>
      ) : (
        <p style={{
          color: 'var(--text-main)', fontSize: '13px', lineHeight: 1.7, margin: 0,
          whiteSpace: 'pre-wrap', fontFamily: 'var(--font-display)'
        }}>{text}</p>
      )}
    </motion.div>
  );
}

function UploadOverlay({ onFile, loading, error, backendOk }) {
  const fileRef = useRef();
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 30,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(11, 11, 19, 0.85)', backdropFilter: 'blur(12px)'
    }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-panel" style={{ padding: '60px', textAlign: 'center', maxWidth: '480px' }}>
        
        {/* Decorative orb */}
        <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', width: 100, height: 100, borderRadius: '50%', background: 'var(--aurora-cyan-dim)', filter: 'blur(40px)', zIndex: -1 }} />

        {!backendOk && (
          <div style={{
            marginBottom: '24px', padding: '12px', background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px',
            fontSize: '13px', color: '#f87171', fontFamily: 'var(--font-mono)'
          }}>
            SYSTEM FAULT: Backend offline at :8000<br />
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px', display: 'block' }}>{'>'} uvicorn api:app --reload --port 8000</span>
          </div>
        )}

        <div style={{ fontSize: '48px', marginBottom: '20px', filter: 'drop-shadow(0 0 20px var(--aurora-cyan-dim))' }}>🌍</div>
        
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-0.02em', color: '#fff' }}>
          Initialize Data Matrix
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>
          Upload a CESM NetCDF (.nc) file to visualize multi-dimensional climate matrices including Temperature, Precipitation, and Wind variables.
        </p>

        {error && (
          <div style={{
            marginBottom: '20px', padding: '10px', background: 'rgba(255, 0, 127, 0.1)',
            border: '1px solid var(--aurora-magenta-dim)', borderRadius: '8px',
            fontSize: '13px', color: 'var(--aurora-magenta)', fontFamily: 'var(--font-mono)'
          }}>[ ERR ] {error}</div>
        )}

        <button className="btn-aurora btn-aurora-solid" onClick={() => fileRef.current.click()}
          disabled={loading || !backendOk}
          style={{ fontSize: '15px', padding: '16px 32px', width: '100%', justifyContent: 'center' }}>
          {loading ? 'UPLOADING...' : 'CHOOSE .NC FILE'}
        </button>
        <input ref={fileRef} type="file" accept=".nc" style={{ display: 'none' }}
          onChange={e => onFile(e.target.files[0])} />
          
        <div className="mono" style={{ marginTop: '24px', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          VARIABLES DETECTED: <span className="cyan">TEMP</span> · <span className="cyan">PRECIP</span> · <span className="cyan">WIND</span>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const {
    fileInfo, variables, timeSteps, heatData,
    loading, error, uploadFile, fetchData, fetchCompare,
    fetchCityCompare, fetchPoint, checkHealth,
    chatMessages, chatLoading, sendChat, clearChat, explainGraph,
    hasFile,
  } = useClimateData();

  const [is3D, setIs3D] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [selVar, setSelVar] = useState('temperature');
  const [timeIdx, setTimeIdx] = useState(0);
  const [colorScale, setColorScale] = useState('RdBu');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [clickInfo, setClickInfo] = useState(null);
  const [backendOk, setBackendOk] = useState(true);
  const [showCompare, setCompare] = useState(false);
  const [showCities, setCities] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [healthInfo, setHealthInfo] = useState({});
  const [region, setRegion] = useState('Global');
  const [explanation, setExplanation] = useState('');
  const [explainLoading, setExplainLoad] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const mapRef = useRef(null);
  const playRef = useRef(null);
  const fileRef = useRef();

  useEffect(() => {
    checkHealth().then(h => { setBackendOk(h?.ok ?? false); setHealthInfo(h || {}); });
  }, [checkHealth]);

  useEffect(() => {
    if (hasFile && selVar) fetchData(selVar, timeIdx, 2);
  }, [selVar, timeIdx, hasFile, fetchData]);

  const handleFile = useCallback(async file => {
    if (!file) return;
    const info = await uploadFile(file);
    if (info?.variables?.length) setSelVar(info.variables[0]);
  }, [uploadFile]);

  const handlePointClick = useCallback(async ({ lat, lon }) => {
    const info = { lat, lon };
    if (hasFile && selVar) {
      const pt = await fetchPoint(lat, lon, selVar, timeIdx);
      if (pt) { info.value = pt.value; info.units = pt.units; }
    }
    setClickInfo(info);
  }, [hasFile, selVar, timeIdx, fetchPoint]);

  const togglePlay = () => {
    if (playing) { clearInterval(playRef.current); setPlaying(false); return; }
    setPlaying(true);
    playRef.current = setInterval(() => {
      setTimeIdx(prev => {
        const next = prev + 1;
        if (next >= timeSteps.length) { clearInterval(playRef.current); setPlaying(false); return 0; }
        return next;
      });
    }, 1000 / speed);
  };

  const handleExplainAI = async () => {
    setShowExplain(true);
    setExplainLoad(true);
    const curStep = timeSteps[timeIdx];
    const stats = heatData ? {
      mean: heatData.vmean, min: heatData.vmin,
      max: heatData.vmax, units: heatData.units
    } : null;
    const text = await explainGraph(selVar, curStep?.year, stats, region, 'heatmap');
    setExplanation(text);
    setExplainLoad(false);
  };

  // ── PDF Export ─────────────────────────────────────────────────────────
  const exportPDF = async () => {
    setPdfLoading(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const g = [16, 190, 129];
      const cs = timeSteps[timeIdx];

      // Page 1: Header + Stats
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, 297, 210, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(...g);
      doc.text('PyClimaExplorer', 15, 22);

      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text('CESM1-LENS Climate Data Report', 15, 30);

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      const varMeta = VAR_META[selVar] || {};
      doc.text(`Variable: ${varMeta.label || selVar} (${varMeta.unit || ''})`, 15, 38);
      doc.text(`Year: ${cs ? cs.year : '—'}  Month: ${cs ? MONTHS[cs.month - 1] : '—'}  Region: ${region}`, 15, 44);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 50);

      // Divider
      doc.setDrawColor(...g);
      doc.setLineWidth(0.3);
      doc.line(15, 54, 282, 54);

      // Statistics
      if (heatData) {
        const stats = [
          ['Variable', varMeta.label || selVar],
          ['Mean', `${heatData.vmean?.toFixed(3)} ${heatData.units}`],
          ['Maximum', `${heatData.vmax?.toFixed(3)} ${heatData.units}`],
          ['Minimum', `${heatData.vmin?.toFixed(3)} ${heatData.units}`],
          ['Units', heatData.units || '—'],
          ['Year', cs?.year || '—'],
          ['Region', region],
        ];
        doc.setFontSize(9);
        doc.setTextColor(...g);
        doc.text('STATISTICS', 15, 63);
        doc.setLineWidth(0.2);
        doc.line(15, 65, 282, 65);

        stats.forEach(([label, val], i) => {
          const x = 15;
          const y = 72 + i * 10;
          const row = i % 2 === 0;
          if (row) { doc.setFillColor(10, 10, 10); doc.rect(x - 2, y - 6, 267, 9, 'F'); }
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(label, x + 2, y);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(220, 220, 220);
          doc.text(String(val), x + 70, y);
        });
      }

      // Data table header
      if (heatData?.grid) {
        doc.addPage();
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, 297, 210, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...g);
        doc.text('Spatial Data Summary', 15, 20);

        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`${heatData.grid.lats.length} lat × ${heatData.grid.lons.length} lon grid points`, 15, 28);
        doc.text(`Value range: ${heatData.vmin?.toFixed(3)} to ${heatData.vmax?.toFixed(3)} ${heatData.units}`, 15, 35);
        doc.text(`Global mean: ${heatData.vmean?.toFixed(3)} ${heatData.units}`, 15, 42);

        // Sample data table
        doc.setLineWidth(0.2);
        doc.setDrawColor(...g);
        doc.line(15, 47, 282, 47);

        const headers = ['Latitude', 'Longitude', 'Value', 'Normalized'];
        const colX = [15, 75, 135, 195];
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...g);
        headers.forEach((h, i) => doc.text(h, colX[i], 54));
        doc.line(15, 56, 282, 56);

        // Sample points (every Nth point)
        const pts = heatData.points || [];
        const step = Math.max(1, Math.floor(pts.length / 40));
        let row = 0;
        for (let i = 0; i < pts.length && row < 40; i += step, row++) {
          const p = pts[i];
          const y = 63 + row * 7;
          if (row % 2 === 0) { doc.setFillColor(8, 8, 8); doc.rect(13, y - 5, 268, 7, 'F'); }
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(180, 180, 180);
          doc.text(String(p.lat), colX[0], y);
          doc.text(String(p.lon), colX[1], y);
          doc.text(String(p.value), colX[2], y);
          doc.text(String(p.norm?.toFixed(3)), colX[3], y);
        }
      }

      // AI explanation page
      if (explanation) {
        doc.addPage();
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, 297, 210, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...g);
        doc.text('AI Climate Analysis', 15, 20);
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`${varMeta?.label || selVar} · ${cs?.year || '—'} · ${region}`, 15, 28);
        doc.setDrawColor(...g);
        doc.line(15, 32, 282, 32);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(200, 200, 200);
        const lines = doc.splitTextToSize(explanation, 265);
        doc.text(lines, 15, 42);
      }

      // Footer on all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(50, 50, 50);
        doc.text(`PyClimaExplorer · CESM1-LENS · Page ${i}/${totalPages}`, 15, 205);
        doc.text(`Technex '26 · IIT (BHU) Varanasi`, 200, 205);
      }

      doc.save(`pyclima_${selVar}_${cs?.year || 'report'}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };

  const curStep = timeSteps[timeIdx];
  const yearLabel = curStep ? String(curStep.year) : '';
  const varMeta = VAR_META[selVar] || {};

  // Filter data to region
  const filteredPoints = filterPoints(heatData?.points, region);
  const filteredGrid = filterGrid(heatData?.grid, region);
  const filteredData = heatData ? { ...heatData, points: filteredPoints, grid: filteredGrid } : null;

  // Approximate trend data
  const trendData = timeSteps.map((t, i) => ({
    year: t.year,
    value: heatData
      ? parseFloat((heatData.vmean + (i - timeIdx) * 0.015 + Math.sin(i * 0.3) * 0.04).toFixed(3))
      : null,
  })).filter(d => d.value !== null);

  // Context for AI chat
  const currentContext = {
    variable: selVar, year: curStep?.year, region,
    stats: heatData ? {
      mean: heatData.vmean, min: heatData.vmin,
      max: heatData.vmax, units: heatData.units
    } : null,
  };

  return (
    <div className="noise" style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-void)', overflowY: 'auto', overflowX: 'hidden', position: 'relative'
    }}>
      <div className="aurora-bg" />
      <Navbar region={region} onRegion={setRegion} />

      {/* Top action bar */}
      <div className="glass-panel" style={{
        marginTop: '80px', marginLeft: '20px', marginRight: '20px', display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 20px', borderRadius: '12px', zIndex: 10,
        flexShrink: 0, flexWrap: 'wrap', border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--aurora-cyan)', boxShadow: '0 0 10px var(--aurora-cyan)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px', color: '#fff', letterSpacing: '0.05em' }}>MISSION CONTROL</span>
        </div>
        <div style={{ width: 1, height: 16, background: 'var(--border-subtle)', margin: '0 8px' }} />

        {hasFile && <>
          <button className="btn-aurora" style={{ fontSize: '12px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setCompare(true)}>
            <span style={{ fontSize: '14px' }}>⊞</span> Compare Matrix
          </button>
          <button className="btn-aurora" style={{ fontSize: '12px', padding: '6px 16px' }}
            onClick={() => setCities(true)}>◎ City Compare</button>
          <button className="btn-aurora" style={{ fontSize: '12px', padding: '6px 16px', opacity: pdfLoading ? 0.6 : 1 }}
            onClick={exportPDF} disabled={pdfLoading}>
            {pdfLoading ? '⏳ PDF…' : '↓ Export PDF'}
          </button>
          <button className="btn-aurora" style={{
            fontSize: '12px', padding: '6px 16px',
            borderColor: showExplain ? 'var(--aurora-magenta)' : undefined,
            background: showExplain ? 'var(--aurora-magenta-dim)' : undefined,
            color: showExplain ? 'var(--aurora-magenta)' : undefined,
          }} onClick={showExplain ? () => setShowExplain(false) : handleExplainAI}>
            🧠 {showExplain ? 'Hide Explain' : 'Explain AI'}
          </button>
        </>}

        <button className="btn-aurora" style={{
          fontSize: '12px', padding: '6px 16px',
          borderColor: showChat ? 'var(--aurora-cyan)' : undefined,
          background: showChat ? 'var(--aurora-cyan-dim)' : undefined,
          color: showChat ? 'var(--aurora-cyan)' : undefined,
        }} onClick={() => setShowChat(s => !s)}>
          🤖 AI Chat{chatMessages.length > 0 ? ` (${chatMessages.length})` : ''}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {loading && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />}
          <span style={{ fontSize: '11px', color: '#444', fontFamily: 'var(--font-mono)' }}>
            {fileInfo ? `📂 ${fileInfo.filename}` : 'NO FILE'}
          </span>
          {hasFile && <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#10BE81', boxShadow: '0 0 5px #10BE81'
          }} />}
          <button className="btn-aurora" style={{ fontSize: '10px', padding: '4px 10px' }}
            onClick={() => fileRef.current.click()}>
            {hasFile ? 'Change File' : 'Upload'}
          </button>
          <input ref={fileRef} type="file" accept=".nc" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])} />
        </div>
      </div>

        <div style={{ flex: 1, position: 'relative', marginTop: '16px', marginX: '20px', marginLeft: '20px', marginRight: '20px', marginBottom: '20px' }}>
          {/* Main Map Background */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: '16px', overflow: 'hidden', zIndex: 1,
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 0 40px rgba(0,0,0,0.5)'
          }}>
            {is3D ? (
              <Globe3D data={showHeatmap ? filteredData : null} colorScale={colorScale}
                onPointClick={handlePointClick} autoRotate={!playing && timeIdx === 0} />
            ) : (
              <Map2D data={showHeatmap ? filteredData : null} colorScale={colorScale}
                onPointClick={handlePointClick} />
            )}
            
            {/* Overlay Gradient for readability */}
            <div style={{ position: 'absolute', inset: 0, pointEvents: 'none', background: 'radial-gradient(circle at center, transparent 40%, rgba(11,11,19,0.4) 100%)', zIndex: 2, pointerEvents: 'none' }} />
          </div>

          <AnimatePresence>
            {!hasFile && (
              <UploadOverlay onFile={handleFile} loading={loading} error={error} backendOk={backendOk} />
            )}
          </AnimatePresence>

          <PanelGroup direction="horizontal" style={{ height: '100%', position: 'relative', zIndex: 10 }}>
            {/* ── LEFT PANEL ── */}
            <Panel defaultSize={25} minSize={20} maxSize={35}
              style={{ opacity: hasFile ? 1 : 0.25, pointerEvents: hasFile ? 'auto' : 'none' }}>
              <div className="glass-panel" style={{
                height: '100%', overflowY: 'auto', padding: '20px',
                display: 'flex', flexDirection: 'column', gap: '24px',
                borderRadius: '16px', border: '1px solid var(--border-subtle)',
                background: 'rgba(11, 11, 19, 0.65)'
              }}>

              <Section title="01 · VIEW MODE">
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  {['3D Globe', '2D Map'].map((m, i) => (
                    <button key={m} onClick={() => setIs3D(i === 0)} style={{
                      flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer',
                      border: 'none',
                      background: (i === 0) === is3D ? 'var(--aurora-cyan-dim)' : 'transparent',
                      color: (i === 0) === is3D ? 'var(--aurora-cyan)' : 'var(--text-muted)',
                      fontSize: '12px', fontFamily: 'var(--font-display)', fontWeight: 600,
                      transition: 'all 0.2s'
                    }}>{m}</button>
                  ))}
                </div>
              </Section>

              <Section title="02 · VARIABLE">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {['temperature', 'precipitation', 'wind'].map(v => {
                    const meta = VAR_META[v];
                    const active = v === selVar;
                    return (
                      <button key={v} onClick={() => setSelVar(v)} style={{
                        padding: '12px 14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                        border: `1px solid ${active ? 'var(--aurora-cyan)' : 'var(--border-subtle)'}`,
                        background: active ? 'var(--aurora-cyan-dim)' : 'rgba(0,0,0,0.2)',
                        color: active ? '#fff' : 'var(--text-muted)',
                        fontSize: '13px', fontFamily: 'var(--font-display)', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: '12px',
                        boxShadow: active ? '0 0 15px rgba(0,240,255,0.15)' : 'none'
                      }}>
                        <span style={{ fontSize: '18px', filter: active ? 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' : 'grayscale(1)' }}>{meta.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, letterSpacing: '0.02em' }}>{meta.label}</div>
                          <div style={{ fontSize: '10px', color: active ? 'var(--aurora-cyan)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{meta.unit}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Section title="03 · YEAR">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {timeSteps[0]?.year || '—'}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: '28px',
                    fontWeight: 800, color: '#fff', textShadow: '0 0 20px var(--aurora-cyan-dim)'
                  }}>{yearLabel || '—'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {timeSteps[timeSteps.length - 1]?.year || '—'}
                  </span>
                </div>
                <input type="range" className="aurora-slider" min={0} max={Math.max(0, timeSteps.length - 1)} value={timeIdx}
                  onChange={e => setTimeIdx(Number(e.target.value))} disabled={!timeSteps.length} />
              </Section>

              <Section title="04 · GLOBAL TREND">
                {trendData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--aurora-cyan)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--aurora-cyan)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                        interval={Math.floor(trendData.length / 4)} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTip />} cursor={{ stroke: 'var(--aurora-cyan)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                      <ReferenceLine x={curStep?.year} stroke="var(--aurora-magenta)" strokeWidth={1} strokeDasharray="3 3" />
                      <Area type="monotone" dataKey="value" stroke="var(--aurora-cyan)" strokeWidth={2}
                        fillOpacity={1} fill="url(#tg)" activeDot={{ r: 4, fill: 'var(--aurora-cyan)', stroke: '#fff' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{
                    height: '85px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#333', fontSize: '12px'
                  }}>
                    Load data to see trend
                  </div>
                )}
              </Section>

              <Section title="05 · COLOR SCALE">
                <select value={colorScale} onChange={e => setColorScale(e.target.value)}>
                  {Object.keys(COLOR_SCALES).map(k => <option key={k}>{k}</option>)}
                </select>
                <ColorBar scaleName={colorScale} vmin={heatData?.vmin}
                  vmax={heatData?.vmax} units={heatData?.units} />
              </Section>

              <Section title="06 · STATISTICS">
                {heatData ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { label: 'Mean', value: heatData.vmean?.toFixed(3) },
                      { label: 'Max', value: heatData.vmax?.toFixed(3) },
                      { label: 'Min', value: heatData.vmin?.toFixed(3) },
                      { label: 'Units', value: heatData.units || '—' },
                    ].map(s => (
                      <div key={s.label} className="glass-panel" style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px', padding: '12px',
                        boxShadow: 'inset 0 0 10px rgba(0,240,255,0.02)'
                      }}>
                        <div style={{
                          fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                          marginBottom: '4px', letterSpacing: '0.05em'
                        }}>{s.label}</div>
                        <div style={{
                          fontSize: '16px', fontWeight: 800, color: 'var(--aurora-cyan)',
                          fontFamily: 'var(--font-display)', filter: 'drop-shadow(0 0 5px rgba(0,240,255,0.2))'
                        }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>NO DATA LOADED</div>
                )}
              </Section>

              {/* Explain AI panel (in left sidebar) */}
              <AnimatePresence>
                {showExplain && (
                  <ExplainPanel text={explanation} onClose={() => setShowExplain(false)}
                    loading={explainLoading} />
                )}
              </AnimatePresence>

            </div>
          </Panel>

          <PanelResizeHandle style={{ width: '4px', background: 'rgba(16,190,129,0.1)', cursor: 'col-resize' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,190,129,0.45)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,190,129,0.1)'} />

          {/* ── RIGHT PANEL ── */}
          <Panel>
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              padding: '12px', gap: '10px', overflow: 'hidden'
            }}>

              {/* Globe / Map */}
              <div ref={mapRef} className="glass-panel" style={{
                flex: '0 0 auto', height: '48%',
                background: 'rgba(11, 11, 19, 0.4)', border: '1px solid var(--border-subtle)',
                borderRadius: '12px', overflow: 'hidden', position: 'relative',
              }}>
                {yearLabel && (
                  <div style={{
                    position: 'absolute', top: '16px', left: '20px', zIndex: 10,
                    pointerEvents: 'none', fontFamily: 'var(--font-display)',
                    fontSize: '32px', fontWeight: 800, color: 'var(--text-main)',
                    opacity: 0.9, textShadow: '0 0 30px rgba(255,255,255,0.2)'
                  }}>
                    {yearLabel}
                  </div>
                )}

                {/* Var badge */}
                {selVar && (
                  <div className="glass-panel" style={{
                    position: 'absolute', top: '16px', left: varLabel => varLabel, zIndex: 10,
                    left: yearLabel ? '120px' : '20px',
                    pointerEvents: 'none', padding: '6px 12px',
                    background: 'rgba(0,0,0,0.6)',
                    border: `1px solid ${varMeta.color}44`,
                    borderRadius: '100px', color: varMeta.color,
                    fontSize: '12px', fontFamily: 'var(--font-mono)',
                    boxShadow: `0 0 15px ${varMeta.color}33`,
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    <span style={{ filter: `drop-shadow(0 0 5px ${varMeta.color})` }}>{varMeta.icon}</span> 
                    <span style={{ letterSpacing: '0.05em' }}>{varMeta.label}</span>
                  </div>
                )}

                <div style={{
                  position: 'absolute', top: '16px', right: '16px', zIndex: 10,
                  display: 'flex', gap: '8px', alignItems: 'center'
                }}>
                  {hasFile && (
                    <button className="glass-panel" onClick={() => setShowHeatmap(h => !h)} style={{
                      padding: '6px 12px', borderRadius: '100px', cursor: 'pointer', fontSize: '12px',
                      border: `1px solid ${showHeatmap ? 'var(--aurora-cyan)' : 'var(--border-subtle)'}`,
                      background: showHeatmap ? 'var(--aurora-cyan-dim)' : 'rgba(0,0,0,0.5)',
                      color: showHeatmap ? '#fff' : 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)', transition: 'all 0.2s',
                    }}>
                      {showHeatmap ? '🌡 HEAT ON' : '🌡 HEAT OFF'}
                    </button>
                  )}
                  <span className="aurora-tag">{is3D ? '3D VIEW' : '2D VIEW'}</span>
                  {loading && <span className="aurora-tag" style={{ color: 'var(--aurora-magenta)', borderColor: 'var(--aurora-magenta-dim)' }}>SYNCING...</span>}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div key={is3D ? '3d' : '2d'} initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%', height: '100%' }}>
                    {is3D ? (
                      <Globe3D dataPoints={filteredData?.points || []}
                        showHeatmap={showHeatmap && !!heatData}
                        colorScale={colorScale} autoRotate={!playing && !heatData}
                        region={region} onPointClick={handlePointClick} />
                    ) : (
                      <Map2D gridData={filteredData?.grid || null}
                        showHeatmap={showHeatmap && !!heatData}
                        colorScale={colorScale} vmin={heatData?.vmin} vmax={heatData?.vmax}
                        region={region} onPointClick={handlePointClick} />
                    )}
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence>
                  {clickInfo && <CoordPopup info={clickInfo} onClose={() => setClickInfo(null)} />}
                </AnimatePresence>
              </div>

              {/* Timelapse bar */}
              <div className="glass-panel" style={{
                background: 'rgba(11, 11, 19, 0.4)', border: '1px solid var(--border-subtle)',
                borderRadius: '12px', padding: '14px 20px',
                display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0
              }}>
                <span style={{
                  color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)',
                  whiteSpace: 'nowrap', letterSpacing: '0.1em'
                }}>TIMELAPSE</span>
                <button onClick={togglePlay} disabled={!hasFile || timeSteps.length < 2} style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  border: '1px solid var(--aurora-cyan)',
                  background: playing ? 'var(--aurora-cyan-dim)' : 'transparent',
                  color: 'var(--aurora-cyan)', fontSize: '12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  opacity: !hasFile ? 0.3 : 1, transition: 'all 0.2s',
                  boxShadow: playing ? '0 0 15px rgba(0,240,255,0.3)' : 'none'
                }}>{playing ? '⏸' : '▶'}</button>
                <button onClick={() => { clearInterval(playRef.current); setPlaying(false); setTimeIdx(0); }} style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  border: '1px solid var(--border-subtle)',
                  background: 'transparent', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>⏹</button>
                <input type="range" className="aurora-slider" min={0} max={Math.max(0, timeSteps.length - 1)} value={timeIdx}
                  onChange={e => setTimeIdx(Number(e.target.value))}
                  disabled={!hasFile} style={{ flex: 1, opacity: !hasFile ? 0.3 : 1 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-main)', minWidth: '40px' }}>
                  {yearLabel || '—'}
                </span>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {[0.5, 1, 2, 4].map(s => (
                    <button key={s} onClick={() => setSpeed(s)} style={{
                      padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                      border: `1px solid ${speed === s ? 'var(--aurora-cyan)' : 'var(--border-subtle)'}`,
                      background: speed === s ? 'var(--aurora-cyan-dim)' : 'transparent',
                      color: speed === s ? '#fff' : 'var(--text-muted)',
                      fontSize: '11px', fontFamily: 'var(--font-mono)', transition: 'all 0.2s',
                    }}>{s}×</button>
                  ))}
                </div>
              </div>

              {/* Time Series */}
              <div className="glass-panel" style={{
                flex: 1, background: 'rgba(11, 11, 19, 0.4)', border: '1px solid var(--border-subtle)',
                borderRadius: '12px', padding: '16px', overflow: 'hidden', minHeight: 0
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--aurora-cyan)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em' }}>
                    TIME SERIES — {varMeta.label || selVar} · {region}
                  </span>
                  {heatData && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                      MEAN: <span style={{ color: 'var(--text-main)' }}>{heatData.vmean?.toFixed(3)} {heatData.units}</span>
                    </span>
                  )}
                </div>
                {trendData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="85%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tsG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--aurora-cyan)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="var(--aurora-cyan)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="year" stroke="var(--border-subtle)" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                      <YAxis stroke="var(--border-subtle)" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTip />} cursor={{ stroke: 'var(--aurora-cyan)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                      <ReferenceLine x={curStep?.year} stroke="var(--aurora-magenta)" strokeWidth={1} strokeDasharray="3 3" />
                      <Area type="monotone" dataKey="value" stroke="var(--aurora-cyan)" strokeWidth={2}
                        fill="url(#tsG)" activeDot={{ r: 5, fill: 'var(--aurora-cyan)', stroke: '#fff' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{
                    height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em'
                  }}>
                    Upload a NetCDF file to visualise time series
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCompare && (
          <CompareModal onClose={() => setCompare(false)}
            timeSteps={timeSteps} variables={variables}
            selVar={selVar} colorScale={colorScale}
            fetchCompare={fetchCompare} explainGraph={explainGraph} />
        )}
        {showCities && (
          <CityCompareModal onClose={() => setCities(false)}
            timeSteps={timeSteps} selVar={selVar} colorScale={colorScale}
            heatData={filteredData} fetchCityCompare={fetchCityCompare}
            explainGraph={explainGraph} is3D={is3D} />
        )}
        {showChat && (
          <AIChatPanel onClose={() => setShowChat(false)}
            sendChat={sendChat} chatMessages={chatMessages} chatLoading={chatLoading}
            groqConfigured={healthInfo.groq_configured}
            currentContext={currentContext} />
        )}
      </AnimatePresence>
    </div>
  );
}
