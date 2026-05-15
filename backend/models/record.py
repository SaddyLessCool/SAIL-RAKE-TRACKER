from pydantic import BaseModel
from typing import Optional


class RecordOut(BaseModel):
    id: Optional[str] = None
    snapshot_id: Optional[str] = None
    rake_name: Optional[str] = None
    ldng_time: Optional[str] = None
    dvsn_from: Optional[str] = None
    load_name: Optional[str] = None
    load_type: Optional[str] = None
    sttn_from: Optional[str] = None
    sttn_to: Optional[str] = None
    cmdt: Optional[str] = None
    stts_code: Optional[str] = None
    zone: Optional[str] = None
    dvsn: Optional[str] = None
    locn: Optional[str] = None
    stts_time: Optional[str] = None
    transit_time: Optional[str] = None
    expd_arvltime: Optional[str] = None
    is_idle_3hrs: Optional[bool] = None
    is_stabled: Optional[bool] = None
    is_transit_delayed: Optional[bool] = None
    is_unloading_delayed: Optional[bool] = None
    is_loading_delayed: Optional[bool] = None
    stabled_hours: Optional[float] = None

    class Config:
        from_attributes = True