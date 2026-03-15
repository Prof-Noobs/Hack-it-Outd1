# PyClimaExplorer v2 🌍

DEMO DATA BASE LINK = https://drive.google.com/uc?export=download&id=1fiaT0wUEIyr7CUScxCPCnFXH3NlVXC4n
DEMO VIDEO LINK = https://youtu.be/awcHo542ba8



**CESM Climate Data Visualisation · Technex '26 · IIT (BHU) Varanasi**

## Quick Start
```bash
# 1. Add Groq API key (free at console.groq.com)
nano pyclima-backend/.env   # add: GROQ_API_KEY=gsk_xxx

# 2. Place CESM dataset at:
#    pyclima-backend/dataset/CESM1-LENS_011.cvdp_data.1920-2018.nc

# 3. Run both servers
./start.sh
# OR manually:
cd pyclima-backend && pip install -r requirements.txt && uvicorn api:app --reload --port 8000
cd pyclima-frontend && npm install && npm start
```

## New in v2
| Feature | Status |
|---|---|
| 3 clean variables (Temperature, Precipitation, Wind) | ✅ |
| Groq AI Chatbox (LLaMA 3.3 70B) | ✅ |
| Explain AI button (explains any graph) | ✅ |
| Compare Years — working with charts + diff map | ✅ |
| Variable selector in Compare & City modals | ✅ |
| City Compare — fast batch endpoint | ✅ |
| 2D Map — city hover labels (30 cities) | ✅ |
| 3D Globe — heatmap on sphere surface | ✅ |
| PDF Export — 3 pages (stats + table + AI) | ✅ |
| 7 color scales | ✅ |

## API Reference (port 8000)
- `GET /data?variable=temperature&time_index=0` — heatmap data
- `GET /compare?variable=precipitation&time_index_a=0&time_index_b=50` — year comparison
- `POST /city-compare` — batch city time series
- `POST /chat` — Groq AI chat
- `POST /explain` — AI graph explanation
- `GET /variable-stats?variable=wind` — statistics
- `GET /health` — status check
