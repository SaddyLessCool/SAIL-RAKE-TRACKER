"""
file_parser.py

Step 1 of the pipeline:
  - Read each .xlsx file into a Pandas DataFrame
  - Apply the 3-case REPORT TIME resolution (PRD Section 2 / Backend Logic Section 1 & 2)
  - Convert all NaN values to None (Python) for safe downstream handling

REPORT TIME Resolution Rules:
  CASE 1: Both files have REPORT TIME → they MUST match → else ERROR
  CASE 2: Only one file has REPORT TIME → copy to the file that is missing it
  CASE 3: Neither file has REPORT TIME → use MAX(STTS TIME) across all rows
"""

import io
import math
import pandas as pd
from fastapi import HTTPException
from utils.validators import validate_columns
from utils.time_utils import parse_datetime_str, to_ist, IST, format_ist


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _safe_val(v):
    """Convert NaN / NaT / inf to None. Everything else passes through."""
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


def _has_report_time(df: pd.DataFrame) -> bool:
    """Return True if the DataFrame has at least one non-null REPORT TIME value."""
    if "REPORT TIME" not in df.columns:
        return False
    return df["REPORT TIME"].notna().any()


def _get_report_time_value(df: pd.DataFrame):
    """Return the first non-null REPORT TIME value as an IST-aware datetime, or None."""
    if "REPORT TIME" not in df.columns:
        return None
    non_null = df["REPORT TIME"].dropna()
    if non_null.empty:
        return None
    val = non_null.iloc[0]
    return to_ist(val)


def _get_max_stts_time(dfs: list) -> object:
    """
    CASE 3: Return MAX(STTS TIME) across all DataFrames as IST-aware datetime.
    Returns None if no valid STTS TIME found.
    """
    max_dt = None
    for df in dfs:
        if "STTS TIME" not in df.columns:
            continue
        for raw_val in df["STTS TIME"].dropna():
            dt = to_ist(raw_val)
            if dt is None:
                continue
            if max_dt is None or dt > max_dt:
                max_dt = dt
    return max_dt


# ─── Main parser ──────────────────────────────────────────────────────────────

def parse_files(file_bytes_list: list) -> tuple:
    """
    Parse a list of (filename, bytes) tuples into DataFrames.
    Apply REPORT TIME resolution.
    Return (list_of_dataframes, resolved_report_time_ist_aware_datetime).

    Raises HTTPException on validation failures.
    """
    dfs = []
    filenames = []

    for filename, raw_bytes in file_bytes_list:
        try:
            df = pd.read_excel(io.BytesIO(raw_bytes), engine="openpyxl")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Cannot read file '{filename}': {str(e)}")

        # Strip whitespace from column names
        df.columns = [str(c).strip() for c in df.columns]

        # Validate required columns
        validate_columns(df, filename)

        dfs.append(df)
        filenames.append(filename)

    # ── REPORT TIME resolution ────────────────────────────────────────────────
    has_rt = [_has_report_time(df) for df in dfs]

    if all(has_rt):
        # CASE 1: All files have REPORT TIME — they must match
        times = [_get_report_time_value(df) for df in dfs]
        # Compare by truncating to the minute (ignore second-level rounding)
        base = times[0]
        for i, t in enumerate(times[1:], start=1):
            if t is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{filenames[i]}' has a null REPORT TIME value despite non-null entries."
                )
            diff = abs((base - t).total_seconds())
            if diff > 60:  # allow up to 1-minute drift
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"REPORT TIME mismatch between files. "
                        f"Expected {format_ist(base)} but '{filenames[i]}' has {format_ist(t)}. "
                        f"All uploaded files must share the same REPORT TIME."
                    )
                )
        resolved_report_time = base

    elif any(has_rt):
        # CASE 2: Only some files have REPORT TIME — copy to those that don't
        source_time = next(t for t, h in zip(
            [_get_report_time_value(df) for df in dfs], has_rt) if h)
        resolved_report_time = source_time
        for i, (df, has) in enumerate(zip(dfs, has_rt)):
            if not has:
                dfs[i]["REPORT TIME"] = source_time

    else:
        # CASE 3: No file has REPORT TIME — use MAX(STTS TIME)
        resolved_report_time = _get_max_stts_time(dfs)
        if resolved_report_time is None:
            raise HTTPException(
                status_code=400,
                detail="No REPORT TIME found in any file and no valid STTS TIME to fall back on."
            )
        for i in range(len(dfs)):
            dfs[i]["REPORT TIME"] = resolved_report_time

    return dfs, resolved_report_time, filenames