// utils/regionDetector.js
// Detects region mentions in chat messages and maps them to region IDs
// used by the REGIONS constant in your app.

// ── Region map: keywords → region ID (must match keys in your REGIONS object) ─
const REGION_KEYWORDS = [
  // Global
  { keywords: ['global', 'world', 'worldwide', 'earth', 'planet'], region: 'Global' },

  // Asia
  { keywords: ['india', 'indian', 'subcontinent', 'hindustan', 'bharat'], region: 'India' },
  { keywords: ['china', 'chinese'], region: 'China' },
  { keywords: ['japan', 'japanese'], region: 'Japan' },
  { keywords: ['southeast asia', 'sea region', 'asean'], region: 'SoutheastAsia' },
  { keywords: ['south asia', 'south asian'], region: 'SouthAsia' },
  { keywords: ['asia', 'asian continent'], region: 'Asia' },
  { keywords: ['middle east', 'arabian', 'persian gulf'], region: 'MiddleEast' },
  { keywords: ['russia', 'russian', 'siberia'], region: 'Russia' },

  // Europe
  { keywords: ['europe', 'european', 'eu', 'european union'], region: 'Europe' },
  { keywords: ['uk', 'united kingdom', 'britain', 'british', 'england'], region: 'UK' },
  { keywords: ['france', 'french'], region: 'France' },
  { keywords: ['germany', 'german'], region: 'Germany' },

  // Americas
  { keywords: ['north america', 'north american'], region: 'NorthAmerica' },
  { keywords: ['south america', 'south american', 'latin america'], region: 'SouthAmerica' },
  { keywords: ['usa', 'united states', 'us ', 'america', 'american'], region: 'USA' },
  { keywords: ['canada', 'canadian'], region: 'Canada' },
  { keywords: ['brazil', 'brazilian'], region: 'Brazil' },
  { keywords: ['amazon', 'amazonia'], region: 'Amazon' },

  // Africa
  { keywords: ['africa', 'african continent'], region: 'Africa' },
  { keywords: ['north africa', 'sahara', 'saharan'], region: 'NorthAfrica' },
  { keywords: ['sub-saharan', 'sub saharan', 'west africa', 'east africa'], region: 'SubSaharanAfrica' },

  // Oceania
  { keywords: ['australia', 'australian', 'oceania'], region: 'Australia' },

  // Polar
  { keywords: ['arctic', 'north pole', 'greenland'], region: 'Arctic' },
  { keywords: ['antarctic', 'antarctica', 'south pole'], region: 'Antarctica' },

  // Oceans / special
  { keywords: ['pacific', 'pacific ocean'], region: 'Pacific' },
  { keywords: ['atlantic', 'atlantic ocean'], region: 'Atlantic' },
  { keywords: ['indian ocean'], region: 'IndianOcean' },
];

/**
 * Scan a text string for region mentions.
 * Returns the FIRST matched region ID, or null if none found.
 *
 * @param {string} text  - chat message or user input
 * @returns {string|null} - region ID like "India", "Global", etc.
 */
export function detectRegion(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  for (const { keywords, region } of REGION_KEYWORDS) {
    for (const kw of keywords) {
      // Word-boundary match: don't match "Indiana" for "india"
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(`(?<![a-z])${escaped}(?![a-z])`, 'i');
      if (rx.test(lower)) {
        return region;
      }
    }
  }
  return null;
}

/**
 * Scan an AI assistant message for an embedded context update block.
 * The AI may respond with something like:
 *   "please update the dashboard context to: {"variable":"temperature","year":2016,"region":"India"}"
 *
 * Returns { variable, year, region } if found, or null.
 *
 * @param {string} text
 * @returns {{ variable?: string, year?: number, region?: string } | null}
 */
export function extractContextUpdate(text) {
  if (!text) return null;

  // Look for a JSON object in the message
  const jsonMatch = text.match(/\{[^{}]*"region"\s*:\s*"([^"]+)"[^{}]*\}/);
  if (jsonMatch) {
    try {
      // Grab the full JSON blob
      const blob = text.match(/\{[^{}]+\}/)?.[0];
      if (blob) {
        const parsed = JSON.parse(blob);
        if (parsed.region) return parsed;
      }
    } catch {
      // Fall through to keyword scan
    }
  }
  return null;
}

/**
 * Full pipeline: given a chat message (user or assistant),
 * return a suggested region change or null.
 *
 * Priority:
 *   1. Embedded JSON context update from AI (most precise)
 *   2. Keyword scan of the message
 *
 * @param {string} text
 * @returns {string|null} region ID
 */
export function getRegionFromMessage(text) {
  // 1. Try embedded context JSON first
  const ctx = extractContextUpdate(text);
  if (ctx?.region) return ctx.region;

  // 2. Fall back to keyword scan
  return detectRegion(text);
}