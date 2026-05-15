"""
routers/upload.py

POST /upload

Accepts 2-3 .xlsx files. Runs the full pipeline:
  file_parser -> data_processor -> calculator -> snapshot_service
  -> comparison_service -> event_engine

Returns clean records + comparison result.
"""

import math
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from services.file_parser import parse_files
from services.data_processor import merge_and_clean
from services.calculator import calculate_flags
from services.snapshot_service import save_snapshot
from services.comparison_service import (
    run_comparison,
    _get_previous_snapshot_id,
    _build_state_map,
)
from services.event_engine import run_event_engine
from utils.validators import validate_xlsx_file
from utils.time_utils import format_ist

router = APIRouter()


def _safe_row(row: dict) -> dict:
    """Convert NaN / inf floats in a row dict to None for JSON serialisation."""
    clean = {}
    for k, v in row.items():
        if v is None:
            clean[k] = None
        elif isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            clean[k] = None
        else:
            clean[k] = v
    return clean


@router.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    # Validate file count
    if len(files) < 2 or len(files) > 3:
        raise HTTPException(
            status_code=400,
            detail=f"Expected 2 or 3 .xlsx files. Received {len(files)}."
        )

    # Validate file types
    for f in files:
        validate_xlsx_file(f)

    # Read raw bytes
    file_bytes_list = []
    for f in files:
        raw = await f.read()
        file_bytes_list.append((f.filename, raw))

    # STEP 1-2: Parse xlsx + REPORT TIME resolution
    dfs, resolved_report_time, filenames = parse_files(file_bytes_list)

    # STEP 3-5: Merge, clean, sort, deduplicate
    merged_df = merge_and_clean(dfs, resolved_report_time)

    # STEP 6: Calculate flags
    calculated_df = calculate_flags(merged_df, resolved_report_time)

    # STEP 7: Save snapshot & records to DB
    snapshot_id = save_snapshot(calculated_df, resolved_report_time, filenames)

    # STEP 8: Snapshot comparison
    comparison_result = run_comparison(snapshot_id, calculated_df, resolved_report_time)

    # STEP 9: Event engine
    # Build current state map from the in-memory DataFrame
    current_state_map = {}
    for _, row in calculated_df.iterrows():
        name = row.get("RAKE NAME")
        if name:
            current_state_map[name] = {
                "stts_code": row.get("STTS CODE"),
                "locn": row.get("LOCN"),
                "stts_time": row.get("STTS TIME"),
            }

    # Fetch previous snapshot and its state map
    previous_snapshot_id = _get_previous_snapshot_id(snapshot_id)
    previous_state_map = {}
    if previous_snapshot_id:
        previous_state_map = _build_state_map(previous_snapshot_id)

    run_event_engine(
        df=calculated_df,
        resolved_report_time=resolved_report_time,
        previous_snapshot_id=previous_snapshot_id,
        current_state_map=current_state_map,
        previous_state_map=previous_state_map,
    )

    # STEP 10: Build and return API response
    records_out = []
    for _, row in calculated_df.iterrows():
        stabled_h = row.get("stabled_hours")
        rec = {
            "rake_name":            row.get("RAKE NAME"),
            "stts_code":            row.get("STTS CODE"),
            "stts_time":            format_ist(row.get("STTS TIME")),
            "locn":                 row.get("LOCN"),
            "zone":                 row.get("ZONE"),
            "dvsn":                 row.get("DVSN"),
            "cmdt":                 row.get("CMDT"),
            "ldng_time":            format_ist(row.get("LDNG TIME")),
            "dvsn_from":            row.get("DVSN FROM"),
            "load_name":            row.get("LOAD NAME"),
            "load_type":            row.get("LOAD TYPE"),
            "sttn_from":            row.get("STTN FROM"),
            "sttn_to":              row.get("STTN TO"),
            "transit_time":         row.get("TRANSIT TIME"),
            "expd_arvltime":        format_ist(row.get("EXPD ARVLTIME")),
            "report_time":          format_ist(row.get("REPORT TIME")),
            "is_idle_3hrs":         bool(row.get("is_idle_3hrs")) if row.get("is_idle_3hrs") is not None else False,
            "is_stabled":           bool(row.get("is_stabled")) if row.get("is_stabled") is not None else False,
            "is_transit_delayed":   bool(row.get("is_transit_delayed")) if row.get("is_transit_delayed") is not None else False,
            "is_unloading_delayed": bool(row.get("is_unloading_delayed")) if row.get("is_unloading_delayed") is not None else False,
            "is_loading_delayed":   bool(row.get("is_loading_delayed")) if row.get("is_loading_delayed") is not None else False,
            "stabled_hours":        float(stabled_h) if stabled_h is not None else None,
        }
        records_out.append(_safe_row(rec))

    return JSONResponse(content={
        "snapshot_id":   snapshot_id,
        "report_time":   format_ist(resolved_report_time),
        "total_records": len(records_out),
        "records":       records_out,
        "comparison":    comparison_result,
    })