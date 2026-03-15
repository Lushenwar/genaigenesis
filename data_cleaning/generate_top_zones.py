"""
Analyze plantation_final.geojson and produce the top-10 priority zones as small
grid cells (50x50m or 100x100m), ranked by Priority-1 cell count per grid cell.
Outputs backend/data/top_10_ml_zones.json.

Usage:
  python generate_top_zones.py           # 100x100 m cells (default)
  python generate_top_zones.py 50        # 50x50 m cells
  python generate_top_zones.py 100        # 100x100 m cells
"""

import argparse
import geopandas as gpd
import json
import math
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path(__file__).parent
# Plantation data may live in repo data/ or data_cleaning/
for data_dir in (BASE_DIR.parent / "data", BASE_DIR.parent / "backend" / "data", BASE_DIR):
    PLANTATION_PATH = data_dir / "plantation_final.geojson"
    if PLANTATION_PATH.exists():
        break
else:
    PLANTATION_PATH = BASE_DIR.parent / "data" / "plantation_final.geojson"
OUTPUT_PATH = BASE_DIR.parent / "backend" / "data" / "top_10_ml_zones.json"

def meters_to_degrees(lat: float, size_m: float) -> tuple[float, float]:
    """Return (lat_deg_per_cell, lon_deg_per_cell) for a square of size_m meters at given latitude."""
    # 1 degree latitude ≈ 111320 m (constant)
    # 1 degree longitude ≈ 111320 * cos(lat) m
    lat_rad = math.radians(lat)
    lat_deg = size_m / 111_320.0
    lon_deg = size_m / (111_320.0 * math.cos(lat_rad))
    return (lat_deg, lon_deg)


def main(cell_size_m: int = 100):
    if not PLANTATION_PATH.exists():
        raise FileNotFoundError(f"Plantation GeoJSON not found: {PLANTATION_PATH}")

    print("Loading plantation data...")
    gdf = gpd.read_file(PLANTATION_PATH)
    print(f"  {len(gdf)} total features")

    p1 = gdf[gdf["Priorite_I"] == 1].copy()
    print(f"  {len(p1)} Priority 1 features")

    if p1.empty:
        print("No Priority 1 features found, using all priorities instead.")
        p1 = gdf.copy()

    # Ensure projected or use centroid in WGS84 for grid assignment
    if p1.crs and p1.crs != "EPSG:4326":
        p1 = p1.to_crs("EPSG:4326")

    # Centroids for grid assignment (handles polygons)
    p1["centroid"] = p1.geometry.centroid
    mean_lat = p1.centroid.y.mean()
    lat_step, lon_step = meters_to_degrees(mean_lat, cell_size_m)

    # Total bounds of data
    minx, miny, maxx, maxy = p1.total_bounds

    # Assign each P1 feature to a grid cell (i, j)
    # Cell (i, j) has west = minx + i*lon_step, south = miny + j*lat_step
    cell_counts: dict[tuple[int, int], list[int]] = defaultdict(list)  # (i,j) -> indices into p1
    for idx, row in p1.iterrows():
        c = row.centroid
        i = int((c.x - minx) / lon_step)
        j = int((c.y - miny) / lat_step)
        cell_counts[(i, j)].append(idx)

    # Rank cells by count of P1 features
    ranked = sorted(
        cell_counts.items(),
        key=lambda item: len(item[1]),
        reverse=True,
    )[:10]

    # Optional: get neighborhood name from the first feature in the cell
    def neighborhood_for_cell(indices: list) -> str:
        if not indices:
            return "Grid cell"
        row = p1.loc[indices[0]]
        return str(row.get("NOM_OFFICI", "Grid cell") or "Grid cell")

    zones = []
    for rank, ((ci, cj), indices) in enumerate(ranked, 1):
        south = miny + cj * lat_step
        north = south + lat_step
        west = minx + ci * lon_step
        east = west + lon_step
        count = len(indices)
        # Center of cell
        center_lat = (south + north) / 2
        center_lng = (west + east) / 2
        neighborhood = neighborhood_for_cell(indices)

        zones.append({
            "zone_id": f"MTL_ZONE_{rank}",
            "ml_risk_cluster": "Critical",
            "neighborhood": neighborhood,
            "center": {
                "lat": round(center_lat, 6),
                "lng": round(center_lng, 6),
            },
            "bounds": {
                "south": round(south, 6),
                "north": round(north, 6),
                "west": round(west, 6),
                "east": round(east, 6),
            },
            "metrics": {
                "priority_1_cell_count": count,
                "area_sq_m": cell_size_m * cell_size_m,
            },
        })

    print(f"\nTop 10 zones (each {cell_size_m}x{cell_size_m} m):")
    for z in zones:
        print(f"  {z['zone_id']}: {z['neighborhood']} — {z['metrics']['priority_1_cell_count']} P1 cells, {z['metrics']['area_sq_m']} m²")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(zones, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nWritten to {OUTPUT_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate top 10 ML zones as small grid cells.")
    parser.add_argument(
        "cell_size",
        nargs="?",
        type=int,
        default=100,
        choices=[50, 100],
        help="Cell size in meters: 50 or 100 (default: 100)",
    )
    args = parser.parse_args()
    main(cell_size_m=args.cell_size)
