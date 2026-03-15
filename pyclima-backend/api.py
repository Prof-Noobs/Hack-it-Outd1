"""
PyClimaExplorer v2 — Enhanced FastAPI Backend
- CESM variable mapping: temperature, precipitation, wind
- Groq-powered AI chat + Explain AI
- Working comparison endpoint
- City comparison time-series endpoint
Run: uvicorn api:app --reload --port 8000
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import xarray as xr
import numpy as np
import tempfile, os, json

from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
groq_client = OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
) if GROQ_API_KEY else None

app = FastAPI(title="PyClimaExplorer v2 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Dataset stores ─────────────────────────────────────────────────────────────
_store    = {}
_cesm_ds  = None
CESM_PATH = "dataset/CESM1-LENS_011.cvdp_data.1920-2018.nc"

# CESM variable mapping: friendly name → actual NetCDF variable candidates
VARIABLE_MAP = {
    "temperature": [
        "tas_global_avg_mon", "tas_trends_ann", "tas_trends_mon",
        "tas", "temp", "temperature", "T", "SAT", "t2m", "TAS",
    ],
    "precipitation": [
        "prate_global_avg_mon", "prate_trends_ann", "prate_trends_mon",
        "pr", "precip", "precipitation", "RAIN", "prcp", "tp", "PRECIP",
    ],
    "wind": [
        "ua_global_avg_mon", "ua_trends_ann", "va_global_avg_mon",
        "uas", "vas", "wind", "windspeed", "sfcWind", "u10", "v10", "WIND",
    ],
}

VARIABLE_LABELS = {
    "temperature":   {"label": "Temperature",   "unit": "degC", "icon": "temperature"},
    "precipitation": {"label": "Precipitation", "unit": "mm/d", "icon": "precipitation"},
    "wind":          {"label": "Wind Speed",    "unit": "m/s",  "icon": "wind"},
}


def try_load_cesm():
    global _cesm_ds
    if os.path.exists(CESM_PATH):
        try:
            _cesm_ds = xr.open_dataset(CESM_PATH, decode_times=False)
            print("CESM dataset loaded. Variables:", list(_cesm_ds.data_vars)[:15])
        except Exception as e:
            print(f"Could not load CESM dataset: {e}")
    else:
        print(f"CESM dataset not found at {CESM_PATH}")

try_load_cesm()


# ── Helpers ────────────────────────────────────────────────────────────────────

def get_coord(ds, candidates):
    for c in candidates:
        if c in ds.dims or c in ds.coords:
            return c
    return None


def to_float(v):
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    return float(v)


def clean_value(val):
    if isinstance(val, float) and np.isnan(val):
        return None
    if isinstance(val, (np.floating, np.float32, np.float64)):
        return float(val)
    if isinstance(val, (np.integer, np.int32, np.int64)):
        return int(val)
    return val


def _active_ds():
    return _store.get("ds") or _cesm_ds


def _resolve_var(ds, friendly: str) -> Optional[str]:
    """Find best matching NetCDF variable for a friendly name."""
    if ds is None:
        return None
    lat_key = get_coord(ds, ["lat", "latitude", "y"])
    lon_key = get_coord(ds, ["lon", "longitude", "x"])
    candidates = VARIABLE_MAP.get(friendly, [friendly])
    # Exact match with spatial dims
    for c in candidates:
        if c in ds.data_vars:
            da = ds[c]
            if lat_key in da.dims or lon_key in da.dims:
                return c
    # Exact match any dims
    for c in candidates:
        if c in ds.data_vars:
            return c
    # Fuzzy match
    kw = friendly.lower()
    for v in ds.data_vars:
        if kw in v.lower():
            return v
    return None


def _var_to_2d(ds, var_name, lat_key, lon_key, time_key=None, time_index=0):
    da = ds[var_name]
    if time_key and time_key in da.dims and len(da[time_key]) > 1:
        da = da.isel({time_key: min(time_index, len(da[time_key]) - 1)})
    da = da.squeeze(drop=True)
    remaining = [d for d in da.dims if d not in (lat_key, lon_key)]
    for d in remaining:
        da = da.isel({d: 0})
    return da


def _make_heatmap(ds, var_name, lat_key, lon_key, time_key=None, time_index=0, resolution=2):
    da = _var_to_2d(ds, var_name, lat_key, lon_key, time_key, time_index)
    if resolution > 1:
        da = da.isel({lat_key: slice(None, None, resolution),
                      lon_key: slice(None, None, resolution)})

    lat_vals = da[lat_key].values.tolist()
    lon_vals = da[lon_key].values.tolist()
    z = np.array(da.values, dtype=float)

    flat = z.ravel()
    flat = flat[~np.isnan(flat)]
    vmin  = float(flat.min())  if len(flat) else 0
    vmax  = float(flat.max())  if len(flat) else 1
    vmean = float(flat.mean()) if len(flat) else 0

    step3d = max(1, len(lat_vals) * len(lon_vals) // 2000)
    points = []
    for i, la in enumerate(lat_vals[::step3d]):
        for j, lo in enumerate(lon_vals[::step3d]):
            v = float(z[i * step3d, j * step3d])
            if np.isnan(v):
                continue
            norm = (v - vmin) / (vmax - vmin + 1e-9)
            points.append({"lat": round(la, 2), "lon": round(lo, 2),
                           "value": round(v, 3), "norm": round(float(norm), 3)})

    grid = {
        "lats": [round(float(x), 2) for x in lat_vals],
        "lons": [round(float(x), 2) for x in lon_vals],
        "z":    [[round(float(v), 3) if not np.isnan(v) else None
                  for v in row] for row in z.tolist()],
    }
    return {"vmin": round(vmin, 3), "vmax": round(vmax, 3), "vmean": round(vmean, 3),
            "points": points, "grid": grid,
            "units": str(ds[var_name].attrs.get("units", ""))}


# ── Available variables ────────────────────────────────────────────────────────

@app.get("/available-variables")
def available_variables():
    result = []
    ds = _active_ds()
    for friendly in ["temperature", "precipitation", "wind"]:
        actual = _resolve_var(ds, friendly) if ds else None
        result.append({
            "id":        friendly,
            "label":     VARIABLE_LABELS[friendly]["label"],
            "unit":      VARIABLE_LABELS[friendly]["unit"],
            "icon":      VARIABLE_LABELS[friendly]["icon"],
            "available": actual is not None,
            "actual_var": actual,
        })
    return result


# ── Upload ─────────────────────────────────────────────────────────────────────

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename.endswith(".nc"):
        raise HTTPException(400, "Only .nc NetCDF files are supported")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".nc")
    try:
        tmp.write(await file.read())
        tmp.close()
        ds = xr.load_dataset(tmp.name)
    except Exception as e:
        raise HTTPException(400, f"Could not read NetCDF file: {e}")
    finally:
        try:
            os.unlink(tmp.name)
        except:
            pass

    lat  = get_coord(ds, ["lat", "latitude", "y", "nav_lat"])
    lon  = get_coord(ds, ["lon", "longitude", "x", "nav_lon"])
    time = get_coord(ds, ["time", "t", "date"])

    if not lat or not lon:
        raise HTTPException(400, "Cannot find lat/lon coordinates.")

    friendly_vars = [f for f in ["temperature", "precipitation", "wind"]
                     if _resolve_var(ds, f)]
    raw_vars = [v for v in ds.data_vars
                if ds[v].dims and lat in ds[v].dims and lon in ds[v].dims]
    variables = friendly_vars if friendly_vars else raw_vars
    if not variables:
        raise HTTPException(400, "No spatial variables found.")

    time_steps = []
    if time:
        raw_times = ds[time].values
        try:
            # First try: values look like plain years (1920.0, 1921.0 ...)
            first = float(raw_times[0])
            if 1500 <= first <= 2200:
                # Plain year numbers — use directly
                time_steps = [{"index": int(i), "year": int(float(v)), "month": 1}
                              for i, v in enumerate(raw_times)]
            else:
                # Try pandas datetime parsing
                import pandas as pd
                times = pd.to_datetime(raw_times)
                time_steps = [{"index": int(i), "year": int(t.year), "month": int(t.month)}
                              for i, t in enumerate(times)]
        except Exception:
            # Fallback: assign sequential years from 1920
            time_steps = [{"index": int(i), "year": 1920 + i, "month": 1}
                          for i in range(len(raw_times))]

    _store.update({"ds": ds, "lat": lat, "lon": lon, "time": time, "filename": file.filename})
    return {
        "variables": variables, "time_steps": time_steps,
        "lat_range": [to_float(float(ds[lat].min())), to_float(float(ds[lat].max()))],
        "lon_range": [to_float(float(ds[lon].min())), to_float(float(ds[lon].max()))],
        "filename":  file.filename,
    }


# ── CESM time steps ────────────────────────────────────────────────────────────

@app.get("/cesm-timesteps")
def cesm_timesteps():
    if _cesm_ds is None:
        return {"years": [], "time_steps": []}
    time_key = get_coord(_cesm_ds, ["time", "t"])
    if time_key:
        n = int(_cesm_ds.dims.get(time_key, 99))
        # CESM 1920-2018 monthly = 1188 steps; if less, map to years
        years = list(range(1920, 1920 + min(n, 99)))
        return {"years": years,
                "time_steps": [{"index": i, "year": y, "month": 1} for i, y in enumerate(years)]}
    return {"years": list(range(1920, 2019)),
            "time_steps": [{"index": i, "year": y, "month": 1} for i, y in enumerate(range(1920, 2019))]}


# ── Heatmap data ───────────────────────────────────────────────────────────────

@app.get("/data")
def get_data(variable: str = Query(...), time_index: int = Query(0), resolution: int = Query(2)):
    ds = _active_ds()
    if ds is None:
        raise HTTPException(400, "No dataset loaded.")

    lat_key  = get_coord(ds, ["lat", "latitude", "y"])
    lon_key  = get_coord(ds, ["lon", "longitude", "x"])
    time_key = get_coord(ds, ["time", "t"])

    actual_var = _resolve_var(ds, variable) or variable
    if actual_var not in ds.data_vars:
        raise HTTPException(404, f"Variable '{variable}' not found. Have: {list(ds.data_vars)[:8]}")

    try:
        result = _make_heatmap(ds, actual_var, lat_key, lon_key, time_key, time_index, resolution)
        result.update({"variable": variable, "actual_var": actual_var, "time_index": time_index})
        return result
    except Exception as e:
        raise HTTPException(500, f"Error: {e}")


# ── Point lookup ───────────────────────────────────────────────────────────────

@app.get("/point")
def get_point(lat: float = Query(...), lon: float = Query(...),
              variable: str = Query(...), time_index: int = Query(0)):
    ds = _active_ds()
    if ds is None:
        raise HTTPException(400, "No dataset loaded.")

    lat_key  = get_coord(ds, ["lat", "latitude", "y"])
    lon_key  = get_coord(ds, ["lon", "longitude", "x"])
    time_key = get_coord(ds, ["time", "t"])
    actual_var = _resolve_var(ds, variable) or variable
    if actual_var not in ds.data_vars:
        raise HTTPException(404, f"Variable not found: {variable}")

    da  = _var_to_2d(ds, actual_var, lat_key, lon_key, time_key, time_index)
    val = da.sel({lat_key: lat, lon_key: lon}, method="nearest")
    return {"lat": round(lat, 4), "lon": round(lon, 4),
            "value": round(float(val.values), 4), "variable": variable,
            "units": str(ds[actual_var].attrs.get("units", ""))}


# ── Compare two time steps ─────────────────────────────────────────────────────

@app.get("/compare")
def compare(variable: str = Query("temperature"), time_index_a: int = Query(0),
            time_index_b: int = Query(-1), resolution: int = Query(3)):
    ds = _active_ds()
    if ds is None:
        raise HTTPException(400, "No dataset loaded.")

    lat_key  = get_coord(ds, ["lat", "latitude", "y"])
    lon_key  = get_coord(ds, ["lon", "longitude", "x"])
    time_key = get_coord(ds, ["time", "t"])
    actual_var = _resolve_var(ds, variable) or variable
    if actual_var not in ds.data_vars:
        raise HTTPException(404, f"Variable '{variable}' not found.")

    if time_index_b < 0 and time_key:
        time_index_b = int(ds.dims.get(time_key, 1)) - 1

    a = _make_heatmap(ds, actual_var, lat_key, lon_key, time_key, time_index_a, resolution)
    b = _make_heatmap(ds, actual_var, lat_key, lon_key, time_key, time_index_b, resolution)

    diff_grid = None
    if a.get("grid") and b.get("grid"):
        lats, lons = a["grid"]["lats"], a["grid"]["lons"]
        za, zb = a["grid"]["z"], b["grid"]["z"]
        z_diff = []
        for i in range(len(lats)):
            row = []
            for j in range(len(lons)):
                va = za[i][j] if i < len(za) and j < len(za[i]) else None
                vb = zb[i][j] if i < len(zb) and j < len(zb[i]) else None
                row.append(round(va - vb, 3) if va is not None and vb is not None else None)
            z_diff.append(row)
        flat = [v for row in z_diff for v in row if v is not None]
        diff_grid = {
            "grid": {"lats": lats, "lons": lons, "z": z_diff},
            "vmin": round(min(flat), 3) if flat else 0,
            "vmax": round(max(flat), 3) if flat else 0,
        }

    return {"variable": variable, "actual_var": actual_var,
            "time_index_a": time_index_a, "time_index_b": time_index_b,
            "data_a": a, "data_b": b, "diff": diff_grid}


# ── Variable timeseries ────────────────────────────────────────────────────────

@app.get("/variable-timeseries")
def variable_timeseries(variable: str = Query("temperature")):
    ds = _active_ds()
    if ds is None:
        raise HTTPException(503, "No dataset available.")

    lat_key  = get_coord(ds, ["lat", "latitude", "y"])
    lon_key  = get_coord(ds, ["lon", "longitude", "x"])
    time_key = get_coord(ds, ["time", "t"])
    actual_var = _resolve_var(ds, variable)
    if not actual_var:
        raise HTTPException(404, f"Variable '{variable}' not found.")

    var = ds[actual_var]
    spatial_dims = [d for d in [lat_key, lon_key] if d and d in var.dims]
    if spatial_dims:
        var = var.mean(dim=spatial_dims)
    if time_key is None or time_key not in var.dims:
        raise HTTPException(400, "No time dimension found.")

    raw_time = ds[time_key].values if time_key in ds.coords else list(range(int(var.shape[0])))
    years = []
    try:
        first = float(raw_time[0])
        if 1500 <= first <= 2200:
            years = [float(v) for v in raw_time]
        else:
            import pandas as pd
            times = pd.to_datetime(raw_time)
            years = [int(t.year) + (int(t.month) - 1) / 12.0 for t in times]
    except Exception:
        years = [float(i) + 1920 for i in range(len(raw_time))]

    values = [clean_value(v) for v in var.values]
    return {"variable": variable, "actual_var": actual_var, "time": years, "values": values}


# ── Variable stats ─────────────────────────────────────────────────────────────

@app.get("/variable-stats")
def variable_stats(variable: str = Query("temperature")):
    ds = _active_ds()
    if ds is None:
        raise HTTPException(503, "No dataset available.")
    actual_var = _resolve_var(ds, variable)
    if not actual_var:
        raise HTTPException(404, f"Variable '{variable}' not found.")
    data = ds[actual_var].values.flatten().astype(float)
    data = data[~np.isnan(data)]
    if not len(data):
        raise HTTPException(400, "Only NaN values.")
    return {"variable": variable, "actual_var": actual_var,
            "min": float(np.min(data)), "max": float(np.max(data)),
            "mean": float(np.mean(data)), "std": float(np.std(data)),
            "shape": list(ds[actual_var].shape), "dims": list(ds[actual_var].dims),
            "units": str(ds[actual_var].attrs.get("units", ""))}


# ── Dataset info ───────────────────────────────────────────────────────────────

@app.get("/dataset-info")
def dataset_info():
    ds = _active_ds()
    if ds is None:
        return {"error": "No dataset loaded"}
    available = []
    for friendly in ["temperature", "precipitation", "wind"]:
        actual = _resolve_var(ds, friendly)
        if actual:
            available.append({"id": friendly, **VARIABLE_LABELS[friendly], "actual_var": actual})
    return {
        "source": "uploaded" if "ds" in _store else "cesm_default",
        "filename": _store.get("filename", "CESM1-LENS default"),
        "available_vars": available,
        "all_variables":  list(ds.data_vars)[:20],
        "dimensions":     {k: int(v) for k, v in ds.dims.items()},
        "has_time":       get_coord(ds, ["time", "t"]) is not None,
    }


# ── AI Chat (Groq) ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None

CHAT_SYSTEM = """You are PyClimaExplorer's AI climate assistant powered by Groq LLaMA.
You help users understand CESM1-LENS climate model data (1920-2018).

