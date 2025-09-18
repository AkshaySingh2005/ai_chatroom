import asyncio
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from llm import generate_response
from memory import get_memory_manager, ChatMessage

from chatroom.liveKit import (
    create_room,
    delete_room,
    create_token,
    list_rooms,
    list_participants,
    close_api_client
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    user_id: str
    message: str
    room_id: Optional[str] = None  # Added room_id to track conversation context

class RoomRequest(BaseModel):
    room_name: str
    empty_timeout: int = 300
    max_participants: int = 10

class TokenRequest(BaseModel):
    room_name: str
    participant_name: str
    can_publish: bool = True
    can_subscribe: bool = True

class MessageResponse(BaseModel):
    id: str
    sender: str
    text: str
    timestamp: str
    is_ai: bool

class HistoryRequest(BaseModel):
    room_id: str
    limit: int = 50

# Add middleware to handle client session cleanup
@app.middleware("http")
async def cleanup_livekit_client(request: Request, call_next):
    response = await call_next(request)
    # Close the LiveKit client after response is generated
    # Only if the path is related to LiveKit operations
    if request.url.path in ["/rooms", "/rooms/{room_name}/participants"]:
        await close_api_client()
    return response

@app.post("/chat")
async def chat_endpoint(chat: ChatRequest):
    # Generate response with room context if available
    response = generate_response(chat.message, chat.room_id)
    
    # Store both user message and AI response if room_id is provided
    if chat.room_id:
        memory_manager = get_memory_manager()
        room_memory = memory_manager.get_room_memory(chat.room_id)
        
        # Store user message
        room_memory.add_message(chat.user_id, chat.message)
        
        # Store AI response
        room_memory.add_message("AI Assistant", response, is_ai=True)
    
    return {"response": response}

# New endpoint to get chat history for a room
@app.get("/rooms/{room_id}/history")
async def get_room_history(room_id: str, limit: int = 50):
    memory_manager = get_memory_manager()
    room_memory = memory_manager.get_room_memory(room_id)
    messages = room_memory.get_recent_messages(limit)
    
    # Format messages for the response
    formatted_messages = []
    for i, msg in enumerate(messages):
        formatted_messages.append({
            "id": f"{msg.timestamp.timestamp()}-{i}",
            "sender": msg.sender,
            "text": msg.text,
            "timestamp": msg.timestamp.isoformat(),
            "is_ai": msg.is_ai
        })
    
    return {"messages": formatted_messages}

# LiveKit room management
@app.post("/rooms")
async def create_room_endpoint(request: RoomRequest):
    try:
        room = await create_room(request.room_name)
        if room:
            # Convert protobuf to dict for JSON serialization
            room_dict = {
                "sid": room.sid,
                "name": room.name,
                "empty_timeout": room.empty_timeout,
                "max_participants": room.max_participants,
                "creation_time": room.creation_time
            }
            return {"success": True, "room": room_dict}
        raise HTTPException(status_code=500, detail="Failed to create room")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.delete("/rooms/{room_name}")
async def delete_room_endpoint(room_name: str):
    try:
        success = await delete_room(room_name)
        if success:
            # Also delete room memory when room is deleted
            memory_manager = get_memory_manager()
            memory_manager.delete_room_memory(room_name)
            return {"success": True}
        raise HTTPException(status_code=500, detail="Failed to delete room")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/rooms")
async def list_rooms_endpoint():
    try:
        rooms = await list_rooms()
        # Convert protocol buffer objects to dicts for JSON serialization
        room_list = []
        for room in rooms:
            room_dict = {
                "sid": room.sid,
                "name": room.name,
                "empty_timeout": room.empty_timeout,
                "max_participants": room.max_participants,
                "num_participants": room.num_participants,
                "creation_time": room.creation_time
            }
            room_list.append(room_dict)
        return {"rooms": room_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# Token generation for LiveKit
@app.post("/token")
async def create_token_endpoint(request: TokenRequest):
    try:
        token = create_token(
            request.room_name,
            request.participant_name,
            request.can_publish,
            request.can_subscribe
        )
        if token:
            return {"token": token}
        raise HTTPException(status_code=500, detail="Failed to generate token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/rooms/{room_name}/participants")
async def list_participants_endpoint(room_name: str):
    try:
        participants = await list_participants(room_name)
        # Convert protocol buffer objects to dicts for JSON serialization
        participant_list = []
        for p in participants:
            p_dict = {
                "sid": p.sid,
                "identity": p.identity,
                "state": str(p.state),
                "metadata": p.metadata,
                "joined_at": p.joined_at
            }
            participant_list.append(p_dict)
        return {"participants": participant_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok"}