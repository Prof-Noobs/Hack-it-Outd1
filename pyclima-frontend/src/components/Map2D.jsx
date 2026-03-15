import React, { useEffect, useRef, useCallback, useState } from 'react';
import { normToColor } from '../utils/colorScale';
import { REGIONS } from '../utils/regions';

const MAJOR_CITIES = [
  { name: 'New York',     lat: 40.71,  lon: -74.01 },
  { name: 'London',       lat: 51.51,  lon: -0.13  },
  { name: 'Paris',        lat: 48.85,  lon:  2.35  },
  { name: 'Tokyo',        lat: 35.69,  lon: 139.69 },
  { name: 'Beijing',      lat: 39.91,  lon: 116.39 },
  { name: 'Mumbai',       lat: 19.08,  lon:  72.88 },
  { name: 'Sydney',       lat:-33.87,  lon: 151.21 },
  { name: 'Sao Paulo',    lat:-23.55,  lon: -46.63 },
  { name: 'Cairo',        lat: 30.04,  lon:  31.24 },
  { name: 'Moscow',       lat: 55.75,  lon:  37.62 },
  { name: 'Dubai',        lat: 25.20,  lon:  55.27 },
  { name: 'Singapore',    lat:  1.35,  lon: 103.82 },
  { name: 'Los Angeles',  lat: 34.05,  lon:-118.24 },
  { name: 'Chicago',      lat: 41.88,  lon: -87.63 },
  { name: 'Toronto',      lat: 43.65,  lon: -79.38 },
  { name: 'Berlin',       lat: 52.52,  lon:  13.40 },
  { name: 'Madrid',       lat: 40.42,  lon:  -3.70 },
  { name: 'Seoul',        lat: 37.57,  lon: 126.98 },
  { name: 'Jakarta',      lat: -6.21,  lon: 106.85 },
  { name: 'Lagos',        lat:  6.45,  lon:   3.40 },
  { name: 'Buenos Aires', lat:-34.61,  lon: -58.38 },
  { name: 'Mexico City',  lat: 19.43,  lon: -99.13 },
  { name: 'Istanbul',     lat: 41.01,  lon:  28.97 },
  { name: 'Varanasi',     lat: 25.32,  lon:  82.97 },
  { name: 'Delhi',        lat: 28.66,  lon:  77.23 },
  { name: 'Shanghai',     lat: 31.23,  lon: 121.47 },
  { name: 'Bangkok',      lat: 13.75,  lon: 100.52 },
  { name: 'Nairobi',      lat: -1.29,  lon:  36.82 },
  { name: 'Karachi',      lat: 24.86,  lon:  67.01 },
];

