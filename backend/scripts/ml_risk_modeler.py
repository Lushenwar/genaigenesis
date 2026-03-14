import pandas as pd
import numpy as np
import json
import random
import os
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

# --- Step 1: Data Ingestion & Mocking ---
def generate_mock_data(n_points=10000):
    """
    Generates 10,000 random data points around Montreal.
    """
    # Montreal Center
    mtl_lat, mtl_lng = 45.5017, -73.5673
    
    # Generate points within a 30x30km grid (approx +/- 0.15 degrees)
    data = {
        "lat": np.random.uniform(mtl_lat - 0.15, mtl_lat + 0.15, n_points),
        "lng": np.random.uniform(mtl_lng - 0.15, mtl_lng + 0.15, n_points),
        "heat_vulnerability": np.random.uniform(0, 100, n_points),
        "tree_canopy_pct": np.random.uniform(0, 100, n_points),
        "pop_density": np.random.uniform(1000, 30000, n_points)
    }
    return pd.DataFrame(data)

# --- Step 2: Spatial Grid Binning (The Zones) ---
def bin_and_aggregate(df):
    """
    Groups raw points into physical squares (~100m x 100m) 
    by rounding coordinates to 3 decimal places.
    """
    df["lat_bin"] = df["lat"].round(3)
    df["lng_bin"] = df["lng"].round(3)
    
    zones = df.groupby(["lat_bin", "lng_bin"]).agg({
        "heat_vulnerability": "mean",
        "tree_canopy_pct": "mean",
        "pop_density": "mean"
    }).reset_index()
    
    zones.rename(columns={
        "heat_vulnerability": "avg_heat",
        "tree_canopy_pct": "avg_canopy",
        "pop_density": "avg_pop"
    }, inplace=True)
    
    # Calculate canopy_deficit (100 - tree_canopy_pct)
    zones["canopy_deficit"] = 100 - zones["avg_canopy"]
    
    return zones

# --- Step 3: The K-Means ML Risk Model ---
def run_ml_risk_model(zones):
    """
    Deploys K-Means clustering to group zones into 4 Risk Tiers.
    """
    features = ["avg_heat", "avg_pop", "canopy_deficit"]
    X = zones[features]
    
    # Standardize features for K-Means distance calculations
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Adjust clusters if we have very few zones (for testing)
    n_zones = len(zones)
    n_clusters = min(4, n_zones)
    
    # KMeans with n_clusters
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
    zones["cluster"] = kmeans.fit_predict(X_scaled)

    # Calculate Silhouette Score (only if 1 < n_clusters < n_zones)
    if 1 < n_clusters < n_zones:
        score = silhouette_score(X_scaled, zones["cluster"])

        print(f"📊 Model Silhouette Score: {score:.3f}")
        if score > 0.5:
            print("✨ High confidence: The clusters are clearly distinct.")
        elif score > 0.3:
            print("👍 Moderate confidence: The clusters are relatively well-separated.")
        else:
            print("⚠️ Low confidence: The clusters are heavily overlapping.")
    
    # Identify "Critical" cluster (highest combined standardized values)
    # We find the cluster center with the highest sum of scaled values
    cluster_centers = kmeans.cluster_centers_
    critical_cluster_idx = np.argmax(cluster_centers.sum(axis=1))
    
    # Map clusters to labels (for demo simplicity, we label one as Critical)
    zones["risk_tier"] = "Standard"
    zones.loc[zones["cluster"] == critical_cluster_idx, "risk_tier"] = "Critical"
    
    return zones

# --- Step 4: Adaptive Rectangle Merging ---
def merge_zones(zones):
    """
    Greedily merges adjacent Critical cells into larger rectangles.
    """
    critical = zones[zones["risk_tier"] == "Critical"].copy()
    if critical.empty:
        return []

    # Map for fast lookup
    grid = {}
    for _, row in critical.iterrows():
        grid[(row["lat_bin"], row["lng_bin"])] = row

    visited = set()
    merged_rects = []

    # Sort to ensure deterministic merging
    sorted_coords = sorted(grid.keys())

    for lat, lng in sorted_coords:
        if (lat, lng) in visited:
            continue

        # Start a new rectangle
        r_width = 1
        r_height = 1

        # Expand East (longitude increases)
        while (lat, round(lng + r_width * 0.001, 3)) in grid and \
              (lat, round(lng + r_width * 0.001, 3)) not in visited:
            r_width += 1

        # Expand North (latitude increases)
        # Check if entire row can be expanded
        can_expand_north = True
        while can_expand_north:
            next_lat = round(lat + r_height * 0.001, 3)
            for w in range(r_width):
                check_lng = round(lng + w * 0.001, 3)
                if (next_lat, check_lng) not in grid or (next_lat, check_lng) in visited:
                    can_expand_north = False
                    break
            if can_expand_north:
                r_height += 1
            else:
                break

        # Collect metrics for the merged area
        rect_zones = []
        for h in range(r_height):
            for w in range(r_width):
                coord = (round(lat + h * 0.001, 3), round(lng + w * 0.001, 3))
                visited.add(coord)
                rect_zones.append(grid[coord])

        # Aggregate metrics
        avg_metrics = pd.DataFrame(rect_zones).agg({
            "avg_heat": "mean",
            "avg_pop": "mean",
            "avg_canopy": "mean",
            "canopy_deficit": "mean"
        })

        # Calculate bounds
        # Base lat/lng represents South-West corner
        merged_rects.append({
            "bounds": {
                "south": round(lat - 0.0005, 4),
                "north": round(lat + (r_height - 1) * 0.001 + 0.0005, 4),
                "west": round(lng - 0.0005, 4),
                "east": round(lng + (r_width - 1) * 0.001 + 0.0005, 4)
            },
            "metrics": {
                "avg_heat_index": round(avg_metrics["avg_heat"], 1),
                "avg_population_density": int(avg_metrics["avg_pop"]),
                "avg_canopy_coverage_pct": round(avg_metrics["avg_canopy"], 1),
                "magnitude_score": avg_metrics["avg_heat"] * avg_metrics["avg_pop"] * avg_metrics["canopy_deficit"]
            }
        })

    return merged_rects

# --- Step 5: Export the Top 10 ML Zones ---
def export_top_zones(merged_rects, output_file="backend/data/top_10_ml_zones.json"):
    """
    Ranks merged rectangles and exports to JSON.
    """
    # Sort by magnitude score
    top_10 = sorted(merged_rects, key=lambda x: x["metrics"]["magnitude_score"], reverse=True)[:10]
    
    json_output = []
    for i, rect in enumerate(top_10):
        # Clean up the output dict (remove internal score)
        metrics = rect["metrics"].copy()
        metrics.pop("magnitude_score")
        
        json_output.append({
            "zone_id": f"MTL_ZONE_{i+1}",
            "ml_risk_cluster": "Critical",
            "bounds": rect["bounds"],
            "metrics": metrics
        })
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, "w") as f:
        json.dump(json_output, f, indent=2)
    
    print(f"Exported {len(json_output)} adaptive rectangles to {output_file}")


if __name__ == "__main__":
    print("🚀 Starting ML Risk Modeler Pipeline...")
    raw_data = generate_mock_data(10000)
    binned_zones = bin_and_aggregate(raw_data)
    ml_zones = run_ml_risk_model(binned_zones)
    merged_rects = merge_zones(ml_zones)
    export_top_zones(merged_rects)
    print("✅ Pipeline Complete.")

