from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
import models
from auth_utils import get_current_user
import uuid, os
from cloudinary_utils import upload_file_to_cloudinary

router = APIRouter()

@router.post("/{booking_id}/upload")
async def upload_delivery(
    booking_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Мобилограф аяқталған тапсырысқа файл жібереді"""
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.mobilographer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    current_status = booking.status.value if hasattr(booking.status, 'value') else str(booking.status)
    if current_status not in ("completed", "editing"):
        raise HTTPException(status_code=400, detail="Can only deliver files for editing/completed bookings")

    contents = await file.read()
    url = upload_file_to_cloudinary(contents, resource_type="auto", folder="mobilograph_deliveries")
    if not url:
        raise HTTPException(status_code=500, detail="Failed to upload delivery file")

    delivery = models.BookingDelivery(
        booking_id=booking_id,
        file_url=url,
        file_name=file.filename or "delivery_file",
    )
    db.add(delivery)

    notif = models.Notification(
        user_id=booking.client_id,
        title="Жұмыс нәтижесі жіберілді",
        message=f"Мобилограф {current_user.username} файл жіберді: {file.filename}",
        notification_type="delivery",
    )
    db.add(notif)
    db.commit()
    db.refresh(delivery)
    return {"id": delivery.id, "file_url": delivery.file_url, "file_name": delivery.file_name}

@router.get("/{booking_id}")
async def get_deliveries(
    booking_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Тапсырысқа жіберілген файлдарды алу"""
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.client_id != current_user.id and booking.mobilographer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    deliveries = db.query(models.BookingDelivery).filter(
        models.BookingDelivery.booking_id == booking_id
    ).order_by(models.BookingDelivery.uploaded_at.desc()).all()

    return [{
        "id": d.id,
        "file_url": d.file_url,
        "file_name": d.file_name,
        "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
    } for d in deliveries]

@router.delete("/{booking_id}/file/{delivery_id}")
async def delete_delivery(
    booking_id: int,
    delivery_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking or booking.mobilographer_id != current_user.id:
        raise HTTPException(status_code=403)
    delivery = db.query(models.BookingDelivery).filter(
        models.BookingDelivery.id == delivery_id,
        models.BookingDelivery.booking_id == booking_id
    ).first()
    if not delivery:
        raise HTTPException(status_code=404)
    if delivery.file_url.startswith("/uploads/delivery_"):
        fp = delivery.file_url.lstrip("/")
        if os.path.exists(fp):
            os.remove(fp)
    db.delete(delivery)
    db.commit()
    return {"ok": True}
