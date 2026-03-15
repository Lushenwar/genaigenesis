"use client";

import { useEffect, useState } from "react";
import { MapView } from "@/components/MapView";
import { getApiBase } from "@/lib/api";
import {
  Loader2,
  TreePine,
  ArrowLeft,
  MapPin,
  AlertTriangle,
  Zap,
  ChevronRight,
  Terminal,
} from "lucide-react";
import { ConductrTrace } from "@/components/ConductrTrace";

/** Bounds shape used by MapView and backend zones */
interface ZoneBounds {
  south: number;
  north: number;
  west: number;
  east: number;
}

/** Matches backend top_10_ml_zones.json; optional fields for backward compatibility */
interface Zone {
  zone_id: string;
  neighborhood?: string;
  center?: { lat: number; lng: number };
  bounds: ZoneBounds;
  ml_risk_cluster?: string;
  metrics: {
    priority_1_cell_count?: number;
    area_sq_m?: number;
    avg_heat_index?: number;
    avg_population_density?: number;
    avg_canopy_coverage_pct?: number;
  };
}

/** Approximate area in m² from bounds (WGS84) */
function areaFromBounds(b: ZoneBounds): number {
  const latMid = (b.north + b.south) / 2;
  const degToM = 111320 * Math.cos((latMid * Math.PI) / 180);
  return (b.north - b.south) * degToM * (b.east - b.west) * degToM;
}

function getZoneLabel(zone: Zone): string {
  return zone.neighborhood ?? zone.zone_id.replace(/_/g, " ");
}

function getZoneCriticalText(zone: Zone): string {
  const c = zone.metrics?.priority_1_cell_count;
  if (typeof c === "number" && !Number.isNaN(c)) return `${c} critical cells`;
  const h = zone.metrics?.avg_heat_index;
  if (typeof h === "number" && !Number.isNaN(h)) return `Heat index ${h}`;
  return zone.ml_risk_cluster ?? "—";
}

function getZoneAreaText(zone: Zone): string {
  const a = zone.metrics?.area_sq_m;
  const m2 = typeof a === "number" && !Number.isNaN(a) ? a : areaFromBounds(zone.bounds);
  if (!Number.isFinite(m2)) return "— m²";
  const k = m2 / 1000;
  return k >= 1 ? `${Math.round(k)}k m²` : `${Math.round(m2)} m²`;
}

interface PlantingSite {
  label: string;
  reason: string;
  priority: string;
  estimated_tree_count: number;
}

interface AnalysisMetadata {
  confidence: string;
  rationale: string;
  constraints: string[];
  quick_wins: string[];
  recommended_species: string[];
}

interface AnalysisResult {
  type: string;
  features: Array<{
    type?: string;
    geometry?: { type: string; coordinates?: number[] | number[][][] };
    properties?: Record<string, unknown>;
  }>;
  metadata: AnalysisMetadata;
  generated_image_base64?: string | null;
}

function ConfidenceBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    high: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${styles[level] || styles.low}`}
    >
      {level} confidence
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const color =
    priority === "high"
      ? "bg-red-500"
      : priority === "medium"
        ? "bg-yellow-500"
        : "bg-zinc-500";
  return <div className={`w-2 h-2 rounded-full ${color} shrink-0 mt-1`} />;
}

export default function Home() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [tracePanelOpen, setTracePanelOpen] = useState(false);

  useEffect(() => {
    const base = getApiBase();
    fetch(`${base}/api/v1/reasoning/sample-zones`)
      .then((res) => res.json())
      .then((data) => setZones(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load zones:", err));
  }, []);

  const handleZoneSelect = async (zone: Zone) => {
    const zoneId = zone?.zone_id;
    if (!zoneId) return;
    setSelectedZone(zone);
    setAnalysis(null);
    setError(null);
    setAnalyzing(true);

    try {
      const base = getApiBase();
      const res = await fetch(
        `${base}/api/v1/reasoning/analyze-zone/${zoneId}`,
        { method: "POST", headers: { Accept: "application/json" } }
      );
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`Server ${res.status}: ${text.slice(0, 200) || res.statusText}`);
      }
      const data = JSON.parse(text) as AnalysisResult & { trace_id?: string };
      setAnalysis(data);
      setTraceId(data.trace_id ?? null);
      if (data.trace_id) setTracePanelOpen(true);
    } catch (err) {
      console.error("Analysis failed:", err);
      setError(err instanceof Error ? err.message : "Analysis failed. Make sure the backend is running.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBack = () => {
    setSelectedZone(null);
    setAnalysis(null);
    setError(null);
    setTraceId(null);
  };

  const plantingSites: PlantingSite[] =
    analysis?.features
      .filter((f) => f.properties?.feature_kind === "recommended_planting_site")
      .map((f) => ({
        label: (f.properties?.label as string) || "Planting site",
        reason: (f.properties?.reason as string) || "",
        priority: (f.properties?.priority as string) || "medium",
        estimated_tree_count:
          (f.properties?.estimated_tree_count as number) || 1,
      })) ?? [];

  const handleLocationSelect = (_lat: number, _lng: number) => {
    // Map polygon clicks — could be wired to blueprint generation later
  };

  return (
    <main className="flex h-screen flex-col bg-black text-white p-6 gap-4 overflow-hidden">
      <header className="shrink-0 flex justify-between items-center border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
            ECO-PULSE
          </h1>
          <p className="text-zinc-400 text-sm">
            AI-Powered Urban Heat Mitigation Planner
          </p>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 overflow-hidden">
        <section className="flex-[2] relative">
          <MapView
            selectedBounds={selectedZone?.bounds ?? null}
            recommendationLayer={analysis ?? null}
            onLocationSelect={handleLocationSelect}
          />
        </section>

        <aside className="flex-1 min-h-0 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm overflow-y-auto">
          {/* ─── Zone List ─── */}
          {!selectedZone && (
            <>
              <h2 className="text-lg font-semibold mb-1">
                Top Impact Zones
              </h2>
              <p className="text-xs text-zinc-500 mb-4">
                10 neighborhoods with the most Priority 1 cells. Click to
                analyze.
              </p>
              {zones.length === 0 && (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                </div>
              )}
              <div className="space-y-2">
                {zones.map((zone, i) => (
                  <button
                    type="button"
                    key={zone.zone_id}
                    onClick={() => handleZoneSelect(zone)}
                    disabled={analyzing}
                    className="w-full text-left p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-red-500/50 hover:bg-zinc-800/60 transition-all group disabled:opacity-60 disabled:pointer-events-none"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <span className="text-[10px] text-red-400 font-bold">
                          #{i + 1}
                        </span>
                        <h3 className="text-sm font-semibold text-white truncate">
                          {getZoneLabel(zone)}
                        </h3>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-zinc-600 group-hover:text-red-400 transition-colors shrink-0 mt-1"
                      />
                    </div>
                    <div className="flex gap-4 mt-1.5 text-[10px] text-zinc-500">
                      <span className="text-red-400/80 font-medium">
                        {getZoneCriticalText(zone)}
                      </span>
                      <span>
                        {getZoneAreaText(zone)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ─── Analysis View ─── */}
          {selectedZone && (
            <>
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-4"
              >
                <ArrowLeft size={14} />
                Back to zones
              </button>

              <div className="mb-4">
                <h2 className="text-lg font-semibold">
                  {getZoneLabel(selectedZone)}
                </h2>
                <div className="flex gap-3 mt-1 text-[10px] text-zinc-500">
                  <span>
                    {getZoneCriticalText(selectedZone)}
                  </span>
                  <span>
                    {getZoneAreaText(selectedZone)}
                  </span>
                </div>
              </div>

              {analyzing && (
                <div className="flex flex-col items-center justify-center p-12 space-y-3">
                  <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                  <p className="text-xs text-zinc-400">
                    Gemini analyzing satellite imagery...
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}

              {analysis && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Generated image with trees (when available) */}
                  {analysis.generated_image_base64 && (
                    <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
                      <img
                        src={`data:image/png;base64,${analysis.generated_image_base64}`}
                        alt="AI-generated tree planting visualization for this area"
                        className="w-full h-auto object-contain max-h-64"
                      />
                      <p className="text-[10px] text-zinc-500 px-3 py-1.5 border-t border-zinc-800">
                        Suggested tree planting view
                      </p>
                    </div>
                  )}

                  {/* Confidence */}
                  <div className="flex items-center gap-2">
                    <ConfidenceBadge level={analysis.metadata.confidence} />
                  </div>

                  {/* Rationale */}
                  <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                      Analysis
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {analysis.metadata.rationale}
                    </p>
                  </div>

                  {/* Recommended Species */}
                  {analysis.metadata.recommended_species.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <TreePine size={12} />
                        Recommended Species
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.metadata.recommended_species.map((s, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-[10px] text-green-400"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Planting Sites */}
                  {plantingSites.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <MapPin size={12} />
                        Planting Sites ({plantingSites.length})
                      </h3>
                      <div className="space-y-2">
                        {plantingSites.map((site, i) => (
                          <div
                            key={i}
                            className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg"
                          >
                            <div className="flex items-start gap-2">
                              <PriorityDot priority={site.priority} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-white">
                                    {site.label}
                                  </span>
                                  <span className="text-[9px] text-zinc-600">
                                    ~{site.estimated_tree_count} trees
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                                  {site.reason}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Constraints */}
                  {analysis.metadata.constraints.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={12} />
                        Constraints
                      </h3>
                      <ul className="space-y-1">
                        {analysis.metadata.constraints.map((c, i) => (
                          <li
                            key={i}
                            className="text-[11px] text-zinc-400 flex items-start gap-1.5"
                          >
                            <span className="text-yellow-500 mt-0.5">-</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Quick Wins */}
                  {analysis.metadata.quick_wins.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Zap size={12} />
                        Quick Wins
                      </h3>
                      <ul className="space-y-1">
                        {analysis.metadata.quick_wins.map((q, i) => (
                          <li
                            key={i}
                            className="text-[11px] text-zinc-400 flex items-start gap-1.5"
                          >
                            <span className="text-green-500 mt-0.5">+</span>
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {/* Audit & Observability: execution trace — always visible at bottom */}
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/80">
        <button
          type="button"
          onClick={() => setTracePanelOpen((v) => !v)}
          className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors rounded-t"
          aria-expanded={tracePanelOpen}
        >
          <Terminal className="w-4 h-4 text-primary shrink-0" />
          <span className="font-medium">
            Conductr Trace{traceId ? ` (run: ${traceId.slice(0, 8)}…)` : " — click a zone, then open for execution trace"}
          </span>
        </button>
        <ConductrTrace
          visible={tracePanelOpen}
          onClose={() => setTracePanelOpen(false)}
          traceId={traceId}
        />
      </div>
    </main>
  );
}
