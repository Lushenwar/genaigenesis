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
