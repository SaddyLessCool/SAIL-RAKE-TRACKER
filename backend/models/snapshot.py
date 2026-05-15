from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SnapshotBase(BaseModel):
    report_time: Optional[str] = None
    file_names: Optional[List[str]] = None


class SnapshotOut(SnapshotBase):
    id: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True