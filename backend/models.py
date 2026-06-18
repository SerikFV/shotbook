from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class UserRole(str, enum.Enum):
    client = "client"
    mobilographer = "mobilographer"
    admin = "admin"

class BookingStatus(str, enum.Enum):
    new = "new"
    confirmed = "confirmed"
    shooting = "shooting"
    editing = "editing"
    completed = "completed"
    cancelled = "cancelled"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.client)
    phone = Column(String(20))
    city = Column(String(100))
    avatar = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_banned = Column(Boolean, default=False)
    is_email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    profile = relationship("MobilographerProfile", back_populates="user", uselist=False)
    bookings_as_client = relationship("Booking", foreign_keys="Booking.client_id", back_populates="client")
    bookings_as_mobilographer = relationship("Booking", foreign_keys="Booking.mobilographer_id", back_populates="mobilographer")
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver")
    notifications = relationship("Notification", back_populates="user")

class MobilographerProfile(Base):
    __tablename__ = "mobilographer_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    bio = Column(Text)
    experience = Column(Integer, default=0)
    hourly_price = Column(Float, default=0)
    rating = Column(Float, default=0)
    total_reviews = Column(Integer, default=0)
    specializations = Column(Text)
    portfolio_urls = Column(Text)
    packages = Column(Text)  # JSON: [{"name":"Базалық","price":5000,"duration":1,"description":"..."}]
    social_links = Column(Text)  # JSON: {"instagram":"...","whatsapp":"...","telegram":"...","youtube":"...","tiktok":"..."}
    google_credentials = Column(Text)  # JSON string of OAuth credentials

    user = relationship("User", back_populates="profile")

class EmailVerification(Base):
    """Email верификация коды — тіркелу және пароль қалпына келтіру"""
    __tablename__ = "email_verifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(String(6), nullable=False)
    purpose = Column(String(20), nullable=False)  # "register" | "reset_password"
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"))
    mobilographer_id = Column(Integer, ForeignKey("users.id"))
    booking_date = Column(DateTime(timezone=True), nullable=False)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    location = Column(String(255))
    shoot_type = Column(String(100))
    notes = Column(Text)
    status = Column(Enum(BookingStatus), default=BookingStatus.new)
    total_price = Column(Float, default=0)
    contract_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("User", foreign_keys=[client_id], back_populates="bookings_as_client")
    mobilographer = relationship("User", foreign_keys=[mobilographer_id], back_populates="bookings_as_mobilographer")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    receiver_id = Column(Integer, ForeignKey("users.id"))
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    deleted_for_sender = Column(Boolean, default=False)
    deleted_for_receiver = Column(Boolean, default=False)
    deleted_for_all = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50))
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"))
    target_user_id = Column(Integer, ForeignKey("users.id"))
    reason = Column(Text, nullable=False)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reporter = relationship("User", foreign_keys=[reporter_id])
    target = relationship("User", foreign_keys=[target_user_id])

class Availability(Base):
    __tablename__ = "availability"
    id = Column(Integer, primary_key=True, index=True)
    mobilographer_id = Column(Integer, ForeignKey("users.id"))
    date = Column(String(20), nullable=False)  # YYYY-MM-DD
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    is_blocked = Column(Boolean, default=False)  # True = бос емес (демалыс т.б.)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    mobilographer = relationship("User", foreign_keys=[mobilographer_id])

class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True)
    client_id = Column(Integer, ForeignKey("users.id"))
    mobilographer_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    booking = relationship("Booking", foreign_keys=[booking_id])
    client = relationship("User", foreign_keys=[client_id])
    mobilographer = relationship("User", foreign_keys=[mobilographer_id])

class Favorite(Base):
    __tablename__ = "favorites"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mobilographer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    client = relationship("User", foreign_keys=[client_id])
    mobilographer = relationship("User", foreign_keys=[mobilographer_id])

class BookingDelivery(Base):
    """Аяқталған тапсырысқа мобилограф жіберген файлдар"""
    __tablename__ = "booking_deliveries"
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_name = Column(String(255))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    booking = relationship("Booking", foreign_keys=[booking_id])


# ─── Топтық чат ──────────────────────────────────────────────────────

class GroupRoom(Base):
    """Топтық чат бөлмесі"""
    __tablename__ = "group_rooms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    avatar = Column(String(255))
    created_by = Column(Integer, ForeignKey("users.id"))
    is_public = Column(Boolean, default=True)   # True = кез келген кіре алады (Telegram канал логикасы)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("GroupRoomMember", back_populates="room")
    messages = relationship("GroupMessage", back_populates="room")


class GroupRoomMember(Base):
    """Топтық чат мүшесі"""
    __tablename__ = "group_room_members"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("group_rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_admin = Column(Boolean, default=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    room = relationship("GroupRoom", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])


class GroupMessage(Base):
    """Топтық чат хабарламасы"""
    __tablename__ = "group_messages"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("group_rooms.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    is_pinned = Column(Boolean, default=False)  # Закреп
    pinned_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    deleted_for_all = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    room = relationship("GroupRoom", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    pinner = relationship("User", foreign_keys=[pinned_by])

# ─── Медиа (Reels/Портфолио) ─────────────────────────────────────────

class MediaInteraction(Base):
    """Видео/Сурет үшін лайктар мен сақтаулар"""
    __tablename__ = "media_interactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    media_url = Column(String(1000), index=True, nullable=False)
    interaction_type = Column(String(20), nullable=False)  # "like" немесе "save"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])

class MediaComment(Base):
    """Видео/Сурет үшін пікірлер"""
    __tablename__ = "media_comments"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    media_url = Column(String(1000), index=True, nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])

# ─── Админ / Аудит ─────────────────────────────────────────

class ActivityLog(Base):
    """Жүйедегі маңызды іс-әрекеттер тарихы"""
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
