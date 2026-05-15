import os
from supabase import create_client
from dotenv import load_dotenv
import json

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

snap_id = "9416264c-e88c-460b-867e-16693b99730c"
res = supabase.table("records").select("*").eq("snapshot_id", snap_id).limit(1).execute()
if res.data:
    print(json.dumps(res.data[0], indent=2))
else:
    print(f"No records found for snapshot {snap_id}")
