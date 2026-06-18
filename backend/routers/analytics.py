from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import get_db
import models
from auth_utils import get_current_user, require_role

router = APIRouter()

@router.get("/mobilographer")
async def get_mobilographer_analytics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id
    
    total = db.query(models.Booking).filter(models.Booking.mobilographer_id == user_id).count()
    active = db.query(models.Booking).filter(
        models.Booking.mobilographer_id == user_id,
        models.Booking.status.in_(["confirmed", "shooting", "editing"])
    ).count()
    completed = db.query(models.Booking).filter(
        models.Booking.mobilographer_id == user_id,
        models.Booking.status == "completed"
    ).count()
    cancelled = db.query(models.Booking).filter(
        models.Booking.mobilographer_id == user_id,
        models.Booking.status == "cancelled"
    ).count()
    
    revenue = db.query(func.sum(models.Booking.total_price)).filter(
        models.Booking.mobilographer_id == user_id,
        models.Booking.status == "completed"
    ).scalar() or 0
    
    # Monthly bookings for last 6 months
    monthly = db.query(
        extract('month', models.Booking.booking_date).label('month'),
        extract('year', models.Booking.booking_date).label('year'),
        func.count(models.Booking.id).label('count')
    ).filter(
        models.Booking.mobilographer_id == user_id
    ).group_by('year', 'month').order_by('year', 'month').limit(12).all()
    
    # Status distribution
    status_dist = db.query(
        models.Booking.status, func.count(models.Booking.id)
    ).filter(
        models.Booking.mobilographer_id == user_id
    ).group_by(models.Booking.status).all()

    return {
        "total_bookings": total,
        "active_bookings": active,
        "completed_bookings": completed,
        "cancelled_bookings": cancelled,
        "total_revenue": revenue,
        "monthly_bookings": [{"month": int(m.month), "year": int(m.year), "count": m.count} for m in monthly],
        "status_distribution": [{"status": s, "count": c} for s, c in status_dist],
    }

@router.get("/admin")
async def get_admin_analytics(
    current_user: models.User = Depends(require_role(models.UserRole.admin)),
    db: Session = Depends(get_db)
):
    total_users = db.query(models.User).count()
    total_mobilographers = db.query(models.User).filter(models.User.role == models.UserRole.mobilographer).count()
    total_clients = db.query(models.User).filter(models.User.role == models.UserRole.client).count()
    total_bookings = db.query(models.Booking).count()
    total_revenue = db.query(func.sum(models.Booking.total_price)).filter(models.Booking.status == "completed").scalar() or 0
    
    return {
        "total_users": total_users,
        "total_mobilographers": total_mobilographers,
        "total_clients": total_clients,
        "total_bookings": total_bookings,
        "total_revenue": total_revenue,
    }
