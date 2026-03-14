"""
Analyze plantation_final.geojson and produce the real top-10 priority zones
grouped by neighborhood, ranked by Priority-1 cell count.
Outputs backend/data/top_10_ml_zones.json.
"""

import geopandas as gpd
import json
from pathlib import Path
from shapely.ops import unary_union

BASE_DIR = Path(__file__).parent
PLANTATION_PATH = BASE_DIR.parent / "data" / "plantation_final.geojson"
OUTPUT_PATH = BASE_DIR.parent / "backend" / "data" / "top_10_ml_zones.json"


def main():
    print("Loading plantation data...")
    gdf = gpd.read_file(PLANTATION_PATH)
    print(f"  {len(gdf)} total features")

    p1 = gdf[gdf["Priorite_I"] == 1]
    print(f"  {len(p1)} Priority 1 features")

    if p1.empty:
        print("No Priority 1 features found, using all priorities instead.")
        p1 = gdf

    print("Grouping by neighborhood...")
    grouped = p1.groupby("NOM_OFFICI").agg(
        cell_count=("FID", "count"),
        geometry=("geometry", unary_union),
    )
    grouped = grouped.sort_values("cell_count", ascending=False).head(10)

    zones = []
    for i, (name, row) in enumerate(grouped.iterrows(), 1):
        bounds = row.geometry.bounds  # (minx, miny, maxx, maxy)
        centroid = row.geometry.centroid
        zones.append({
            "zone_id": f"MTL_ZONE_{i}",
            "ml_risk_cluster": "Critical",
            "neighborhood": name,
            "center": {
                "lat": round(centroid.y, 6),
                "lng": round(centroid.x, 6),
            },
            "bounds": {
                "south": round(bounds[1], 6),
                "north": round(bounds[3], 6),
                "west": round(bounds[0], 6),
                "east": round(bounds[2], 6),
            },
            "metrics": {
                "priority_1_cell_count": int(row.cell_count),
                "area_sq_m": int(row.cell_count * 625),
            },
        })

    print(f"\nTop 10 zones:")
    for z in zones:
        print(f"  {z['zone_id']}: {z['neighborhood']} — {z['metrics']['priority_1_cell_count']} cells")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(zones, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWritten to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