The platform shows three variables:
- Temperature (degC): surface air temperature trends
- Precipitation (mm/day): rainfall patterns  
- Wind Speed (m/s): surface wind fields

Be concise, scientific but accessible. Reference:
- Notable climate events (1997-98 El Nino, volcanic eruptions, PDO shifts)
- Regional patterns (monsoons, trade winds, ITCZ, polar amplification)
- Long-term trends (anthropogenic warming signal)

Keep answers under 150 words unless asked for detail.
Always be helpful and mention what to look for on the map.
"""

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    if groq_client is None:
        return {"response": "AI chat requires GROQ_API_KEY in your .env file. Get a free key at console.groq.com", "error": "no_key"}

    ctx = f"\n\nDashboard context: {json.dumps(request.context)}" if request.context else ""
    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": CHAT_SYSTEM},
                      {"role": "user", "content": request.message + ctx}],
            max_tokens=300, temperature=0.7
        )
        return {"response": resp.choices[0].message.content.strip(), "error": None}
    except Exception as e:
        return {"response": f"AI error: {e}", "error": str(e)}


# ── Explain AI (Groq) ─────────────────────────────────────────────────────────

class ExplainRequest(BaseModel):
    variable: str
    year: Optional[int] = None
    stats: Optional[dict] = None
    region: Optional[str] = "Global"
    chart_type: Optional[str] = "heatmap"

EXPLAIN_SYSTEM = """You are a climate scientist explaining visualizations to students and researchers.
Structure your response exactly as:
1. What is shown (1-2 sentences)
• Key pattern 1
• Key pattern 2
• Key pattern 3
2. Scientific significance (1-2 sentences)
Keep total under 180 words. Be specific and educational."""

@app.post("/explain")
async def explain_endpoint(request: ExplainRequest):
    if groq_client is None:
        return {"explanation": "Explain AI requires GROQ_API_KEY in your .env file.", "error": "no_key"}

    stats_str = ""
    if request.stats:
        s = request.stats
        stats_str = f" Current stats: mean={s.get('mean','?')}, min={s.get('min','?')}, max={s.get('max','?')} {s.get('units','')}."

    prompt = (f"Explain the {request.chart_type} of {request.variable} for the "
              f"{request.region} region{f', year {request.year}' if request.year else ''}.{stats_str} "
              f"Data is from CESM1-LENS climate model (1920-2018).")
    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": EXPLAIN_SYSTEM},
                      {"role": "user", "content": prompt}],
            max_tokens=350, temperature=0.6
        )
        return {"explanation": resp.choices[0].message.content.strip(), "error": None}
    except Exception as e:
        return {"explanation": f"Error: {e}", "error": str(e)}


# ── City comparison ────────────────────────────────────────────────────────────

class CityCompareRequest(BaseModel):
    city_a: dict
    city_b: dict
    variable: str = "temperature"

@app.post("/city-compare")
async def city_compare(request: CityCompareRequest):
    ds = _active_ds()
    if ds is None:
        raise HTTPException(400, "No dataset loaded.")

    lat_key  = get_coord(ds, ["lat", "latitude", "y"])
    lon_key  = get_coord(ds, ["lon", "longitude", "x"])
    time_key = get_coord(ds, ["time", "t"])
    actual_var = _resolve_var(ds, request.variable)
    if not actual_var:
        raise HTTPException(404, f"Variable '{request.variable}' not found.")

    da = ds[actual_var]
    if not time_key or time_key not in da.dims:
        raise HTTPException(400, "No time dimension.")

    n_time = int(da.dims[time_key])
    raw_time = ds[time_key].values if time_key in ds.coords else list(range(n_time))
    years = []
    try:
        first = float(raw_time[0])
        if 1500 <= first <= 2200:
            years = [int(float(v)) for v in raw_time]
        else:
            import pandas as pd
            times = pd.to_datetime(raw_time)
            years = [int(t.year) for t in times]
    except Exception:
        years = list(range(1920, 1920 + n_time))

    lat_a, lon_a = request.city_a["lat"], request.city_a["lon"]
    lat_b, lon_b = request.city_b["lat"], request.city_b["lon"]

    try:
        pt_a = da.sel({lat_key: lat_a, lon_key: lon_a}, method="nearest").values
        pt_b = da.sel({lat_key: lat_b, lon_key: lon_b}, method="nearest").values
        series_a = [clean_value(v) for v in pt_a]
        series_b = [clean_value(v) for v in pt_b]
    except Exception as e:
        raise HTTPException(500, f"Error: {e}")

    combined = [{"year": y, "cityA": a, "cityB": b}
                for y, a, b in zip(years, series_a, series_b)]

    def stats(vals):
        v = [x for x in vals if x is not None]
        return {"mean": round(float(np.mean(v)), 3), "max": round(float(np.max(v)), 3),
                "min": round(float(np.min(v)), 3)} if v else {}

    return {
        "variable": request.variable, "series": combined,
        "stats_a": stats(series_a), "stats_b": stats(series_b),
        "city_a": request.city_a, "city_b": request.city_b,
        "units": str(ds[actual_var].attrs.get("units", "")),
    }


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    ds = _active_ds()
    available_vars = [f for f in ["temperature", "precipitation", "wind"]
                      if ds and _resolve_var(ds, f)]
    return {
        "status": "ok",
        "dataset_loaded":  "ds" in _store,
        "cesm_loaded":     _cesm_ds is not None,
        "ai_chat":         groq_client is not None,
        "groq_configured": bool(GROQ_API_KEY),
        "available_vars":  available_vars,
    }


@app.post("/reset-dataset")
def reset_dataset():
    for k in ["ds", "lat", "lon", "time", "filename"]:
        _store.pop(k, None)
    return {"success": True}
