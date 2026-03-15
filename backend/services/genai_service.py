import os
import base64
from typing import List, Dict, Any
from google import genai
from google.genai import types
from pydantic import BaseModel

class PlantingSite(BaseModel):
    site_name: str
    justification: str

class Metrics(BaseModel):
    cooling_capacity: float
    shade_index: float
    evapotranspiration_rate: float
    albedo_change: float
    estimated_cost: str
    estimated_annual_roi: str
    model_confidence: str

class BlueprintOutput(BaseModel):
    context: str
    recommended_species: List[str]
    planting_sites: List[PlantingSite]
    quick_wins: List[str]
    metrics: Metrics

class GenAIService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=self.api_key)
        self.blueprint_model = "gemini-2.5-flash" 
        self.image_model = "gemini-2.5-flash-image"

    async def generate_blueprint_data(self, zone_data: Dict[str, Any]) -> Dict[str, Any]:
        """Step 1: The Master Blueprint (Gemini 2.5 Flash)"""
        
        prompt = f"""
        Act as an expert urban planner and financial risk manager for "Eco-Pulse".
        Analyze the following zone data and provide a comprehensive urban planning blueprint.
        
        FINANCIAL GUIDELINES:
        - Implementation costs MUST be realistic for a municipal pilot, typically in the range of $30,000 - $120,000 USD.
        - Annual benefits should be proportional (approx 5-15% of cost).
        - Format costs and ROI with a "~" prefix and "USD" suffix (e.g., "~$45,000 USD").

        STRATEGIC GUIDELINES:
        - Generate EXACTLY ONE high-impact, consolidated "Planting Site" per zone. 
        - DO NOT provide multiple sites. Combine all strategic goals into this single primary intervention.
        - Quick wins should focus on site assessment, community engagement, and prioritization.

        Zone Data:
        {zone_data}
        """

        response = self.client.models.generate_content(
            model=self.blueprint_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=BlueprintOutput,
            ),
        )
        
        if response.parsed:
            data = response.parsed.dict()
            # Strict Enforcement: Only allow one site even if the model hallucinates others
            if data.get("planting_sites") and len(data["planting_sites"]) > 0:
                data["planting_sites"] = data["planting_sites"][:1]
            return data
        else:
            # Fallback if parsing fails
            raise Exception("Model failed to return structured blueprint data.")

    async def transform_street_view(self, image_bytes: bytes, species: List[str]) -> str:
        """Step 3: The 5x Visual Generator (Gemini 2.5 Flash Image)"""
        
        species_str = ", ".join(species)
        prompt = (
            f"Professional urban architectural visualization. Transform this street view by integrating mature {species_str} trees "
            "as strategic urban canopy. \n"
            "STRICT FIDELITY CONSTRAINTS:\n"
            "1. ADDITIVE ONLY: Only add trees and their shadows. DO NOT add furniture, cars, cyclists, or new pavement.\n"
            "2. DO NOT obstruct buildings, signs, or traffic infrastructure.\n"
            "3. MATCHING: The resulting image must look exactly like the original but with the new trees integrated seamlessly into the existing environment.\n"
            "4. Shadows must be consistent with the original lighting but include the new canopy shade."
        )
        
        image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
        
        try:
            response = self.client.models.generate_content(
                model=self.image_model,
                contents=[prompt, image_part],
            )
            
            # Check for image in parts
            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    return base64.b64encode(part.inline_data.data).decode('utf-8')
                if part.file_data:
                    # In some cases, it might return a file URI, but for this SDK and model it's usually inline
                    pass
            
            # If no image found in parts, check if it returned text (error handle)
            raise Exception(f"Model did not return an image. Response: {response.text}")
        except Exception as e:
            print(f"Transformation failed: {e}")
            raise

genai_service = GenAIService()
