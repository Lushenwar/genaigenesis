/**
 * API client for ECO-PULSE backend.
 * Set VITE_API_URL in .env to point to the backend (default: http://localhost:8000).
 * Works in Vite (import.meta.env) and Next (process.env.NEXT_PUBLIC_API_URL).
 */
export function getApiBase(): string {
  const fromVite = (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL;
  const fromNext = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL;
  const url = (fromVite ?? fromNext ?? "")?.trim();
  return url || "http://localhost:8000";
}

export async function getPlantationData(): Promise<unknown> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/v1/plantation-data`);
  if (!res.ok) throw new Error("Failed to load plantation data");
  return res.json();
}

/** Top 10 highest-vulnerability zones from backend (sample-zones). */
export interface Top10Zone {
  zone_id: string;
  ml_risk_cluster?: string;
  neighborhood?: string;
  center?: { lat: number; lng: number };
  bounds: { south: number; north: number; west: number; east: number };
  metrics?: {
    avg_heat_index?: number;
    avg_population_density?: number;
    avg_canopy_coverage_pct?: number;
    area_sq_m?: number;
    priority_1_cell_count?: number;
  };
}

export async function getTop10Zones(): Promise<Top10Zone[]> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/api/v1/reasoning/sample-zones`);
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Failed to fetch") || msg.includes("Load failed") || msg.includes("Connection refused") || msg.includes("NetworkError")) {
      throw new Error(`Cannot reach backend at ${base}. Start it with: cd backend && uvicorn main:app --reload`);
    }
    throw err;
  }
}

/** Analysis result from analyze-zone (GeoJSON + metadata). */
export interface AnalyzeZoneResult {
  type: string;
  features: Array<{
    type?: string;
    geometry?: { type: string; coordinates?: number[] | number[][][] };
    properties?: Record<string, unknown>;
  }>;
  metadata: {
    confidence: string;
    rationale: string;
    constraints: string[];
    quick_wins: string[];
    recommended_species: string[];
  };
  generated_image_base64?: string | null;
}

export async function analyzeZone(zoneId: string): Promise<AnalyzeZoneResult> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/v1/reasoning/analyze-zone/${zoneId}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text ? text.slice(0, 200) : `Server ${res.status}`);
  }
  return JSON.parse(text) as AnalyzeZoneResult;
}
