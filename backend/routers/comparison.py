"""
routers/comparison.py

GET /compare?snapshot_id=...

Returns the comparison result for a given snapshot:
  still_stabled, new_stabled, moved — each with rake names, locations, durations.
"""

from fastapi import APIRouter, HTTPException, Query
from core.supabase_client import get_supabase

from utils.time_utils import format_ist, to_ist

router = APIRouter()


@router.get("/compare")
def get_comparison(snapshot_id: str = Query(..., description="UUID of the snapshot")):
    supabase = get_supabase()

    result = (
        supabase.table("comparisons")
        .select("*")
        .eq("current_snapshot_id", snapshot_id)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail=f"No comparison found for snapshot_id '{snapshot_id}'."
        )

    comp = result.data[0]
    comp["created_at"] = format_ist(to_ist(comp.get("created_at")))
    return comp