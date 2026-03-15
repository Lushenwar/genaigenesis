import { Terminal, X } from "lucide-react";

const traceLog = [
  { ts: "00:00.14", msg: "Pipeline initialized — Spatial Data Engine v2.4" },
  { ts: "00:01.20", msg: "fn:load_vegetation_raster(bounds=[43.58,43.72,-79.50,-79.28])" },
  { ts: "00:02.89", msg: "Loaded 14,202 plantable hectares from NDVI composite" },
  { ts: "00:04.01", msg: "fn:intersect_population_density(source='statscan_2021')" },
  { ts: "00:05.44", msg: "Top 10 vulnerability zones identified — max_risk=0.94" },
  { ts: "00:07.10", msg: "fn:calculate_invest_cooling(shade=0.72, evap=0.68, albedo=0.31)" },
  { ts: "00:08.33", msg: "InVEST Urban Cooling Model — capacity_index=0.82" },
  { ts: "00:10.21", msg: "fn:gemini_generate_blueprint(constraints={cost_max: 2400000})" },
  { ts: "00:14.89", msg: "Blueprint JSON generated — 4 interventions, est_roi=14.2%" },
  { ts: "00:16.00", msg: "fn:imagen3_inpaint(target='zone_B07', type='green_roof')" },
  { ts: "00:19.44", msg: "Visualization rendered — confidence=0.91" },
];

interface ConductrTraceProps {
  visible: boolean;
  onClose: () => void;
}

export function ConductrTrace({ visible, onClose }: ConductrTraceProps) {
  if (!visible) return null;

  return (
    <div className="border-t border-border bg-secondary/50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
          <span className="text-[11px] font-medium text-muted-foreground">Conductr Trace</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
      <div className="overflow-y-auto max-h-[180px] p-3 space-y-1">
        {traceLog.map((entry, i) => (
          <div key={i} className="flex gap-3 text-[11px] font-mono-data leading-relaxed">
            <span className="text-muted-foreground/60 shrink-0">{entry.ts}</span>
            <span className="text-foreground/80">{entry.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
