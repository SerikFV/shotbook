from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta, timezone
from database import get_db
import models
from auth_utils import verify_password, get_password_hash, create_access_token, get_current_user
from email_utils import generate_code, send_verification_email

router = APIRouter()

# ─── Pydantic схемалары ───────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "client"
    phone: str = ""
    city: str = ""

class LoginRequest(BaseModel):
    login: str
    password: str

class CheckFieldRequest(BaseModel):
    field: str
    value: str

class VerifyEmailRequest(BaseModel):
    user_id: int
    code: str

class ResendCodeRequest(BaseModel):
    user_id: int
    purpose: str = "register"

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UpdateAccountRequest(BaseModel):
    username: str = ""
    email: str = ""

class ChangeEmailRequest(BaseModel):
    new_email: EmailStr

class ConfirmEmailChangeRequest(BaseModel):
    new_email: str
    code: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# ─── Көмекші функция ─────────────────────────────────────────────────

def _build_user_response(user: models.User) -> dict:
    profile = None
    if user.profile:
        profile = {
            "bio": user.profile.bio,
            "experience": user.profile.experience,
            "hourly_price": user.profile.hourly_price,
            "rating": user.profile.rating,
            "total_reviews": user.profile.total_reviews,
            "specializations": user.profile.specializations,
            "portfolio_urls": user.profile.portfolio_urls,
            "social_links": user.profile.social_links,
            "has_google_calendar": bool(user.profile.google_credentials),
        }
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "city": user.city,
        "avatar": user.avatar,
        "is_email_verified": user.is_email_verified,
        "profile": profile,
    }


def _create_verification(db: Session, user_id: int, purpose: str) -> str:
    """Ескі кодтарды жойып, жаңа код жасайды"""
    db.query(models.EmailVerification).filter(
        models.EmailVerification.user_id == user_id,
        models.EmailVerification.purpose == purpose,
        models.EmailVerification.is_used == False,
    ).delete()
    db.commit()

    code = generate_code()
    ev = models.EmailVerification(
        user_id=user_id,
        code=code,
        purpose=purpose,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(ev)
    db.commit()
    return code

# ─── Тіркелу ─────────────────────────────────────────────────────────

@router.post("/register")
async def register(
    req: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    existing_user_email = db.query(models.User).filter(models.User.email == req.email).first()
    if existing_user_email:
        if existing_user_email.is_email_verified:
            raise HTTPException(status_code=400, detail="Email already registered")
        else:
            if existing_user_email.role == models.UserRole.mobilographer:
                db.query(models.MobilographerProfile).filter(models.MobilographerProfile.user_id == existing_user_email.id).delete()
            db.query(models.ActivityLog).filter(models.ActivityLog.user_id == existing_user_email.id).delete()
            db.query(models.EmailVerification).filter(models.EmailVerification.user_id == existing_user_email.id).delete()
            db.delete(existing_user_email)
            db.commit()

    existing_user_username = db.query(models.User).filter(models.User.username == req.username).first()
    if existing_user_username:
        if existing_user_username.is_email_verified:
            raise HTTPException(status_code=400, detail="Username already taken")
        else:
            if existing_user_username.role == models.UserRole.mobilographer:
                db.query(models.MobilographerProfile).filter(models.MobilographerProfile.user_id == existing_user_username.id).delete()
            db.query(models.ActivityLog).filter(models.ActivityLog.user_id == existing_user_username.id).delete()
            db.query(models.EmailVerification).filter(models.EmailVerification.user_id == existing_user_username.id).delete()
            db.delete(existing_user_username)
            db.commit()

    role = models.UserRole(req.role) if req.role in ["client", "mobilographer"] else models.UserRole.client

    user = models.User(
        username=req.username,
        email=req.email,
        password_hash=get_password_hash(req.password),
        role=role,
        phone=req.phone,
        city=req.city,
        is_email_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if role == models.UserRole.mobilographer:
        profile = models.MobilographerProfile(user_id=user.id)
        db.add(profile)
        db.commit()

    # Аудит: Тіркелу
    log = models.ActivityLog(user_id=user.id, action="Пайдаланушы тіркелді", details=f"Рөлі: {user.role}")
    db.add(log)
    db.commit()

    # Верификация коды жіберу
    code = _create_verification(db, user.id, "register")
    background_tasks.add_task(send_verification_email, user.email, code, "register")

    # Token жасаймыз (верификация бетіне өту үшін)
    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _build_user_response(user),
        "requires_verification": True,
    }

# ─── Кіру ────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(models.User).filter(models.User.email == req.login).first() or
        db.query(models.User).filter(models.User.username == req.login).first()
    )
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.is_banned:
        raise HTTPException(status_code=403, detail="Account is banned")
    if not user.is_email_verified and user.role != models.UserRole.admin:
        # Жаңа код жіберіп, верификацияға бағыттау
        code = _create_verification(db, user.id, "register")
        send_verification_email(user.email, code, "register")
        token = create_access_token({"sub": str(user.id)})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": _build_user_response(user),
            "requires_verification": True,
        }

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _build_user_response(user),
    }

# ─── Email верификация ────────────────────────────────────────────────

