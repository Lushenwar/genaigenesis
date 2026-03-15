import { useEffect, useState } from "react";
import { Terminal, X, ChevronDown, ChevronRight } from "lucide-react";
import { getApiBase } from "@/lib/api";

const staticTraceLog = [
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

export interface TraceStep {
  order: number;
  step_name: string;
  input_summary?: string;
  output_summary?: string;
  error?: string | null;
  timestamp?: number | null;
}

export interface TraceData {
  trace_id: string;
  steps: TraceStep[];
  flow_name?: string;
  session_name?: string;
  start_time?: number;
  end_time?: number;
}

interface ConductrTraceProps {
  visible: boolean;
  onClose: () => void;
  traceId?: string | null;
}

export function ConductrTrace({ visible, onClose, traceId }: ConductrTraceProps) {
  const [trace, setTrace] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  useEffect(() => {
    if (!visible || !traceId?.trim()) {
      setTrace(null);
      setFetchError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    const base = getApiBase();
    fetch(`${base}/api/v1/traces/${encodeURIComponent(traceId)}`, {
      headers: { Accept: "application/json" },
    })
      .then((res) => {
        if (cancelled) return null;
        if (!res.ok) {
          if (res.status === 404) return null;
          throw new Error(res.statusText || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: TraceData | null) => {
        if (!cancelled) {
          setTrace(data ?? null);
          if (data === null && traceId) setFetchError("Trace not found or unavailable.");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setTrace(null);
          setFetchError(err instanceof Error ? err.message : "Failed to load trace.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, traceId]);

  if (!visible) return null;

  const useLiveTrace = trace?.steps?.length;
  const steps = useLiveTrace ? trace!.steps : [];
  const subtitle = trace?.flow_name ?? "Execution trace";

  return (
    <div className="border-t border-border bg-secondary/50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
          <span className="text-[11px] font-medium text-muted-foreground">
            {subtitle}
          </span>
          {traceId && !useLiveTrace && !loading && !fetchError && (
            <span className="text-[10px] text-muted-foreground/80">(static)</span>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
      <div className="overflow-y-auto max-h-[220px] p-3 space-y-1">
        {loading && (
          <div className="text-[11px] text-muted-foreground py-2">Loading trace…</div>
        )}
        {fetchError && (
          <div className="text-[11px] text-amber-500 py-2">{fetchError}</div>
        )}
        {!loading && useLiveTrace && steps.map((step, i) => (
          <div key={step.order} className="text-[11px] font-mono-data leading-relaxed">
            <button
              type="button"
              className="w-full flex gap-2 items-start text-left rounded px-1 py-0.5 hover:bg-muted/50"
              onClick={() => setExpandedStep(expandedStep === i ? null : i)}
            >
              <span className="text-muted-foreground/60 shrink-0">
                {step.timestamp != null ? formatTs(step.timestamp) : `${step.order}.`}
              </span>
              <span className="text-foreground/80 flex-1 min-w-0">
                {step.step_name}
              </span>
              {(step.input_summary || step.output_summary || step.error)
                ? (expandedStep === i ? (
                    <ChevronDown className="w-3 h-3 shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-3 h-3 shrink-0 mt-0.5" />
                  ))
                : null}
            </button>
            {expandedStep === i && (step.input_summary || step.output_summary || step.error) && (
              <div className="ml-5 mt-1 pl-2 border-l border-border/50 space-y-1 text-[10px] text-muted-foreground">
                {step.input_summary && (
                  <div><span className="text-muted-foreground/70">In:</span> {step.input_summary}</div>
                )}
                {step.output_summary && (
                  <div><span className="text-muted-foreground/70">Out:</span> {step.output_summary}</div>
                )}
                {step.error && (
                  <div className="text-amber-500">Error: {step.error}</div>
                )}
              </div>
            )}
          </div>
        ))}
        {!loading && !useLiveTrace && !fetchError && staticTraceLog.map((entry, i) => (
          <div key={i} className="flex gap-3 text-[11px] font-mono-data leading-relaxed">
            <span className="text-muted-foreground/60 shrink-0">{entry.ts}</span>
            <span className="text-foreground/80">{entry.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTs(ts: number): string {
  if (typeof ts !== "number" || !Number.isFinite(ts)) return "";
  const sec = Math.floor(ts);
  const ms = Math.round((ts - sec) * 100);
  return `${String(sec).padStart(2, "0")}:${String(ms).padStart(2, "0")}`;
}
