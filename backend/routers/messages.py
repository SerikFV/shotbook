from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from pydantic import BaseModel
from database import get_db
import models
from auth_utils import get_current_user

router = APIRouter()

class MessageCreate(BaseModel):
    receiver_id: int
    message: str

class DeleteMessageRequest(BaseModel):
    delete_for: str  # "me" | "all"


def _msg_visible(m: models.Message, user_id: int) -> bool:
    """Хабарлама осы пайдаланушыға көрінетін болса True"""
    if m.deleted_for_all:
        return False
    if m.sender_id == user_id and m.deleted_for_sender:
        return False
    if m.receiver_id == user_id and m.deleted_for_receiver:
        return False
    return True


def _msg_to_dict(m: models.Message, viewer_id: int) -> dict:
    text = m.message
    if m.deleted_for_all:
        text = "__deleted_all__"
    elif (m.sender_id == viewer_id and m.deleted_for_sender) or \
         (m.receiver_id == viewer_id and m.deleted_for_receiver):
        text = "__deleted_me__"
    return {
        "id": m.id,
        "sender_id": m.sender_id,
        "receiver_id": m.receiver_id,
        "message": text,
        "is_read": m.is_read,
        "deleted_for_all": m.deleted_for_all,
        "deleted_for_sender": m.deleted_for_sender,
        "deleted_for_receiver": m.deleted_for_receiver,
        "created_at": m.created_at.isoformat(),
    }


@router.post("/")
async def send_message(
    data: MessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg = models.Message(
        sender_id=current_user.id,
        receiver_id=data.receiver_id,
        message=data.message,
    )
    db.add(msg)
    notif = models.Notification(
        user_id=data.receiver_id,
        title="Жаңа хабарлама",
        message=f"{current_user.username}: {data.message[:50]}",
        notification_type="new_message",
    )
    db.add(notif)
    db.commit()
    db.refresh(msg)
    return {
        "id": msg.id, "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id, "message": msg.message,
        "created_at": msg.created_at.isoformat(),
        "sender": {"username": current_user.username, "avatar": current_user.avatar}
    }


@router.get("/conversation/{other_user_id}")
async def get_conversation(
    other_user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    messages = db.query(models.Message).filter(
        or_(
            and_(models.Message.sender_id == current_user.id, models.Message.receiver_id == other_user_id),
            and_(models.Message.sender_id == other_user_id, models.Message.receiver_id == current_user.id),
        )
    ).order_by(models.Message.created_at).all()

    # Mark as read
    for m in messages:
        if m.receiver_id == current_user.id and not m.is_read:
            m.is_read = True
    db.commit()

    return [_msg_to_dict(m, current_user.id) for m in messages if _msg_visible(m, current_user.id)]


@router.get("/contacts")
async def get_contacts(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    messages = db.query(models.Message).filter(
        or_(models.Message.sender_id == current_user.id, models.Message.receiver_id == current_user.id)
    ).all()

    contact_ids = set()
    for m in messages:
        if not _msg_visible(m, current_user.id):
            continue
        other = m.receiver_id if m.sender_id == current_user.id else m.sender_id
        contact_ids.add(other)

    result = []
    for cid in contact_ids:
        u = db.query(models.User).filter(models.User.id == cid).first()
        if not u:
            continue
        unread = db.query(models.Message).filter(
            models.Message.sender_id == cid,
            models.Message.receiver_id == current_user.id,
            models.Message.is_read == False,
            models.Message.deleted_for_receiver == False,
            models.Message.deleted_for_all == False,
        ).count()
        last_msg = db.query(models.Message).filter(
            or_(
                and_(models.Message.sender_id == current_user.id, models.Message.receiver_id == cid),
                and_(models.Message.sender_id == cid, models.Message.receiver_id == current_user.id),
            )
        ).order_by(models.Message.created_at.desc()).first()

        # Соңғы хабарлама өшірілген болса skip
        last_text = ""
        if last_msg and _msg_visible(last_msg, current_user.id):
            last_text = last_msg.message if not last_msg.deleted_for_all else "Хабарлама өшірілді"

        result.append({
            "id": u.id, "username": u.username, "avatar": u.avatar,
            "role": u.role, "unread": unread,
            "last_message": last_text,
            "last_time": last_msg.created_at.isoformat() if last_msg else "",
        })
    return result


# ─── Хабарламаны өшіру ────────────────────────────────────────────────

@router.delete("/message/{msg_id}")
async def delete_message(
    msg_id: int,
    data: DeleteMessageRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg = db.query(models.Message).filter(models.Message.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != current_user.id and msg.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if data.delete_for == "all":
        # Тек жіберуші өзі үшін барлығына өшіре алады
        if msg.sender_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only sender can delete for all")
        msg.deleted_for_all = True
    else:  # "me"
        if msg.sender_id == current_user.id:
            msg.deleted_for_sender = True
        else:
            msg.deleted_for_receiver = True

    db.commit()
    return {"ok": True, "msg_id": msg_id, "delete_for": data.delete_for}


# ─── Чатты тазарту (өзіне ғана) ──────────────────────────────────────

@router.delete("/clear/{other_user_id}")
async def clear_chat(
    other_user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Чатты тек өзіне ғана тазарту"""
    messages = db.query(models.Message).filter(
        or_(
            and_(models.Message.sender_id == current_user.id, models.Message.receiver_id == other_user_id),
            and_(models.Message.sender_id == other_user_id, models.Message.receiver_id == current_user.id),
        )
    ).all()

    for m in messages:
        if m.sender_id == current_user.id:
            m.deleted_for_sender = True
        else:
            m.deleted_for_receiver = True

    db.commit()
    return {"ok": True, "cleared": len(messages)}


# ─── Оқылмаған хабарламалар саны ─────────────────────────────────────

@router.get("/unread-count")
async def get_unread_count(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    count = db.query(models.Message).filter(
        models.Message.receiver_id == current_user.id,
        models.Message.is_read == False,
        models.Message.deleted_for_receiver == False,
        models.Message.deleted_for_all == False,
    ).count()
    return {"count": count}
