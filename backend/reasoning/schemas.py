from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class PlantingSiteRecommendation(BaseModel):
    label: str = Field(..., description="Short site label, e.g. north sidewalk")
    reason: str = Field(..., description="Why this location is suitable")
    priority: str = Field(..., description="Priority level: high, medium, or low")
    estimated_tree_count: int = Field(..., ge=1)
    coordinates_hint: Optional[Dict[str, float]] = Field(
        default=None,
        description="Approximate coordinate hint if available (lat/lng)",
    )


class ReasoningGeoJsonResponse(BaseModel):
    type: Literal["FeatureCollection"]
    name: str
    features: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    generated_image_base64: Optional[str] = Field(
        default=None,
        description="Base64-encoded image with trees overlay (when available).",
    )

