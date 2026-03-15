import json
import os
import base64
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional, Tuple

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_MODEL = os.getenv("GEMINI_API_MODEL", "gemini-2.5-flash")


class ReasoningService:
    def __init__(self) -> None:
        self.api_key = GEMINI_API_KEY
        self.api_model = GEMINI_API_MODEL

    def _generate_with_gemini_api_key(
        self,
        prompt: str,
        image_bytes: Optional[bytes],
        image_mime_type: Optional[str],
    ) -> Optional[str]:
        if not self.api_key:
            return None

        parts: List[Dict[str, Any]] = [{"text": prompt}]
        if image_bytes and image_mime_type:
            parts.append(
                {
                    "inline_data": {
                        "mime_type": image_mime_type,
                        "data": base64.b64encode(image_bytes).decode("utf-8"),
                    }
                }
            )

        payload = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }
        body = json.dumps(payload).encode("utf-8")
        model_candidates: List[str] = []
        for model_name in (self.api_model, "gemini-2.5-flash", "gemini-2.0-flash"):
            if model_name and model_name not in model_candidates:
                model_candidates.append(model_name)

        result = None
        for model_name in model_candidates:
            url = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model_name}:generateContent?key={self.api_key}"
            )
            request = urllib.request.Request(
                url=url,
                data=body,
                method="POST",
                headers={"Content-Type": "application/json"},
            )
            try:
                with urllib.request.urlopen(request, timeout=25) as response:
                    result = json.loads(response.read().decode("utf-8"))
                    break
            except urllib.error.HTTPError:
                continue
            except (urllib.error.URLError, TimeoutError):
                continue

        if result is None:
            return None

        candidates = result.get("candidates", [])
        if not candidates:
            return None

        candidate_content = candidates[0].get("content", {})
        candidate_parts = candidate_content.get("parts", [])
        if not candidate_parts:
            return None

        return candidate_parts[0].get("text")

    def _normalize_geo_data(self, payload: Any) -> List[Dict[str, Any]]:
        # Supports both GeoJSON FeatureCollection and list-based zone JSON.
        if isinstance(payload, dict) and payload.get("type") == "FeatureCollection":
            features = payload.get("features", [])
            if not isinstance(features, list):
                raise ValueError("Invalid GeoJSON: 'features' must be a list.")
            return features

        if isinstance(payload, list):
            return payload

        if isinstance(payload, dict):
            # Fallback for custom JSON wrappers.
            for key in ("zones", "areas", "data", "items"):
                value = payload.get(key)
                if isinstance(value, list):
                    return value

        raise ValueError("Unsupported geo payload format.")

    def _extract_item_id(self, item: Dict[str, Any], index: int) -> str:
        direct_keys = ("id", "zone_id", "area_id", "feature_id", "name")
        for key in direct_keys:
            value = item.get(key)
            if value is not None:
                return str(value)

        properties = item.get("properties", {})
        if isinstance(properties, dict):
            for key in direct_keys:
                value = properties.get(key)
                if value is not None:
                    return str(value)

        return str(index)

    def _find_selected_area(
        self, items: List[Dict[str, Any]], selected_area_id: str
    ) -> Tuple[str, Dict[str, Any]]:
        selected_area_id = str(selected_area_id)

        for i, item in enumerate(items):
            if self._extract_item_id(item, i) == selected_area_id:
                return selected_area_id, item

        if selected_area_id.isdigit():
            idx = int(selected_area_id)
            if 0 <= idx < len(items):
                return selected_area_id, items[idx]

        raise ValueError(
            f"Area '{selected_area_id}' was not found in the uploaded geo file."
        )

    def _build_geo_summary(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        avg_heat_values: List[float] = []
        avg_canopy_values: List[float] = []

        for item in items:
            metrics = item.get("metrics", {})
            if isinstance(metrics, dict):
                heat = metrics.get("avg_heat_index")
                canopy = metrics.get("avg_canopy_coverage_pct")
                if isinstance(heat, (int, float)):
                    avg_heat_values.append(float(heat))
                if isinstance(canopy, (int, float)):
                    avg_canopy_values.append(float(canopy))

        return {
            "total_areas": len(items),
            "avg_heat_index_mean": round(sum(avg_heat_values) / len(avg_heat_values), 2)
            if avg_heat_values
            else None,
            "avg_canopy_coverage_mean": round(
                sum(avg_canopy_values) / len(avg_canopy_values), 2
            )
            if avg_canopy_values
            else None,
        }

    def _safe_json_load(self, text: str) -> Dict[str, Any]:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # In case the model wraps JSON in extra text.
            start = text.find("{")
            end = text.rfind("}")
            if start >= 0 and end > start:
                return json.loads(text[start : end + 1])
            raise

    def _extract_bounds(self, selected_area: Dict[str, Any]) -> Optional[Dict[str, float]]:
        bounds = selected_area.get("bounds")
        if isinstance(bounds, dict):
            required = {"north", "south", "east", "west"}
            if required.issubset(bounds.keys()):
                return {
                    "north": float(bounds["north"]),
                    "south": float(bounds["south"]),
                    "east": float(bounds["east"]),
                    "west": float(bounds["west"]),
                }

        geometry = selected_area.get("geometry")
        if isinstance(geometry, dict) and geometry.get("type") == "Polygon":
            coordinates = geometry.get("coordinates", [])
            if coordinates and isinstance(coordinates[0], list):
                lngs: List[float] = []
                lats: List[float] = []
                for coord in coordinates[0]:
                    if isinstance(coord, list) and len(coord) >= 2:
                        lngs.append(float(coord[0]))
                        lats.append(float(coord[1]))
                if lngs and lats:
                    return {
                        "north": max(lats),
                        "south": min(lats),
                        "east": max(lngs),
                        "west": min(lngs),
                    }
        return None

    def _generate_trees_image_base64(
        self,
        rationale: str,
        satellite_image_bytes: Optional[bytes] = None,
    ) -> Optional[str]:
        """
        Optionally generate an image with trees for the frontend.
        Returns base64-encoded PNG or None if generation is not available.
        Can be wired to Vertex Imagen or another image-generation API.
        """
        try:
            from services.vertex_ai import vertex_service
            if not vertex_service.vertex_enabled or not vertex_service.imagen_model:
                return None
            prompt = (
                "Photorealistic aerial view of an urban neighborhood with added street trees, "
                "green canopy, and planted areas. Same perspective as a satellite image. "
                f"Context: {rationale[:300]}."
            )
            result = vertex_service.imagen_model.generate_images(
                prompt=prompt,
                number_of_images=1,
                aspect_ratio="1:1",
            )
            if result is None:
                return None
            images = getattr(result, "images", None) or getattr(result, "generated_images", [])
            if not images:
                return None
            img = images[0]
            import io
            pil = getattr(img, "_pil_image", None) or getattr(img, "pil_image", None)
            if pil is not None:
                buf = io.BytesIO()
                pil.save(buf, format="PNG")
                return base64.b64encode(buf.getvalue()).decode("utf-8")
        except Exception:
            pass
        return None

    def _bounds_to_polygon_geometry(self, bounds: Dict[str, float]) -> Dict[str, Any]:
        south = bounds["south"]
        north = bounds["north"]
        west = bounds["west"]
        east = bounds["east"]
        return {
            "type": "Polygon",
            "coordinates": [
                [
                    [west, south],
                    [east, south],
                    [east, north],
                    [west, north],
                    [west, south],
                ]
            ],
        }

    def _synthetic_point_for_site(
        self, site_index: int, site_count: int, bounds: Optional[Dict[str, float]]
    ) -> Dict[str, float]:
        if not bounds:
            return {"lat": 0.0, "lng": 0.0}

        south = bounds["south"]
        north = bounds["north"]
        west = bounds["west"]
        east = bounds["east"]

        if site_count <= 1:
            row = 0.5
            col = 0.5
        else:
            step = 1.0 / (site_count + 1)
            row = step * (site_index + 1)
            col = 1.0 - step * (site_index + 1)

        lat = south + (north - south) * row
        lng = west + (east - west) * col
        return {"lat": round(lat, 7), "lng": round(lng, 7)}

    def _build_recommendation_geojson(
        self, parsed: Dict[str, Any], selected_area: Dict[str, Any], resolved_id: str
    ) -> Dict[str, Any]:
        features: List[Dict[str, Any]] = []
        bounds = self._extract_bounds(selected_area)

        area_geometry = selected_area.get("geometry")
        if not isinstance(area_geometry, dict) and bounds:
            area_geometry = self._bounds_to_polygon_geometry(bounds)

        if isinstance(area_geometry, dict):
            features.append(
                {
                    "type": "Feature",
                    "id": f"{resolved_id}-selected-area",
                    "geometry": area_geometry,
                    "properties": {
                        "feature_kind": "selected_area",
                        "selected_area_id": resolved_id,
                        "risk_cluster": selected_area.get("ml_risk_cluster"),
                        "metrics": selected_area.get("metrics", {}),
                    },
                }
            )

        sites = parsed.get("candidate_planting_sites", [])
        if not isinstance(sites, list):
            sites = []

        for idx, site in enumerate(sites):
            if not isinstance(site, dict):
                continue

            coords = site.get("coordinates_hint")
            if not isinstance(coords, dict) or "lat" not in coords or "lng" not in coords:
                coords = self._synthetic_point_for_site(idx, max(1, len(sites)), bounds)

            lat = float(coords.get("lat"))
            lng = float(coords.get("lng"))
            feature = {
                "type": "Feature",
                "id": f"{resolved_id}-site-{idx + 1}",
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": {
                    "feature_kind": "recommended_planting_site",
                    "selected_area_id": resolved_id,
                    "label": site.get("label", f"Planting site {idx + 1}"),
                    "priority": site.get("priority", "medium"),
                    "estimated_tree_count": site.get("estimated_tree_count", 1),
                    "reason": site.get("reason", ""),
                    "recommended_species": parsed.get("recommended_species", []),
                    "confidence": parsed.get("confidence", "low"),
                },
            }
            features.append(feature)

        return {
            "type": "FeatureCollection",
            "name": "tree_planting_recommendation_layer",
            "features": features,
            "metadata": {
                "selected_area_id": resolved_id,
                "confidence": parsed.get("confidence", "low"),
                "rationale": parsed.get("rationale", ""),
                "constraints": parsed.get("constraints", []),
                "quick_wins": parsed.get("quick_wins", []),
                "recommended_species": parsed.get("recommended_species", []),
            },
        }

    async def analyze_area_for_tree_planting(
        self,
        selected_area_id: str,
        geo_payload_bytes: bytes,
        image_bytes: Optional[bytes] = None,
        image_mime_type: Optional[str] = None,
        user_goal: str = "",
        max_sites: int = 5,
    ) -> Dict[str, Any]:
        payload = json.loads(geo_payload_bytes.decode("utf-8"))
        items = self._normalize_geo_data(payload)
        resolved_id, selected_area = self._find_selected_area(items, selected_area_id)
        geo_summary = self._build_geo_summary(items)

        # Keep context bounded for reliability while still giving model useful signal.
        sample_items = items[: min(20, len(items))]

        has_image = bool(image_bytes and image_mime_type)
        visual_guidance = (
            "Infer visual cues from the image (shade gaps, wide sidewalks, parking edges, barren strips)."
            if has_image
            else "No image is provided. Base recommendations only on geo data and explicitly mention this limitation in constraints."
        )

        input_context = (
            "The attached image is the satellite view of this exact area. "
            "The GeoJSON below describes the same area (geometry and properties). "
            "Treat the image and GeoJSON as one unit for your analysis."
            if has_image
            else "The GeoJSON below describes the selected area."
        )

        prompt = f"""
You are an urban forestry planning analyst.
Your goal: choose the best places to plant trees in the selected area.

{input_context}

Return STRICT JSON with this schema:
{{
  "selected_area_id": "string",
  "confidence": "high|medium|low",
  "rationale": "short paragraph",
  "recommended_species": ["species 1", "species 2"],
  "candidate_planting_sites": [
    {{
      "label": "short location name",
      "reason": "why this spot",
      "priority": "high|medium|low",
      "estimated_tree_count": 1,
      "coordinates_hint": {{"lat": 0.0, "lng": 0.0}} or null
    }}
  ],
  "constraints": ["constraint"],
  "quick_wins": ["immediate action"],
  "raw_selected_area": {{}}
}}

Rules:
- Use the selected area data as the anchor.
- {visual_guidance}
- If exact coordinates for candidate spots are unknown, set coordinates_hint to null.
- Limit candidate_planting_sites to at most {max_sites}.
- Prefer species suitable for hot urban microclimates.
- Keep rationale practical and short.
- Output ONLY valid JSON.

Selected area id: {resolved_id}
User goal/context: {user_goal or "N/A"}
Geo summary: {json.dumps(geo_summary)}
Selected area object: {json.dumps(selected_area)}
Geo sample (first {len(sample_items)} items): {json.dumps(sample_items)}
"""

        parsed = None
        if self.api_key:
            api_response_text = self._generate_with_gemini_api_key(
                prompt=prompt,
                image_bytes=image_bytes,
                image_mime_type=image_mime_type,
            )
            if api_response_text:
                try:
                    parsed = self._safe_json_load(api_response_text)
                except Exception:
                    parsed = None

        if parsed is None:
            parsed = {
                "selected_area_id": resolved_id,
                "confidence": "low",
                "rationale": "Model unavailable or response could not be parsed as JSON. Returning fallback guidance.",
                "recommended_species": ["Honey Locust", "Ginkgo", "Hackberry"],
                "candidate_planting_sites": [
                    {
                        "label": "Street edge with low canopy",
                        "reason": "Likely high heat exposure and available right-of-way.",
                        "priority": "high",
                        "estimated_tree_count": 4,
                        "coordinates_hint": None,
                    }
                ],
                "constraints": ["Needs field validation for underground utilities."],
                "quick_wins": ["Start with curb-side pilot planting and monitor survival."],
                "raw_selected_area": selected_area,
            }

        if "selected_area_id" not in parsed:
            parsed["selected_area_id"] = resolved_id

        result = self._build_recommendation_geojson(
            parsed=parsed, selected_area=selected_area, resolved_id=resolved_id
        )

        # Optional: generate "image with trees" for the frontend (when Vertex Imagen is available).
        generated_b64 = self._generate_trees_image_base64(
            rationale=parsed.get("rationale", ""),
            satellite_image_bytes=image_bytes,
        )
        result["generated_image_base64"] = generated_b64

        return result


reasoning_service = ReasoningService()

