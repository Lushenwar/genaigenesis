"""
Analyze plantation_final.geojson and produce the top-10 priority zones as grid
cells (50–500 m), ranked by Priority-1 cell count. Excludes big same-priority
areas (e.g. football fields, warehouses) by polygon area and contiguous region size.
Outputs backend/data/top_10_ml_zones.json.

Usage:
  python generate_top_zones.py              # 500x500 m cells (default)
  python generate_top_zones.py 100           # 100x100 m
  python generate_top_zones.py 500 --no-filter  # skip big-area filters
"""

import argparse
import geopandas as gpd
import json
from pathlib import Path
from collections import defaultdict
from shapely.geometry import box

BASE_DIR = Path(__file__).parent
for data_dir in (BASE_DIR.parent / "data", BASE_DIR.parent / "backend" / "data", BASE_DIR):
    PLANTATION_PATH = data_dir / "plantation_final.geojson"
    if PLANTATION_PATH.exists():
        break
else:
    PLANTATION_PATH = BASE_DIR.parent / "data" / "plantation_final.geojson"
OUTPUT_PATH = BASE_DIR.parent / "backend" / "data" / "top_10_ml_zones.json"

# Montreal ~45.5°N: use UTM zone 18N for area in m²
UTM_EPSG = 32618
# Drop single P1 polygons larger than this (e.g. big field, warehouse)
MAX_POLYGON_AREA_M2 = 20_000
# Exclude grid cells that belong to a contiguous "has P1" region larger than this
MAX_CONTIGUOUS_REGION_M2 = 25_000


def connected_components(cells: set[tuple[int, int]]) -> list[set[tuple[int, int]]]:
    """Partition cells into 4-connected components (rook adjacency)."""
    components: list[set[tuple[int, int]]] = []
    remaining = set(cells)

    while remaining:
        stack = [remaining.pop()]
        comp = {stack[0]}
        while stack:
            ci, cj = stack.pop()
            for di, dj in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                n = (ci + di, cj + dj)
                if n in remaining:
                    remaining.discard(n)
                    comp.add(n)
                    stack.append(n)
        components.append(comp)
    return components


def main(
    cell_size_m: int = 500,
    filter_big_areas: bool = True,
):
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

    if p1.crs is None or p1.crs != "EPSG:4326":
        p1 = p1.to_crs("EPSG:4326")

    # Work in UTM for area and centroid (avoids geographic CRS centroid warning)
    p1_utm = p1.to_crs(epsg=UTM_EPSG)

    # --- Filter 1: drop single polygons that are too large (big field, warehouse) ---
    if filter_big_areas:
        p1_utm["area_m2"] = p1_utm.geometry.area
        before = len(p1_utm)
        p1_utm = p1_utm[p1_utm["area_m2"] <= MAX_POLYGON_AREA_M2]
        p1 = p1.loc[p1_utm.index].copy()
        dropped = before - len(p1)
        if dropped:
            print(f"  Dropped {dropped} P1 polygons larger than {MAX_POLYGON_AREA_M2:,} m²")

    # Centroids and grid in UTM (meters) so single-cell size is correct
    p1_utm["centroid"] = p1_utm.geometry.centroid
    minx, miny, maxx, maxy = p1_utm.total_bounds

    cell_counts: dict[tuple[int, int], list[int]] = defaultdict(list)
    for idx, row in p1_utm.iterrows():
        c = row.centroid
        i = int((c.x - minx) / cell_size_m)
        j = int((c.y - miny) / cell_size_m)
        cell_counts[(i, j)].append(idx)

    # --- Filter 2: exclude only multi-cell blobs that are too large (single cells always kept) ---
    excluded_cells: set[tuple[int, int]] = set()
    if filter_big_areas and cell_counts:
        has_p1 = set(cell_counts.keys())
        components = connected_components(has_p1)
        cell_area_m2 = cell_size_m * cell_size_m
        for comp in components:
            region_area_m2 = len(comp) * cell_area_m2
            if len(comp) >= 2 and region_area_m2 > MAX_CONTIGUOUS_REGION_M2:
                excluded_cells |= comp
        if excluded_cells:
            print(f"  Excluded {len(excluded_cells)} cells in contiguous multi-cell regions > {MAX_CONTIGUOUS_REGION_M2:,} m²")

    # Rank cells by P1 count, skipping excluded cells
    eligible = [
        (key, val) for key, val in cell_counts.items()
        if key not in excluded_cells
    ]
    ranked = sorted(eligible, key=lambda item: len(item[1]), reverse=True)[:10]

    def neighborhood_for_cell(indices: list) -> str:
        if not indices:
            return "Grid cell"
        row = p1.loc[indices[0]]
        return str(row.get("NOM_OFFICI", "Grid cell") or "Grid cell")

    # Convert UTM cell bounds to WGS84 for JSON output
    def cell_bounds_wgs84(ci: int, cj: int):
        west_utm = minx + ci * cell_size_m
        east_utm = west_utm + cell_size_m
        south_utm = miny + cj * cell_size_m
        north_utm = south_utm + cell_size_m
        b = box(west_utm, south_utm, east_utm, north_utm)
        g = gpd.GeoDataFrame(geometry=[b], crs=UTM_EPSG).to_crs("EPSG:4326")
        x1, y1, x2, y2 = g.total_bounds
        return {"south": y1, "north": y2, "west": x1, "east": x2}

    zones = []
    for rank, ((ci, cj), indices) in enumerate(ranked, 1):
        b = cell_bounds_wgs84(ci, cj)
        count = len(indices)
        center_lat = (b["south"] + b["north"]) / 2
        center_lng = (b["west"] + b["east"]) / 2
        neighborhood = neighborhood_for_cell(indices)
        zones.append({
            "zone_id": f"MTL_ZONE_{rank}",
            "ml_risk_cluster": "Critical",
            "neighborhood": neighborhood,
            "center": {"lat": round(center_lat, 6), "lng": round(center_lng, 6)},
            "bounds": {
                "south": round(b["south"], 6),
                "north": round(b["north"], 6),
                "west": round(b["west"], 6),
                "east": round(b["east"], 6),
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
    parser = argparse.ArgumentParser(description="Generate top 10 ML zones as grid cells.")
    parser.add_argument(
        "cell_size",
        nargs="?",
        type=int,
        default=500,
        choices=[50, 100, 250, 500],
        help="Cell size in meters: 50, 100, 250, or 500 (default: 500)",
    )
    parser.add_argument(
        "--no-filter",
        action="store_true",
        help="Do not filter out big polygons or large contiguous regions",
    )
    args = parser.parse_args()
    main(cell_size_m=args.cell_size, filter_big_areas=not args.no_filter)
