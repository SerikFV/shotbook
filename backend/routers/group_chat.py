from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from database import get_db
import models
from auth_utils import get_current_user
from websockets_manager import manager
from cloudinary_utils import upload_file_to_cloudinary

router = APIRouter()

class GroupMessageCreate(BaseModel):
    message: str

class GroupRoomUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None

def require_mob_or_admin(user: models.User):
    if user.role not in [models.UserRole.mobilographer, models.UserRole.admin]:
        raise HTTPException(status_code=403, detail="Тек мобилографтар немесе админдер үшін")
    return user

@router.get("/main")
async def get_main_group(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_mob_or_admin(current_user)
    
    room = db.query(models.GroupRoom).filter(models.GroupRoom.name == "🎥 Мобилографтар чаты").first()
    if not room:
        room = models.GroupRoom(name="🎥 Мобилографтар чаты", description="Барлық мобилографтарға арналған ортақ топ", is_public=True)
        db.add(room)
        db.commit()
        db.refresh(room)
        
    is_member = db.query(models.GroupRoomMember).filter(
        models.GroupRoomMember.room_id == room.id,
        models.GroupRoomMember.user_id == current_user.id
    ).first() is not None

    return {
        "id": room.id,
        "name": room.name,
        "description": room.description,
        "avatar": room.avatar,
        "is_member": is_member
    }

@router.put("/{room_id}")
async def update_group_settings(
    room_id: int,
    data: GroupRoomUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_mob_or_admin(current_user)
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Тек админ өзгерте алады")
        
    room = db.query(models.GroupRoom).filter(models.GroupRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Топ табылмады")
        
    if data.name: room.name = data.name
    if data.avatar: room.avatar = data.avatar
    db.commit()
    
    await manager.broadcast_group_event(room.id, {
        "type": "group_update",
        "room_id": room.id,
        "name": room.name,
        "avatar": room.avatar
    }, db)
    return {"ok": True}

@router.post("/{room_id}/avatar")
async def upload_group_avatar(
    room_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_mob_or_admin(current_user)
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Тек админ өзгерте алады")
        
    room = db.query(models.GroupRoom).filter(models.GroupRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Топ табылмады")
        
    contents = await file.read()
    url = upload_file_to_cloudinary(contents, folder="shotbook/groups")
    if not url:
        raise HTTPException(status_code=400, detail="Файл жүктелмеді")
        
    room.avatar = url
    db.commit()
    
    await manager.broadcast_group_event(room.id, {
        "type": "group_update",
        "room_id": room.id,
        "name": room.name,
        "avatar": room.avatar
    }, db)
    return {"avatar_url": url}

@router.post("/{room_id}/join")
async def join_group(
    room_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_mob_or_admin(current_user)
    member = db.query(models.GroupRoomMember).filter(
        models.GroupRoomMember.room_id == room_id,
        models.GroupRoomMember.user_id == current_user.id
    ).first()
    
    if not member:
        member = models.GroupRoomMember(room_id=room_id, user_id=current_user.id)
        db.add(member)
        db.commit()
    return {"ok": True}

@router.post("/{room_id}/leave")
async def leave_group(
    room_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(models.GroupRoomMember).filter(
        models.GroupRoomMember.room_id == room_id,
        models.GroupRoomMember.user_id == current_user.id
    ).delete()
    db.commit()
    return {"ok": True}

@router.get("/{room_id}/messages")
async def get_group_messages(
    room_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_mob_or_admin(current_user)
    
    messages = db.query(models.GroupMessage).filter(
        models.GroupMessage.room_id == room_id,
        models.GroupMessage.deleted_for_all == False
    ).order_by(models.GroupMessage.created_at).all()
    
    result = []
    for m in messages:
        result.append({
            "id": m.id,
            "message": m.message,
            "is_pinned": m.is_pinned,
            "created_at": m.created_at.isoformat(),
            "sender_id": m.sender.id,
            "sender": {
                "username": m.sender.username,
                "avatar": m.sender.avatar,
                "role": m.sender.role
            }
        })
    return result

@router.post("/{room_id}/messages")
async def send_group_message(
    room_id: int,
    data: GroupMessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_mob_or_admin(current_user)
    
    if current_user.role != models.UserRole.admin:
        is_member = db.query(models.GroupRoomMember).filter(
            models.GroupRoomMember.room_id == room_id,
            models.GroupRoomMember.user_id == current_user.id
        ).first()
        if not is_member:
            raise HTTPException(status_code=403, detail="Топқа жазу үшін алдымен қосылу керек")
            
    msg = models.GroupMessage(
        room_id=room_id,
        sender_id=current_user.id,
        message=data.message
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    msg_data = {
        "id": msg.id,
        "room_id": msg.room_id,
        "message": msg.message,
        "is_pinned": msg.is_pinned,
        "created_at": msg.created_at.isoformat(),
        "sender_id": current_user.id,
        "sender": {
            "username": current_user.username,
            "avatar": current_user.avatar,
            "role": current_user.role
        }
    }
    
    await manager.broadcast_group_message(room_id, msg_data, db)
    return msg_data

@router.post("/messages/{msg_id}/pin")
async def toggle_pin_message(
    msg_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_mob_or_admin(current_user)
    
    msg = db.query(models.GroupMessage).filter(models.GroupMessage.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Хабарлама табылмады")
        
    if current_user.role != models.UserRole.admin and msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Закреп қоюға рұқсат жоқ")
        
    msg.is_pinned = not msg.is_pinned
    msg.pinned_by = current_user.id if msg.is_pinned else None
    db.commit()
    
    await manager.broadcast_group_event(msg.room_id, {
        "type": "group_pin_update",
        "msg_id": msg.id,
        "is_pinned": msg.is_pinned
    }, db)
    
    return {"ok": True, "is_pinned": msg.is_pinned}

@router.delete("/messages/{msg_id}")
async def delete_group_message(
    msg_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_mob_or_admin(current_user)
    
    msg = db.query(models.GroupMessage).filter(models.GroupMessage.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Хабарлама табылмады")
        
    # Тек админ немесе автор өшіре алады
    if current_user.role != models.UserRole.admin and msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Хабарламаны өшіруге рұқсат жоқ")
        
    msg.deleted_for_all = True
    db.commit()
    
    await manager.broadcast_group_event(msg.room_id, {
        "type": "group_message_deleted",
        "msg_id": msg.id,
        "room_id": msg.room_id
    }, db)
    
    return {"ok": True}
