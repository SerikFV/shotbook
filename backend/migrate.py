"""DB миграция — жаңа колонкалар мен кестелер қосу"""
from database import engine
from sqlalchemy import text

migrations = [
    # mobilographer_profiles-ке packages колонкасы
    "ALTER TABLE mobilographer_profiles ADD COLUMN IF NOT EXISTS packages TEXT",
    # social_links колонкасы
    "ALTER TABLE mobilographer_profiles ADD COLUMN IF NOT EXISTS social_links TEXT",
    # users-ке is_email_verified колонкасы
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE",
    # messages кестесіне жаңа колонкалар
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_sender BOOLEAN DEFAULT FALSE",
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_receiver BOOLEAN DEFAULT FALSE",
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_all BOOLEAN DEFAULT FALSE",
    # email_verifications кестесі
    """CREATE TABLE IF NOT EXISTS email_verifications (        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(6) NOT NULL,
        purpose VARCHAR(20) NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )""",
    # favorites кестесі
    """CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        mobilographer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(client_id, mobilographer_id)
    )""",
    # bookings-ке contract_url қосу
    "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contract_url VARCHAR(500)",
    # booking_deliveries кестесі
    """CREATE TABLE IF NOT EXISTS booking_deliveries (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        file_url VARCHAR(500) NOT NULL,
        file_name VARCHAR(255),
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
    )""",
    # group_rooms кестесі
    """CREATE TABLE IF NOT EXISTS group_rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        avatar VARCHAR(255),
        created_by INTEGER REFERENCES users(id),
        is_public BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )""",
    # group_room_members кестесі
    """CREATE TABLE IF NOT EXISTS group_room_members (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES group_rooms(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        is_admin BOOLEAN DEFAULT FALSE,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(room_id, user_id)
    )""",
    # group_messages кестесі
    """CREATE TABLE IF NOT EXISTS group_messages (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES group_rooms(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id),
        message TEXT NOT NULL,
        is_pinned BOOLEAN DEFAULT FALSE,
        pinned_by INTEGER REFERENCES users(id),
        deleted_for_all BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )""",
]

with engine.connect() as conn:
    for sql in migrations:
        try:
            conn.execute(text(sql))
            conn.commit()
            print(f"OK: {sql[:60]}...")
        except Exception as e:
            print(f"SKIP ({e}): {sql[:60]}...")

print("Migration done!")
