"""
daily_summary.py

GET /daily-summary — PRD Section 7 / Backend Logic Section 7.

Logic:
  1. Define today's window: 00:00:00 → 23:59:59 IST
  2. Fetch CLOSED events where end_time falls within today
  3. Fetch OPEN events where start_time <= today_end
  4. Merge both lists
  5. Trim each event's duration to today's window using overlap logic
  6. Aggregate: total rakes, total duration, movements, still-stabled

Response format (PRD Section 7.3):
  {
    "total_rakes": 8,
    "total_duration_hours": 42.5,
    "total_movements": 3,
    "still_stabled_count": 5,
    "rake_summary": [ { "rake": "R1", "duration_hours": 6.0 }, ... ],
    "still_stabled_rakes": [ "R2", "R3", ... ]
  }
"""

from core.supabase_client import get_supabase
from utils.time_utils import today_window_ist, calculate_overlap_hours, now_ist, to_ist


def get_daily_summary() -> dict:
    supabase = get_supabase()
    today_start, today_end = today_window_ist()

    # ── Get Latest Report Time (to anchor open events) ───────────────────────
    latest_snapshot = (
        supabase.table("snapshots")
        .select("report_time")
        .order("report_time", desc=True)
        .limit(1)
        .execute()
    )
    latest_report_time = now_ist()
    if latest_snapshot.data:
        latest_report_time = to_ist(latest_snapshot.data[0]["report_time"])

    today_start_iso = today_start.isoformat()
    today_end_iso = today_end.isoformat()

    # ── Fetch CLOSED events that overlap today ────────────────────────────────
    closed_result = (
        supabase.table("events")
        .select("*")
        .eq("status", "CLOSED")
        .gte("end_time", today_start_iso)
        .lte("start_time", today_end_iso)
        .execute()
    )

    # ── Fetch OPEN events that started on or before today_end ────────────────
    open_result = (
        supabase.table("events")
        .select("*")
        .eq("status", "OPEN")
        .lte("start_time", today_end_iso)
        .execute()
    )

    all_events = (closed_result.data or []) + (open_result.data or [])

    # ── Aggregate ─────────────────────────────────────────────────────────────
    rake_duration_map = {}
    total_movements = 0
    # {rake_name: {rake_name, locn, duration_hours}}
    still_stabled_map = {}

    for ev in all_events:
        rake = ev.get("rake_name")
        locn = ev.get("locn")
        if not rake:
            continue

        start_time = to_ist(ev.get("start_time"))
        end_time = to_ist(ev.get("end_time"))  # None if OPEN

        if start_time is None:
            continue

        duration = calculate_overlap_hours(
            start_time, end_time, today_start, today_end, 
            now_override=latest_report_time
        )

        if duration == 0:
            continue

        rake_duration_map[rake] = rake_duration_map.get(rake, 0.0) + duration

        if ev.get("status") == "CLOSED":
            total_movements += 1

        if ev.get("status") == "OPEN":
            if rake not in still_stabled_map:
                still_stabled_map[rake] = {
                    "rake_name": rake,
                    "locn": locn,
                    "duration_hours": duration
                }
            else:
                still_stabled_map[rake]["duration_hours"] += duration

    rake_summary = [
        {"rake_name": rake, "duration_hours": round(dur, 4)}
        for rake, dur in rake_duration_map.items()
    ]
    rake_summary.sort(key=lambda x: x["duration_hours"], reverse=True)

    total_duration_hours = round(sum(rake_duration_map.values()), 4)

    return {
        "total_rakes": len(rake_duration_map),
        "total_duration_hours": total_duration_hours,
        "total_movements": total_movements,
        "still_stabled_count": len(still_stabled_map),
        "rake_summary": rake_summary,
        "still_stabled_rakes": list(still_stabled_map.values()),
    }