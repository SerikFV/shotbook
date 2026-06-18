import json
from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_text(json.dumps(message))

    async def send_notification(self, notif: dict, user_id: int):
        """Notification-ды реалтайм WebSocket арқылы жіберу"""
        await self.send_personal_message({**notif, "type": "notification"}, user_id)

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    async def broadcast_group_message(self, room_id: int, message: dict, db):
        import models
        members = db.query(models.GroupRoomMember).filter(models.GroupRoomMember.room_id == room_id).all()
        admins = db.query(models.User).filter(models.User.role == models.UserRole.admin).all()
        
        user_ids = {m.user_id for m in members}
        user_ids.update({a.id for a in admins})
        
        message["type"] = "group_message"
        for uid in user_ids:
            await self.send_personal_message(message, uid)

    async def broadcast_group_event(self, room_id: int, event: dict, db):
        import models
        members = db.query(models.GroupRoomMember).filter(models.GroupRoomMember.room_id == room_id).all()
        admins = db.query(models.User).filter(models.User.role == models.UserRole.admin).all()
        
        user_ids = {m.user_id for m in members}
        user_ids.update({a.id for a in admins})
        
        for uid in user_ids:
            await self.send_personal_message(event, uid)

manager = ConnectionManager()
