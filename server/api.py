from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from llm import generate_response

from livekit_service import (
    create_room,
    delete_room,
    create_token,
    list_rooms,
    list_participants
)

app = FastAPI()

class ChatRequest(BaseModel):
    user_id: str
    message: str

class RoomRequest(BaseModel):
    room_name: str

class TokenRequest(BaseModel):
    room_name: str
    participant_name: str
    can_publish: bool = True
    can_subscribe: bool = True

class Room(BaseModel):
    name: str
    num_participants: int
    created_at: Optional[str] = None

class Participant(BaseModel):
    identity: str
    metadata: Optional[str] = None

@app.post("/chat")
async def chat_endpoint(chat: ChatRequest):
    response = generate_response(chat.message, "")
    return {"response": response}

# LiveKit room management
@app.post("/rooms")
async def create_room_endpoint(request: RoomRequest):
    room = create_room(request.room_name)
    if room:
        return {"success": True, "room": room}
    raise HTTPException(status_code=500, detail="Failed to create room")

@app.delete("/rooms/{room_name}")
async def delete_room_endpoint(room_name: str):
    success = delete_room(room_name)
    if success:
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to delete room")

@app.get("/rooms")
async def list_rooms_endpoint():
    rooms = list_rooms()
    return {"rooms": rooms}

# Token generation for LiveKit
@app.post("/token")
async def create_token_endpoint(request: TokenRequest):
    token = create_token(
        request.room_name,
        request.participant_name,
        request.can_publish,
        request.can_subscribe
    )
    if token:
        return {"token": token}
    raise HTTPException(status_code=500, detail="Failed to generate token")

@app.get("/rooms/{room_name}/participants")
async def list_participants_endpoint(room_name: str):
    participants = list_participants(room_name)
    return {"participants": participants}