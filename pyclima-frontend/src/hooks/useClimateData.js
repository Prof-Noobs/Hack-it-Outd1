import { useState, useCallback, useRef } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function useClimateData() {
  const [fileInfo,     setFileInfo]     = useState(null);
  const [variables,    setVariables]    = useState(['temperature','precipitation','wind']);
  const [timeSteps,    setTimeSteps]    = useState([]);
  const [heatData,     setHeatData]     = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading,  setChatLoading]  = useState(false);
  const abortRef = useRef(null);

  const loadDemo = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/load-demo`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Demo load failed');
      setFileInfo(data);
      setVariables(data.variables?.length ? data.variables : ['temperature','precipitation','wind']);
      setTimeSteps(data.time_steps || []);
      return data;
    } catch (e) { setError(e.message); return null; }
    finally { setLoading(false); }
  }, []);

  const uploadFile = useCallback(async (file) => {
    setLoading(true); setError(null);
    try {
      const form = new FormData(); form.append('file', file);
      const res  = await fetch(`${API}/upload`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setFileInfo(data);
      setVariables(data.variables?.length ? data.variables : ['temperature','precipitation','wind']);
      setTimeSteps(data.time_steps || []);
      return data;
    } catch (e) { setError(e.message); return null; }
    finally { setLoading(false); }
  }, []);

  const fetchData = useCallback(async (variable, timeIndex, resolution = 2) => {
    if (!variable) return null;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/data?variable=${variable}&time_index=${timeIndex}&resolution=${resolution}`, { signal: abortRef.current.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Data fetch failed');
      setHeatData(data); return data;
    } catch (e) { if (e.name !== 'AbortError') setError(e.message); return null; }
    finally { setLoading(false); }
  }, []);

  const fetchCompare = useCallback(async (variable, idxA, idxB, resolution = 3) => {
    try {
      const res  = await fetch(`${API}/compare?variable=${variable}&time_index_a=${idxA}&time_index_b=${idxB}&resolution=${resolution}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Compare failed');
      return data;
    } catch (e) { console.error('Compare error:', e); return null; }
  }, []);

  const fetchCityCompare = useCallback(async (cityA, cityB, variable) => {
    try {
      const res = await fetch(`${API}/city-compare`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city_a: cityA, city_b: cityB, variable }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'City compare failed');
      return data;
    } catch (e) { console.error('City compare error:', e); return null; }
  }, []);

  const fetchTimeseries = useCallback(async (variable) => {
    try {
      const res  = await fetch(`${API}/variable-timeseries?variable=${variable}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      return data;
    } catch (e) { console.error('Timeseries error:', e); return null; }
  }, []);

  const fetchStats = useCallback(async (variable) => {
    try {
      const res  = await fetch(`${API}/variable-stats?variable=${variable}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      return data;
    } catch { return null; }
  }, []);

  const fetchPoint = useCallback(async (lat, lon, variable, timeIndex) => {
    try {
      const res = await fetch(`${API}/point?lat=${lat}&lon=${lon}&variable=${variable}&time_index=${timeIndex}`);
      return await res.json();
    } catch { return null; }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/health`);
      const data = await res.json();
      return { ok: res.ok, ...data };
    } catch { return { ok: false }; }
  }, []);

  const fetchCesmTimesteps = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/cesm-timesteps`);
      return await res.json();
    } catch { return { time_steps: [] }; }
  }, []);

  const sendChat = useCallback(async (message, context = null) => {
    const userMsg = { role: 'user', content: message, id: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const res  = await fetch(`${API}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context }),
      });
      const data = await res.json();
      const assistantMsg = {
        role: 'assistant', id: Date.now() + 1,
        content: data.response || 'No response received.',
        error: data.error,
      };
      setChatMessages(prev => [...prev, assistantMsg]);
      return assistantMsg;
    } catch (e) {
      const errMsg = { role: 'assistant', content: `Error: ${e.message}`, id: Date.now() + 1, error: e.message };
      setChatMessages(prev => [...prev, errMsg]);
      return null;
    } finally { setChatLoading(false); }
  }, []);

  // ── explainGraph ────────────────────────────────────────────────────────────
  // FIX: Normalize the `year` argument before sending to the backend.
  //
  // The backend ExplainRequest now has `year: Optional[str]` (after our api.py fix),
  // but even with that, we sanitize here so the hook is safe regardless of caller:
  //
  //   DashboardPage calls:  explainGraph(selVar, curStep?.year, stats, region, 'heatmap')
  //     → year is a number like 1998  ✓
  //
  //   CompareModal (old) called: explainGraph(variable, `${yearA} vs ${yearB}`, stats, ...)
  //     → year was a string "1920 vs 2018" sent to int field  ✗  (was the crash)
  //
  //   CompareModal (fixed) calls: explainGraph(variable, null, stats, 'Global (A vs B)', type)
  //     → year is null, region carries the context  ✓
  //
  // We convert numbers → strings, leave strings and null as-is, so the backend
  // always receives either a plain string or null — never a bare JS number that
  // Pydantic would previously reject as a non-int string.
  const explainGraph = useCallback(async (variable, year, stats, region, chartType) => {
    // Normalize year: number → string, anything else passes through (null, string)
    let safeYear = null;
    if (year !== null && year !== undefined) {
      safeYear = String(year); // "1998", "1920 vs 2018", etc.
    }

    // Sanitize stats: ensure all numeric values are plain JS numbers, not objects
    let safeStats = null;
    if (stats && typeof stats === 'object') {
      safeStats = {
        mean:  stats.mean  != null ? Number(stats.mean)  : null,
        min:   stats.min   != null ? Number(stats.min)   : null,
        max:   stats.max   != null ? Number(stats.max)   : null,
        units: stats.units != null ? String(stats.units) : '',
      };
      // Drop null values so backend doesn't choke on them
      Object.keys(safeStats).forEach(k => {
        if (safeStats[k] === null) delete safeStats[k];
      });
    }

    const payload = {
      variable:   String(variable),
      year:       safeYear,               // string | null
      stats:      safeStats,              // clean dict | null
      region:     region  || 'Global',
      chart_type: chartType || 'heatmap',
    };

    try {
      const res = await fetch(`${API}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Explain API error:', data);
        return `Backend error: ${data.detail || JSON.stringify(data)}`;
      }
      return data.explanation || 'Could not generate explanation.';
    } catch (e) {
      console.error('explainGraph fetch error:', e);
      return `Network error: ${e.message}`;
    }
  }, []);

  const clearChat = useCallback(() => setChatMessages([]), []);

  return {
    fileInfo, variables, timeSteps, heatData, loading, error,
    chatMessages, chatLoading,
    uploadFile, loadDemo, fetchData, fetchCompare, fetchCityCompare,
    fetchTimeseries, fetchStats, fetchPoint,
    checkHealth, fetchCesmTimesteps,
    sendChat, clearChat, explainGraph,
    hasFile: !!fileInfo,
  };
}