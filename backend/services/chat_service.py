import requests
import time
from core.supabase_client import get_supabase
from core.config import settings

DEFAULT_GOOGLE_MODEL = "gemini-1.5"
GEMINI_ENDPOINTS = [
    "https://generativelanguage.googleapis.com/v1/models/{model}:generate?key={key}",
]


def parse_gemini_response(data: dict) -> str:
    if not isinstance(data, dict):
        raise ValueError("Unexpected Gemini response format")

    candidates = data.get("candidates") or []
    if candidates and isinstance(candidates, list):
        first = candidates[0]
        if isinstance(first, dict):
            if "output" in first:
                return first["output"]
            content = first.get("content")
            if isinstance(content, dict):
                parts = content.get("parts") or []
                if parts and isinstance(parts[0], dict) and "text" in parts[0]:
                    return parts[0]["text"]
            if isinstance(content, list):
                first_content = content[0]
                if isinstance(first_content, dict) and "text" in first_content:
                    return first_content["text"]
                if isinstance(first_content, str):
                    return first_content
        if isinstance(first, str):
            return first

    if "outputText" in data and isinstance(data["outputText"], str):
        return data["outputText"]
    if "result" in data and isinstance(data["result"], str):
        return data["result"]

    if "content" in data and isinstance(data["content"], str):
        return data["content"]

    raise ValueError("Could not parse Gemini response format")


def get_chat_response(user_query: str) -> str:
    google_api_key = settings.GOOGLE_API_KEY
    google_model = settings.GOOGLE_MODEL or DEFAULT_GOOGLE_MODEL

    if not google_api_key:
        return "Error: GOOGLE_API_KEY is missing in your environment configuration (.env file)."

    # 1. Fetch data context
    supabase = get_supabase()
    latest_snapshot_res = (
        supabase.table("snapshots")
        .select("*")
        .order("report_time", desc=True)
        .limit(1)
        .execute()
    )
    
    if not latest_snapshot_res.data:
        return "I don't have any data yet."
    
    snapshot_id = latest_snapshot_res.data[0]["id"]
    report_time = latest_snapshot_res.data[0]["report_time"]
    
    records_res = (
        supabase.table("records")
        .select("*")
        .eq("snapshot_id", snapshot_id)
        .execute()
    )
    
    # 2. Format Context
    context = f"Report Time: {report_time}\n"
    context += "Current Rake Status:\n"
    for r in records_res.data:
        status = "STABLED" if r.get("is_stabled") else "NOT STABLED"
        context += f"- {r.get('rake_name')}: Loc {r.get('locn')}, Status {r.get('stts_code')} ({status})\n"

    # 3. Request LLM completion
    max_retries = 3
    retry_delay = 2

    # Prioritize Gemini if API key is provided (as requested by the user)
    if google_api_key:
        headers = {"Content-Type": "application/json"}
        prompt = f"You are a professional logistics assistant. Analyze the provided rake data accurately and concisely.\n\nData Context:\n{context}\n\nQuestion: {user_query}"
        model = google_model.strip() or DEFAULT_GOOGLE_MODEL
        last_error = None

        for attempt in range(max_retries):
            for endpoint in GEMINI_ENDPOINTS:
                url = endpoint.format(model=model, key=google_api_key)
                payload = {
                    "instances": [{"content": prompt}],
                    "temperature": 0.2,
                    "maxOutputTokens": 512,
                }

                try:
                    response = requests.post(url, headers=headers, json=payload, timeout=300)
                    if response.ok:
                        data = response.json()
                        return parse_gemini_response(data)
                    last_error = f"Gemini endpoint {url} returned {response.status_code}: {response.text}"
                    if response.status_code in {404, 400, 405}:
                        continue
                    response.raise_for_status()
                except Exception as e:
                    last_error = str(e)
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
                        retry_delay *= 2
                        continue
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2

        return f"Error talking to Gemini (Direct API): {last_error}"

    return "Error: No AI engine was able to compile a response."
