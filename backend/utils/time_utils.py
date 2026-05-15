from datetime import datetime, timedelta, time, timezone
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")


def now_ist() -> datetime:
    """Return current datetime in IST (timezone-aware)."""
    return datetime.now(IST)


def to_ist(dt) -> datetime:
    """
    Convert a datetime to IST.
    Accepts:
      - None / NaT  → returns None
      - naive datetime → treat as IST (railway data is Indian)
      - aware datetime → convert to IST
      - string → parse then convert
      - pandas Timestamp → handled via .to_pydatetime()
    """
    if dt is None:
        return None

    # Handle pandas NaT / Timestamp
    try:
        import pandas as pd
        if pd.isnull(dt):
            return None
        if isinstance(dt, pd.Timestamp):
            dt = dt.to_pydatetime()
    except Exception:
        pass

    if isinstance(dt, str):
        dt = parse_datetime_str(dt)
        if dt is None:
            return None

    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            # Treat naive datetimes as IST (Indian Railways data)
            dt = dt.replace(tzinfo=IST)
        else:
            dt = dt.astimezone(IST)
        return dt

    return None


def parse_datetime_str(s: str) -> datetime:
    """
    Parse a datetime string into a datetime object.
    Handles various formats including ISO strings with 'T' or space,
    and timezone offsets like '+00' or '+05:30'.
    Returns None on failure.
    """
    if not s or not isinstance(s, str):
        return None
    s = s.strip()
    
    # Try common formats
    formats = [
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S.%f%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f%z",
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
            
    # Fallback to dateutil if available for complex ISO strings
    try:
        from dateutil.parser import parse
        return parse(s)
    except Exception:
        pass

    return None


def format_ist(dt) -> str:
    """
    Format a datetime to the project-standard string: 'DD-MM-YYYY HH:MM'.
    Returns None if dt is None or NaT.
    """
    if dt is None:
        return None

    # Handle pandas NaT / Timestamp
    try:
        import pandas as pd
        if pd.isnull(dt):
            return None
        if isinstance(dt, pd.Timestamp):
            dt = dt.to_pydatetime()
    except Exception:
        pass

    if not isinstance(dt, datetime):
        return None

    if dt.tzinfo is None:
        # Treat naive datetimes as IST (Indian Railways data)
        dt = dt.replace(tzinfo=IST)
    
    ist_dt = dt.astimezone(IST)
    return ist_dt.strftime("%d-%m-%Y %H:%M")


def resolve_range(range_type: str = None, start: str = None, end: str = None):
    """
    Resolve a time range to (start_dt, end_dt) both as IST-aware datetimes.

    Rules (as per PRD Section 8.2):
      - Provide range_type  OR  start+end. Both → error.
      - range_type values: 7d, 15d, 20d, 1m, 6m, 1y
      - Custom: ISO datetime strings for start and end
    """
    now = now_ist()

    if range_type and (start or end):
        raise ValueError("Provide either range_type OR start+end, not both.")

    if range_type:
        mapping = {
            "7d": timedelta(days=7),
            "15d": timedelta(days=15),
            "20d": timedelta(days=20),
            "1m": timedelta(days=30),
            "6m": timedelta(days=180),
            "1y": timedelta(days=365),
        }
        if range_type not in mapping:
            raise ValueError(f"Invalid range_type '{range_type}'. Must be one of: 7d, 15d, 20d, 1m, 6m, 1y")
        return now - mapping[range_type], now

    if start and end:
        start_dt = parse_datetime_str(start)
        end_dt = parse_datetime_str(end)
        if start_dt is None or end_dt is None:
            raise ValueError("Could not parse start or end datetime strings.")
        return start_dt.replace(tzinfo=IST), end_dt.replace(tzinfo=IST)

    raise ValueError("Must provide range_type or start+end.")


def today_window_ist():
    """
    Returns (today_start, today_end) as IST-aware datetimes.
    today_start = 00:00:00 today IST
    today_end   = 23:59:59 today IST
    """
    now = now_ist()
    today_start = datetime.combine(now.date(), time(0, 0, 0)).replace(tzinfo=IST)
    today_end = datetime.combine(now.date(), time(23, 59, 59)).replace(tzinfo=IST)
    return today_start, today_end


def calculate_overlap_hours(start_time: datetime, end_time: datetime,
                            window_start: datetime, window_end: datetime,
                            now_override: datetime = None) -> float:
    """
    Calculate the overlap duration (in hours) between an event and a time window.
    Both datetimes should be IST-aware.
    If end_time is None, use now_override or now_ist() (event is still OPEN).
    """
    if end_time is None:
        end_time = now_override if now_override else now_ist()

    effective_start = max(start_time, window_start)
    effective_end = min(end_time, window_end)

    if effective_end <= effective_start:
        return 0.0

    return (effective_end - effective_start).total_seconds() / 3600