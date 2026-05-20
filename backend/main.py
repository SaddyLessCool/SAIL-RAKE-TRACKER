"""
main.py

SAIL Rake Tracker — FastAPI app entry point.
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from routers import upload, snapshot, comparison, events, daily_summary, range_summary, chat
from core.auth import verify_auth_token

app = FastAPI(
    title="SAIL Rake Tracker API",
    description=(
        "Backend API for tracking SAIL railway rake stabling events. "
        "All timestamps are in Indian Standard Time (IST, UTC+5:30)."
    ),
    version="1.0.0",
    dependencies=[Depends(verify_auth_token)],
)

import os

# ── CORS (Environment based origins for production, localhost for dev) ───────
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080,http://localhost:3000,http://127.0.0.1:3000")
origins = [origin.strip() for origin in frontend_url.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ──────────────────────────────────────────────────────────
app.include_router(upload.router, tags=["Upload"])
app.include_router(snapshot.router, tags=["Snapshots"])
app.include_router(comparison.router, tags=["Comparison"])
app.include_router(events.router, tags=["Events"])
app.include_router(daily_summary.router, tags=["Summaries"])
app.include_router(range_summary.router, tags=["Summaries"])
app.include_router(chat.router, tags=["Chat"])


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "service": "SAIL Rake Tracker API",
        "version": "1.0.0",
        "timezone": "Asia/Kolkata (IST, UTC+5:30)",
    }