import json
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from reasoning.schemas import ReasoningGeoJsonResponse
from reasoning.service import reasoning_service


router = APIRouter(prefix="/api/v1/reasoning", tags=["reasoning"])
BACKEND_ROOT = Path(__file__).resolve().parent.parent
SAMPLE_ZONE_FILE = BACKEND_ROOT / "data" / "top_10_ml_zones.json"
TESTER_HTML_FILE = Path(__file__).resolve().parent / "map_tester.html"


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

