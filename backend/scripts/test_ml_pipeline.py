import pandas as pd
import numpy as np
import os
import sys

# Add the scripts directory to path to import the modeler
sys.path.append(os.path.join(os.getcwd(), 'backend', 'scripts'))

from ml_risk_modeler import bin_and_aggregate, run_ml_risk_model, merge_zones

def test_ml_pipeline_logic():
    """
    Tests the ML pipeline with a controlled dummy dataset.
    We create a clear 'high risk' cluster and verify it's detected and merged.
    """
    print("🧪 Testing ML Pipeline Logic...")
    
    # Create 20 points representing 2 distinct ADJACENT critical zones
    # Zone 1 (lat 45.501, lng -73.567)
    # Zone 2 (lat 45.501, lng -73.568) - ADJACENT EAST/WEST
    data = {
        "lat":  [45.501] * 10 + [45.501] * 10, 
        "lng":  [-73.567] * 10 + [-73.568] * 10,
        "heat_vulnerability": [95] * 20,
        "tree_canopy_pct": [5] * 20, 
        "pop_density": [29000] * 20
    }
    
    # Add 'Low risk' points - 10 zones far away
    for i in range(10):
        data["lat"].extend([45.601 + i*0.01] * 2)
        data["lng"].extend([-73.667] * 2)
        data["heat_vulnerability"].extend([20, 20])
        data["tree_canopy_pct"].extend([80, 80])
        data["pop_density"].extend([2000, 2000])

    df = pd.DataFrame(data)
    
    # Step 1: Aggregate
    zones = bin_and_aggregate(df)
    
    # Step 2: ML Model
    ml_zones = run_ml_risk_model(zones)
    
    # Step 3: Merging
    merged_rects = merge_zones(ml_zones)
    
    print(f"Total Zones: {len(ml_zones)}")
    print(f"Merged Rects: {len(merged_rects)}")
    
    # We expect the 2 adjacent critical zones to be merged into ONE rectangle
    # The magnitude score will be high, so it should be the top 1
    assert len(merged_rects) == 1, f"Expected 1 merged rectangle for adjacent zones, got {len(merged_rects)}"
    
    rect = merged_rects[0]
    print(f"Merged Bounds: {rect['bounds']}")
    
    # Verify bounds cover both zones
    # West: -73.568 (zone 2), East: -73.567 (zone 1)
    assert rect['bounds']['west'] < -73.568
    assert rect['bounds']['east'] > -73.567
    
    print("✅ Logic Test Passed!")


if __name__ == "__main__":
    test_ml_pipeline_logic()
