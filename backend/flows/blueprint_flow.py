"""
Blueprint generation flow with Railtracks tracing.
Pipeline: Input Data → Risk Model Output → Financial/ROI Check → Blueprint Generation → Visualization.
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional, Tuple

# Optional Railtracks import — app runs without it
try:
    import railtracks as rt
    RAILTRACKS_AVAILABLE = True
except ImportError:
    rt = None
    RAILTRACKS_AVAILABLE = False

from services.vertex_ai import vertex_service


def _input_data_node(lat: float, lng: float, context: str) -> Dict[str, Any]:
    """Trace node: spatial/geo input for blueprint."""
    return {
        "lat": lat,
        "lng": lng,
        "context_summary": (context or "")[:200],
        "with_image": False,
    }


def _risk_model_node(lat: float, lng: float, context: str) -> Dict[str, Any]:
    """Trace node: Risk/InVEST model placeholder (no zone_id in blueprint path)."""
    return {
        "capacity_index": 0.82,
        "risk_level": "medium",
        "note": "Placeholder; full InVEST/risk run would use zone metrics.",
    }


def _financial_check_node(
    cost_max: Optional[float],
    estimated_cost: Optional[float] = None,
) -> Dict[str, Any]:
    """Trace node: financial threshold / ROI check."""
    if cost_max is None:
        cost_max = 2_400_000
    within = estimated_cost is None or estimated_cost <= cost_max
    return {
        "cost_max": cost_max,
        "estimated_cost": estimated_cost,
        "within_budget": within,
    }


async def _blueprint_gemini_node(lat: float, lng: float, context: str) -> Dict[str, Any]:
    """Trace node: Gemini blueprint generation (Vertex)."""
    return await vertex_service.generate_intervention_blueprint(lat, lng, context or "")


async def _viz_node(lat: float, lng: float, strategy: str) -> str:
    """Trace node: optional visualization (Imagen)."""
    return await vertex_service.generate_visual_overlay(lat, lng, strategy)


async def run_blueprint_flow(
    lat: float,
    lng: float,
    context: str,
    cost_max: Optional[float] = None,
) -> Tuple[Dict[str, Any], Optional[str]]:
    """
    Run the full blueprint pipeline. If Railtracks is available, runs inside a Session
    with traced nodes and returns (blueprint_dict, trace_id). Otherwise returns (blueprint_dict, None).
    """
    if not RAILTRACKS_AVAILABLE:
        blueprint = await _blueprint_gemini_node(lat, lng, context)
        image_url = await _viz_node(lat, lng, blueprint.get("intervention_strategy", ""))
        blueprint["after_image_url"] = image_url
        return blueprint, None

    from tracing.trace_store import trace_store

    def save_trace(payload: Dict[str, Any]) -> None:
        sid = payload.get("session_id")
        if sid:
            trace_store.save(sid, payload)

    session = rt.Session(
        flow_name="blueprint",
        save_state=False,
        payload_callback=save_trace,
    )

    @rt.function_node(name="input_data")
    def input_data_node(lat: float, lng: float, context: str) -> Dict[str, Any]:
        return _input_data_node(lat, lng, context)

    @rt.function_node(name="risk_invest_model")
    def risk_model_node(lat: float, lng: float, context: str) -> Dict[str, Any]:
        return _risk_model_node(lat, lng, context)

    @rt.function_node(name="financial_roi_check")
    def financial_check_node(cost_max: Optional[float], estimated_cost: Optional[float] = None) -> Dict[str, Any]:
        return _financial_check_node(cost_max, estimated_cost)

    @rt.function_node(name="gemini_generate_blueprint")
    async def blueprint_gemini_node(lat: float, lng: float, context: str) -> Dict[str, Any]:
        return await _blueprint_gemini_node(lat, lng, context)

    @rt.function_node(name="visualization")
    async def viz_node(lat: float, lng: float, strategy: str) -> str:
        return await _viz_node(lat, lng, strategy)

    @rt.function_node(name="blueprint_flow")
    async def blueprint_flow_node(lat: float, lng: float, context: str, cost_max: Optional[float] = None) -> Dict[str, Any]:
        await rt.call(input_data_node, lat, lng, context or "")
        await rt.call(risk_model_node, lat, lng, context or "")
        await rt.call(financial_check_node, cost_max or 2_400_000, None)
        blueprint = await rt.call(blueprint_gemini_node, lat, lng, context or "")
        image_url = await rt.call(viz_node, lat, lng, blueprint.get("intervention_strategy", ""))
        blueprint["after_image_url"] = image_url
        return blueprint

    with session:
        result = await rt.call(blueprint_flow_node, lat, lng, context or "", cost_max)

    trace_id = session._identifier
    return result, trace_id