export default function Map2D({
  gridData    = null,
  showHeatmap = true,
  colorScale  = 'RdBu',
  onPointClick,
  vmin = 0,
  vmax = 1,
  region      = 'Global',
  cityMarkers = [],
}) {
  const canvasRef  = useRef(null);
  const bordersRef = useRef(null);
  const rafRef     = useRef(null);
  const [hoverCity, setHoverCity] = useState(null);
  const [hoverPos,  setHoverPos]  = useState({ x: 0, y: 0 });

  const getViewport = useCallback(() => {
    const r = REGIONS[region] || REGIONS.Global;
    return { latMin: r.lat[0], latMax: r.lat[1], lonMin: r.lon[0], lonMax: r.lon[1] };
  }, [region]);

  const project = useCallback((lon, lat, w, h) => {
    const vp = getViewport();
    return {
      x: ((lon - vp.lonMin) / (vp.lonMax - vp.lonMin)) * w,
      y: ((vp.latMax - lat) / (vp.latMax - vp.latMin)) * h,
    };
  }, [getViewport]);

  const unproject = useCallback((x, y, w, h) => {
    const vp = getViewport();
    return {
      lon: vp.lonMin + (x / w) * (vp.lonMax - vp.lonMin),
      lat: vp.latMax - (y / h) * (vp.latMax - vp.latMin),
    };
  }, [getViewport]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w   = canvas.width;
    const h   = canvas.height;
    const vp  = getViewport();

    // ── Ocean background ──────────────────────────────────────────────────
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0,   '#01050a');
    grad.addColorStop(0.5, '#020d1c');
    grad.addColorStop(1,   '#050a14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // ── Subtle grid lines ─────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(0,240,255,0.06)';
    ctx.lineWidth   = 0.5;
    for (let lat = -80; lat <= 80; lat += 20) {
      if (lat < vp.latMin || lat > vp.latMax) continue;
      const p = project(vp.lonMin, lat, w, h);
      ctx.beginPath(); ctx.moveTo(0, p.y); ctx.lineTo(w, p.y); ctx.stroke();
    }
    for (let lon = -180; lon <= 180; lon += 30) {
      if (lon < vp.lonMin || lon > vp.lonMax) continue;
      const p = project(lon, 0, w, h);
      ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, h); ctx.stroke();
    }

    // ── Heatmap tiles ─────────────────────────────────────────────────────
    if (showHeatmap && gridData?.lats && gridData?.lons && gridData?.z) {
      const { lats, lons, z } = gridData;
      const dlat  = lats.length > 1 ? Math.abs(lats[1] - lats[0]) : 2.5;
      const dlon  = lons.length > 1 ? Math.abs(lons[1] - lons[0]) : 2.5;
      const range = (vmax - vmin) || 1;
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < lats.length; i++) {
        for (let j = 0; j < lons.length; j++) {
          const val = z[i]?.[j];
          if (val == null) continue;
          const norm = Math.max(0, Math.min(1, (val - vmin) / range));
          // Project tile corners — use half-cell padding for seamless coverage
          const p1 = project(lons[j] - dlon * 0.55, lats[i] + dlat * 0.55, w, h);
          const p2 = project(lons[j] + dlon * 0.55, lats[i] - dlat * 0.55, w, h);
          const tw  = Math.max(1.5, p2.x - p1.x);
          const th  = Math.max(1.5, p2.y - p1.y);
          ctx.fillStyle = normToColor(norm, colorScale);
          ctx.fillRect(Math.floor(p1.x), Math.floor(p1.y), Math.ceil(tw), Math.ceil(th));
        }
      }
      ctx.globalAlpha = 1;
    }

    // ── Country borders ───────────────────────────────────────────────────
    // KEY FIX: each ring gets its own beginPath() + we start a new sub-path
    // whenever a point leaves the viewport (prevents the fan-lines artifact)
    if (bordersRef.current) {
      ctx.strokeStyle = (showHeatmap && gridData)
        ? 'rgba(255,255,255,0.7)'
        : 'rgba(0,240,255,0.6)';
      ctx.lineWidth   = (showHeatmap && gridData) ? 1.0 : 0.8;
      ctx.lineJoin    = 'round';

      bordersRef.current.forEach(ring => {
        if (!ring?.length) return;
        // Each ring is its own path — never continue across rings
        ctx.beginPath();
        let penDown = false;
        let prevOut = false;

        for (let k = 0; k < ring.length; k++) {
          const [lon, lat] = ring[k];

          // Check if point is within extended viewport
          const inView = (
            lon >= vp.lonMin - 2 && lon <= vp.lonMax + 2 &&
            lat >= vp.latMin - 2 && lat <= vp.latMax + 2
          );

          if (!inView) {
            // Point is outside — lift the pen
            penDown = false;
            prevOut = true;
            continue;
          }

          const { x, y } = project(lon, lat, w, h);

          if (!penDown || prevOut) {
            // Start a new sub-path — moveTo instead of lineTo
            ctx.moveTo(x, y);
            penDown = true;
          } else {
            ctx.lineTo(x, y);
          }
          prevOut = false;
        }
        ctx.stroke();
      });
    }

    // ── Equator & prime meridian ──────────────────────────────────────────
    ctx.strokeStyle = 'rgba(0,240,255,0.15)';
    ctx.lineWidth   = 1.0;
    ctx.setLineDash([5, 5]);
    if (0 >= vp.latMin && 0 <= vp.latMax) {
      const eq = project(0, 0, w, h);
      ctx.beginPath(); ctx.moveTo(0, eq.y); ctx.lineTo(w, eq.y); ctx.stroke();
    }
    if (0 >= vp.lonMin && 0 <= vp.lonMax) {
      const pm = project(0, 0, w, h);
      ctx.beginPath(); ctx.moveTo(pm.x, 0); ctx.lineTo(pm.x, h); ctx.stroke();
    }
    ctx.setLineDash([]);

    // ── Major city dots ───────────────────────────────────────────────────
    MAJOR_CITIES.forEach(city => {
      if (city.lat < vp.latMin || city.lat > vp.latMax ||
          city.lon < vp.lonMin || city.lon > vp.lonMax) return;
      const { x, y } = project(city.lon, city.lat, w, h);
      if (x < 4 || x > w - 4 || y < 4 || y > h - 4) return;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fill();
    });

    // ── User-selected city markers ────────────────────────────────────────
    cityMarkers.forEach(({ lat, lon, color = '#ffffff', label }) => {
      const { x, y } = project(lon, lat, w, h);
      if (x < 0 || x > w || y < 0 || y > h) return;

      // Outer ring
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.globalAlpha = 0.35;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Inner filled dot
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Label with drop shadow
      if (label) {
        ctx.font        = 'bold 11px DM Mono, monospace';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur  = 5;
        ctx.fillStyle   = color;
        ctx.fillText(label, x + 12, y + 4);
        ctx.shadowBlur  = 0;
      }
    });
  }, [gridData, showHeatmap, colorScale, vmin, vmax, project, getViewport, cityMarkers, region]);

  // Load borders once
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(topo => { bordersRef.current = extractRings(topo); draw(); })
      .catch(() => draw());
  }, []); // eslint-disable-line

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    });
    obs.observe(canvas);
    canvas.width  = canvas.offsetWidth  || 800;
    canvas.height = canvas.offsetHeight || 400;
    return () => obs.disconnect();
  }, [draw]);

  const handleClick = useCallback(e => {
    if (!onPointClick) return;
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width  / rect.width);
    const y = (e.clientY - rect.top)  * (canvas.height / rect.height);
    const { lon, lat } = unproject(x, y, canvas.width, canvas.height);
    onPointClick({ lat: parseFloat(lat.toFixed(3)), lon: parseFloat(lon.toFixed(3)) });
  }, [onPointClick, unproject]);

  const handleMouseMove = useCallback(e => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (canvas.width  / rect.width);
    const my   = (e.clientY - rect.top)  * (canvas.height / rect.height);
    const vp   = getViewport();

    let closest = null;
    let minDist = Infinity;
    MAJOR_CITIES.forEach(city => {
      if (city.lat < vp.latMin || city.lat > vp.latMax ||
          city.lon < vp.lonMin || city.lon > vp.lonMax) return;
      const { x, y } = project(city.lon, city.lat, canvas.width, canvas.height);
      const sx = rect.width  / canvas.width;
      const sy = rect.height / canvas.height;
      const d  = Math.sqrt(((x - mx) * sx) ** 2 + ((y - my) * sy) ** 2);
      if (d < 20 && d < minDist) { minDist = d; closest = city; }
    });
    setHoverCity(closest);
    setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [getViewport, project]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverCity(null)}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
      />
      {hoverCity && (
        <div style={{
          position: 'absolute',
          left: Math.min(hoverPos.x + 14, canvasRef.current ? canvasRef.current.offsetWidth - 140 : 9999),
          top:  hoverPos.y - 30,
          pointerEvents: 'none', zIndex: 20,
          background: 'rgba(0,0,0,0.88)',
          border: '1px solid var(--aurora-cyan)',
          borderRadius: '8px', padding: '6px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px', color: 'var(--aurora-cyan)',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}>
          📍 {hoverCity.name}
        </div>
      )}
    </div>
  );
}

function extractRings(topo) {
  const name   = Object.keys(topo.objects)[0];
  const obj    = topo.objects[name];
  const scale  = topo.transform?.scale    || [1, 1];
  const transl = topo.transform?.translate || [0, 0];
  const decode = arc => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * scale[0] + transl[0], y * scale[1] + transl[1]]; });
  };
  const stitch = idxs => {
    const r = [];
    idxs.forEach(i => { const a = i < 0 ? [...topo.arcs[~i]].reverse() : topo.arcs[i]; r.push(...decode(a)); });
    return r;
  };
  const rings = [];
  (obj.geometries || []).forEach(g => {
    if (g.type === 'Polygon')      g.arcs.forEach(a => rings.push(stitch(a)));
    if (g.type === 'MultiPolygon') g.arcs.forEach(p => p.forEach(a => rings.push(stitch(a))));
  });
  return rings;
}
