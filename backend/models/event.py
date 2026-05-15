from pydantic import BaseModel
from typing import Optional


class EventOut(BaseModel):
    id: Optional[str] = None
    rake_name: Optional[str] = None
    from_state: Optional[str] = None
    to_state: Optional[str] = None
    locn: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_hours: Optional[float] = None
    status: Optional[str] = None
    event_type: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True