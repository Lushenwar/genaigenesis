import json
import os
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from reasoning.schemas import ReasoningGeoJsonResponse
from reasoning.service import reasoning_service


router = APIRouter(prefix="/api/v1/reasoning", tags=["reasoning"])
BACKEND_ROOT = Path(__file__).resolve().parent.parent
SAMPLE_ZONE_FILE = BACKEND_ROOT / "data" / "top_10_ml_zones.json"
TESTER_HTML_FILE = Path(__file__).resolve().parent / "map_tester.html"
SAT_CACHE_DIR = BACKEND_ROOT / "data" / "satellite_cache"

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")


def _fetch_satellite_image(bounds: dict) -> Optional[bytes]:
    """Fetch a satellite image from Google Maps Static API for the given bounds."""
    if not GOOGLE_MAPS_API_KEY:
        return None

    lat = (bounds["north"] + bounds["south"]) / 2
    lng = (bounds["east"] + bounds["west"]) / 2

    cache_key = f"{lat:.6f}_{lng:.6f}"
    SAT_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = SAT_CACHE_DIR / f"{cache_key}.png"
    if cache_path.exists():
        return cache_path.read_bytes()

    url = (
        f"https://maps.googleapis.com/maps/api/staticmap"
        f"?center={lat},{lng}&zoom=18&size=640x640"
        f"&maptype=satellite&key={GOOGLE_MAPS_API_KEY}"
    )
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            cache_path.write_bytes(data)
            return data
    except (urllib.error.URLError, TimeoutError):
        return None


@router.post("/analyze-area", response_model=ReasoningGeoJsonResponse)
async def analyze_area(
    selected_area_id: str = Form(...),
    geojson_file: UploadFile = File(...),
    area_image: UploadFile | None = File(default=None),
    user_goal: str = Form(default=""),
    max_sites: int = Form(default=5),
):
    try:
        geo_content = await geojson_file.read()
        image_content = None
        image_mime = None
        if area_image is not None:
            image_content = await area_image.read()
            image_mime = area_image.content_type or "image/jpeg"

        result = await reasoning_service.analyze_area_for_tree_planting(
            selected_area_id=selected_area_id,
            geo_payload_bytes=geo_content,
            image_bytes=image_content,
            image_mime_type=image_mime,
            user_goal=user_goal,
            max_sites=max_sites,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/analyze-zone/{zone_id}", response_model=ReasoningGeoJsonResponse)
async def analyze_zone(zone_id: str, max_sites: int = 5):
    """
    All-in-one endpoint: loads the zone from top_10_ml_zones.json,
    fetches a satellite image for it, then sends both to Gemini for
    tree-planting analysis.
    """
    if not SAMPLE_ZONE_FILE.exists():
        raise HTTPException(status_code=404, detail="Zones file not found.")

    zones = json.loads(SAMPLE_ZONE_FILE.read_text(encoding="utf-8"))
    zone = next((z for z in zones if z["zone_id"] == zone_id), None)
    if zone is None:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found.")

    sat_image = _fetch_satellite_image(zone["bounds"])
    sat_mime = "image/png" if sat_image else None

    try:
        result = await reasoning_service.analyze_area_for_tree_planting(
            selected_area_id=zone_id,
            geo_payload_bytes=json.dumps(zones).encode("utf-8"),
            image_bytes=sat_image,
            image_mime_type=sat_mime,
            user_goal="Maximize tree canopy coverage in the highest-priority urban heat zone. Identify specific planting sites.",
            max_sites=max_sites,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/sample-zones")
async def get_sample_zones():
    if not SAMPLE_ZONE_FILE.exists():
        raise HTTPException(status_code=404, detail="Sample zones file not found.")
    try:
        return json.loads(SAMPLE_ZONE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Sample zones file is invalid JSON.") from exc


@router.get("/tester")
async def get_reasoning_tester():
    if not TESTER_HTML_FILE.exists():
        raise HTTPException(status_code=404, detail="Tester page not found.")
    return FileResponse(str(TESTER_HTML_FILE), media_type="text/html")

