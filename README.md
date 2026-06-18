# 📸 ShotBook — Mobilographer Booking Platform

Мобилографтарға арналған толық booking және CRM платформасы.

## 🚀 Технологиялар

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + React Router |
| Backend | Python FastAPI + SQLAlchemy |
| Database | PostgreSQL |
| Auth | JWT |
| Realtime | WebSocket |
| i18n | i18next (Қазақша / Русский) |
| Charts | Chart.js |

---

## 📦 Орнату (Docker арқылы — ең оңай)

### Алдын-ала орнату керек:
- [Docker Desktop](https://docker.com/products/docker-desktop)

```bash
# 1. Жобаны клондау немесе папканы ашу
cd shotbook

# 2. Docker-мен іске қосу
docker-compose up --build

# 3. Браузерде ашу
# Frontend: http://localhost:3000
# Backend API docs: http://localhost:8000/docs
```

---

## 💻 Қолмен орнату (Development)

### Backend

```bash
cd backend

# Virtual environment жасау
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Пакеттер орнату
pip install -r requirements.txt

# PostgreSQL базасын жасау
createdb shotbook_db
# немесе psql арқылы:
# CREATE DATABASE shotbook_db;
# CREATE USER shotbook_user WITH PASSWORD 'shotbook_pass';
# GRANT ALL PRIVILEGES ON DATABASE shotbook_db TO shotbook_user;

# .env файлын жасау
cp .env.example .env
# .env файлын өз деректеріңізге сай өзгертіңіз

# Серверді іске қосу
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Пакеттер орнату
npm install

# Dev серверін іске қосу
npm run dev
# http://localhost:5173 адресінде ашылады
```

---

## 🔑 Бірінші Admin аккаунт жасау

Тіркелгеннен кейін, PostgreSQL-де рольді өзгертіңіз:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## 📁 Жоба құрылымы

```
shotbook/
├── backend/
│   ├── main.py              # FastAPI app + WebSocket
│   ├── database.py          # SQLAlchemy конфигурациясы
│   ├── models.py            # Дерекқор модельдері
│   ├── auth_utils.py        # JWT + password hashing
│   ├── requirements.txt
│   └── routers/
│       ├── auth.py          # Тіркелу / Кіру
│       ├── users.py         # Пайдаланушы профилі
│       ├── bookings.py      # Тапсырыс жүйесі
│       ├── messages.py      # Хабарлама жүйесі
│       ├── notifications.py # Хабарламалар
│       ├── analytics.py     # Аналитика
│       └── admin.py         # Әкімші панелі
│
└── frontend/
    └── src/
        ├── App.jsx           # Роутинг
        ├── main.jsx          # Entry point
        ├── index.css         # Global стильдер
        ├── i18n/             # Қазақша / Орысша аудармалар
        ├── store/            # Zustand state management
        ├── services/         # Axios API клиенті
        ├── components/
        │   └── layout/       # Sidebar + Topbar
        └── pages/
            ├── auth/         # Login + Register
            ├── client/       # Mobilographer тізімі + Профиль
            ├── mobilographer/ # Calendar + Analytics
            ├── admin/        # Әкімші панелі
            ├── HomePage.jsx
            ├── BookingsPage.jsx
            ├── MessagesPage.jsx
            └── ProfilePage.jsx
```

---

## 🌐 API Endpoints

| Method | URL | Сипаттама |
|--------|-----|-----------|
| POST | /api/auth/register | Тіркелу |
| POST | /api/auth/login | Кіру |
| GET | /api/auth/me | Ағымдағы пайдаланушы |
| GET | /api/users/mobilographers | Барлық мобилографтар |
| GET | /api/users/{id} | Пайдаланушы профилі |
| PUT | /api/users/me/profile | Профильді жаңарту |
| POST | /api/bookings/ | Тапсырыс жасау |
| GET | /api/bookings/my | Менің тапсырыстарым |
| PATCH | /api/bookings/{id}/status | Статусты өзгерту |
| GET | /api/messages/contacts | Контактілер тізімі |
| GET | /api/messages/conversation/{id} | Сөйлесу тарихы |
| POST | /api/messages/ | Хабарлама жіберу |
| GET | /api/notifications/ | Хабарламалар |
| GET | /api/analytics/mobilographer | Аналитика |
| GET | /api/admin/users | Барлық пайдаланушылар (admin) |
| WS | /ws/{user_id} | WebSocket чат |

---

## 👥 Рольдер

| Рол | Мүмкіндіктер |
|-----|-------------|
| **Client** | Мобилографтарды қарау, тапсырыс беру, чат |
| **Mobilographer** | Профиль, күнтізбе, тапсырыстарды басқару, аналитика |
| **Admin** | Барлық пайдаланушылар, тапсырыстар, платформа статистикасы |

---

## 🎨 Дизайн жүйесі

```css
--bg: #0F0F0F        /* Негізгі фон */
--card: #1A1A1A      /* Карточкалар */
--accent: #7C5CFF    /* Акцент түсі */
--text: #FFFFFF      /* Мәтін */
--text-secondary: #A0A0A0  /* Қосымша мәтін */
```

---

## 📝 Тапсырыс статустары

| Статус | Қазақша | Орысша |
|--------|---------|--------|
| new | Жаңа | Новый |
| confirmed | Расталды | Подтверждено |
| shooting | Түсірілім | Съёмка |
| editing | Монтаж | Монтаж |
| completed | Аяқталды | Завершено |
| cancelled | Бас тартылды | Отменено |
