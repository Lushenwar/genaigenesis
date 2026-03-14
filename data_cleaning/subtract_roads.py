import geopandas as gpd
from pathlib import Path
from shapely.ops import unary_union

BASE_DIR = Path(__file__).parent

PLANTATION_PATH = BASE_DIR / "plantation_priorities_no_buildings.geojson"
ROADS_PATH = BASE_DIR / "road-data" / "road-data.geojson"
OUTPUT_PATH = BASE_DIR / "plantation_final.geojson"

ROAD_BUFFER_M = {
    "boulevard": 12,
    "autoroute": 15,
    "rue": 9,
    "avenue": 9,
    "chemin": 8,
    "place": 5,
    "ruelle": 4,
    "croissant": 5,
}
DEFAULT_BUFFER_M = 8


def main():
    print("Loading plantation priorities (no buildings)...")
    priorities = gpd.read_file(PLANTATION_PATH)
    print(f"  {len(priorities)} features")

    # Reproject to EPSG:2950 for meter-accurate buffering
    print("Reprojecting plantation to EPSG:2950...")
    priorities = priorities.to_crs(epsg=2950)

    print("Loading road data...")
    roads = gpd.read_file(ROADS_PATH)
    print(f"  {len(roads)} road segments")

    # Roads are likely already in WGS84; reproject to match
    if roads.crs and roads.crs.to_epsg() != 2950:
        print("Reprojecting roads to EPSG:2950...")
        roads = roads.to_crs(epsg=2950)

    # Buffer each road by its type width
    print("Buffering roads by type...")
    roads["_buffer"] = roads["TYP_VOIE"].str.lower().str.strip().map(ROAD_BUFFER_M).fillna(DEFAULT_BUFFER_M)
    roads["geometry"] = roads.apply(lambda r: r.geometry.buffer(r["_buffer"]), axis=1)

    print("Finding plantation cells that overlap buffered roads...")
    joined = gpd.sjoin(priorities, roads[["geometry"]], how="inner", predicate="intersects")
    overlapping = joined.index.unique()
    print(f"  {len(overlapping)} cells overlap roads")

    print("Removing overlapping cells...")
    result = priorities.drop(overlapping)
    print(f"  {len(result)} cells remaining (removed {len(priorities) - len(result)})")

    print("Reprojecting result to WGS84...")
    result = result.to_crs(epsg=4326)

    print(f"Writing to {OUTPUT_PATH.name}...")
    result.to_file(OUTPUT_PATH, driver="GeoJSON")
    print(f"Done! {OUTPUT_PATH.stat().st_size / (1024 * 1024):.1f} MB")


if __name__ == "__main__":
    main()