"""
comparison_service.py

Step 8 of the pipeline (PRD Section 5):
  - Fetch the previous snapshot from Supabase
  - Build state maps (rake → {stts_code, locn}) for both current and previous
  - Classify rakes into still_stabled / new_stabled / moved using set operations
  - Calculate durations for each group
  - Insert comparison result into `comparisons` table

Edge case: First upload (no previous snapshot) → still_stabled=[], moved=[],
           new_stabled = all currently stabled rakes.
"""

import uuid
import pandas as pd
from core.supabase_client import get_supabase
from utils.time_utils import now_ist, to_ist


def _duration_hours(start_time_str, report_time) -> float:
    """Calculate hours between a start_time ISO string and report_time."""
    if not start_time_str:
        return 0.0
    start = to_ist(start_time_str)
    if start is None:
        return 0.0
    diff = (report_time - start).total_seconds() / 3600
    return round(max(diff, 0.0), 4)


def _get_previous_snapshot_id(current_snapshot_id: str):
    """
    Fetch the snapshot created just before the current one.
    Returns the snapshot id string or None if no previous snapshot exists.
    """
    supabase = get_supabase()
    result = (
        supabase.table("snapshots")
        .select("id, report_time, created_at")
        .neq("id", current_snapshot_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]["id"]
    return None


def _build_state_map(snapshot_id: str) -> dict:
    """
    Build a {rake_name: {stts_code, locn, stts_time}} map from the records table.
    """
    supabase = get_supabase()
    result = (
        supabase.table("records")
        .select("rake_name, stts_code, locn, stts_time")
        .eq("snapshot_id", snapshot_id)
        .execute()
    )
    state_map = {}
    for rec in result.data:
        name = rec.get("rake_name")
        if name:
            state_map[name] = {
                "stts_code": rec.get("stts_code"),
                "locn": rec.get("locn"),
                "stts_time": rec.get("stts_time"),
            }
    return state_map


def run_comparison(current_snapshot_id: str, df: pd.DataFrame, resolved_report_time) -> dict:
    """
    Compare current snapshot against previous snapshot.
    Returns the comparison result dict and stores it in `comparisons` table.
    """
    supabase = get_supabase()
    report_time = resolved_report_time

    # ── Build current state map from the in-memory DataFrame ─────────────────
    current_state_map = {}
    for _, row in df.iterrows():
        name = row.get("RAKE NAME")
        if name:
            current_state_map[name] = {
                "stts_code": row.get("STTS CODE"),
                "locn": row.get("LOCN"),
                "stts_time": row.get("STTS TIME"),
            }

    # ── Get previous snapshot ─────────────────────────────────────────────────
    previous_snapshot_id = _get_previous_snapshot_id(current_snapshot_id)

    if previous_snapshot_id is None:
        # First upload — no previous snapshot
        previous_state_map = {}
    else:
        previous_state_map = _build_state_map(previous_snapshot_id)

    # ── Build stabled sets ────────────────────────────────────────────────────
    current_stabled_set = {
        name for name, state in current_state_map.items()
        if isinstance(state.get("stts_code"), str) and state["stts_code"].upper() == "ST"
    }
    previous_stabled_set = {
        name for name, state in previous_state_map.items()
        if isinstance(state.get("stts_code"), str) and state["stts_code"].upper() == "ST"
    }

    # ── Set operations ────────────────────────────────────────────────────────
    still_stabled_names = current_stabled_set & previous_stabled_set
    new_stabled_names = current_stabled_set - previous_stabled_set
    moved_names = previous_stabled_set - current_stabled_set

    # ── Get open event start_times for duration calculation ──────────────────
    # Fetch all OPEN events for rakes in still_stabled or moved groups
    all_relevant_rakes = list(still_stabled_names | moved_names)
    open_event_map = {}
    if all_relevant_rakes:
        open_result = (
            supabase.table("events")
            .select("rake_name, start_time")
            .in_("rake_name", all_relevant_rakes)
            .eq("status", "OPEN")
            .execute()
        )
        for ev in open_result.data:
            open_event_map[ev["rake_name"]] = ev.get("start_time")

    # ── Build output lists ────────────────────────────────────────────────────
    still_stabled = []
    for name in still_stabled_names:
        state = current_state_map[name]
        start_time_str = open_event_map.get(name)
        dur = _duration_hours(start_time_str, report_time)
        still_stabled.append({
            "rake_name": name,
            "locn": state.get("locn"),
            "duration_hours": dur,
        })

    new_stabled = []
    for name in new_stabled_names:
        state = current_state_map[name]
        new_stabled.append({
            "rake_name": name,
            "locn": state.get("locn"),
            "duration_hours": 0.0,
        })

    moved = []
    for name in moved_names:
        state = previous_state_map[name]
        start_time_str = open_event_map.get(name)
        dur = _duration_hours(start_time_str, report_time)
        moved.append({
            "rake_name": name,
            "locn": state.get("locn"),
            "duration_hours": dur,
        })

    # ── Store comparison in DB ────────────────────────────────────────────────
    comparison_id = str(uuid.uuid4())
    comparison_row = {
        "id": comparison_id,
        "current_snapshot_id": current_snapshot_id,
        "previous_snapshot_id": previous_snapshot_id,
        "still_stabled": still_stabled,
        "new_stabled": new_stabled,
        "moved": moved,
        "still_stabled_count": len(still_stabled),
        "new_stabled_count": len(new_stabled),
        "moved_count": len(moved),
        "created_at": now_ist().isoformat(),
    }
    supabase.table("comparisons").insert(comparison_row).execute()

    return {
        "still_stabled_count": len(still_stabled),
        "new_stabled_count": len(new_stabled),
        "moved_count": len(moved),
        "still_stabled": still_stabled,
        "new_stabled": new_stabled,
        "moved": moved,
    }