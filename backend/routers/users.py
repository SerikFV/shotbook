from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
import models
from auth_utils import get_current_user
import os, uuid
from urllib.parse import urlparse
from cloudinary_utils import upload_file_to_cloudinary

router = APIRouter()


def validate_portfolio_urls(urls_text: str) -> str:
    """Portfolio URL-дерін тексеру: http/https немесе /uploads/ жолдары"""
    if not urls_text:
        return urls_text
    lines = [u.strip() for u in urls_text.split('\n') if u.strip()]
    for url in lines:
        parsed = urlparse(url)
        # /uploads/... — серверде сақталған файл, рұқсат
        if url.startswith('/uploads/'):
            continue
        if parsed.scheme not in ('http', 'https'):
            raise HTTPException(status_code=400, detail=f"Invalid URL: {url}. Only http/https allowed.")
    return '\n'.join(lines)


@router.get("/mobilographers")
async def get_mobilographers(
    city: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    min_experience: Optional[int] = None,
    specialization: Optional[str] = None,
    sort_by: Optional[str] = None,   # "rating" | "price_asc" | "price_desc" | "experience"
    db: Session = Depends(get_db)
):
    q = db.query(models.User).filter(
        models.User.role == models.UserRole.mobilographer,
        models.User.is_active == True,
        models.User.is_banned == False,
    )
    if city:
        q = q.filter(models.User.city.ilike(f"%{city}%"))

    users = q.all()

    result = []
    for u in users:
        p = u.profile
        hourly = p.hourly_price if p else 0
        rating = p.rating if p else 0
        exp = p.experience if p else 0
        specs = (p.specializations or "") if p else ""

        # Профиль фильтрлері
        if min_price is not None and hourly < min_price:
            continue
        if max_price is not None and hourly > max_price:
            continue
        if min_rating is not None and rating < min_rating:
            continue
        if min_experience is not None and exp < min_experience:
            continue
        if specialization and specialization.lower() not in specs.lower():
            continue

        result.append({
            "id": u.id,
            "username": u.username,
            "city": u.city,
            "avatar": u.avatar,
            "profile": {
                "bio": p.bio if p else "",
                "experience": exp,
                "hourly_price": hourly,
                "rating": rating,
                "total_reviews": p.total_reviews if p else 0,
                "specializations": specs,
            }
        })

    # Сорттау
    if sort_by == "rating":
        result.sort(key=lambda x: x["profile"]["rating"], reverse=True)
    elif sort_by == "price_asc":
        result.sort(key=lambda x: x["profile"]["hourly_price"])
    elif sort_by == "price_desc":
        result.sort(key=lambda x: x["profile"]["hourly_price"], reverse=True)
    elif sort_by == "experience":
        result.sort(key=lambda x: x["profile"]["experience"], reverse=True)

    return result


