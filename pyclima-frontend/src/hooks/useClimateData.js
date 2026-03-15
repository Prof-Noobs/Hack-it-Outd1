import { useState, useCallback, useRef } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function useClimateData() {
  const [fileInfo,    setFileInfo]    = useState(null);
  const [variables,   setVariables]   = useState(['temperature','precipitation','wind']);
  const [timeSteps,   setTimeSteps]   = useState([]);
  const [heatData,    setHeatData]    = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [chatMessages,setChatMessages]= useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const abortRef = useRef(null);

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
      const assistantMsg = { role: 'assistant', id: Date.now() + 1,
        content: data.response || 'No response received.', error: data.error };
      setChatMessages(prev => [...prev, assistantMsg]);
      return assistantMsg;
    } catch (e) {
      const errMsg = { role: 'assistant', content: `Error: ${e.message}`, id: Date.now() + 1, error: e.message };
      setChatMessages(prev => [...prev, errMsg]); return null;
    } finally { setChatLoading(false); }
  }, []);

  const explainGraph = useCallback(async (variable, year, stats, region, chartType) => {
    try {
      const res = await fetch(`${API}/explain`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variable, year, stats, region, chart_type: chartType }),
      });
      const data = await res.json();
      return data.explanation || 'Could not generate explanation.';
    } catch (e) { return `Error: ${e.message}`; }
  }, []);

  const clearChat = useCallback(() => setChatMessages([]), []);

  return {
    fileInfo, variables, timeSteps, heatData, loading, error,
    chatMessages, chatLoading,
    uploadFile, fetchData, fetchCompare, fetchCityCompare,
    fetchTimeseries, fetchStats, fetchPoint,
    checkHealth, fetchCesmTimesteps,
    sendChat, clearChat, explainGraph,
    hasFile: !!fileInfo,
  };
}
