"use client";

import { useEffect, useState } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface MapViewProps {
  onLocationSelect: (lat: number, lng: number) => void;
}

function GeoJsonLayer() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Load GeoJSON data
    map.data.loadGeoJson("/toronto_heat.geojson");

    // Style the GeoJSON data (Glowing Heat Effect)
    map.data.setStyle((feature) => {
      const anomaly = feature.getProperty("temp_anomaly") as number;

      const color = anomaly > 4 ? "#ef4444" : "#f97316"; // Red to Orange
      return {
        fillColor: color,
        strokeColor: color,
        strokeWeight: 2,
        fillOpacity: 0.4,
        clickable: true,
      };
    });

    // Handle clicks on GeoJSON features
    const clickListener = map.data.addListener("click", (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      // Trigger parent handler (will be passed via props)
      if (window.__ON_LOCATION_SELECT) {
        window.__ON_LOCATION_SELECT(lat, lng);
      }
    });

    return () => google.maps.event.removeListener(clickListener);
  }, [map]);

  return null;
}

export default function MapView({ onLocationSelect }: MapViewProps) {
  // Expose handler to window for the child component to access easily in this simple scaffold
  useEffect(() => {
    window.__ON_LOCATION_SELECT = onLocationSelect;
  }, [onLocationSelect]);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-zinc-800 shadow-2xl relative">
      <APIProvider apiKey={API_KEY}>
        <Map
          style={{ width: "100%", height: "100%" }}
          defaultCenter={{ lat: 43.6532, lng: -79.3832 }}
          defaultZoom={14}
          gestureHandling={"greedy"}
          disableDefaultUI={true}
          mapId={"bf50a9134251786"} 
          colorScheme="DARK"
        >
          <GeoJsonLayer />
        </Map>
      </APIProvider>
      
      {/* Legend Overlay */}
      <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md p-3 rounded-lg border border-zinc-700 text-[10px] space-y-2 pointer-events-none">
        <p className="font-bold text-zinc-400 uppercase tracking-widest mb-1">Heat Intensity</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-sm opacity-60"></div>
          <span className="text-zinc-300">&gt; 4.0°C Anomaly</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-sm opacity-60"></div>
          <span className="text-zinc-300">2.0°C - 4.0°C Anomaly</span>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    __ON_LOCATION_SELECT?: (lat: number, lng: number) => void;
  }
}

