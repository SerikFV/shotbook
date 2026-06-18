import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ['DATABASE_URL'] = 'postgresql://shotbook_user:shotbook_pass@localhost:5432/shotbook_db'

from database import engine, Base, SessionLocal
import models
import bcrypt

Base.metadata.create_all(bind=engine)
db = SessionLocal()

ADMIN_USERNAME = 'admin'
ADMIN_EMAIL    = 'admin@shotbook.kz'
ADMIN_PASSWORD = 'Admin@2025!'

pw = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()

existing = db.query(models.User).filter(
    (models.User.username == ADMIN_USERNAME) | (models.User.email == ADMIN_EMAIL)
).first()

if existing:
    # Бар болса — деректерін жаңарт
    existing.username         = ADMIN_USERNAME
    existing.email            = ADMIN_EMAIL
    existing.password_hash    = pw
    existing.role             = models.UserRole.admin
    existing.is_active        = True
    existing.is_banned        = False
    existing.is_email_verified = True
    db.commit()
    print(f"Admin UPDATED:")
else:
    admin = models.User(
        username          = ADMIN_USERNAME,
        email             = ADMIN_EMAIL,
        password_hash     = pw,
        role              = models.UserRole.admin,
        is_active         = True,
        is_banned         = False,
        is_email_verified = True,
    )
    db.add(admin)
    db.commit()
    print("Admin CREATED:")

print(f"  username : {ADMIN_USERNAME}")
print(f"  email    : {ADMIN_EMAIL}")
print(f"  password : {ADMIN_PASSWORD}")
print(f"  role     : admin")
print(f"  verified : True")

db.close()
