from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from database import get_db
from models import User, MediaInteraction, MediaComment, MobilographerProfile, UserRole
from routers.auth import get_current_user
from pydantic import BaseModel, HttpUrl
import urllib.parse
import random

router = APIRouter()

class MediaActionRequest(BaseModel):
    url: str

class MediaCommentRequest(BaseModel):
    url: str
    text: str

@router.get("/stats")
def get_media_stats(url: str, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user)):
    url = urllib.parse.unquote(url)
    likes_count = db.query(MediaInteraction).filter(MediaInteraction.media_url == url, MediaInteraction.interaction_type == "like").count()
    saves_count = db.query(MediaInteraction).filter(MediaInteraction.media_url == url, MediaInteraction.interaction_type == "save").count()
    comments_count = db.query(MediaComment).filter(MediaComment.media_url == url).count()

    is_liked = False
    is_saved = False
    if current_user:
        is_liked = db.query(MediaInteraction).filter(
            MediaInteraction.media_url == url, 
            MediaInteraction.interaction_type == "like", 
            MediaInteraction.user_id == current_user.id
        ).first() is not None
        
        is_saved = db.query(MediaInteraction).filter(
            MediaInteraction.media_url == url, 
            MediaInteraction.interaction_type == "save", 
            MediaInteraction.user_id == current_user.id
        ).first() is not None

    return {
        "likes": likes_count,
        "saves": saves_count,
        "comments": comments_count,
        "is_liked": is_liked,
        "is_saved": is_saved
    }

@router.post("/toggle-like")
def toggle_like(req: MediaActionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(MediaInteraction).filter(
        MediaInteraction.media_url == req.url,
        MediaInteraction.interaction_type == "like",
        MediaInteraction.user_id == current_user.id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "unliked"}
    else:
        new_like = MediaInteraction(user_id=current_user.id, media_url=req.url, interaction_type="like")
        db.add(new_like)
        db.commit()
        return {"status": "liked"}

@router.post("/toggle-save")
def toggle_save(req: MediaActionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(MediaInteraction).filter(
        MediaInteraction.media_url == req.url,
        MediaInteraction.interaction_type == "save",
        MediaInteraction.user_id == current_user.id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "unsaved"}
    else:
        new_save = MediaInteraction(user_id=current_user.id, media_url=req.url, interaction_type="save")
        db.add(new_save)
        db.commit()
        return {"status": "saved"}

@router.post("/comments")
def add_comment(req: MediaCommentRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comment = MediaComment(user_id=current_user.id, media_url=req.url, text=req.text)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "id": comment.id,
        "text": comment.text,
        "created_at": comment.created_at,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "avatar": current_user.avatar
        }
    }

@router.get("/comments")
def get_comments(url: str, db: Session = Depends(get_db)):
    url = urllib.parse.unquote(url)
    comments = db.query(MediaComment).filter(MediaComment.media_url == url).order_by(MediaComment.created_at.desc()).all()
    
    return [
        {
            "id": c.id,
            "text": c.text,
            "created_at": c.created_at,
            "user": {
                "id": c.user.id,
                "username": c.user.username,
                "avatar": c.user.avatar
            }
        } for c in comments
    ]

@router.get("/explore")
def explore_media(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.role == UserRole.mobilographer, User.is_active == True).all()
    all_reels = []
    
    for u in users:
        p = u.profile
        if not p or not p.portfolio_urls:
            continue
            
        urls = [url.strip() for url in p.portfolio_urls.split('\n') if url.strip()]
        for url in urls:
            clean_url = url.split('?')[0]
            if 'video' in clean_url or clean_url.endswith('.mp4') or clean_url.endswith('.mov') or 'cloudinary' in clean_url:
                all_reels.append({
                    "url": url,
                    "author": {
                        "id": u.id,
                        "username": u.username,
                        "avatar": u.avatar,
                    },
                    "description": p.bio if p.bio else "Менің жаңа жұмысым! Бағасын беріңіздер 🔥"
                })
                
    random.shuffle(all_reels)
    return all_reels
