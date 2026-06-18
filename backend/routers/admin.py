from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from auth_utils import get_current_user

router = APIRouter()

def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user

@router.get("/users")
async def list_users(admin=Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [{
        "id": u.id, "username": u.username, "email": u.email,
        "role": u.role, "city": u.city, "is_active": u.is_active,
        "is_banned": u.is_banned, "created_at": u.created_at.isoformat() if u.created_at else None
    } for u in users]

@router.post("/users/{user_id}/ban")
async def ban_user(user_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    # #8 — admin өзін бан баса алмайды
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u: raise HTTPException(status_code=404)
    u.is_banned = True
    db.commit()
    return {"ok": True}

@router.post("/users/{user_id}/unban")
async def unban_user(user_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u: raise HTTPException(status_code=404)
    u.is_banned = False
    db.commit()
    return {"ok": True}

@router.post("/users/{user_id}/toggle-active")
async def toggle_active(user_id: int, admin=Depends(require_admin), db: Session = Depends(get_db)):
    # #8 — admin өзін деактивтей алмайды
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u: raise HTTPException(status_code=404)
    u.is_active = not u.is_active
    db.commit()
    return {"is_active": u.is_active}

@router.get("/bookings")
async def list_all_bookings(admin=Depends(require_admin), db: Session = Depends(get_db)):
    bookings = db.query(models.Booking).order_by(models.Booking.created_at.desc()).all()
    return [{
        "id": b.id, "status": b.status,
        "booking_date": b.booking_date.isoformat() if b.booking_date else None,
        "shoot_type": b.shoot_type, "total_price": b.total_price,
        "client": b.client.username if b.client else "",
        "mobilographer": b.mobilographer.username if b.mobilographer else "",
    } for b in bookings]

from pydantic import BaseModel
from websockets_manager import manager

class BroadcastRequest(BaseModel):
    target: str
    title: str
    message: str

@router.post("/broadcast")
async def broadcast_notification(req: BroadcastRequest, admin=Depends(require_admin), db: Session = Depends(get_db)):
    q = db.query(models.User).filter(models.User.is_active == True)
    if req.target == "clients":
        q = q.filter(models.User.role == models.UserRole.client)
    elif req.target == "mobilographers":
        q = q.filter(models.User.role == models.UserRole.mobilographer)
        
    users = q.all()
    
    for u in users:
        notif = models.Notification(
            user_id=u.id,
            title=req.title,
            message=req.message,
            notification_type="system"
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        
        await manager.send_notification({
            "id": notif.id,
            "title": notif.title,
            "message": notif.message,
            "notification_type": notif.notification_type,
            "created_at": notif.created_at.isoformat() if notif.created_at else None
        }, u.id)
        
    log = models.ActivityLog(user_id=admin.id, action="Хабарландыру жіберілді", details=f"Мақсаты: {req.target}, Тақырыбы: {req.title}")
    db.add(log)
    db.commit()
    
    return {"sent_count": len(users)}

@router.get("/activity")
async def get_activity(admin=Depends(require_admin), db: Session = Depends(get_db)):
    logs = db.query(models.ActivityLog).order_by(models.ActivityLog.created_at.desc()).limit(100).all()
    res = []
    for log in logs:
        res.append({
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "user": {"id": log.user.id, "username": log.user.username} if log.user else None
        })
    return res
