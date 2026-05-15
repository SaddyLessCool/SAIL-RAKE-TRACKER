import os
from supabase import create_client
from dotenv import load_dotenv
import json

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

res = supabase.table("records").select("*").limit(1).execute()
if res.data:
    print(json.dumps(res.data[0], indent=2))
else:
    print("No records found")
