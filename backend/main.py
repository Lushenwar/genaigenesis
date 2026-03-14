from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional

# Load backend/.env before service modules read environment variables.
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

from services.vertex_ai import vertex_service
from services.firebase import firebase_service
from reasoning.router import router as reasoning_router

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

app = FastAPI(title="ECO-PULSE API", description="AI-powered Urban Heat Mitigation Planner")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(reasoning_router)

class BlueprintRequest(BaseModel):
    latitude: float
    longitude: float
    location_context: Optional[str] = "Toronto urban area"

class BlueprintResponse(BaseModel):
    intervention_strategy: str
    estimated_cost: int
    projected_temperature_drop_celsius: float
    recommended_materials: List[str]
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "Welcome to ECO-PULSE API"}


@app.get("/api/v1/plantation-data")
async def get_plantation_data():
    geojson_path = DATA_DIR / "plantation_final.geojson"
    if not geojson_path.exists():
        raise HTTPException(status_code=404, detail="Plantation data not found")
    return FileResponse(
        geojson_path,
        media_type="application/geo+json",
        headers={"Cache-Control": "public, max-age=3600"},
    )

@app.post("/api/v1/generate-blueprint", response_model=BlueprintResponse)
async def generate_blueprint(request: BlueprintRequest):
    try:
        # Node 1: Gemini 1.5 Pro (The Reasoner)
        blueprint = await vertex_service.generate_intervention_blueprint(
            request.latitude, request.longitude, request.location_context
        )
        
        # Node 2: Imagen 3 (The Visualizer)
        image_url = await vertex_service.generate_visual_overlay(
            request.latitude, request.longitude, blueprint["intervention_strategy"]
        )
        
        blueprint["after_image_url"] = image_url
        return blueprint
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/save-blueprint")
async def save_blueprint(blueprint: BlueprintResponse):
    try:
        blueprint_id = await firebase_service.save_blueprint(blueprint.dict())
        return {"status": "success", "message": "Blueprint saved to Firestore", "id": blueprint_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
