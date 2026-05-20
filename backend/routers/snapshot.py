"""
routers/snapshot.py

GET /snapshots         — list all snapshots
GET /snapshot/{id}    — get a specific snapshot with its records
"""

from fastapi import APIRouter, HTTPException
from core.supabase_client import get_supabase

from utils.time_utils import format_ist, to_ist

router = APIRouter()


@router.get("/snapshots")
def list_snapshots(page: int = 1, limit: int = 15):
    supabase = get_supabase()
    offset = (page - 1) * limit
    result = (
        supabase.table("snapshots")
        .select("id, report_time, file_names, created_at")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    data = result.data or []
    print(f"DEBUG: Found {len(data)} snapshots")
    for snap in data:
        raw_rt = snap.get("report_time")
        formatted = format_ist(to_ist(raw_rt))
        print(f"DEBUG: Snapshot {snap.get('id')} raw_rt={raw_rt} formatted={formatted}")
        snap["report_time"] = formatted
        snap["created_at"] = format_ist(to_ist(snap.get("created_at")))
    return {"snapshots": data}


@router.get("/snapshot/{snapshot_id}")
def get_snapshot(snapshot_id: str):
    supabase = get_supabase()

    # Fetch snapshot metadata
    snap_result = (
        supabase.table("snapshots")
        .select("*")
        .eq("id", snapshot_id)
        .execute()
    )
    if not snap_result.data:
        raise HTTPException(status_code=404, detail=f"Snapshot '{snapshot_id}' not found.")

    snapshot = snap_result.data[0]
    snapshot["report_time"] = format_ist(to_ist(snapshot.get("report_time")))
    snapshot["created_at"] = format_ist(to_ist(snapshot.get("created_at")))

    # Fetch associated records
    rec_result = (
        supabase.table("records")
        .select("*")
        .eq("snapshot_id", snapshot_id)
        .execute()
    )
    records_raw = rec_result.data or []
    print(f"DEBUG: Snapshot {snapshot_id} has {len(records_raw)} records")

    records_out = []
    for row in records_raw:
        # Explicitly map fields to match the frontend 'Rake' type
        # We handle both lowercase (rake_name) and uppercase (RAKE NAME) if they exist
        rec = {
            "id":                   row.get("id"),
            "snapshot_id":          row.get("snapshot_id"),
            "rake_name":            row.get("rake_name") or row.get("RAKE NAME") or row.get("rake"),
            "stts_code":            row.get("stts_code") or row.get("STTS CODE"),
            "stts_time":            format_ist(to_ist(row.get("stts_time") or row.get("STTS TIME"))),
            "locn":                 row.get("locn") or row.get("LOCN"),
            "zone":                 row.get("zone") or row.get("ZONE"),
            "dvsn":                 row.get("dvsn") or row.get("DVSN"),
            "cmdt":                 row.get("cmdt") or row.get("CMDT"),
            "ldng_time":            format_ist(to_ist(row.get("ldng_time") or row.get("LDNG TIME"))),
            "dvsn_from":            row.get("dvsn_from") or row.get("DVSN FROM"),
            "load_name":            row.get("load_name") or row.get("LOAD NAME"),
            "load_type":            row.get("load_type") or row.get("LOAD TYPE"),
            "sttn_from":            row.get("sttn_from") or row.get("STTN FROM"),
            "sttn_to":              row.get("sttn_to") or row.get("STTN TO"),
            "transit_time":         row.get("transit_time") or row.get("TRANSIT TIME"),
            "expd_arvltime":        format_ist(to_ist(row.get("expd_arvltime") or row.get("EXPD ARVLTIME"))),
            "report_time":          format_ist(to_ist(row.get("report_time") or row.get("REPORT TIME"))),
            "is_idle_3hrs":         bool(row.get("is_idle_3hrs")),
            "is_stabled":           bool(row.get("is_stabled")),
            "is_transit_delayed":   bool(row.get("is_transit_delayed")),
            "is_unloading_delayed": bool(row.get("is_unloading_delayed")),
            "is_loading_delayed":   bool(row.get("is_loading_delayed")),
            "stabled_hours":        row.get("stabled_hours"),
        }
        records_out.append(rec)

    return {
        "snapshot": snapshot,
        "records": records_out,
        "total_records": len(records_out),
    }