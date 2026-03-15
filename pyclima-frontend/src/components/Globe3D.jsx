import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { normToColor, hexToThree } from '../utils/colorScale';
import { REGIONS } from '../utils/regions';

const Globe3D = forwardRef(function Globe3D({
  dataPoints = [],
  showHeatmap = true,
  colorScale = 'RdBu',
  autoRotate = true,
  region = 'Global',
  cityMarkers = [],
  onPointClick,
}, ref) {
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);

  const zoomIn  = () => setZoom(z => Math.max(z - 0.3, 0.5));  // smaller z = closer
  const zoomOut = () => setZoom(z => Math.min(z + 0.3, 2.5));

  useImperativeHandle(ref, () => ({
    stopRotation:  () => { stateRef.current.autoRotate = false; },
    startRotation: () => { stateRef.current.autoRotate = true; },
  }));

  const latLonToVec3 = (lat, lon, r = 1.012) => {
    const THREE = window.THREE;
    const phi   = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -Math.sin(phi) * Math.cos(theta),
       Math.cos(phi),
       Math.sin(phi) * Math.sin(theta)
    ).multiplyScalar(r);
  };

  // ── Scene init (once) ─────────────────────────────────────────────────────
  useEffect(() => {
    const THREE = window.THREE;
    if (!THREE || !mountRef.current) return;

    const w = mountRef.current.clientWidth  || 600;
    const h = mountRef.current.clientHeight || 600;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.z = 2.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Base ocean canvas
    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = 2048; baseCanvas.height = 1024;
    const bCtx = baseCanvas.getContext('2d');
    const grad = bCtx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0, '#01050a'); grad.addColorStop(0.5, '#020d1c'); grad.addColorStop(1, '#050a14');
    bCtx.fillStyle = grad; bCtx.fillRect(0, 0, 2048, 1024);
    bCtx.strokeStyle = 'rgba(0,240,255,0.08)'; bCtx.lineWidth = 1.0;
    for (let i = 0; i <= 18; i++) { bCtx.beginPath(); bCtx.moveTo(0, i*1024/18); bCtx.lineTo(2048, i*1024/18); bCtx.stroke(); }
    for (let i = 0; i <= 36; i++) { bCtx.beginPath(); bCtx.moveTo(i*2048/36, 0); bCtx.lineTo(i*2048/36, 1024); bCtx.stroke(); }

    const heatCanvas = document.createElement('canvas');
    heatCanvas.width = 2048; heatCanvas.height = 1024;
    const texCanvas  = document.createElement('canvas');
    texCanvas.width  = 2048; texCanvas.height  = 1024;

    const drawComposited = () => {
      const tCtx = texCanvas.getContext('2d');
      tCtx.clearRect(0, 0, 2048, 1024);
      tCtx.drawImage(baseCanvas, 0, 0);
      if (stateRef.current.showHeatmap) tCtx.drawImage(heatCanvas, 0, 0);
    };
    drawComposited();

    const tex = new THREE.CanvasTexture(texCanvas);
    const sphereMat = new THREE.MeshPhongMaterial({ map: tex, specular: new THREE.Color(0x112233), shininess: 4 });
    const sphere    = new THREE.Mesh(new THREE.SphereGeometry(1, 80, 80), sphereMat);
    scene.add(sphere);

    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.045, 64, 64), new THREE.MeshPhongMaterial({ color: 0x00f0ff, side: THREE.BackSide, transparent: true, opacity: 0.1 })));
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.12,  32, 32), new THREE.MeshPhongMaterial({ color: 0x4400ff, side: THREE.BackSide, transparent: true, opacity: 0.04 })));

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dir = new THREE.DirectionalLight(0x00f0ff, 0.5); dir.position.set(5, 3, 5); scene.add(dir);
    const back = new THREE.DirectionalLight(0xff00ff, 0.25); back.position.set(-5, -3, -5); scene.add(back);

    const bordersGroup = new THREE.Group();
    const markersGroup = new THREE.Group();
    scene.add(bordersGroup, markersGroup);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let lastClick = 0;

    const onClick = e => {
      if (!stateRef.current.onPointClick) return;
      const now = Date.now();
      if (now - lastClick < 300) return;
      lastClick = now;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(sphere);
      if (hits.length > 0) {
        const p   = hits[0].point.clone().applyEuler(new THREE.Euler(-sphere.rotation.x, -sphere.rotation.y, 0)).normalize();
        const lat = 90 - Math.acos(Math.max(-1, Math.min(1, p.y))) * 180 / Math.PI;
        const lon = Math.atan2(p.z, -p.x) * 180 / Math.PI - 180;
        stateRef.current.onPointClick({ lat: parseFloat(lat.toFixed(3)), lon: parseFloat(lon.toFixed(3)) });
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    const drawBorders = features => {
      while (bordersGroup.children.length) bordersGroup.remove(bordersGroup.children[0]);
      const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
      features.forEach(f => {
        const g    = f.geometry;
        const sets = g.type === 'Polygon' ? [g.coordinates[0]] : g.type === 'MultiPolygon' ? g.coordinates.map(p => p[0]) : [];
        sets.forEach(coords => {
          if (!coords?.length) return;
          const pts = coords.map(([lo, la]) => latLonToVec3(la, lo));
          bordersGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat.clone()));
        });
      });
    };
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json()).then(topo => drawBorders(topoToFeatures(topo))).catch(() => {});

    let isDragging = false, prev = { x: 0, y: 0 };
    const syncGroups = () => { [bordersGroup, markersGroup].forEach(g => g.rotation.copy(sphere.rotation)); };
    const onDown = e => { isDragging = true; prev = { x: e.clientX, y: e.clientY }; stateRef.current.autoRotate = false; };
    const onUp   = () => { isDragging = false; };
    const onMove = e => {
      if (!isDragging) return;
      sphere.rotation.y += (e.clientX - prev.x) * 0.005;
      sphere.rotation.x += (e.clientY - prev.y) * 0.005;
      syncGroups();
      prev = { x: e.clientX, y: e.clientY };
    };
    renderer.domElement.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);

    const onResize = () => {
      if (!mountRef.current) return;
      const nw = mountRef.current.clientWidth, nh = mountRef.current.clientHeight;
      camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (stateRef.current.autoRotate && !isDragging) { sphere.rotation.y += 0.0015; syncGroups(); }
      renderer.render(scene, camera);
    };
    animate();

    stateRef.current = { autoRotate, showHeatmap, scene, camera, renderer, sphere, bordersGroup, markersGroup, heatCanvas, baseCanvas, texCanvas, tex, drawComposited, onPointClick };

    return () => {
      cancelAnimationFrame(frameId);
      renderer.domElement.removeEventListener('mousedown', onDown);
      renderer.domElement.removeEventListener('click', onClick);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
      if (mountRef.current?.contains(renderer.domElement)) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []); // eslint-disable-line

  useEffect(() => { stateRef.current.onPointClick = onPointClick; }, [onPointClick]);

  useEffect(() => {
    const { heatCanvas, texCanvas, tex, drawComposited } = stateRef.current;
    if (!heatCanvas || !texCanvas || !tex) return;
    stateRef.current.showHeatmap = showHeatmap;
    const hCtx = heatCanvas.getContext('2d');
    hCtx.clearRect(0, 0, 2048, 1024);
    if (showHeatmap && dataPoints.length > 0) {
      dataPoints.forEach(({ lat, lon, norm }) => {
        const px = ((lon + 180) / 360) * 2048;
        const py = ((90 - lat) / 180) * 1024;
        const dotSize = 10;
        const color   = normToColor(norm, colorScale);
        const alpha   = 0.72 + norm * 0.22;
        const g = hCtx.createRadialGradient(px, py, 0, px, py, dotSize);
        g.addColorStop(0,   hexToRgba(color, alpha));
        g.addColorStop(0.6, hexToRgba(color, alpha * 0.7));
        g.addColorStop(1,   hexToRgba(color, 0));
        hCtx.fillStyle = g; hCtx.beginPath(); hCtx.arc(px, py, dotSize, 0, Math.PI * 2); hCtx.fill();
      });
    }
    drawComposited(); tex.needsUpdate = true;
  }, [dataPoints, showHeatmap, colorScale]);

  useEffect(() => {
    const THREE = window.THREE;
    const { markersGroup, sphere } = stateRef.current;
    if (!THREE || !markersGroup) return;
    while (markersGroup.children.length) markersGroup.remove(markersGroup.children[0]);
    cityMarkers.forEach(({ lat, lon, color = '#ffffff' }) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: hexToThree(color) }));
      m.position.copy(latLonToVec3(lat, lon, 1.025));
      markersGroup.add(m);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.025, 0.035, 20), new THREE.MeshBasicMaterial({ color: hexToThree(color), side: THREE.DoubleSide, transparent: true, opacity: 0.55 }));
      ring.position.copy(latLonToVec3(lat, lon, 1.028));
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      markersGroup.add(ring);
    });
    if (sphere) markersGroup.rotation.copy(sphere.rotation);
  }, [cityMarkers]);

  useEffect(() => {
    const { camera, sphere, bordersGroup, markersGroup } = stateRef.current;
    if (!camera || !sphere) return;
    const r    = REGIONS[region] || REGIONS.Global;
    const clat = (r.lat[0] + r.lat[1]) / 2;
    const clon = (r.lon[0] + r.lon[1]) / 2;
    sphere.rotation.y = -(clon * Math.PI / 180);
    sphere.rotation.x =  (clat * Math.PI / 180);
    [bordersGroup, markersGroup].forEach(g => { if (g) g.rotation.copy(sphere.rotation); });
    camera.position.z = r.camZ;
    camera.updateProjectionMatrix();
  }, [region]);

  useEffect(() => { stateRef.current.autoRotate = autoRotate; }, [autoRotate]);

  // ── Apply zoom to camera ──────────────────────────────────────────────────
  useEffect(() => {
    const { camera } = stateRef.current;
    if (!camera) return;
    const r = REGIONS[region] || REGIONS.Global;
    camera.position.z = r.camZ * zoom;
    camera.updateProjectionMatrix();
  }, [zoom, region]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', background: '#010810', borderRadius: '12px', overflow: 'hidden' }}
    >
      {/* ── Zoom controls — bottom center ── */}
      <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 20, display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button onClick={zoomOut} title="Zoom Out"
          style={{ height: '28px', padding: '0 14px', borderRadius: '100px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', transition: 'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,240,255,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}>
          − ZOOM OUT
        </button>
        <div style={{ padding: '0 10px', height: '28px', borderRadius: '100px', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--aurora-cyan)', fontSize: '11px', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', backdropFilter: 'blur(8px)', minWidth: '52px', justifyContent: 'center' }}>
          {zoom.toFixed(2)}×
        </div>
        <button onClick={zoomIn} title="Zoom In"
          style={{ height: '28px', padding: '0 14px', borderRadius: '100px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', transition: 'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,240,255,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}>
          + ZOOM IN
        </button>
      </div>

      {/* Globe mount */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'crosshair' }} />
    </div>
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

function topoToFeatures(topo) {
  const name   = Object.keys(topo.objects)[0];
  const obj    = topo.objects[name];
  const scale  = topo.transform?.scale     || [1, 1];
  const transl = topo.transform?.translate || [0, 0];
  const decode = arc => { let x = 0, y = 0; return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * scale[0] + transl[0], y * scale[1] + transl[1]]; }); };
  const stitch = idxs => { const r = []; idxs.forEach(i => { const a = i < 0 ? [...topo.arcs[~i]].reverse() : topo.arcs[i]; r.push(...decode(a)); }); return r; };
  return (obj.geometries || []).map(g => {
    if (g.type === 'Polygon')      return { geometry: { type: 'Polygon',      coordinates: g.arcs.map(stitch) } };
    if (g.type === 'MultiPolygon') return { geometry: { type: 'MultiPolygon', coordinates: g.arcs.map(p => p.map(stitch)) } };
    return null;
  }).filter(Boolean);
}

export default Globe3D;