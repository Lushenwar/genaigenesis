"""
In-memory trace store for Railtracks session payloads.
Maps trace_id (session_id) to full payload and provides a normalized view for the frontend.
"""
from __future__ import annotations

import threading
from typing import Any, Dict, List, Optional

# Max number of traces to keep in memory (FIFO)
_MAX_TRACES = 500


class TraceStore:
    """Thread-safe in-memory store for execution traces."""

    def __init__(self, max_traces: int = _MAX_TRACES) -> None:
        self._store: Dict[str, Dict[str, Any]] = {}
        self._order: List[str] = []
        self._max = max_traces
        self._lock = threading.Lock()

    def save(self, trace_id: str, payload: Dict[str, Any]) -> None:
        with self._lock:
            if trace_id not in self._store:
                self._order.append(trace_id)
            self._store[trace_id] = payload
            while len(self._order) > self._max:
                old = self._order.pop(0)
                self._store.pop(old, None)

    def get(self, trace_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._store.get(trace_id)

    def get_normalized(self, trace_id: str) -> Optional[Dict[str, Any]]:
        """Return trace in frontend-friendly format: { trace_id, steps: [...] }."""
        payload = self.get(trace_id)
        if not payload:
            return None
        return normalize_payload_for_frontend(trace_id, payload)


def normalize_payload_for_frontend(trace_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert Railtracks session payload to a simple list of steps for the ConductrTrace UI.
    Uses runs[].nodes / runs[].steps when present; otherwise builds from runs[].edges and nodes.
    """
    steps: List[Dict[str, Any]] = []
    runs = payload.get("runs")
    if not runs:
        return {"trace_id": trace_id, "steps": steps, "flow_name": payload.get("flow_name")}

    for run in runs:
        run_steps = run.get("steps") or []
        nodes = run.get("nodes") or []
        status = run.get("status", "")
        # Build steps from Railtracks format: steps may be list of stamps; nodes have details
        if run_steps:
            for i, s in enumerate(run_steps):
                if isinstance(s, dict):
                    steps.append({
                        "order": i + 1,
                        "step_name": s.get("node_name") or s.get("name") or f"Step {i + 1}",
                        "input_summary": s.get("input_summary") or _truncate(str(s.get("input", ""))),
                        "output_summary": s.get("output_summary") or _truncate(str(s.get("output", ""))),
                        "error": s.get("error"),
                        "timestamp": s.get("time") or s.get("timestamp"),
                    })
                else:
                    steps.append({
                        "order": i + 1,
                        "step_name": str(s) if s else f"Step {i + 1}",
                        "input_summary": "",
                        "output_summary": "",
                        "error": None,
                        "timestamp": None,
                    })
        elif nodes:
            for i, n in enumerate(nodes):
                if isinstance(n, dict):
                    steps.append({
                        "order": i + 1,
                        "step_name": n.get("name") or n.get("node_name") or n.get("id") or f"Step {i + 1}",
                        "input_summary": _truncate(str(n.get("input") or n.get("args") or "")),
                        "output_summary": _truncate(str(n.get("output") or n.get("result") or "")),
                        "error": n.get("error"),
                        "timestamp": n.get("timestamp") or n.get("start_time"),
                    })
                else:
                    steps.append({
                        "order": i + 1,
                        "step_name": str(n),
                        "input_summary": "",
                        "output_summary": "",
                        "error": None,
                        "timestamp": None,
                    })

        if not steps and run.get("name"):
            # Single top-level run with no substeps
            steps.append({
                "order": 1,
                "step_name": run.get("name", "Run"),
                "input_summary": "",
                "output_summary": f"Status: {status}",
                "error": run.get("error"),
                "timestamp": run.get("start_time"),
            })
        break  # Use first run only for simple linear trace

    return {
        "trace_id": trace_id,
        "steps": steps,
        "flow_name": payload.get("flow_name"),
        "session_name": payload.get("session_name"),
        "start_time": payload.get("start_time"),
        "end_time": payload.get("end_time"),
    }


def _truncate(s: str, max_len: int = 200) -> str:
    if not s:
        return ""
    s = str(s).strip()
    return s[:max_len] + "..." if len(s) > max_len else s


# Singleton store used by payload_callback from Session
trace_store = TraceStore()
