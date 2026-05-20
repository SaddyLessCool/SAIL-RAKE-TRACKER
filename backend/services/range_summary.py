"""
range_summary.py

GET /range-summary — PRD Section 8 / Backend Logic Section 8.

Logic:
  1. Resolve range via resolve_range()
  2. Fetch all events that overlap the range
  3. Trim each event duration to range window
  4. Aggregate per-rake, per-location, total, movements, idle > 3 hrs

Response format (PRD Section 8.6):
  {
    "range_start": "...",
    "range_end": "...",
    "total_rakes": 10,
    "total_duration_hours": 120.0,
    "total_movements": 8,
    "rake_summary": [ { "rake": "R1", "duration": 20.0 }, ... ],
    "location_summary": { "LOCATION_A": 40.0, ... },
    "idle_more_than_3hrs_count": 2,
    "idle_rakes": [ { "rake": "R3", "locn": "...", "idle_hours": 5.0 } ]
  }
"""

from core.supabase_client import get_supabase
from utils.time_utils import resolve_range, calculate_overlap_hours, now_ist, to_ist


def get_range_summary(range_type: str = None, start: str = None, end: str = None) -> dict:
    range_start, range_end = resolve_range(range_type, start, end)

    supabase = get_supabase()

    # ── Fetch overlapping events ───────────────────────────────────────────────
    # Condition (PRD Section 8.3):
    #   (start_time <= range_end AND end_time >= range_start)
    #   OR (start_time <= range_end AND end_time IS NULL)  ← still-open events
    range_start_iso = range_start.isoformat()
    range_end_iso = range_end.isoformat()

    closed_result = (
        supabase.table("events")
        .select("*")
        .eq("status", "CLOSED")
        .lte("start_time", range_end_iso)
        .gte("end_time", range_start_iso)
        .execute()
    )

    open_result = (
        supabase.table("events")
        .select("*")
        .eq("status", "OPEN")
        .lte("start_time", range_end_iso)
        .execute()
    )

    all_events = (closed_result.data or []) + (open_result.data or [])

    # ── Aggregate ─────────────────────────────────────────────────────────────
    rake_summary = {}
    location_summary = {}
    location_rakes = {} # locn -> set(rake_names)
    total_duration = 0.0
    total_movements = 0
    idle_rakes = []

    now = now_ist()

    for ev in all_events:
        rake = ev.get("rake_name")
        locn = ev.get("locn")
        if not rake:
            continue

        start_time = to_ist(ev.get("start_time"))
        end_time = to_ist(ev.get("end_time"))  # None if OPEN

        if start_time is None:
            continue

        duration = calculate_overlap_hours(start_time, end_time, range_start, range_end)

        if duration == 0:
            continue

        rake_summary[rake] = rake_summary.get(rake, 0.0) + duration
        if locn:
            location_summary[locn] = location_summary.get(locn, 0.0) + duration
            if locn not in location_rakes:
                location_rakes[locn] = set()
            location_rakes[locn].add(rake)
        total_duration += duration

        if ev.get("status") == "CLOSED":
            total_movements += 1

        if ev.get("status") == "OPEN":
            # Calculate idle hours from event start to now
            idle_hours = (now - start_time).total_seconds() / 3600
            if idle_hours > 3:
                idle_rakes.append({
                    "rake_name": rake,
                    "locn": locn,
                    "duration_hours": round(idle_hours, 4),
                })

    rake_summary_list = [
        {"rake": rake, "duration": round(dur, 4)}
        for rake, dur in rake_summary.items()
    ]
    rake_summary_list.sort(key=lambda x: x["duration"], reverse=True)

    location_summary_list = []
    for loc, dur in location_summary.items():
        location_summary_list.append({
            "locn": loc,
            "count": len(location_rakes.get(loc, set())),
            "rakes": sorted(list(location_rakes.get(loc, set())))
        })
    location_summary_list.sort(key=lambda x: x["count"], reverse=True)

    return {
        "start_date": range_start.strftime("%d-%m-%Y"),
        "end_date": range_end.strftime("%d-%m-%Y"),
        "total_rakes": len(rake_summary),
        "total_duration_hours": round(total_duration, 4),
        "total_movements": total_movements,
        "rake_summary": rake_summary_list,
        "location_summary": location_summary_list,
        "idle_more_than_3hrs_count": len(idle_rakes),
        "idle_over_3hrs": idle_rakes,
    }