export const REGIONS = {
  Global:         { lat: [-90,  90],  lon: [-180, 180], camZ: 2.5,  label: 'Global' },

  // ── Asia ──────────────────────────────────────────────────────────────────
  Asia:           { lat: [0,    70],  lon: [60,   150], camZ: 1.6,  label: 'Asia' },
  India:          { lat: [6,    38],  lon: [68,    98], camZ: 1.4,  label: 'India' },
  China:          { lat: [18,   54],  lon: [73,   135], camZ: 1.5,  label: 'China' },
  Japan:          { lat: [24,   46],  lon: [122,  146], camZ: 1.6,  label: 'Japan' },
  SouthAsia:      { lat: [5,    40],  lon: [60,   100], camZ: 1.5,  label: 'South Asia' },
  SoutheastAsia:  { lat: [-10,  28],  lon: [92,   142], camZ: 1.5,  label: 'SE Asia' },
  MiddleEast:     { lat: [12,   42],  lon: [25,    65], camZ: 1.6,  label: 'Middle East' },
  Russia:         { lat: [45,   80],  lon: [30,   180], camZ: 1.6,  label: 'Russia' },

  // ── Europe ────────────────────────────────────────────────────────────────
  Europe:         { lat: [35,   72],  lon: [-10,   45], camZ: 1.8,  label: 'Europe' },
  UK:             { lat: [49,   61],  lon: [-8,     2], camZ: 2.0,  label: 'UK' },
  France:         { lat: [42,   52],  lon: [-5,    10], camZ: 2.0,  label: 'France' },
  Germany:        { lat: [47,   56],  lon: [6,     15], camZ: 2.0,  label: 'Germany' },

  // ── Americas ──────────────────────────────────────────────────────────────
  NorthAmerica:   { lat: [15,   75],  lon: [-170,  -50], camZ: 1.7,  label: 'N. America' },
  'North America':{ lat: [15,   75],  lon: [-170,  -50], camZ: 1.7,  label: 'N. America' },
  USA:            { lat: [24,   50],  lon: [-125,  -65], camZ: 1.6,  label: 'USA' },
  Canada:         { lat: [42,   84],  lon: [-141,  -52], camZ: 1.6,  label: 'Canada' },
  SouthAmerica:   { lat: [-60,  15],  lon: [-85,   -30], camZ: 1.8,  label: 'S. America' },
  'South America':{ lat: [-60,  15],  lon: [-85,   -30], camZ: 1.8,  label: 'S. America' },
  Brazil:         { lat: [-34,   6],  lon: [-74,   -34], camZ: 1.6,  label: 'Brazil' },
  Amazon:         { lat: [-20,   5],  lon: [-75,   -45], camZ: 1.6,  label: 'Amazon' },

  // ── Africa ────────────────────────────────────────────────────────────────
  Africa:         { lat: [-40,  40],  lon: [-20,    55], camZ: 1.7,  label: 'Africa' },
  NorthAfrica:    { lat: [15,   38],  lon: [-18,    40], camZ: 1.6,  label: 'N. Africa' },
  SubSaharanAfrica:{ lat: [-35, 15],  lon: [-18,    52], camZ: 1.6,  label: 'Sub-Saharan' },

  // ── Oceania ───────────────────────────────────────────────────────────────
  Australia:      { lat: [-45,  -10], lon: [112,   155], camZ: 1.6,  label: 'Australia' },

  // ── Polar ─────────────────────────────────────────────────────────────────
  Arctic:         { lat: [60,   90],  lon: [-180,  180], camZ: 2.0,  label: 'Arctic' },
  Antarctica:     { lat: [-90, -60],  lon: [-180,  180], camZ: 2.0,  label: 'Antarctica' },

  // ── Oceans ────────────────────────────────────────────────────────────────
  Pacific:        { lat: [-60,  60],  lon: [120,  -70],  camZ: 1.8,  label: 'Pacific' },
  Atlantic:       { lat: [-60,  70],  lon: [-80,   20],  camZ: 1.8,  label: 'Atlantic' },
  IndianOcean:    { lat: [-60,  30],  lon: [20,   120],  camZ: 1.8,  label: 'Indian Ocean' },
};

export const REGION_NAMES = Object.keys(REGIONS);

/** Centre lat/lon of a region */
export function regionCenter(name) {
  const r = REGIONS[name] || REGIONS.Global;
  return {
    lat: (r.lat[0] + r.lat[1]) / 2,
    lon: (r.lon[0] + r.lon[1]) / 2,
  };
}

/** Filter a grid to a region's bounding box */
export function filterGrid(grid, regionName) {
  if (!grid) return grid;
  if (!regionName || regionName === 'Global') return grid;
  const r = REGIONS[regionName];
  if (!r) return grid; // unknown region → return unfiltered

  const lats = grid.lats.map((v, i) => ({ v, i })).filter(({ v }) => v >= r.lat[0] && v <= r.lat[1]);
  const lons = grid.lons.map((v, i) => ({ v, i })).filter(({ v }) => v >= r.lon[0] && v <= r.lon[1]);
  const latIdxs = lats.map(x => x.i);
  const lonIdxs = lons.map(x => x.i);
  return {
    lats: lats.map(x => x.v),
    lons: lons.map(x => x.v),
    z:    latIdxs.map(li => lonIdxs.map(lj => grid.z[li]?.[lj] ?? null)),
  };
}

/** Filter point list to a region */
export function filterPoints(points, regionName) {
  if (!points?.length) return [];
  if (!regionName || regionName === 'Global') return points;
  const r = REGIONS[regionName];
  if (!r) return points; // unknown region → return unfiltered
  return points.filter(p => {
    if (!p) return false; // guard against null/undefined entries
    return p.lat >= r.lat[0] && p.lat <= r.lat[1]
        && p.lon >= r.lon[0] && p.lon <= r.lon[1];
  });
}