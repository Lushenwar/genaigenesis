import geopandas as gpd
import pandas as pd
import sys
from pathlib import Path
from shapely.ops import unary_union

BASE_DIR = Path(__file__).parent

MONTREAL_BOUNDS = {
    "min_lon": -73.98,
    "max_lon": -73.47,
    "min_lat": 45.40,
    "max_lat": 45.70,
}

DATASETS = [
    {
        "name": "ICFU Heat Islands",
        "shapefile": BASE_DIR / "icfu2022_centrespopulation2021_buf2000m_9cl_shp" / "ICFU2022_CentresPopulation2021_buf2000m_9cl.shp",
        "output": BASE_DIR / "montreal_heat.geojson",
        "simplify_tolerance": 0.0005,
    },
    {
        "name": "Buildings - Rooftops",
        "shapefile": BASE_DIR / "batiments_2d_2016_arrondissements" / "CARTO-BAT-TOIT.shp",
        "output": BASE_DIR / "montreal_batiments_toit.geojson",
        "simplify_tolerance": 0.0001,
    },
    {
        "name": "Buildings - Construction",
        "shapefile": BASE_DIR / "batiments_2d_2016_arrondissements" / "CARTO-BAT-CONSTRUCTION.shp",
        "output": BASE_DIR / "montreal_batiments_construction.geojson",
        "simplify_tolerance": 0.0001,
    },
    {
        "name": "Buildings - Super-Structure",
        "shapefile": BASE_DIR / "batiments_2d_2016_arrondissements" / "CARTO-BAT-SUPER-STRUCTURE.shp",
        "output": BASE_DIR / "montreal_batiments_superstructure.geojson",
        "simplify_tolerance": 0.0001,
    },
    {
        "name": "Buildings - Detail",
        "shapefile": BASE_DIR / "batiments_2d_2016_arrondissements" / "CARTO-BAT-DETAIL.shp",
        "output": BASE_DIR / "montreal_batiments_detail.geojson",
        "simplify_tolerance": 0.0001,
    },
    {
        "name": "Buildings - Cote",
        "shapefile": BASE_DIR / "batiments_2d_2016_arrondissements" / "CARTO-BAT-COTE.shp",
        "output": BASE_DIR / "montreal_batiments_cote.geojson",
        "simplify_tolerance": 0.0001,
    },
    {
        "name": "Buildings - Ruine",
        "shapefile": BASE_DIR / "batiments_2d_2016_arrondissements" / "CARTO-BAT-RUINE.shp",
        "output": BASE_DIR / "montreal_batiments_ruine.geojson",
        "simplify_tolerance": 0.0001,
    },
]


def convert_shapefile(dataset):
    name = dataset["name"]
    shp = dataset["shapefile"]
    out = dataset["output"]
    tol = dataset["simplify_tolerance"]

    print(f"\n{'='*50}")
    print(f"Processing: {name}")
    print(f"  Reading: {shp}")
    gdf = gpd.read_file(shp)
    print(f"  Total features: {len(gdf)}")
    print(f"  Original CRS: {gdf.crs}")

    print("  Reprojecting to WGS84 (EPSG:4326)...")
    gdf = gdf.to_crs(epsg=4326)

    print("  Filtering to Montreal bounding box...")
    b = MONTREAL_BOUNDS
    gdf = gdf.cx[b["min_lon"]:b["max_lon"], b["min_lat"]:b["max_lat"]]
    print(f"  Features in Montreal area: {len(gdf)}")

    if gdf.empty:
        print(f"  WARNING: No features found for {name}, skipping.")
        return

    print(f"  Simplifying geometry (tolerance={tol})...")
    gdf["geometry"] = gdf["geometry"].simplify(tolerance=tol, preserve_topology=True)

    print(f"  Writing GeoJSON to: {out}")
    gdf.to_file(out, driver="GeoJSON")
    print(f"  Done! Output size: {out.stat().st_size / 1024:.1f} KB")


def subtract_buildings():
    """
    Remove building footprint polygons from the plantation priority zones,
    leaving only open land where planting is feasible.
    """
    print("\n" + "=" * 50)
    print("Subtracting buildings from plantation priorities")

    plantation_path = BASE_DIR / "plantation-priorites.geojson"
    print(f"  Loading {plantation_path.name}...")
    priorities = gpd.read_file(plantation_path)
    print(f"  Plantation features: {len(priorities)}")

    # Reproject from EPSG:2950 to WGS84 so everything is in the same CRS
    print("  Reprojecting plantation data to WGS84...")
    priorities = priorities.to_crs(epsg=4326)

    building_files = [
        BASE_DIR / "montreal_batiments_construction.geojson",
        BASE_DIR / "montreal_batiments_toit.geojson",
    ]

    frames = []
    for bf in building_files:
        if bf.exists():
            print(f"  Loading {bf.name}...")
            bdf = gpd.read_file(bf)
            print(f"    {len(bdf)} features")
            frames.append(bdf)

    if not frames:
        print("  ERROR: No building GeoJSONs found. Run shapefile conversion first.")
        return

    all_buildings = pd.concat(frames, ignore_index=True)
    all_buildings = gpd.GeoDataFrame(all_buildings, geometry="geometry", crs="EPSG:4326")

    print("  Creating unified building footprint (this may take a while)...")
    building_union = unary_union(all_buildings.geometry)

    print("  Subtracting building polygons from priority zones...")
    priorities["geometry"] = priorities["geometry"].difference(building_union)

    # Drop any polygons that became empty after subtraction
    priorities = priorities[~priorities.geometry.is_empty]
    print(f"  Features remaining after subtraction: {len(priorities)}")

    print("  Simplifying geometry...")
    priorities["geometry"] = priorities["geometry"].simplify(
        tolerance=0.0001, preserve_topology=True
    )

    output = BASE_DIR / "plantation_priorities_no_buildings.geojson"
    print(f"  Writing result to: {output}")
    priorities.to_file(output, driver="GeoJSON")
    print(f"  Done! Output size: {output.stat().st_size / 1024:.1f} KB")


def main():
    for dataset in DATASETS:
        convert_shapefile(dataset)
    subtract_buildings()
    print("\nAll datasets processed!")


if __name__ == "__main__":
    main()