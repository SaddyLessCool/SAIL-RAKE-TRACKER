"""
routers/daily_summary.py

GET /daily-summary

Returns today's stabling summary (IST window: 00:00 → 23:59).
"""

from fastapi import APIRouter
from services.daily_summary import get_daily_summary

router = APIRouter()


@router.get("/daily-summary")
def daily_summary():
    return get_daily_summary()