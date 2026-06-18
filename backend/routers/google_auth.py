from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
import models
from auth_utils import get_current_user
import os
import json
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials

router = APIRouter()

# Client credentials from user
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

REDIRECT_URI = "http://localhost:8000/api/google/callback"
SCOPES = ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/calendar.events"]

client_config = {
    "web": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [REDIRECT_URI]
    }
}

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"  # Allow http for local development

@router.get("/auth-url")
async def get_auth_url(current_user: models.User = Depends(get_current_user)):
    if current_user.role != models.UserRole.mobilographer:
        raise HTTPException(status_code=403, detail="Only mobilographers can connect Google Calendar")
    
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )
    
    # We pass user_id in state to link it back during callback
    auth_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',
        state=str(current_user.id)
    )
    return {"auth_url": auth_url}

@router.get("/callback")
async def google_callback(request: Request, code: str, state: str, db: Session = Depends(get_db)):
    try:
        user_id = int(state)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state")
        
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )
    
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    profile = db.query(models.MobilographerProfile).filter(models.MobilographerProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    profile.google_credentials = credentials.to_json()
    db.commit()
    
    # Redirect back to frontend
    return RedirectResponse(url="http://localhost:5173/calendar?google_sync=success")

@router.delete("/disconnect")
async def disconnect_google(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(models.MobilographerProfile).filter(models.MobilographerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    profile.google_credentials = None
    db.commit()
    return {"ok": True}
