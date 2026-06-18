import os
import datetime
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

SCOPES = ['https://www.googleapis.com/auth/calendar.events']

def create_calendar_event(mobilographer_id: int, summary: str, description: str, start_dt: datetime.datetime, end_dt: datetime.datetime):
    """Google Calendar-ге жаңа шара (event) қосады."""
    creds = None
    token_path = f"token_{mobilographer_id}.json"
    
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception:
                return None
        else:
            # Token жоқ болса, синхронизация жасалмайды
            return None
            
    try:
        service = build('calendar', 'v3', credentials=creds)
        event = {
            'summary': summary,
            'description': description,
            'start': {
                'dateTime': start_dt.isoformat(),
                'timeZone': 'Asia/Almaty',
            },
            'end': {
                'dateTime': end_dt.isoformat(),
                'timeZone': 'Asia/Almaty',
            },
        }
        event = service.events().insert(calendarId='primary', body=event).execute()
        return event.get('htmlLink')
    except Exception as e:
        print(f"Google Calendar error: {e}")
        return None
