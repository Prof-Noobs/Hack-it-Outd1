export const COLOR_SCALES = {
  'RdBu': [
    [0.0,  '#2166ac'],
    [0.15, '#4393c3'],
    [0.3,  '#92c5de'],
    [0.45, '#d1e5f0'],
    [0.5,  '#f7f7f7'],
    [0.6,  '#fddbc7'],
    [0.75, '#f4a582'],
    [0.85, '#d6604d'],
    [1.0,  '#b2182b'],
  ],
  'Viridis': [
    [0.0,  '#440154'],
    [0.2,  '#3b528b'],
    [0.4,  '#21918c'],
    [0.6,  '#5ec962'],
    [0.8,  '#aed328'],
    [1.0,  '#fde725'],
  ],
  'Plasma': [
    [0.0,  '#0d0887'],
    [0.25, '#7e03a8'],
    [0.5,  '#cb4679'],
    [0.75, '#f89441'],
    [1.0,  '#f0f921'],
  ],
  'Inferno': [
    [0.0,  '#000004'],
    [0.25, '#420a68'],
    [0.5,  '#932667'],
    [0.75, '#dd513a'],
    [0.9,  '#fca50a'],
    [1.0,  '#f0f921'],
  ],
  'YlOrRd': [
    [0.0,  '#ffffb2'],
    [0.25, '#fecc5c'],
    [0.5,  '#fd8d3c'],
    [0.75, '#f03b20'],
    [1.0,  '#bd0026'],
  ],
  'BlueGreen': [
    [0.0,  '#f7fcfd'],
    [0.25, '#ccece6'],
    [0.5,  '#66c2a4'],
    [0.75, '#2ca25f'],
    [1.0,  '#006d2c'],
  ],
  'CoolWarm': [
    [0.0,  '#3b4cc0'],
    [0.25, '#7b9ff9'],
    [0.5,  '#f2f2f2'],
    [0.75, '#f7a789'],
    [1.0,  '#b40426'],
  ],
};

export function normToColor(norm, scaleName = 'RdBu') {
  const scale   = COLOR_SCALES[scaleName] || COLOR_SCALES['RdBu'];
  const clamped = Math.max(0, Math.min(1, norm));
  for (let i = 1; i < scale.length; i++) {
    const [t0, c0] = scale[i - 1];
    const [t1, c1] = scale[i];
    if (clamped <= t1) {
      const t = (clamped - t0) / (t1 - t0 + 1e-9);
      return lerpHex(c0, c1, t);
    }
  }
  return scale[scale.length - 1][1];
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
}
function lerpHex(c0, c1, t) {
  const [r0,g0,b0] = hexToRgb(c0);
  const [r1,g1,b1] = hexToRgb(c1);
  return rgbToHex(r0+(r1-r0)*t, g0+(g1-g0)*t, b0+(b1-b0)*t);
}

export function hexToThree(hex) {
  return parseInt(hex.replace('#',''), 16);
}
export function isDanger(norm) { return norm >= 0.9; }
