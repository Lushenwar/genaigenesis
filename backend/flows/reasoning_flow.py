"""
Tree-planting reasoning flow with Railtracks tracing.
Pipeline: Input Data (geo + image) → Risk/InVEST model → Tree-planting analysis (Gemini) → Visualization.
"""
from __future__ import annotations

from typing import Any, Dict, Optional, Tuple

try:
    import railtracks as rt
    RAILTRACKS_AVAILABLE = True
except ImportError:
    rt = None
    RAILTRACKS_AVAILABLE = False

from reasoning.service import reasoning_service


def _input_data_node(
    selected_area_id: str,
    geo_summary: Dict[str, Any],
    has_image: bool,
) -> Dict[str, Any]:
    """Trace node: spatial/geo input for tree-planting analysis."""
    return {
        "selected_area_id": selected_area_id,
        "total_areas": geo_summary.get("total_areas"),
        "avg_heat_index_mean": geo_summary.get("avg_heat_index_mean"),
        "avg_canopy_coverage_mean": geo_summary.get("avg_canopy_coverage_mean"),
        "with_image": has_image,
    }


def _risk_invest_node(zone_id: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Trace node: Risk/InVEST model (placeholder or from zone metrics)."""
    return {
        "zone_id": zone_id,
        "capacity_index": 0.82,
        "risk_level": (metrics or {}).get("ml_risk_cluster") or "medium",
        "metrics_summary": {k: v for k, v in (metrics or {}).items() if k in ("avg_heat_index", "avg_canopy_coverage_pct", "priority_1_cell_count")},
    }


async def _tree_planting_analysis_node(
    selected_area_id: str,
    geo_payload_bytes: bytes,
    image_bytes: Optional[bytes],
    image_mime_type: Optional[str],
    user_goal: str,
    max_sites: int,
) -> Dict[str, Any]:
    """Trace node: Gemini tree-planting analysis (full service call)."""
    return await reasoning_service.analyze_area_for_tree_planting(
        selected_area_id=selected_area_id,
        geo_payload_bytes=geo_payload_bytes,
        image_bytes=image_bytes,
        image_mime_type=image_mime_type,
        user_goal=user_goal,
        max_sites=max_sites,
    )


async def run_reasoning_flow(
    selected_area_id: str,
    geo_payload_bytes: bytes,
    image_bytes: Optional[bytes] = None,
    image_mime_type: Optional[str] = None,
    user_goal: str = "",
    max_sites: int = 5,
    zone_metrics: Optional[Dict[str, Any]] = None,
) -> Tuple[Dict[str, Any], Optional[str]]:
    """
    Run the tree-planting analysis pipeline with tracing.
    Returns (result_dict, trace_id). trace_id is None if Railtracks is unavailable.
    """
    import json
    from reasoning.service import reasoning_service

    payload = json.loads(geo_payload_bytes.decode("utf-8"))
    items = reasoning_service._normalize_geo_data(payload)
    resolved_id, selected_area = reasoning_service._find_selected_area(items, selected_area_id)
    geo_summary = reasoning_service._build_geo_summary(items)
    has_image = bool(image_bytes and image_mime_type)
    metrics = zone_metrics or selected_area.get("metrics") or {}
    zone_id = selected_area.get("zone_id") or resolved_id

    if not RAILTRACKS_AVAILABLE:
        result = await _tree_planting_analysis_node(
            selected_area_id=resolved_id,
            geo_payload_bytes=geo_payload_bytes,
            image_bytes=image_bytes,
            image_mime_type=image_mime_type,
            user_goal=user_goal,
            max_sites=max_sites,
        )
        return result, None

    from tracing.trace_store import trace_store

    def save_trace(p: Dict[str, Any]) -> None:
        sid = p.get("session_id")
        if sid:
            trace_store.save(sid, p)

    session = rt.Session(
        flow_name="reasoning_tree_planting",
        save_state=False,
        payload_callback=save_trace,
    )

    @rt.function_node(name="input_data")
    def input_data_node(
        selected_area_id: str,
        geo_summary: Dict[str, Any],
        has_image: bool,
    ) -> Dict[str, Any]:
        return _input_data_node(selected_area_id, geo_summary, has_image)

    @rt.function_node(name="risk_invest_model")
    def risk_invest_node(zone_id: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
        return _risk_invest_node(zone_id, metrics)

    @rt.function_node(name="gemini_tree_planting_analysis")
    async def tree_planting_analysis_node(
        selected_area_id: str,
        geo_payload_bytes: bytes,
        image_bytes: Optional[bytes],
        image_mime_type: Optional[str],
        user_goal: str,
        max_sites: int,
    ) -> Dict[str, Any]:
        return await _tree_planting_analysis_node(
            selected_area_id, geo_payload_bytes, image_bytes,
            image_mime_type, user_goal, max_sites,
        )

    @rt.function_node(name="reasoning_flow")
    async def reasoning_flow_node(
        selected_area_id: str,
        geo_payload_bytes: bytes,
        image_bytes: Optional[bytes],
        image_mime_type: Optional[str],
        user_goal: str,
        max_sites: int,
        geo_summary: Dict[str, Any],
        zone_id: str,
        metrics: Dict[str, Any],
    ) -> Dict[str, Any]:
        await rt.call(input_data_node, selected_area_id, geo_summary, bool(image_bytes and image_mime_type))
        await rt.call(risk_invest_node, zone_id, metrics)
        result = await rt.call(
            tree_planting_analysis_node,
            selected_area_id,
            geo_payload_bytes,
            image_bytes,
            image_mime_type,
            user_goal,
            max_sites,
        )
        return result

    with session:
        result = await rt.call(
            reasoning_flow_node,
            resolved_id,
            geo_payload_bytes,
            image_bytes,
            image_mime_type,
            user_goal,
            max_sites,
            geo_summary,
            zone_id,
            metrics,
        )

    trace_id = session._identifier
    return result, trace_id
