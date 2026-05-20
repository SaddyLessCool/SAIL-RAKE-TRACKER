from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.chat_service import get_chat_response

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
def chat(request: ChatRequest):
    try:
        response = get_chat_response(request.message)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
