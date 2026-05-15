"""
event_engine.py

Step 9 of the pipeline — implements all 5 event cases (PRD Section 6 / Backend Logic Section 6).

FIRST UPLOAD (no previous snapshot):
  All currently stabled rakes → INSERT new OPEN event.
  start_time = STTS TIME (fallback: report_time if STTS TIME is None).

SUBSEQUENT UPLOADS — 5 cases:
  🟢 CASE 1: ST @ same location     → Do nothing (event stays OPEN)
  🟡 CASE 2: ST @ new location      → CLOSE old event, OPEN new event
  🔴 CASE 3: ST → non-ST            → CLOSE open event
  🔵 CASE 4: non-ST → ST            → INSERT new OPEN event
  ⚫ CASE 5: non-ST → non-ST        → Ignore

All timestamps are IST-aware and stored as ISO strings in Supabase.
"""

import uuid
import pandas as pd
from core.supabase_client import get_supabase
from utils.time_utils import now_ist, to_ist


def _is_st(stts_code) -> bool:
    return isinstance(stts_code, str) and stts_code.upper() == "ST"


def _get_open_event(supabase, rake_name: str) -> dict:
    """Fetch the current OPEN event for a rake, or None."""
    result = (
        supabase.table("events")
        .select("*")
        .eq("rake_name", rake_name)
        .eq("status", "OPEN")
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]
    return None


def _close_event(supabase, event_id: str, report_time, event_type: str):
    """Close an OPEN event by setting end_time, duration_hours, status, event_type."""
    event = supabase.table("events").select("start_time").eq("id", event_id).execute()
    if not event.data:
        return
    start_time_str = event.data[0]["start_time"]
    start_time = to_ist(start_time_str)
    duration_hours = None
    if start_time:
        duration_hours = round(max((report_time - start_time).total_seconds() / 3600, 0.0), 4)

    supabase.table("events").update({
        "end_time": report_time.isoformat(),
        "duration_hours": duration_hours,
        "status": "CLOSED",
        "event_type": event_type,
        "updated_at": now_ist().isoformat(),
    }).eq("id", event_id).execute()


def _open_event(supabase, rake_name: str, from_state: str, locn: str, start_time):
    """Insert a new OPEN event into the events table."""
    now_str = now_ist().isoformat()
    supabase.table("events").insert({
        "id": str(uuid.uuid4()),
        "rake_name": rake_name,
        "from_state": from_state,
        "to_state": "ST",
        "locn": locn,
        "start_time": start_time.isoformat() if start_time else now_str,
        "end_time": None,
        "duration_hours": None,
        "status": "OPEN",
        "event_type": "entered_stable",
        "created_at": now_str,
        "updated_at": now_str,
    }).execute()


def run_event_engine(
    df: pd.DataFrame,
    resolved_report_time,
    previous_snapshot_id,
    current_state_map: dict,
    previous_state_map: dict,
):
    """
    Apply all 5 event cases. Operates directly on the events table in Supabase.

    Parameters:
      df                    — current cleaned DataFrame (used for STTS TIME lookup)
      resolved_report_time  — IST-aware datetime
      previous_snapshot_id  — None on first upload
      current_state_map     — {rake_name: {stts_code, locn, stts_time}}
      previous_state_map    — {rake_name: {stts_code, locn, stts_time}} (empty on first upload)
    """
    supabase = get_supabase()
    report_time = resolved_report_time

    # Build a quick lookup: rake_name → stts_time (IST-aware datetime) from current df
    stts_time_lookup = {}
    for _, row in df.iterrows():
        name = row.get("RAKE NAME")
        if name:
            stts_time_lookup[name] = row.get("STTS TIME")

    is_first_upload = (previous_snapshot_id is None)

    # ── FIRST UPLOAD ──────────────────────────────────────────────────────────
    if is_first_upload:
        for rake_name, state in current_state_map.items():
            if _is_st(state.get("stts_code")):
                stts_time = stts_time_lookup.get(rake_name)
                start_time = stts_time if stts_time is not None else report_time
                _open_event(
                    supabase,
                    rake_name=rake_name,
                    from_state="UNKNOWN",
                    locn=state.get("locn"),
                    start_time=start_time,
                )
        return

    # ── SUBSEQUENT UPLOADS — apply 5 cases ────────────────────────────────────
    all_rakes = set(current_state_map.keys()) | set(previous_state_map.keys())

    for rake_name in all_rakes:
        curr = current_state_map.get(rake_name)
        prev = previous_state_map.get(rake_name)

        curr_stts = curr.get("stts_code") if curr else None
        curr_locn = curr.get("locn") if curr else None
        prev_stts = prev.get("stts_code") if prev else None
        prev_locn = prev.get("locn") if prev else None

        curr_is_st = _is_st(curr_stts)
        prev_is_st = _is_st(prev_stts)

        if prev_is_st and curr_is_st:
            if prev_locn == curr_locn:
                # ── CASE 1: Still stabled at same location → do nothing ───────
                pass
            else:
                # ── CASE 2: Location change ───────────────────────────────────
                open_event = _get_open_event(supabase, rake_name)
                if open_event:
                    _close_event(supabase, open_event["id"], report_time, "location_change")
                stts_time = stts_time_lookup.get(rake_name)
                start_time = stts_time if stts_time is not None else report_time
                _open_event(
                    supabase,
                    rake_name=rake_name,
                    from_state=prev_stts,
                    locn=curr_locn,
                    start_time=start_time,
                )

        elif prev_is_st and not curr_is_st:
            # ── CASE 3: Left stable (ST → non-ST) ────────────────────────────
            open_event = _get_open_event(supabase, rake_name)
            if open_event:
                _close_event(supabase, open_event["id"], report_time, "left_stable")

        elif not prev_is_st and curr_is_st:
            # ── CASE 4: Newly stabled (non-ST → ST) ──────────────────────────
            stts_time = stts_time_lookup.get(rake_name)
            start_time = stts_time if stts_time is not None else report_time
            _open_event(
                supabase,
                rake_name=rake_name,
                from_state=prev_stts if prev_stts else "UNKNOWN",
                locn=curr_locn,
                start_time=start_time,
            )

        else:
            # ── CASE 5: non-ST → non-ST → ignore ─────────────────────────────
            pass