/**
 * API client for ECO-PULSE backend.
 * Set VITE_API_URL in .env to point to the backend (default: http://localhost:8000).
 */
const getApiBase = (): string =>
  (import.meta.env.VITE_API_URL as string)?.trim() || "http://localhost:8000";

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
  bounds: { south: number; north: number; west: number; east: number };
  metrics?: {
    avg_heat_index?: number;
    avg_population_density?: number;
    avg_canopy_coverage_pct?: number;
    area_sq_m?: number;
  };
}

export async function getTop10Zones(): Promise<Top10Zone[]> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/v1/reasoning/sample-zones`);
  if (!res.ok) throw new Error("Failed to load top 10 zones");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
