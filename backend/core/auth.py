import os
from fastapi import Header, HTTPException, status

API_SECRET_TOKEN = os.getenv("API_SECRET_TOKEN", "sail_secure_token_2026")

async def verify_auth_token(authorization: str = Header(None)):
    # Exempt standard API documentation endpoints if needed, but since it is global, we check the path.
    # We will raise HTTP 401 if missing or invalid.
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header",
        )
    token = authorization.split(" ")[1] if " " in authorization else authorization
    if token != API_SECRET_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization Token",
        )
