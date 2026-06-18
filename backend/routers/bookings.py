from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from database import get_db
import models
from auth_utils import get_current_user

router = APIRouter()

# Статус ауысуының рұқсат етілген жолдары (#3 — статус flow тексеруі)
VALID_TRANSITIONS = {
    "new":       ["confirmed", "cancelled"],
    "confirmed": ["shooting"],          # расталғаннан кейін бас тарту жоқ
    "shooting":  ["editing"],
    "editing":   ["completed"],
    "completed": [],
    "cancelled": [],
}

def time_to_minutes(t: str) -> int:
    """HH:MM → минутқа айналдыру (#2 — string comparison fix)"""
    h, m = map(int, t.split(":"))
    return h * 60 + m

class BookingCreate(BaseModel):
    mobilographer_id: int
    booking_date: datetime
    start_time: str
    end_time: str
    location: str
    shoot_type: str
    notes: Optional[str] = ""

class BookingStatusUpdate(BaseModel):
    status: str

def booking_to_dict(b: models.Booking):
    return {
        "id": b.id,
        "client_id": b.client_id,
        "mobilographer_id": b.mobilographer_id,
        "booking_date": b.booking_date.isoformat() if b.booking_date else None,
        "start_time": b.start_time,
        "end_time": b.end_time,
        "location": b.location,
        "shoot_type": b.shoot_type,
        "notes": b.notes,
        "status": b.status,
        "total_price": b.total_price,
        "contract_url": getattr(b, "contract_url", None),
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "client": {"id": b.client.id, "username": b.client.username, "avatar": b.client.avatar} if b.client else None,
        "mobilographer": {"id": b.mobilographer.id, "username": b.mobilographer.username, "avatar": b.mobilographer.avatar} if b.mobilographer else None,
        "has_review": False,  # frontend толтырады
    }

