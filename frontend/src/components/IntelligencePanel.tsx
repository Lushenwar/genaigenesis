import { useState, useEffect } from "react";
import { ChevronRight, FileJson, Thermometer, Loader2, AlertCircle, ArrowLeft, TreePine, MapPin, Zap } from "lucide-react";
import { InterventionCard } from "./InterventionCard";
import { getTop10Zones, type Top10Zone } from "@/lib/api";
import type { AnalyzeZoneResult } from "@/lib/api";

// Tree canopy only — ROI 6–15% (30-yr), Shade 0.70–0.85, ETI 0.60–0.75, Albedo 0.05–0.10, cost $6k–$15k
const interventions = [
  { refId: "TC-01", coords: "43.6532, -79.3832", type: "Tree Canopy", coolingCap: "0.74", roi: "8%", shade: "0.72", evapotranspiration: "0.62", albedo: "0.06", cost: "$7,500", confidence: 88 },
  { refId: "TC-02", coords: "43.6611, -79.3950", type: "Tree Canopy", coolingCap: "0.79", roi: "11%", shade: "0.78", evapotranspiration: "0.68", albedo: "0.08", cost: "$10,200", confidence: 86 },
  { refId: "TC-03", coords: "43.6445, -79.4010", type: "Tree Canopy", coolingCap: "0.83", roi: "14%", shade: "0.84", evapotranspiration: "0.73", albedo: "0.09", cost: "$13,000", confidence: 90 },
];

const tabs = ["Recommendations", "Top 10", "Dashboard"];

