import { useState } from "react";
import { ChevronRight, FileJson } from "lucide-react";
import { InterventionCard } from "./InterventionCard";
import { ConductrTrace } from "./ConductrTrace";

const interventions = [
  { refId: "09-X24", coords: "43.6532, -79.3832", type: "Green Roof", coolingCap: "0.82", roi: "14.2%", shade: "0.72", evapotranspiration: "0.68", albedo: "0.31", cost: "$1.2M", confidence: 91 },
  { refId: "11-K07", coords: "43.6611, -79.3950", type: "Tree Canopy", coolingCap: "0.76", roi: "11.8%", shade: "0.84", evapotranspiration: "0.72", albedo: "0.18", cost: "$840K", confidence: 87 },
  { refId: "15-M12", coords: "43.6445, -79.4010", type: "Cool Pavement", coolingCap: "0.54", roi: "8.3%", shade: "0.12", evapotranspiration: "0.08", albedo: "0.67", cost: "$620K", confidence: 83 },
];

const tabs = ["Visualization", "Results", "JSON", "Execution details"];

export function IntelligencePanel() {
  const [traceVisible, setTraceVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("Visualization");

  return (
    <div className="h-full flex flex-col border-l border-border bg-background">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-medium transition-colors relative ${
              activeTab === tab
                ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Config header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Intervention Blueprint</span>
        <div className="flex items-center gap-1.5">
          <FileJson className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
          <span className="font-mono-data text-[11px] text-primary">blueprint_2026.json</span>
        </div>
      </div>

      {/* Pipeline */}
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-1 overflow-x-auto">
        {["Spatial Data", "Risk Model", "AI Blueprint", "Viz"].map((stage, i) => (
          <div key={stage} className="flex items-center gap-1 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-[10px] text-muted-foreground">{stage}</span>
            {i < 3 && <ChevronRight className="w-3 h-3 text-border" strokeWidth={1.5} />}
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {interventions.map(intervention => (
          <InterventionCard key={intervention.refId} {...intervention} />
        ))}

        <button
          onClick={() => setTraceVisible(!traceVisible)}
          className="w-full py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border rounded-sm hover:bg-secondary transition-colors"
        >
          {traceVisible ? "Hide" : "View"} Conductr Trace
        </button>
      </div>

      <ConductrTrace visible={traceVisible} onClose={() => setTraceVisible(false)} />
    </div>
  );
}