@router.post("/")
async def create_booking(
    data: BookingCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # #4 — тек client рольді пайдаланушы тапсырыс бере алады
    if current_user.role != models.UserRole.client:
        raise HTTPException(status_code=403, detail="Only clients can create bookings")

    # #4 — өзіне тапсырыс бере алмайды
    if current_user.id == data.mobilographer_id:
        raise HTTPException(status_code=400, detail="Cannot book yourself")

    # #5 — бұғатталған немесе белсенді емес мобилографты тексеру
    mobilographer = db.query(models.User).filter(
        models.User.id == data.mobilographer_id,
        models.User.role == models.UserRole.mobilographer,
        models.User.is_active == True,
        models.User.is_banned == False,
    ).first()
    if not mobilographer:
        raise HTTPException(status_code=404, detail="Mobilographer not found or unavailable")

    # #11 — өткен күнге тапсырыс беруге болмайды (backend валидация)
    if data.booking_date.date() < date.today():
        raise HTTPException(status_code=400, detail="Cannot book for past dates")

    # start < end тексеру
    start_mins = time_to_minutes(data.start_time)
    end_mins = time_to_minutes(data.end_time)
    if end_mins <= start_mins:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    # #2 — уақыт қабаттасуын сандық салыстырумен тексеру (бар тапсырыстармен)
    existing = db.query(models.Booking).filter(
        models.Booking.mobilographer_id == data.mobilographer_id,
        models.Booking.booking_date == data.booking_date,
        models.Booking.status.notin_(["cancelled"]),
    ).all()
    for ex in existing:
        ex_start = time_to_minutes(ex.start_time)
        ex_end = time_to_minutes(ex.end_time)
        if start_mins < ex_end and end_mins > ex_start:
            raise HTTPException(status_code=400, detail="Time slot already booked")

    # Availability бос емес слоттармен қабаттасуды тексеру
    date_str = data.booking_date.strftime("%Y-%m-%d")
    blocked_slots = db.query(models.Availability).filter(
        models.Availability.mobilographer_id == data.mobilographer_id,
        models.Availability.date == date_str,
        models.Availability.is_blocked == True,
    ).all()
    for slot in blocked_slots:
        slot_start = time_to_minutes(slot.start_time)
        slot_end = time_to_minutes(slot.end_time)
        if start_mins < slot_end and end_mins > slot_start:
            raise HTTPException(
                status_code=400,
                detail=f"Мобилограф {slot.start_time}–{slot.end_time} аралығында бос емес"
            )

    hourly_price = mobilographer.profile.hourly_price if mobilographer.profile else 0
    hours = (end_mins - start_mins) / 60
    total_price = hours * hourly_price

    booking = models.Booking(
        client_id=current_user.id,
        mobilographer_id=data.mobilographer_id,
        booking_date=data.booking_date,
        start_time=data.start_time,
        end_time=data.end_time,
        location=data.location,
        shoot_type=data.shoot_type,
        notes=data.notes,
        total_price=total_price,
    )
    db.add(booking)

    log = models.ActivityLog(user_id=current_user.id, action="Жаңа тапсырыс жасалды", details=f"Мобилограф ID: {data.mobilographer_id}")
    db.add(log)

    notif = models.Notification(
        user_id=data.mobilographer_id,
        title="Жаңа тапсырыс",
        message=f"{current_user.username} жаңа тапсырыс жіберді",
        notification_type="new_booking",
    )
    db.add(notif)
    db.commit()
    db.refresh(booking)
    return booking_to_dict(booking)

@router.get("/my")
async def get_my_bookings(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == models.UserRole.client:
        bookings = db.query(models.Booking).filter(
            models.Booking.client_id == current_user.id
        ).order_by(models.Booking.created_at.desc()).all()
    elif current_user.role == models.UserRole.mobilographer:
        bookings = db.query(models.Booking).filter(
            models.Booking.mobilographer_id == current_user.id
        ).order_by(models.Booking.created_at.desc()).all()
    else:
        bookings = db.query(models.Booking).order_by(models.Booking.created_at.desc()).all()

    result = []
    for b in bookings:
        d = booking_to_dict(b)
        # #6 — review бар-жоғын backend-тан тексеру
        if current_user.role == models.UserRole.client:
            has_review = db.query(models.Review).filter(
                models.Review.booking_id == b.id
            ).first() is not None
            d["has_review"] = has_review
        result.append(d)
    return result

@router.patch("/{booking_id}/status")
async def update_booking_status(
    booking_id: int,
    data: BookingStatusUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role == models.UserRole.mobilographer and booking.mobilographer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Client тек өзінің тапсырысын cancel ғана жасай алады
    if current_user.role == models.UserRole.client:
        if booking.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if data.status != "cancelled":
            raise HTTPException(status_code=403, detail="Clients can only cancel bookings")

    # #3 — статус ауысу логикасын тексеру
    current_status = booking.status.value if hasattr(booking.status, 'value') else str(booking.status)
    allowed = VALID_TRANSITIONS.get(current_status, [])
    if data.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot change status from '{current_status}' to '{data.status}'. Allowed: {allowed}"
        )

    try:
        booking.status = models.BookingStatus(data.status)
        if data.status == "confirmed":
            from contract_generator import generate_contract_pdf
            c_name = booking.client.username if booking.client else "Unknown"
            m_name = booking.mobilographer.username if booking.mobilographer else "Unknown"
            date_str = booking.booking_date.strftime("%Y-%m-%d") if booking.booking_date else ""
            c_url = generate_contract_pdf(booking.id, c_name, m_name, date_str, booking.total_price)
            booking.contract_url = c_url
            
            # Google Calendar-мен синхронизация
            from google_calendar_utils import create_calendar_event
            import datetime
            try:
                # format parsing
                dt_start = datetime.datetime.strptime(f"{date_str} {booking.start_time}", "%Y-%m-%d %H:%M")
                dt_end = datetime.datetime.strptime(f"{date_str} {booking.end_time}", "%Y-%m-%d %H:%M")
                create_calendar_event(
                    booking.mobilographer_id,
                    f"Түсірілім: {c_name}",
                    f"Қызмет: {booking.shoot_type}\nЛокация: {booking.location}\nКелісімшарт: {c_url}",
                    dt_start,
                    dt_end
                )
            except Exception as e:
                print(f"GCal sync error: {e}")

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")

    status_labels = {
        "confirmed": "Расталды", "cancelled": "Бас тартылды",
        "shooting": "Түсірілім", "editing": "Монтаж", "completed": "Аяқталды"
    }
    notif = models.Notification(
        user_id=booking.client_id,
        title="Тапсырыс жаңартылды",
        message=f"Тапсырыс статусы: {status_labels.get(data.status, data.status)}",
        notification_type="booking_update",
    )
    db.add(notif)

    log = models.ActivityLog(user_id=current_user.id, action="Тапсырыс статусы өзгертілді", details=f"Жаңа статус: {data.status} (Бронь ID: {booking_id})")
    db.add(log)

    db.commit()
    db.refresh(booking)
    return booking_to_dict(booking)

@router.post("/{booking_id}/contract/regenerate")
async def regenerate_contract(
    booking_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if current_user.id not in [booking.client_id, booking.mobilographer_id] and current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    from contract_generator import generate_contract_pdf
    c_name = booking.client.username if booking.client else "Unknown"
    m_name = booking.mobilographer.username if booking.mobilographer else "Unknown"
    date_str = booking.booking_date.strftime("%Y-%m-%d") if booking.booking_date else ""
    c_url = generate_contract_pdf(booking.id, c_name, m_name, date_str, booking.total_price)
    booking.contract_url = c_url
    db.commit()
    return {"contract_url": c_url}

@router.get("/mobilographer/{user_id}/calendar")
async def get_calendar_bookings(user_id: int, db: Session = Depends(get_db)):
    bookings = db.query(models.Booking).filter(
        models.Booking.mobilographer_id == user_id,
        models.Booking.status.notin_(["cancelled"])
    ).all()
    return [booking_to_dict(b) for b in bookings]


class RescheduleRequest(BaseModel):
    booking_date: datetime
    start_time: str
    end_time: str
    reason: Optional[str] = ""


@router.post("/{booking_id}/reschedule")
async def request_reschedule(
    booking_id: int,
    data: RescheduleRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Client жаңа уақыт ұсынады — мобилографқа notification жіберіледі"""
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    current_status = booking.status.value if hasattr(booking.status, 'value') else str(booking.status)
    if current_status not in ("new", "confirmed"):
        raise HTTPException(status_code=400, detail="Can only reschedule new or confirmed bookings")

    if data.booking_date.date() < date.today():
        raise HTTPException(status_code=400, detail="Cannot reschedule to past dates")

    start_mins = time_to_minutes(data.start_time)
    end_mins = time_to_minutes(data.end_time)
    if end_mins <= start_mins:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    # Уақыт қабаттасуын тексеру (бұл booking-ді шығарып алып)
    existing = db.query(models.Booking).filter(
        models.Booking.mobilographer_id == booking.mobilographer_id,
        models.Booking.booking_date == data.booking_date,
        models.Booking.status.notin_(["cancelled"]),
        models.Booking.id != booking_id,
    ).all()
    for ex in existing:
        ex_start = time_to_minutes(ex.start_time)
        ex_end = time_to_minutes(ex.end_time)
        if start_mins < ex_end and end_mins > ex_start:
            raise HTTPException(status_code=400, detail="Time slot already booked")

    # Тапсырысты жаңа уақытқа ауыстыру + статусты new-ге қайтару (қайта растау керек)
    old_date = booking.booking_date.strftime("%Y-%m-%d") if booking.booking_date else "?"
    booking.booking_date = data.booking_date
    booking.start_time = data.start_time
    booking.end_time = data.end_time
    booking.status = models.BookingStatus.new

    # Бағаны қайта есептеу
    mobilographer = db.query(models.User).filter(models.User.id == booking.mobilographer_id).first()
    hourly_price = mobilographer.profile.hourly_price if mobilographer and mobilographer.profile else 0
    hours = (end_mins - start_mins) / 60
    booking.total_price = hours * hourly_price

    reason_text = f" Себеп: {data.reason}" if data.reason else ""
    notif = models.Notification(
        user_id=booking.mobilographer_id,
        title="Тапсырыс қайта жоспарланды",
        message=f"{current_user.username} тапсырысты {old_date} → {data.booking_date.strftime('%Y-%m-%d')} күніне ауыстырды.{reason_text}",
        notification_type="reschedule",
    )
    db.add(notif)
    db.commit()
    db.refresh(booking)
    return booking_to_dict(booking)
