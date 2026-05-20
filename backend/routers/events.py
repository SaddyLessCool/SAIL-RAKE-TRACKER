"""
routers/events.py

GET /events

Query the events table with optional filters:
  ?rake_name=R1
  ?status=OPEN or ?status=CLOSED
  ?locn=LOCATION_A
"""

from typing import Optional
from fastapi import APIRouter, Query
from core.supabase_client import get_supabase

from utils.time_utils import format_ist, to_ist

router = APIRouter()


@router.get("/events")
def get_events(
    rake_name: Optional[str] = Query(None, description="Filter by rake name"),
    status: Optional[str] = Query(None, description="Filter by status: OPEN or CLOSED"),
    locn: Optional[str] = Query(None, description="Filter by location"),
    page: int = 1,
    limit: int = 30,
):
    supabase = get_supabase()
    offset = (page - 1) * limit

    query = supabase.table("events").select("*").order("created_at", desc=True)

    if rake_name:
        query = query.eq("rake_name", rake_name)
    if status:
        query = query.eq("status", status.upper())
    if locn:
        query = query.eq("locn", locn)

    result = query.range(offset, offset + limit - 1).execute()
    events = result.data or []
    
    for ev in events:
        ev["start_time"] = format_ist(to_ist(ev.get("start_time")))
        ev["end_time"] = format_ist(to_ist(ev.get("end_time")))
        ev["created_at"] = format_ist(to_ist(ev.get("created_at")))
        ev["updated_at"] = format_ist(to_ist(ev.get("updated_at")))

    return {
        "events": events,
        "total": len(events),
    }