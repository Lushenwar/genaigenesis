import os
import requests
import random
from typing import List, Dict, Any

class StreetViewService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_MAPS_API_KEY")
        self.base_url = "https://maps.googleapis.com/maps/api/streetview"

    def generate_random_points(self, bbox: Dict[str, float], count: int = 5) -> List[Dict[str, float]]:
        """Generates random (lat, lng) within a bounding box."""
        # bbox expected format: {"min_lat": ..., "max_lat": ..., "min_lng": ..., "max_lng": ...}
        points = []
        for _ in range(count):
            lat = random.uniform(bbox["min_lat"], bbox["max_lat"])
            lng = random.uniform(bbox["min_lng"], bbox["max_lng"])
            points.append({"lat": lat, "lng": lng})
        return points

    async def fetch_street_view_image(self, lat: float, lng: float) -> bytes:
        """Step 2: The Street View Fallback Scraper"""
        params = {
            "size": "640x640",
            "location": f"{lat},{lng}",
            "key": self.api_key,
            "radius": 200,  # Critical fallback
            "source": "outdoor"
        }
        
        response = requests.get(self.base_url, params=params)
        if response.status_code == 200:
            return response.content
        else:
            print(f"Street View API Error: {response.status_code} - {response.text}")
            raise Exception(f"Failed to fetch Street View image: {response.status_code} - {response.text}")

streetview_service = StreetViewService()
