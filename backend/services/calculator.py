"""
calculator.py

Step 6 of the pipeline — compute 5 derived flag fields for every row:

  Flag i   — is_idle_3hrs
  Flag ii  — is_stabled
  Flag iii — is_transit_delayed
  Flag iv  — is_unloading_delayed & is_loading_delayed
  Flag v   — stabled_hours

All logic is taken verbatim from Backend Logic Document Section 3.
"""

import pandas as pd
from utils.time_utils import now_ist


def _hours_diff(t1, t2) -> float:
    """Return (t1 - t2) in hours. Both must be datetime-like. Returns None on failure."""
    if t1 is None or t2 is None:
        return None

    # Handle pandas NaT
    try:
        import pandas as pd
        if pd.isnull(t1) or pd.isnull(t2):
            return None
    except Exception:
        pass

    try:
        delta = t1 - t2
        return delta.total_seconds() / 3600
    except Exception:
        return None


def calculate_flags(df: pd.DataFrame, resolved_report_time) -> pd.DataFrame:
    """
    Adds 6 derived columns to df in place and returns it.
    resolved_report_time is an IST-aware datetime.
    """
    report_time = resolved_report_time

    is_idle_3hrs_list = []
    is_stabled_list = []
    is_transit_delayed_list = []
    is_unloading_delayed_list = []
    is_loading_delayed_list = []
    stabled_hours_list = []

    for _, row in df.iterrows():
        stts_time = row.get("STTS TIME")
        stts_code = row.get("STTS CODE")
        expd_arvltime = row.get("EXPD ARVLTIME")
        plct_resn = row.get("PLCT RESN")

        # ── Flag i — is_idle_3hrs ─────────────────────────────────────────────
        if stts_time is not None:
            diff = _hours_diff(report_time, stts_time)
            is_idle_3hrs = (diff is not None and diff >= 3)
        else:
            is_idle_3hrs = False

        # ── Flag ii — is_stabled ──────────────────────────────────────────────
        is_stabled = (isinstance(stts_code, str) and stts_code.upper() == "ST")

        # ── Flag iii — is_transit_delayed ─────────────────────────────────────
        if expd_arvltime is not None:
            if (isinstance(stts_code, str) and stts_code.upper() != "PL") and expd_arvltime < report_time:
                is_transit_delayed = True
            else:
                is_transit_delayed = False
        else:
            is_transit_delayed = False

        # ── Flag iv — is_unloading_delayed & is_loading_delayed ───────────────
        if expd_arvltime is not None and expd_arvltime < report_time:
            # Rake is overdue
            plct = plct_resn.strip().upper() if isinstance(plct_resn, str) else None
            if plct == "ULDG":
                is_unloading_delayed = True
                is_loading_delayed = False
            elif plct == "LDNG":
                is_loading_delayed = True
                is_unloading_delayed = False
            else:
                is_loading_delayed = False
                is_unloading_delayed = False
        else:
            is_loading_delayed = False
            is_unloading_delayed = False

        # ── Flag v — stabled_hours ────────────────────────────────────────────
        if is_stabled:
            stabled_hours = _hours_diff(report_time, stts_time)
        else:
            stabled_hours = None

        is_idle_3hrs_list.append(is_idle_3hrs)
        is_stabled_list.append(is_stabled)
        is_transit_delayed_list.append(is_transit_delayed)
        is_unloading_delayed_list.append(is_unloading_delayed)
        is_loading_delayed_list.append(is_loading_delayed)
        stabled_hours_list.append(stabled_hours)

    df = df.copy()
    df["is_idle_3hrs"] = is_idle_3hrs_list
    df["is_stabled"] = is_stabled_list
    df["is_transit_delayed"] = is_transit_delayed_list
    df["is_unloading_delayed"] = is_unloading_delayed_list
    df["is_loading_delayed"] = is_loading_delayed_list
    # Use object dtype so Python None is preserved (not converted to NaN float)
    df["stabled_hours"] = pd.array(stabled_hours_list, dtype=object)

    return df