@router.get("/{user_id}")
async def get_user(user_id: int, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    p = u.profile
    return {
        "id": u.id, "username": u.username, "email": u.email,
        "role": u.role, "city": u.city, "phone": u.phone,
        "avatar": u.avatar, "created_at": u.created_at,
        "profile": {
            "bio": p.bio if p else "",
            "experience": p.experience if p else 0,
            "hourly_price": p.hourly_price if p else 0,
            "rating": p.rating if p else 0,
            "total_reviews": p.total_reviews if p else 0,
            "specializations": p.specializations if p else "",
            "portfolio_urls": p.portfolio_urls if p else "",
            "packages": p.packages if p else "[]",
            "social_links": p.social_links if p else "{}",
            "has_google_calendar": bool(p.google_credentials) if p else False,
        } if p else None
    }


class ProfileUpdate(BaseModel):
    city: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    experience: Optional[int] = None
    hourly_price: Optional[float] = None
    specializations: Optional[str] = None
    portfolio_urls: Optional[str] = None
    packages: Optional[str] = None  # JSON string
    social_links: Optional[str] = None  # JSON string: {"instagram":"...","whatsapp":"...","telegram":"...","youtube":"...","tiktok":"..."}


@router.put("/me/profile")
async def update_profile(
    data: ProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.city is not None: current_user.city = data.city
    if data.phone is not None: current_user.phone = data.phone

    if current_user.role == models.UserRole.mobilographer:
        if not current_user.profile:
            profile = models.MobilographerProfile(user_id=current_user.id)
            db.add(profile)
            db.commit()
            db.refresh(current_user)
        if data.bio is not None: current_user.profile.bio = data.bio
        if data.experience is not None: current_user.profile.experience = data.experience
        if data.hourly_price is not None: current_user.profile.hourly_price = data.hourly_price
        if data.specializations is not None: current_user.profile.specializations = data.specializations
        if data.portfolio_urls is not None:
            current_user.profile.portfolio_urls = validate_portfolio_urls(data.portfolio_urls)
        if data.packages is not None:
            current_user.profile.packages = data.packages
        if data.social_links is not None:
            current_user.profile.social_links = data.social_links

    db.commit()
    return {"message": "Profile updated"}


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    ALLOWED_EXTS = {"jpg", "jpeg", "png", "webp", "gif"}
    MAX_SIZE = 5 * 1024 * 1024  # 5 MB

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="Only image files allowed (jpg, png, webp, gif)")
    if (file.content_type or "") not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type")

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    url = upload_file_to_cloudinary(contents, resource_type="image", folder="mobilograph_avatars")
    if not url:
        raise HTTPException(status_code=500, detail="Failed to upload avatar")

    current_user.avatar = url
    db.commit()
    return {"avatar": current_user.avatar}


@router.post("/me/portfolio/upload")
async def upload_portfolio_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != models.UserRole.mobilographer:
        raise HTTPException(status_code=403, detail="Only mobilographers")

    ALLOWED_EXTS = {"jpg", "jpeg", "png", "webp", "gif",
                    "mp4", "mov", "avi", "webm", "mkv", "flv", "wmv", "m4v", "3gp", "ts"}
    ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    ALLOWED_VIDEO_TYPES = {
        "video/mp4", "video/quicktime", "video/avi", "video/webm",
        "video/x-msvideo", "video/x-matroska", "video/x-flv",
        "video/x-ms-wmv", "video/m4v", "video/3gpp", "video/mp2t",
        "application/octet-stream",  # кейбір браузер content-type дұрыс жібермейді
    }
    ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail=f"Unsupported format: .{ext}")

    is_video = ext in {"mp4", "mov", "avi", "webm", "mkv", "flv", "wmv", "m4v", "3gp", "ts"}

    # Размер шегі жоқ — барлық файл қабылданады
    contents = await file.read()

    res_type = "video" if is_video else "image"
    new_url = upload_file_to_cloudinary(contents, resource_type=res_type, folder="mobilograph_portfolio")
    if not new_url:
        raise HTTPException(status_code=500, detail="Failed to upload media")
    if not current_user.profile:
        profile = models.MobilographerProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(current_user)

    existing = current_user.profile.portfolio_urls or ""
    urls = [u.strip() for u in existing.split('\n') if u.strip()]
    urls.append(new_url)
    current_user.profile.portfolio_urls = '\n'.join(urls)
    db.commit()
    return {"url": new_url, "is_video": is_video}


@router.delete("/me/portfolio/image")
async def delete_portfolio_image(
    url: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != models.UserRole.mobilographer:
        raise HTTPException(status_code=403, detail="Only mobilographers")
    if not current_user.profile:
        raise HTTPException(status_code=404)

    urls = [u.strip() for u in (current_user.profile.portfolio_urls or "").split('\n') if u.strip()]
    if url not in urls:
        raise HTTPException(status_code=404, detail="Image not found")

    urls.remove(url)
    current_user.profile.portfolio_urls = '\n'.join(urls)
    db.commit()

    if url.startswith("/uploads/portfolio_"):
        file_path = url.lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)

    return {"ok": True}
