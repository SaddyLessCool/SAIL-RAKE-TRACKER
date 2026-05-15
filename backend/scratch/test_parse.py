import sys
import os
from datetime import datetime
from zoneinfo import ZoneInfo

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from utils.time_utils import to_ist, parse_datetime_str

test_str = "2026-05-06 13:42:00+00"
dt = to_ist(test_str)
print(f"Input: {test_str}")
print(f"Parsed: {dt}")

if dt is None:
    print("FAILED TO PARSE")
else:
    print(f"Success: {dt} (tzinfo: {dt.tzinfo})")