function ZoneDetailView({
  zoneLabel,
  onBack,
  analyzing,
  error,
  analysis,
}: {
  zoneLabel: string;
  onBack: () => void;
  analyzing: boolean;
  error: string | null;
  analysis: AnalyzeZoneResult | null;
}) {
  const sites = analysis?.features?.filter((f) => f.properties?.feature_kind === "recommended_planting_site") ?? [];
  const meta = analysis?.metadata;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col p-3">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground mb-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
        Back to zones
      </button>
      <h3 className="text-sm font-semibold text-foreground truncate">{zoneLabel}</h3>

      {analyzing && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground text-xs">
          <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
          <span>Analyzing zone…</span>
        </div>
      )}
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[11px] mt-2">
          {error}
        </div>
      )}
      {analysis && meta && !analyzing && (
        <div className="space-y-3 mt-2">
          <div className="px-2 py-1.5 rounded border bg-muted/30 text-[11px] text-muted-foreground">
            {meta.rationale}
          </div>
          {meta.recommended_species?.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                <TreePine className="w-3 h-3" /> Species
              </p>
              <div className="flex flex-wrap gap-1">
                {meta.recommended_species.map((s, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {sites.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3" /> Planting sites ({sites.length})
              </p>
              <ul className="space-y-1.5">
                {sites.slice(0, 5).map((f, i) => (
                  <li key={i} className="text-[11px] text-foreground/90">
                    {(f.properties?.label as string) || `Site ${i + 1}`}
                    {(f.properties?.reason as string) && (
                      <span className="text-muted-foreground block truncate">{(f.properties.reason as string)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {meta.quick_wins?.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                <Zap className="w-3 h-3" /> Quick wins
              </p>
              <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                {meta.quick_wins.map((q, i) => (
                  <li key={i}>+ {q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Top10TabContent({
  onZoneSelect,
  selectedZone,
  analysis,
  analyzing,
  analysisError,
  onBack,
}: {
  onZoneSelect: (zone: Top10Zone) => void;
  selectedZone: Top10Zone | null;
  analysis: AnalyzeZoneResult | null;
  analyzing: boolean;
  analysisError: string | null;
  onBack: () => void;
}) {
  const [zones, setZones] = useState<Top10Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTop10Zones()
      .then(setZones)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load zones"))
      .finally(() => setLoading(false));
  }, []);

  if (selectedZone) {
    const label = selectedZone.neighborhood ?? selectedZone.zone_id.replace(/_/g, " ");
    return (
      <ZoneDetailView
        zoneLabel={label}
        onBack={onBack}
        analyzing={analyzing}
        error={analysisError}
        analysis={analysis}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
          <span>Loading highest-vulnerability zones…</span>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-destructive text-sm text-center max-w-[260px]">
          <AlertCircle className="w-5 h-5 shrink-0" strokeWidth={1.5} />
          <span>{error}</span>
          <span className="text-xs text-muted-foreground">Ensure the backend is running and sample-zones are available.</span>
        </div>
      </div>
    );
  }
  if (!zones.length) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto p-4 text-center text-sm text-muted-foreground">
        No zone data available.
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
      <p className="text-[11px] text-muted-foreground mb-2 px-1">
        Ranked by heat vulnerability (ML risk). Click a zone for details.
      </p>
      {zones.map((zone, index) => {
        const rank = index + 1;
        const b = zone.bounds;
        const lat = ((b.north + b.south) / 2).toFixed(4);
        const lng = ((b.west + b.east) / 2).toFixed(4);
        const heat = zone.metrics?.avg_heat_index;
        const pop = zone.metrics?.avg_population_density;
        const canopy = zone.metrics?.avg_canopy_coverage_pct;
        const cluster = zone.ml_risk_cluster ?? "—";
        return (
          <button
            type="button"
            key={zone.zone_id}
            onClick={() => onZoneSelect(zone)}
            className="w-full text-left border border-border rounded-md bg-background p-3 hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                  {rank}
                </span>
                <span className="font-mono text-xs font-medium text-foreground truncate" title={zone.zone_id}>
                  {zone.zone_id.replace(/_/g, " ")}
                </span>
              </div>
              <span
                className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  cluster === "Critical"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                }`}
              >
                {cluster}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
              {typeof heat === "number" && (
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3" strokeWidth={1.5} />
                  Heat index {heat.toFixed(1)}
                </span>
              )}
              {typeof pop === "number" && (
                <span>Pop. {(pop / 1000).toFixed(1)}k/km²</span>
              )}
              {typeof canopy === "number" && (
                <span>Canopy {canopy.toFixed(1)}%</span>
              )}
              {typeof zone.metrics?.priority_1_cell_count === "number" && (
                <span>{zone.metrics.priority_1_cell_count} critical cells</span>
              )}
            </div>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">
              {lat}° N, {Math.abs(parseFloat(lng)).toFixed(4)}° W
            </p>
          </button>
        );
      })}
    </div>
  );
}

export interface IntelligencePanelProps {
  selectedZone?: Top10Zone | null;
  analysis?: AnalyzeZoneResult | null;
  analyzing?: boolean;
  analysisError?: string | null;
  onZoneSelect?: (zone: Top10Zone) => void;
  onZoneBack?: () => void;
}

export function IntelligencePanel({
  selectedZone = null,
  analysis = null,
  analyzing = false,
  analysisError = null,
  onZoneSelect = () => {},
  onZoneBack = () => {},
}: IntelligencePanelProps = {}) {
  const [activeTab, setActiveTab] = useState("Recommendations");

  return (
    <div className="h-full min-h-0 flex flex-col border-l border-border bg-background">
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

      {activeTab === "Top 10" ? (
        <>
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-sm font-medium text-foreground">Highest-vulnerability zones</span>
          </div>
          <Top10TabContent
            onZoneSelect={onZoneSelect}
            selectedZone={selectedZone}
            analysis={analysis}
            analyzing={analyzing}
            analysisError={analysisError}
            onBack={onZoneBack}
          />
        </>
      ) : (
        <>
          {/* Config header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Intervention Blueprint</span>
            <div className="flex items-center gap-1.5">
              <FileJson className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              <span className="font-mono text-[11px] text-primary">blueprint_2026.json</span>
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
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            {interventions.map(intervention => (
              <InterventionCard key={intervention.refId} {...intervention} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
