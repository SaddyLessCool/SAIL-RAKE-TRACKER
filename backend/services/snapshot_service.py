"""
snapshot_service.py

Step 7 of the pipeline:
  - Insert a new row into `snapshots` table
  - Bulk-insert all clean records into `records` table linked to this snapshot_id

All datetime values are serialised to IST strings before inserting into Supabase.
NaN / None values are passed as None (Supabase stores them as NULL).
"""

import uuid
import math
import pandas as pd
from core.supabase_client import get_supabase
from utils.time_utils import format_ist, now_ist


def _safe(v):
    """Convert NaN / NaT / inf to None for Supabase insertion."""
    if v is None:
        return None
    try:
        if pd.isnull(v):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _dt_to_str(v):
    """Serialise an IST-aware datetime to an ISO string, or None."""
    if v is None:
        return None
    try:
        if pd.isnull(v):
            return None
    except (TypeError, ValueError):
        pass
    if hasattr(v, "isoformat"):
        return v.isoformat()
    return None


def save_snapshot(df: pd.DataFrame, resolved_report_time, filenames: list) -> str:
    """
    Insert a snapshot row and all its records into Supabase.
    Returns the new snapshot_id (UUID string).
    """
    supabase = get_supabase()
    snapshot_id = str(uuid.uuid4())
    now_str = now_ist().isoformat()

    # ── Insert snapshot row ───────────────────────────────────────────────────
    snapshot_row = {
        "id": snapshot_id,
        "report_time": _dt_to_str(resolved_report_time),
        "file_names": filenames,
        "created_at": now_str,
    }
    supabase.table("snapshots").insert(snapshot_row).execute()

    # ── Build and bulk-insert records ─────────────────────────────────────────
    records = []
    for _, row in df.iterrows():
        record = {
            "id": str(uuid.uuid4()),
            "snapshot_id": snapshot_id,
            # Text fields
            "rake_name": _safe(row.get("RAKE NAME")),
            "ldng_time": _dt_to_str(row.get("LDNG TIME")),
            "dvsn_from": _safe(row.get("DVSN FROM")),
            "load_name": _safe(row.get("LOAD NAME")),
            "load_type": _safe(row.get("LOAD TYPE")),
            "sttn_from": _safe(row.get("STTN FROM")),
            "sttn_to": _safe(row.get("STTN TO")),
            "cmdt": _safe(row.get("CMDT")),
            "stts_code": _safe(row.get("STTS CODE")),
            "zone": _safe(row.get("ZONE")),
            "dvsn": _safe(row.get("DVSN")),
            "locn": _safe(row.get("LOCN")),
            # Datetime fields
            "stts_time": _dt_to_str(row.get("STTS TIME")),
            "report_time": _dt_to_str(row.get("REPORT TIME")),
            "transit_time": _safe(row.get("TRANSIT TIME")),
            "expd_arvltime": _dt_to_str(row.get("EXPD ARVLTIME")),
            # Calculated flags
            "is_idle_3hrs": bool(row.get("is_idle_3hrs")) if row.get("is_idle_3hrs") is not None else False,
            "is_stabled": bool(row.get("is_stabled")) if row.get("is_stabled") is not None else False,
            "is_transit_delayed": bool(row.get("is_transit_delayed")) if row.get("is_transit_delayed") is not None else False,
            "is_unloading_delayed": bool(row.get("is_unloading_delayed")) if row.get("is_unloading_delayed") is not None else False,
            "is_loading_delayed": bool(row.get("is_loading_delayed")) if row.get("is_loading_delayed") is not None else False,
            "stabled_hours": _safe(row.get("stabled_hours")),
        }
        records.append(record)

    if records:
        # Supabase has a default limit of 1000 rows per insert; chunk if needed
        chunk_size = 500
        for i in range(0, len(records), chunk_size):
            supabase.table("records").insert(records[i:i + chunk_size]).execute()

    return snapshot_id