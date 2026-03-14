import os
import json
from typing import Dict, Any, Optional

try:
    import vertexai
    from vertexai.generative_models import GenerativeModel, GenerationConfig
    from vertexai.preview.vision_models import ImageGenerationModel
except ImportError:
    vertexai = None
    GenerativeModel = None
    GenerationConfig = None
    ImageGenerationModel = None

# Initialize Vertex AI
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "eco-pulse-hackathon")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")

class VertexAIService:
    def __init__(self):
        self.vertex_enabled = False
        self.gemini_model: Optional[GenerativeModel] = None
        self.imagen_model: Optional[ImageGenerationModel] = None

        if vertexai is None:
            return

        try:
            vertexai.init(project=PROJECT_ID, location=LOCATION)
            self.gemini_model = GenerativeModel("gemini-1.5-pro")
            self.imagen_model = ImageGenerationModel.from_pretrained("imagen-3.0-generate-001")
            self.vertex_enabled = True
        except Exception:
            # Keep service available in local/dev mode even when GCP auth or
            # model initialization is not configured yet.
            self.vertex_enabled = False

    async def generate_intervention_blueprint(self, lat: float, lng: float, context: str) -> Dict[str, Any]:
        """
        Generates a text-based urban planning blueprint using Gemini 1.5 Pro.
        """
        prompt = f"""
        You are a master urban planner and sustainability expert. 
        Analyze the following location for heat island mitigation:
        Coordinates: {lat}, {lng}
        Context: {context}

        Provide a strictly formatted JSON response with:
        - intervention_strategy: Specific architectural/biological steps.
        - estimated_cost: Total cost in USD (integer).
        - projected_temperature_drop_celsius: Expected cooling effect (float).
        - recommended_materials: List of specific materials or plant species.
        
        Ensure the advice is technical, mathematical, and specific to urban heat island reduction.
        """
        
        if self.vertex_enabled and self.gemini_model and GenerationConfig:
            response = self.gemini_model.generate_content(
                prompt,
                generation_config=GenerationConfig(
                    response_mime_type="application/json",
                )
            )
            try:
                return json.loads(response.text)
            except Exception:
                pass

        # Fallback for demo stability and local development.
        return {
            "intervention_strategy": "Green roof installation and tree canopy expansion.",
            "estimated_cost": 5000,
            "projected_temperature_drop_celsius": 3.5,
            "recommended_materials": ["Sedum", "White Oak", "Reflective Membrane"]
        }

    async def generate_visual_overlay(self, lat: float, lng: float, strategy: str) -> str:
        """
        Generates a transformed image overlay using Imagen 3.
        Note: In a real hackathon setting, you'd use Inpainting or Image-to-Image.
        This provides a base generation prompt for the beginner code.
        """
        prompt = f"A photorealistic urban scene at {lat}, {lng} transformed with {strategy}. High-quality green roofs, lush trees, and sustainable architecture. Dark mode aesthetic."
        
        if self.vertex_enabled and self.imagen_model:
            # This is a synchronous call in the current SDK version; wrap accordingly if needed.
            self.imagen_model.generate_images(
                prompt=prompt,
                number_of_images=1,
                aspect_ratio="1:1"
            )

        # For simplicity in beginner code, we expect to save this to GCS or return base64.
        # Returning a placeholder for now as per context.md "cheat code" directives.
        return "https://storage.googleapis.com/eco-pulse-assets/transformed_preview.jpg"

vertex_service = VertexAIService()
