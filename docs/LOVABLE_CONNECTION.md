# Connecting Lovable Frontend to This Backend

Your frontend lives in **Lovable**; the API lives in **this repo**. Here’s the simplest way to connect them.

## 1. Deploy the backend

The Lovable app runs in the browser and must call a **public** API. Run this backend somewhere reachable on the internet, for example:

- **Railway** – connect this repo, set env vars, deploy
- **Render** – Web Service from this repo, start: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Fly.io** – `fly launch` in project root, then `fly deploy`
- **Google Cloud Run** – containerize and deploy

You’ll get a URL like `https://your-api.up.railway.app` or `https://your-app.onrender.com`.

## 2. Allow your Lovable app in CORS

Lovable apps are at **`https://<your-app>.lovable.app`**. The backend must allow that exact origin.

**On your deployment** (Railway, Render, etc.), set:

```bash
CORS_ORIGINS=https://your-app-name.lovable.app
```

If you have multiple frontends (e.g. staging + prod), use a comma-separated list:

```bash
CORS_ORIGINS=https://myapp.lovable.app,https://myapp-staging.lovable.app
```

Local dev already allows `http://localhost:3000` and `http://127.0.0.1:3000`.

## 3. Point Lovable at your API

In **Lovable**:

1. Add an **environment variable** (or use their “API URL” / config if they have it), for example:
   - Name: `VITE_API_URL` or `API_URL`
   - Value: `https://your-api.up.railway.app` (your real backend URL, no trailing slash)

2. In your Lovable app code, call the API using that base URL, for example:
   - `GET ${API_URL}/api/v1/plantation-data`
   - `POST ${API_URL}/api/v1/generate-blueprint` with body `{ latitude, longitude, location_context? }`
   - `POST ${API_URL}/api/v1/save-blueprint` with the blueprint object
   - Reasoning: `POST ${API_URL}/api/v1/reasoning/analyze-area` (multipart form), `GET ${API_URL}/api/v1/reasoning/sample-zones`

Use the same request/response shapes as in this repo (see `backend/main.py` and `backend/reasoning/router.py`).

## API summary

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Health / welcome |
| GET | `/api/v1/plantation-data` | GeoJSON for map |
| POST | `/api/v1/generate-blueprint` | Generate blueprint (lat, lng, location_context?) |
| POST | `/api/v1/save-blueprint` | Save blueprint to Firestore |
| GET | `/api/v1/reasoning/sample-zones` | Sample zones JSON |
| POST | `/api/v1/reasoning/analyze-area` | Analyze area (multipart: selected_area_id, geojson_file, area_image?, user_goal?, max_sites?) |

## Optional: use the in-repo frontend as reference

The `frontend/` in this repo uses `NEXT_PUBLIC_API_URL` (or falls back to `http://localhost:8000`). You can mirror that in Lovable: one env var for the API base URL, then all requests go to `${API_URL}/api/v1/...`.
