from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from auth_utils import get_current_user

router = APIRouter()

@router.get("/")
async def get_favorites(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    favs = db.query(models.Favorite).filter(
        models.Favorite.client_id == current_user.id
    ).all()
    result = []
    for f in favs:
        u = f.mobilographer
        p = u.profile if u else None
        result.append({
            "id": f.id,
            "mobilographer_id": f.mobilographer_id,
            "username": u.username if u else "",
            "avatar": u.avatar if u else None,
            "city": u.city if u else "",
            "profile": {
                "rating": p.rating if p else 0,
                "hourly_price": p.hourly_price if p else 0,
                "experience": p.experience if p else 0,
                "bio": p.bio if p else "",
            } if p else None,
        })
    return result

@router.post("/{mobilographer_id}")
async def add_favorite(
    mobilographer_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != models.UserRole.client:
        raise HTTPException(status_code=403, detail="Only clients can add favorites")
    existing = db.query(models.Favorite).filter(
        models.Favorite.client_id == current_user.id,
        models.Favorite.mobilographer_id == mobilographer_id
    ).first()
    if existing:
        return {"ok": True, "favorited": True}
    fav = models.Favorite(client_id=current_user.id, mobilographer_id=mobilographer_id)
    db.add(fav)
    db.commit()
    return {"ok": True, "favorited": True}

@router.delete("/{mobilographer_id}")
async def remove_favorite(
    mobilographer_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fav = db.query(models.Favorite).filter(
        models.Favorite.client_id == current_user.id,
        models.Favorite.mobilographer_id == mobilographer_id
    ).first()
    if fav:
        db.delete(fav)
        db.commit()
    return {"ok": True, "favorited": False}

@router.get("/check/{mobilographer_id}")
async def check_favorite(
    mobilographer_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    exists = db.query(models.Favorite).filter(
        models.Favorite.client_id == current_user.id,
        models.Favorite.mobilographer_id == mobilographer_id
    ).first() is not None
    return {"favorited": exists}
