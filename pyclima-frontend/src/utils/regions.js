export const REGIONS = {
  Global:        { lat: [-90,  90],  lon: [-180, 180], camZ: 2.5,  label: 'Global' },
  Asia:          { lat: [0,   70],   lon: [60,  150],  camZ: 1.6,  label: 'Asia' },
  Europe:        { lat: [35,  72],   lon: [-10,  45],  camZ: 1.8,  label: 'Europe' },
  'North America':{ lat: [15, 75],   lon: [-170, -50], camZ: 1.7,  label: 'N. America' },
  Africa:        { lat: [-40, 40],   lon: [-20,  55],  camZ: 1.7,  label: 'Africa' },
  'South America':{ lat: [-60, 15],  lon: [-85,  -30], camZ: 1.8,  label: 'S. America' },
  Arctic:        { lat: [60,  90],   lon: [-180, 180], camZ: 2.0,  label: 'Arctic' },
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
  if (!grid || regionName === 'Global') return grid;
  const r    = REGIONS[regionName];
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
  if (!points || regionName === 'Global') return points;
  const r = REGIONS[regionName];
  return points.filter(p => p.lat >= r.lat[0] && p.lat <= r.lat[1] && p.lon >= r.lon[0] && p.lon <= r.lon[1]);
}
