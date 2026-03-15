"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PRIORITY_COLORS: Record<number, string> = {
  1: "#d32f2f",
  2: "#f57c00",
  3: "#fbc02d",
  4: "#66bb6a",
  5: "#2196f3",
};

export interface ZoneBounds {
  south: number;
  north: number;
  west: number;
  east: number;
}

interface MapViewProps {
  onLocationSelect: (lat: number, lng: number) => void;
  selectedBounds?: ZoneBounds | null;
}

function PlantationLayer() {
  const map = useMap();
  const loaded = useRef(false);

  useEffect(() => {
    if (!map || loaded.current) return;
    loaded.current = true;

    fetch(`${API_BASE}/api/v1/plantation-data`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((geojson) => {
        map.data.addGeoJson(geojson);

        map.data.setStyle((feature) => {
          const priority = feature.getProperty("Priorite_I") as number;
          return {
            fillColor: PRIORITY_COLORS[priority] || "#9e9e9e",
            fillOpacity: 0.65,
            strokeWeight: 0,
            clickable: true,
          };
        });

        map.data.addListener(
          "click",
          (event: google.maps.Data.MouseEvent) => {
            if (window.__ON_LOCATION_SELECT) {
              window.__ON_LOCATION_SELECT(
                event.latLng!.lat(),
                event.latLng!.lng()
              );
            }
          }
        );
      })
      .catch((err) => console.error("Failed to load plantation data:", err));

    return () => {
      map.data.forEach((f) => map.data.remove(f));
    };
  }, [map]);

  return null;
}

function ZoneHighlight({ bounds }: { bounds: ZoneBounds }) {
  const map = useMap();
  const rectRef = useRef<google.maps.Rectangle | null>(null);

  useEffect(() => {
    if (!map) return;

    const gBounds = new google.maps.LatLngBounds(
      { lat: bounds.south, lng: bounds.west },
      { lat: bounds.north, lng: bounds.east }
    );

    if (rectRef.current) {
      rectRef.current.setBounds(gBounds);
    } else {
      rectRef.current = new google.maps.Rectangle({
        bounds: gBounds,
        map,
        strokeColor: "#ef4444",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: "#ef4444",
        fillOpacity: 0.08,
        clickable: false,
      });
    }

    map.fitBounds(gBounds, { top: 40, bottom: 40, left: 40, right: 40 });

    return () => {
      rectRef.current?.setMap(null);
      rectRef.current = null;
    };
  }, [map, bounds]);

  return null;
}

export default function MapView({ onLocationSelect, selectedBounds }: MapViewProps) {
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    window.__ON_LOCATION_SELECT = onLocationSelect;
  }, [onLocationSelect]);

  const handleTilesLoaded = useCallback(() => setMapLoading(false), []);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-zinc-800 shadow-2xl relative">
      <APIProvider apiKey={API_KEY}>
        <Map
          style={{ width: "100%", height: "100%" }}
          defaultCenter={{ lat: 45.55, lng: -73.65 }}
          defaultZoom={12}
          gestureHandling={"greedy"}
          disableDefaultUI={true}
          mapId={"bf50a9134251786"}
          colorScheme="DARK"
          onTilesLoaded={handleTilesLoaded}
        >
          <PlantationLayer />
          {selectedBounds && <ZoneHighlight bounds={selectedBounds} />}
        </Map>
      </APIProvider>

      {mapLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <p className="text-sm text-zinc-400 animate-pulse">
            Loading map data...
          </p>
        </div>
      )}

      <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md p-3 rounded-lg border border-zinc-700 text-[10px] space-y-1.5 pointer-events-none">
        <p className="font-bold text-zinc-400 uppercase tracking-widest mb-1">
          Plantation Priority
        </p>
        {[
          { color: "bg-red-600", label: "Priority 1 (Highest)" },
          { color: "bg-orange-500", label: "Priority 2" },
          { color: "bg-yellow-400", label: "Priority 3" },
          { color: "bg-green-400", label: "Priority 4" },
          { color: "bg-blue-500", label: "Priority 5 (Lowest)" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-3 h-3 ${item.color} rounded-sm opacity-70`} />
            <span className="text-zinc-300">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

declare global {
  interface Window {
    __ON_LOCATION_SELECT?: (lat: number, lng: number) => void;
  }
}
