from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
import models
from auth_utils import get_current_user

router = APIRouter()

class AvailabilityCreate(BaseModel):
    date: str          # YYYY-MM-DD
    start_time: str    # HH:MM
    end_time: str      # HH:MM
    is_blocked: bool = False

class ReviewCreate(BaseModel):
    booking_id: int
    rating: int        # 1-5
    comment: Optional[str] = ""

class ReportCreate(BaseModel):
    target_user_id: int
    reason: str

# --- Availability ---

@router.get("/availability/{mobilographer_id}")
async def get_availability(mobilographer_id: int, db: Session = Depends(get_db)):
    slots = db.query(models.Availability).filter(
        models.Availability.mobilographer_id == mobilographer_id
    ).all()
    result = [{"id": s.id, "date": s.date, "start_time": s.start_time,
             "end_time": s.end_time, "is_blocked": s.is_blocked} for s in slots]
             
    # Try fetching Google Calendar events
    profile = db.query(models.MobilographerProfile).filter(models.MobilographerProfile.user_id == mobilographer_id).first()
    if profile and profile.google_credentials:
        import json
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        import datetime
        try:
            creds_info = json.loads(profile.google_credentials)
            from routers.google_auth import CLIENT_ID, CLIENT_SECRET
            creds_info["client_id"] = CLIENT_ID
            creds_info["client_secret"] = CLIENT_SECRET
            creds = Credentials.from_authorized_user_info(creds_info)
            service = build('calendar', 'v3', credentials=creds)
            
            now = datetime.datetime.utcnow().isoformat() + 'Z'
            events_result = service.events().list(calendarId='primary', timeMin=now,
                                                maxResults=50, singleEvents=True,
                                                orderBy='startTime').execute()
            events = events_result.get('items', [])
            
            for event in events:
                start = event['start'].get('dateTime', event['start'].get('date'))
                end = event['end'].get('dateTime', event['end'].get('date'))
                if 'T' in start:
                    start_dt = datetime.datetime.fromisoformat(start.replace('Z', '+00:00'))
                    end_dt = datetime.datetime.fromisoformat(end.replace('Z', '+00:00'))
                    
                    # Convert to local time (naive approach, assume UTC+5 for now or just use string as is)
                    # For simplicity, if we rely on the API returning timezone-aware strings, we can just slice it
                    # But it's safer to extract local components
                    date_str = start[:10]
                    start_time = start[11:16]
                    end_time = end[11:16]
                    
                    result.append({
                        "id": f"google_{event['id']}",
                        "date": date_str,
                        "start_time": start_time,
                        "end_time": end_time,
                        "is_blocked": True,
                        "title": event.get("summary", "Google Calendar")
                    })
                else:
                    result.append({
                        "id": f"google_{event['id']}",
                        "date": start,
                        "start_time": "00:00",
                        "end_time": "23:59",
                        "is_blocked": True,
                        "title": event.get("summary", "Google Calendar")
                    })
        except Exception as e:
            print(f"Error fetching google calendar: {e}")

    return result

