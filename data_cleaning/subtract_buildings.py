import geopandas as gpd
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).parent

def main():
    print("Loading plantation priorities...")
    priorities = gpd.read_file(BASE_DIR / "plantation-priorites.geojson")
    print(f"  {len(priorities)} features, CRS: {priorities.crs}")

    building_files = [
        BASE_DIR / "montreal_batiments_construction.geojson",
        BASE_DIR / "montreal_batiments_toit.geojson",
    ]

    frames = []
    for bf in building_files:
        print(f"Loading {bf.name}...")
        bdf = gpd.read_file(bf)
        print(f"  {len(bdf)} features")
        frames.append(bdf)

    all_buildings = gpd.GeoDataFrame(
        pd.concat(frames, ignore_index=True), geometry="geometry", crs="EPSG:4326"
    )

    # Reproject buildings to match plantation CRS (faster than reprojecting 601K features)
    print("Reprojecting buildings to EPSG:2950...")
    all_buildings = all_buildings.to_crs(epsg=2950)

    print("Finding plantation cells that overlap buildings...")
    joined = gpd.sjoin(priorities, all_buildings, how="inner", predicate="intersects")
    overlapping = joined.index.unique()
    print(f"  {len(overlapping)} cells overlap buildings")

    print("Removing overlapping cells...")
    result = priorities.drop(overlapping)
    print(f"  {len(result)} cells remaining (removed {len(priorities) - len(result)})")

    # Reproject to WGS84 for web use
    print("Reprojecting result to WGS84...")
    result = result.to_crs(epsg=4326)

    output = BASE_DIR / "plantation_priorities_no_buildings.geojson"
    print(f"Writing to {output.name}...")
    result.to_file(output, driver="GeoJSON")
    print(f"Done! {output.stat().st_size / (1024 * 1024):.1f} MB")

if __name__ == "__main__":
    main()