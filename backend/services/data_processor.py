"""
data_processor.py

Steps 2-5 of the pipeline:
  Step 2: Merge DataFrames vertically (concatenate)
  Step 3: Clean & Format (strip whitespace, parse datetimes, uppercase STTS CODE)
  Step 4: Sort by STTS TIME descending
  Step 5: Remove duplicate rows (all columns identical)

All NaN / NaT values are converted to None throughout.
Datetimes are stored as IST-aware datetime objects internally.
"""

import math
import pandas as pd
from datetime import datetime
from utils.time_utils import to_ist, format_ist, parse_datetime_str, IST
from datetime import timezone


# Columns that should be parsed as datetime
DATETIME_COLS = ["STTS TIME", "LDNG TIME", "EXPD ARVLTIME", "REPORT TIME"]

# Columns that are text fields (strip whitespace)
TEXT_COLS = [
    "ZONE", "DVSN", "LOCN", "PLCT RESN", "STTS CODE", "DVSN FROM",
    "STTN FROM", "STTN TO", "CC RAKE", "RAKE NAME", "LOAD NAME",
    "LOAD TYPE", "TOTL UNTS", "L/E", "CMDT", "CNSR", "CNSG",
    "TRANSIT TIME", "LOCO TYPE"
]


def _safe_val(v):
    """Convert NaN / NaT / inf / empty string to None."""
    if v is None:
        return None
    try:
        if pd.isnull(v):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if isinstance(v, str) and v.strip() == "":
        return None
    return v


def merge_and_clean(dfs: list, resolved_report_time) -> pd.DataFrame:
    """
    Accept a list of DataFrames (already validated).
    Apply Steps 2-5 and return a single clean DataFrame.

    Each row in the result has:
      - Text columns stripped and None-ified
      - STTS CODE uppercased
      - All datetime columns parsed and stored as IST-aware datetime objects
      - REPORT TIME set uniformly to resolved_report_time
    """

    # ── STEP 2: Vertical concatenation ───────────────────────────────────────
    merged = pd.concat(dfs, ignore_index=True)

    # ── STEP 3: Clean & Format ────────────────────────────────────────────────

    # 3a. Strip whitespace from all string columns
    for col in TEXT_COLS:
        if col in merged.columns:
            merged[col] = merged[col].apply(
                lambda v: str(v).strip() if pd.notna(v) and str(v).strip() else None
            )

    # 3b. Uppercase STTS CODE
    if "STTS CODE" in merged.columns:
        merged["STTS CODE"] = merged["STTS CODE"].apply(
            lambda v: v.upper() if isinstance(v, str) else None
        )

    # 3c. Parse datetime columns → IST-aware datetime objects
    for col in DATETIME_COLS:
        if col not in merged.columns:
            continue
        parsed = []
        for raw in merged[col]:
            if raw is None:
                parsed.append(None)
                continue
            try:
                if pd.isnull(raw):
                    parsed.append(None)
                    continue
            except (TypeError, ValueError):
                pass
            dt = to_ist(raw)
            parsed.append(dt)
        merged[col] = parsed

    # 3d. Override REPORT TIME with the resolved value uniformly
    merged["REPORT TIME"] = resolved_report_time

    # 3e. Convert remaining NaN floats (LOCO NUMB, RMNG KM) to None
    for col in ["LOCO NUMB", "RMNG KM"]:
        if col in merged.columns:
            merged[col] = merged[col].apply(lambda v: _safe_val(v))

    # Sort with None values last
    _EPOCH = datetime(1970, 1, 1, tzinfo=IST)
    merged = merged.sort_values(
        by="STTS TIME",
        ascending=False,
        na_position="last",
        key=lambda col: col.apply(
            lambda v: v if v is not None else _EPOCH
        )
    ).reset_index(drop=True)

    # ── STEP 5: Drop full-row duplicates ─────────────────────────────────────
    # Because REPORT TIME and datetime cols are now objects, convert to string for comparison
    def row_key(row):
        return tuple(
            (v.isoformat() if hasattr(v, "isoformat") else str(v))
            for v in row
        )

    keys = merged.apply(row_key, axis=1)
    merged = merged[~keys.duplicated(keep="first")].reset_index(drop=True)

    return merged