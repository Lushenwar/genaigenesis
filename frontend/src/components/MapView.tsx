import { useState, useCallback, useEffect, useRef } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { getPlantationData } from "@/lib/api";

// Must be VITE_GOOGLE_MAPS_API_KEY in .env — Vite only exposes VITE_* variables
const API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string)?.trim() || "";

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

interface GeoJsonFeatureCollection {
  type?: string;
  features?: unknown[];
}

function PlantationDataLayer() {
  const map = useMap();
  const loaded = useRef(false);

  useEffect(() => {
    if (!map || loaded.current) return;
    loaded.current = true;

    getPlantationData()
      .then((geojson) => {
        if (!geojson || typeof geojson !== "object") return;
        const data = geojson as GeoJsonFeatureCollection;
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
    return () => {
      const g = (window as unknown as { google?: { maps: { event: { removeListener: (l: unknown) => void } } } }).google;
      if (g) g.maps.event.removeListener(listener);
    };
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
  const [mapError, setMapError] = useState<string | null>(null);

  const handleTilesLoaded = useCallback(() => {
    setMapLoading(false);
    setMapError(null);
  }, []);

  // If map tiles never load (e.g. invalid API key or API not enabled), show error after 12s
  useEffect(() => {
    if (!mapLoading) return;
    const t = setTimeout(() => {
      setMapError(
        "Map did not load. Check: (1) VITE_GOOGLE_MAPS_API_KEY in frontend/.env and restart Vite, (2) Maps JavaScript API enabled for your key in Google Cloud Console, (3) Browser Console (F12) for errors."
      );
    }, 12000);
    return () => clearTimeout(t);
  }, [mapLoading]);

  return (
    <div className="relative h-full w-full min-h-[400px] overflow-hidden bg-secondary">
      <APIProvider apiKey={API_KEY}>
        <Map
          style={{ width: "100%", height: "100%", minHeight: "400px" }}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/90 z-10 p-4">
          <p className="text-sm text-muted-foreground animate-pulse">Loading map…</p>
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 z-20 p-6">
          <div className="text-center max-w-lg text-sm text-amber-900 dark:text-amber-200">
            <p className="font-medium mb-2">Map failed to load</p>
            <p className="text-amber-800 dark:text-amber-300 text-left">{mapError}</p>
            <p className="mt-3 text-xs">Open DevTools (F12) → Console and look for red errors from Google Maps or your page.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function MapView() {
  if (!API_KEY) {
    return (
      <div className="relative h-full w-full min-h-[400px] flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md p-6">
        <div className="text-center max-w-md text-sm text-zinc-700 dark:text-zinc-300">
          <p className="font-medium mb-1">Map needs a Google Maps API key</p>
          <p className="text-zinc-600 dark:text-zinc-400">In <code className="bg-zinc-300 dark:bg-zinc-700 px-1 rounded">frontend/.env</code> add:</p>
          <pre className="mt-2 p-2 bg-zinc-300 dark:bg-zinc-700 rounded text-left text-xs overflow-x-auto">VITE_GOOGLE_MAPS_API_KEY=your_key_here</pre>
          <p className="mt-2 text-xs text-zinc-500">Restart the dev server (npx vite) after changing .env. Backend: VITE_API_URL (default http://localhost:8000)</p>
        </div>
      </div>
    );
  }
  return <MapContent />;
}
