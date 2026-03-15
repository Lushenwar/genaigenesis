import { useState, useCallback, useEffect, useRef } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { getPlantationData } from "@/lib/api";

const API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || "";

/** Heat-map colors by Priorite_I (1=highest priority). */
const HEAT_COLORS: Record<number, string> = {
  1: "#ff3333",
  2: "#ff6633",
  3: "#ffaa33",
  4: "#88cc44",
  5: "#44aaff",
};

const DEFAULT_CENTER = { lat: 45.55, lng: -73.65 };
const DEFAULT_ZOOM = 11;

function PlantationDataLayer() {
  const map = useMap();
  const loaded = useRef(false);

  useEffect(() => {
    if (!map || loaded.current) return;
    loaded.current = true;

    getPlantationData()
      .then((geojson) => {
        if (!geojson || typeof geojson !== "object") return;
        const data = geojson as GeoJSON.FeatureCollection;
        if (!data.features?.length) return;

        map.data.addGeoJson(data);
        map.data.setStyle((feature) => {
          const priority = (feature.getProperty("Priorite_I") as number) ?? 3;
          const fillColor = HEAT_COLORS[priority] ?? "#666";
          return {
            fillColor,
            fillOpacity: 0.55,
            strokeColor: "#fff",
            strokeOpacity: 0.85,
            strokeWeight: 1.2,
            clickable: true,
          };
        });
      })
      .catch((err) => console.error("Failed to load plantation data:", err));

    return () => {
      map.data.forEach((f) => map.data.remove(f));
    };
  }, [map]);

  return null;
}

function MapOverlayUI() {
  const map = useMap();
  const [center, setCenter] = useState(DEFAULT_CENTER);

  useEffect(() => {
    if (!map) return;
    const updateCenter = () => {
      const c = map.getCenter();
      if (c) setCenter({ lat: c.lat(), lng: c.lng() });
    };
    updateCenter();
    const listener = map.addListener("center_changed", updateCenter);
    return () => google.maps.event.removeListener(listener);
  }, [map]);

  return (
    <>
      <div className="absolute top-3 left-3 flex gap-2 z-10">
        <button className="px-3 py-1.5 text-xs font-medium rounded-sm shadow-sm bg-background border border-border text-foreground">
          Map
        </button>
        <button className="px-3 py-1.5 text-xs font-medium rounded-sm bg-background/60 text-muted-foreground border border-transparent hover:border-border hover:bg-background transition-colors">
          Satellite
        </button>
      </div>
      <div className="absolute top-3 right-3 bg-background/90 border border-border rounded-sm px-2.5 py-1.5 shadow-sm z-10">
        <span className="font-mono text-[11px] text-muted-foreground">
          {center.lat.toFixed(4)}° N, {Math.abs(center.lng).toFixed(4)}° W
        </span>
      </div>
      <div className="absolute right-3 bottom-3 flex flex-col gap-1 z-10">
        {[ZoomIn, ZoomOut, Maximize2].map((Icon, i) => (
          <button
            key={i}
            className="w-8 h-8 bg-background border border-border rounded-sm flex items-center justify-center shadow-sm hover:bg-secondary transition-colors"
          >
            <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          </button>
        ))}
      </div>
      <div className="absolute bottom-3 left-3 z-10">
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-sm text-xs font-medium shadow-sm hover:opacity-90 transition-opacity">
          Run Blueprint
        </button>
      </div>
      <div className="absolute bottom-3 left-[4.5rem] flex gap-2 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {[1, 2, 3, 4, 5].map((p) => (
            <span key={p} className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-sm border border-white/50"
                style={{ backgroundColor: HEAT_COLORS[p] ?? "#666" }}
              />
              {p === 1 && "High"}
              {p === 5 && "Low"}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

function MapContent() {
  const [mapLoading, setMapLoading] = useState(true);
  const handleTilesLoaded = useCallback(() => setMapLoading(false), []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-secondary">
      <APIProvider apiKey={API_KEY}>
        <Map
          style={{ width: "100%", height: "100%" }}
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI
          mapTypeId="roadmap"
          onTilesLoaded={handleTilesLoaded}
        >
          <PlantationDataLayer />
          <MapOverlayUI />
        </Map>
      </APIProvider>

      {mapLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <p className="text-sm text-muted-foreground animate-pulse">Loading map…</p>
        </div>
      )}
    </div>
  );
}

export function MapView() {
  if (!API_KEY) {
    return (
      <div className="relative h-full w-full flex items-center justify-center bg-secondary text-muted-foreground text-sm p-4">
        Set VITE_GOOGLE_MAPS_API_KEY in .env to show the map. Backend: ensure VITE_API_URL points to http://localhost:8000.
      </div>
    );
  }
  return <MapContent />;
}
