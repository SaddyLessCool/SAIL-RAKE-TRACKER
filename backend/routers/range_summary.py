"""
routers/range_summary.py

GET /range-summary

Analytics over a time window (all times in IST).

Supported:
  ?range_type=7d | 15d | 20d | 1m | 6m | 1y
  ?start=2026-04-01 00:00&end=2026-04-30 23:59
  (Provide EITHER range_type OR start+end, not both.)
"""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from services.range_summary import get_range_summary

router = APIRouter()


@router.get("/range-summary")
def range_summary(
    range_type: Optional[str] = Query(None, description="Predefined range: 7d, 15d, 20d, 1m, 6m, 1y"),
    start: Optional[str] = Query(None, description="Custom range start (ISO or YYYY-MM-DD HH:MM)"),
    end: Optional[str] = Query(None, description="Custom range end (ISO or YYYY-MM-DD HH:MM)"),
):
    try:
        return get_range_summary(range_type=range_type, start=start, end=end)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))