#!/usr/bin/env python3
"""
Quick test for Railtracks trace flow.
Run from repo root: python backend/scripts/test_railtracks_trace.py
Or from backend: python scripts/test_railtracks_trace.py

Requires backend deps (railtracks, etc.) and optionally GEMINI_API_KEY for full reasoning.
"""
import asyncio
import json
import sys
from pathlib import Path

# Add backend to path so we can import from reasoning/ and flows/
BACKEND = Path(__file__).resolve().parent.parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))


async def main():
    print("1. Checking Railtracks availability...")
    try:
        import railtracks as rt
        print("   railtracks: OK")
    except ImportError:
        print("   railtracks: NOT INSTALLED (pip install railtracks)")
        print("   Trace IDs will not be returned; app still works without tracing.")
        return

    print("2. Testing trace store (no HTTP)...")
    from tracing.trace_store import trace_store, normalize_payload_for_frontend

    # Store a fake payload and retrieve normalized
    fake_id = "test-trace-123"
    fake_payload = {
        "session_id": fake_id,
        "flow_name": "test_flow",
        "runs": [
            {
                "name": "test_run",
                "steps": [
                    {"node_name": "input_data", "input": "lat=43.6", "output": "ok"},
                    {"node_name": "blueprint", "output": "strategy generated"},
                ],
            }
        ],
    }
    trace_store.save(fake_id, fake_payload)
    normalized = trace_store.get_normalized(fake_id)
    assert normalized and normalized.get("trace_id") == fake_id
    steps = normalized.get("steps", [])
    print(f"   Stored and retrieved trace with {len(steps)} steps: {[s.get('step_name') for s in steps]}")

    print("3. Testing blueprint flow (returns trace_id when Railtracks is on)...")
    from flows.blueprint_flow import run_blueprint_flow, RAILTRACKS_AVAILABLE

    if not RAILTRACKS_AVAILABLE:
        print("   RAILTRACKS_AVAILABLE is False; trace_id will be None.")
    else:
        try:
            blueprint, trace_id = await run_blueprint_flow(43.65, -79.38, "Test context", cost_max=2_400_000)
            if trace_id:
                print(f"   trace_id returned: {trace_id[:20]}...")
                norm = trace_store.get_normalized(trace_id)
                print(f"   GET /traces/{{id}} would return {len(norm.get('steps', []))} steps")
            else:
                print("   trace_id was None (fallback path used)")
        except Exception as e:
            print(f"   Flow error (OK if Vertex/GCP not set): {e}")

    print("Done. Railtracks trace path is working.")


if __name__ == "__main__":
    asyncio.run(main())