@router.post("/availability")
async def add_availability(
    data: AvailabilityCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != models.UserRole.mobilographer:
        raise HTTPException(status_code=403, detail="Only mobilographers")

    def t2m(t: str) -> int:
        h, m = map(int, t.split(":"))
        return h * 60 + m

    new_start = t2m(data.start_time)
    new_end   = t2m(data.end_time)

    if new_end <= new_start:
        raise HTTPException(status_code=400, detail="Аяқталу уақыты басталудан кейін болуы керек")

    # Бұғатталған уақыт болса — бар тапсырыстармен қабаттасуды тексер
    if data.is_blocked:
        from datetime import datetime
        try:
            booking_dt = datetime.strptime(data.date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Күн форматы дұрыс емес (YYYY-MM-DD)")

        conflicting_bookings = db.query(models.Booking).filter(
            models.Booking.mobilographer_id == current_user.id,
            models.Booking.booking_date == booking_dt,
            models.Booking.status.notin_(["cancelled"]),
        ).all()

        for b in conflicting_bookings:
            b_start = t2m(b.start_time)
            b_end   = t2m(b.end_time)
            if new_start < b_end and new_end > b_start:
                raise HTTPException(
                    status_code=400,
                    detail=f"Бұл уақытта {b.start_time}–{b.end_time} аралығында брон бар. Алдымен бронды жойыңыз."
                )

    slot = models.Availability(
        mobilographer_id=current_user.id,
        date=data.date,
        start_time=data.start_time,
        end_time=data.end_time,
        is_blocked=data.is_blocked
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return {"id": slot.id, "date": slot.date, "start_time": slot.start_time,
            "end_time": slot.end_time, "is_blocked": slot.is_blocked}

@router.delete("/availability/{slot_id}")
async def delete_availability(
    slot_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    slot = db.query(models.Availability).filter(models.Availability.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Not found")
    if slot.mobilographer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(slot)
    db.commit()
    return {"ok": True}

# --- Reviews ---

@router.post("/reviews")
async def create_review(
    data: ReviewCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != models.UserRole.client:
        raise HTTPException(status_code=403, detail="Only clients can review")
    booking = db.query(models.Booking).filter(
        models.Booking.id == data.booking_id,
        models.Booking.client_id == current_user.id,
        models.Booking.status == models.BookingStatus.completed
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found or not completed")
    existing = db.query(models.Review).filter(models.Review.booking_id == data.booking_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already reviewed")
    if not (1 <= data.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be 1-5")

    review = models.Review(
        booking_id=data.booking_id,
        client_id=current_user.id,
        mobilographer_id=booking.mobilographer_id,
        rating=data.rating,
        comment=data.comment
    )
    db.add(review)

    # #1 — рейтингті дұрыс есептеу:
    # review.db.add() жасалды бірақ commit болмады, сондықтан
    # бар болған review-ларды ғана сұраймыз (жаңасын қоспай)
    profile = db.query(models.MobilographerProfile).filter(
        models.MobilographerProfile.user_id == booking.mobilographer_id
    ).first()
    if profile:
        existing_reviews = db.query(models.Review).filter(
            models.Review.mobilographer_id == booking.mobilographer_id
        ).all()  # жаңа review commit болмағандықтан бұл тізімде жоқ
        total = sum(r.rating for r in existing_reviews) + data.rating
        count = len(existing_reviews) + 1
        profile.rating = round(total / count, 1)
        profile.total_reviews = count

    db.commit()
    return {"ok": True}

@router.get("/reviews/{mobilographer_id}")
async def get_reviews(mobilographer_id: int, db: Session = Depends(get_db)):
    reviews = db.query(models.Review).filter(
        models.Review.mobilographer_id == mobilographer_id
    ).order_by(models.Review.created_at.desc()).all()
    return [{
        "id": r.id, "rating": r.rating, "comment": r.comment,
        "client": r.client.username if r.client else "",
        "created_at": r.created_at.isoformat() if r.created_at else None
    } for r in reviews]

# --- Reports ---

@router.post("/reports")
async def create_report(
    data: ReportCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = models.Report(
        reporter_id=current_user.id,
        target_user_id=data.target_user_id,
        reason=data.reason
    )
    db.add(report)
    db.commit()
    return {"ok": True}

@router.get("/reports")
async def get_reports(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin only")
    reports = db.query(models.Report).order_by(models.Report.created_at.desc()).all()
    return [{
        "id": r.id,
        "reporter": r.reporter.username if r.reporter else "",
        "target": r.target.username if r.target else "",
        "target_id": r.target_user_id,
        "reason": r.reason,
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None
    } for r in reports]

VALID_REPORT_STATUSES = {"pending", "resolved", "dismissed"}

@router.patch("/reports/{report_id}")
async def update_report_status(
    report_id: int,
    status: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin only")
    # #7 — тек рұқсат етілген статустарды қабылдау
    if status not in VALID_REPORT_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {VALID_REPORT_STATUSES}")
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404)
    report.status = status
    db.commit()
    return {"ok": True}
