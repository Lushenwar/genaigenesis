import requests
import json
import base64

def test_mtl_zone_1():
    url = "http://localhost:8000/api/v1/generate-blueprint"
    payload = {
        "zone_id": "MTL_ZONE_1",
        "bbox": {
            "min_lat": 45.49,
            "max_lat": 45.51,
            "min_lng": -73.71,
            "max_lng": -73.69
        }
    }
    
    print(f"Testing MTL_ZONE_1 refinement at {url}...")
    try:
        response = requests.post(url, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        
        # Verify Summary
        summary = data.get("blueprint_summary", {})
        print("\n--- Blueprint Summary ---")
        print(f"Context: {summary.get('context')[:100]}...")
        print(f"Species: {summary.get('recommended_species')}")
        
        # Verify Interventions
        interventions = data.get("interventions", [])
        print(f"\nNumber of interventions: {len(interventions)}")
        
        if len(interventions) == 1:
            print("SUCCESS: Only 1 intervention returned.")
            intervention = interventions[0]
            print(f"Site: {intervention.get('site_name')}")
            
            # Check images
            images = intervention.get("images", {})
            if images.get("before_base64") and images.get("after_base64"):
                print("SUCCESS: Both Before and After images are present.")
                
                # Save first frame for visual check if needed
                # with open("before.jpg", "wb") as f:
                #    f.write(base64.b64decode(images["before_base64"]))
                # with open("after.jpg", "wb") as f:
                #    f.write(base64.b64decode(images["after_base64"]))
            else:
                print("FAILURE: Missing image data.")
        else:
            print(f"FAILURE: Expected 1 intervention, got {len(interventions)}.")

        # Match specific content
        expected_context_start = "The selected area, MTL_ZONE_1, is identified as a 'Critical' ML risk cluster"
        if summary.get('context').startswith(expected_context_start):
            print("SUCCESS: Context matches expected override.")
        else:
            print("FAILURE: Context does not match override.")

    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_mtl_zone_1()
