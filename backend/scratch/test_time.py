from utils.time_utils import to_ist, format_ist
from datetime import datetime

iso_str = "2026-05-07T02:59:00+05:30"
dt = to_ist(iso_str)
print(f"to_ist result type: {type(dt)}")
print(f"to_ist result: {dt}")
print(f"format_ist result: {format_ist(dt)}")
