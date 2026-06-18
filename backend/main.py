from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import json
from typing import Dict, List
import os

from database import engine, Base, get_db
from routers import auth, users, bookings, messages, notifications, analytics, admin, availability, google_auth, group_chat
from routers import favorites, delivery, media
import models
from websockets_manager import manager

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ShotBook API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["bookings"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(group_chat.router, prefix="/api/groups", tags=["Group Chat"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(availability.router, prefix="/api", tags=["availability"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["favorites"])
app.include_router(delivery.router, prefix="/api/delivery", tags=["delivery"])
app.include_router(google_auth.router, prefix="/api/google", tags=["google_auth"])
app.include_router(media.router, prefix="/api/media", tags=["media"])

# WebSocket connection manager is now imported from websockets_manager

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, token: str = None):
    # Token query param арқылы аутентификация: /ws/1?token=...
    if token:
        try:
            from jose import jwt as _jwt
            from auth_utils import SECRET_KEY, ALGORITHM
            payload = _jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            token_user_id = int(payload.get("sub", -1))
            if token_user_id != user_id:
                await websocket.close(code=4003)
                return
        except Exception:
            await websocket.close(code=4001)
            return

    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            receiver_id = message_data.get("receiver_id")
            if receiver_id:
                await manager.send_personal_message(message_data, receiver_id)
                await manager.send_personal_message(message_data, user_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

@app.get("/api/online/{user_id}")
async def check_online(user_id: int):
    return {"online": manager.is_online(user_id)}

@app.get("/")
async def root():
    return {"message": "ShotBook API v1.0"}
