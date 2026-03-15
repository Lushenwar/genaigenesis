import { useState } from "react";
import { MapPin, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import mapImage from "@/assets/map-light.jpg";

const zones = [
  { id: 1, x: 38, y: 32, label: "Zone A-14", risk: "High", temp: "+4.2°C" },
  { id: 2, x: 55, y: 48, label: "Zone B-07", risk: "Critical", temp: "+5.8°C" },
  { id: 3, x: 42, y: 60, label: "Zone C-22", risk: "Moderate", temp: "+2.9°C" },
  { id: 4, x: 65, y: 35, label: "Zone D-03", risk: "High", temp: "+3.7°C" },
];

export function MapView() {
  const [activeZone, setActiveZone] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);

  return (
    <div className="relative h-full w-full overflow-hidden bg-secondary">
      <img src={mapImage} alt="Toronto geospatial map" className="absolute inset-0 w-full h-full object-cover" />

      {/* Scan line */}
      {scanning && (
        <div className="absolute left-0 right-0 h-[2px] bg-primary/60 z-20 animate-[scan-line_3s_ease-in-out]" />
      )}

      {/* Zone markers */}
      {zones.map(zone => (
        <div
          key={zone.id}
          className="absolute z-10 cursor-pointer"
          style={{ left: `${zone.x}%`, top: `${zone.y}%`, transform: "translate(-50%, -50%)" }}
          onMouseEnter={() => setActiveZone(zone.id)}
          onMouseLeave={() => setActiveZone(null)}
        >
          <MapPin className={`w-5 h-5 ${
            zone.risk === "Critical" ? "text-destructive" : zone.risk === "High" ? "text-risk" : "text-accent"
          } drop-shadow-sm`} strokeWidth={1.5} />

          {activeZone === zone.id && (
            <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-background border border-border rounded-md p-2 min-w-[120px] shadow-md z-30">
              <p className="text-[11px] font-medium text-foreground">{zone.label}</p>
              <div className="flex justify-between mt-1 text-[10px]">
                <span className={zone.risk === "Critical" ? "text-destructive" : zone.risk === "High" ? "text-risk" : "text-accent"}>{zone.risk}</span>
                <span className="text-muted-foreground font-mono-data">{zone.temp}</span>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Top bar */}
      <div className="absolute top-3 left-3 flex gap-2 z-10">
        <button
          className={`px-3 py-1.5 text-xs font-medium rounded-sm shadow-sm border transition-colors ${
            true ? "bg-background border-border text-foreground" : "bg-background/60 border-transparent text-muted-foreground"
          }`}
        >
          Map
        </button>
        <button className="px-3 py-1.5 text-xs font-medium rounded-sm bg-background/60 text-muted-foreground border border-transparent hover:border-border hover:bg-background transition-colors">
          Satellite
        </button>
      </div>

      {/* Coordinates */}
      <div className="absolute top-3 right-3 bg-background/90 border border-border rounded-sm px-2.5 py-1.5 shadow-sm z-10">
        <span className="font-mono-data text-[11px] text-muted-foreground">43.6532° N, 79.3832° W</span>
      </div>

      {/* Zoom */}
      <div className="absolute right-3 bottom-3 flex flex-col gap-1 z-10">
        {[ZoomIn, ZoomOut, Maximize2].map((Icon, i) => (
          <button key={i} className="w-8 h-8 bg-background border border-border rounded-sm flex items-center justify-center shadow-sm hover:bg-secondary transition-colors">
            <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          </button>
        ))}
      </div>

      {/* Run button */}
      <div className="absolute bottom-3 left-3 z-10">
        <button
          onClick={() => { setScanning(true); setTimeout(() => setScanning(false), 3000); }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-sm text-xs font-medium shadow-sm hover:opacity-90 transition-opacity"
        >
          {scanning ? "Scanning..." : "Run Blueprint"}
        </button>
      </div>
    </div>
  );
}