@router.post("/verify-email")
async def verify_email(req: VerifyEmailRequest, db: Session = Depends(get_db)):
    ev = db.query(models.EmailVerification).filter(
        models.EmailVerification.user_id == req.user_id,
        models.EmailVerification.code == req.code,
        models.EmailVerification.purpose == "register",
        models.EmailVerification.is_used == False,
    ).first()

    if not ev:
        raise HTTPException(status_code=400, detail="invalid_code")
    if ev.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="code_expired")

    ev.is_used = True
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    user.is_email_verified = True
    db.commit()

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _build_user_response(user),
    }

# ─── Кодты қайта жіберу ──────────────────────────────────────────────

@router.post("/resend-code")
async def resend_code(
    req: ResendCodeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    code = _create_verification(db, user.id, req.purpose)
    background_tasks.add_task(send_verification_email, user.email, code, req.purpose)
    return {"ok": True, "message": "Code sent"}

# ─── Пароль ұмыттым ──────────────────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(
    req: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        # Қауіпсіздік үшін — пайдаланушы жоқ болса да OK қайтарамыз
        return {"ok": True}

    code = _create_verification(db, user.id, "reset_password")
    background_tasks.add_task(send_verification_email, user.email, code, "reset_password")
    return {"ok": True, "user_id": user.id}

# ─── Пароль қалпына келтіру ──────────────────────────────────────────

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    ev = db.query(models.EmailVerification).filter(
        models.EmailVerification.user_id == user.id,
        models.EmailVerification.code == req.code,
        models.EmailVerification.purpose == "reset_password",
        models.EmailVerification.is_used == False,
    ).first()

    if not ev:
        raise HTTPException(status_code=400, detail="invalid_code")
    if ev.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="code_expired")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="password_min")

    ev.is_used = True
    user.password_hash = get_password_hash(req.new_password)
    db.commit()

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _build_user_response(user),
    }

# ─── Field check ─────────────────────────────────────────────────────

@router.post("/check-field")
async def check_field(req: CheckFieldRequest, db: Session = Depends(get_db)):
    if req.field == "username":
        taken = db.query(models.User).filter(models.User.username == req.value).first() is not None
    elif req.field == "email":
        taken = db.query(models.User).filter(models.User.email == req.value).first() is not None
    else:
        raise HTTPException(status_code=400, detail="Invalid field")
    return {"taken": taken}

# ─── /me ─────────────────────────────────────────────────────────────

@router.get("/me")
async def get_me(current_user: models.User = Depends(get_current_user)):
    profile = None
    if current_user.profile:
        profile = {
            "bio": current_user.profile.bio,
            "experience": current_user.profile.experience,
            "hourly_price": current_user.profile.hourly_price,
            "rating": current_user.profile.rating,
            "total_reviews": current_user.profile.total_reviews,
            "specializations": current_user.profile.specializations,
            "portfolio_urls": current_user.profile.portfolio_urls,
            "social_links": current_user.profile.social_links,
            "has_google_calendar": bool(current_user.profile.google_credentials),
        }
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "phone": current_user.phone,
        "city": current_user.city,
        "avatar": current_user.avatar,
        "is_email_verified": current_user.is_email_verified,
        "profile": profile,
        "created_at": current_user.created_at,
    }

# ─── Account update ───────────────────────────────────────────────────

@router.put("/account")
async def update_account(
    data: UpdateAccountRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.username and data.username != current_user.username:
        exists = db.query(models.User).filter(
            models.User.username == data.username,
            models.User.id != current_user.id
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = data.username

    if data.email and data.email != current_user.email:
        exists = db.query(models.User).filter(
            models.User.email == data.email,
            models.User.id != current_user.id
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = data.email

    db.commit()
    return _build_user_response(current_user)

# ─── Password change ──────────────────────────────────────────────────

@router.put("/password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="current_password_incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="password_min")
    current_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {"ok": True}

# ─── Email өзгерту: 1-қадам — жаңа emailге код жіберу ───────────────

@router.post("/request-email-change")
async def request_email_change(
    data: ChangeEmailRequest,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Жаңа emailге верификация коды жіберу"""
    new_email = str(data.new_email).lower().strip()

    if new_email == current_user.email:
        raise HTTPException(status_code=400, detail="same_email")

    # Жаңа email тіркелген бе тексеру
    exists = db.query(models.User).filter(
        models.User.email == new_email,
        models.User.id != current_user.id
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="email_taken")

    # Код жасап жіберу (purpose = "change_email")
    code = _create_verification(db, current_user.id, "change_email")
    background_tasks.add_task(send_verification_email, new_email, code, "register")
    return {"ok": True}

# ─── Email өзгерту: 2-қадам — кодты тексеріп email ауыстыру ─────────

@router.post("/confirm-email-change")
async def confirm_email_change(
    data: ConfirmEmailChangeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Кодты тексеріп email-ды өзгерту"""
    new_email = data.new_email.lower().strip()

    # Код тексеру
    ev = db.query(models.EmailVerification).filter(
        models.EmailVerification.user_id == current_user.id,
        models.EmailVerification.code == data.code,
        models.EmailVerification.purpose == "change_email",
        models.EmailVerification.is_used == False,
    ).first()

    if not ev:
        raise HTTPException(status_code=400, detail="invalid_code")
    if ev.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="code_expired")

    # Қайта тексеру — басқа біреу осы email-ды алып қойды ма
    exists = db.query(models.User).filter(
        models.User.email == new_email,
        models.User.id != current_user.id
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="email_taken")

    ev.is_used = True
    current_user.email = new_email
    db.commit()

    return _build_user_response(current_user)
