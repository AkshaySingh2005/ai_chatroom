import os
from datetime import datetime
import json
from typing import List, Dict, Any, Optional
from pathlib import Path


HISTORY_DIR = Path(os.path.dirname(os.path.abspath(__file__))) / "chat_history"


if not HISTORY_DIR.exists():
    HISTORY_DIR.mkdir(parents=True)

class ChatMessage:
    def __init__(self, sender: str, text: str, timestamp: Optional[datetime] = None, is_ai: bool = False):
        self.sender = sender
        self.text = text
        self.timestamp = timestamp or datetime.now()
        self.is_ai = is_ai
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "sender": self.sender,
            "text": self.text,
            "timestamp": self.timestamp.isoformat(),
            "is_ai": self.is_ai
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ChatMessage':
        return cls(
            sender=data["sender"],
            text=data["text"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            is_ai=data.get("is_ai", False)
        )

class RoomMemory:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.file_path = HISTORY_DIR / f"{room_id}.json"
        self.messages = self._load_messages()
    
    def _load_messages(self) -> List[ChatMessage]:
        if not self.file_path.exists():
            return []
        
        try:
            with open(self.file_path, "r") as f:
                data = json.load(f)
                return [ChatMessage.from_dict(msg) for msg in data]
        except Exception as e:
            print(f"Error loading messages for room {self.room_id}: {e}")
            return []
    
    def _save_messages(self) -> None:
        try:
            with open(self.file_path, "w") as f:
                json.dump([msg.to_dict() for msg in self.messages], f)
        except Exception as e:
            print(f"Error saving messages for room {self.room_id}: {e}")
    
    def add_message(self, sender: str, text: str, is_ai: bool = False) -> None:
        """Add a message to the room's chat history"""
        message = ChatMessage(sender, text, is_ai=is_ai)
        self.messages.append(message)
        self._save_messages()
    
    def get_recent_messages(self, limit: int = 50) -> List[ChatMessage]:
        """Get the most recent messages for the room"""
        return self.messages[-limit:] if self.messages else []
    
    def get_context_for_ai(self, max_messages: int = 10) -> str:
        """Format recent messages as context for the AI"""
        recent_messages = self.get_recent_messages(max_messages)
        if not recent_messages:
            return "No previous conversation in this room."
        
        context_lines = ["Recent conversation:"]
        for msg in recent_messages:
            prefix = "[AI]" if msg.is_ai else f"[{msg.sender}]"
            timestamp = msg.timestamp.strftime("%H:%M:%S")
            context_lines.append(f"{timestamp} {prefix} {msg.text}")
        
        return "\n".join(context_lines)
    
    def clear_history(self) -> None:
        """Clear the room's chat history"""
        self.messages = []
        self._save_messages()

# Singleton-like memory manager for accessing room memories
class MemoryManager:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._rooms = {}
        return cls._instance
    
    def get_room_memory(self, room_id: str) -> RoomMemory:
        """Get or create a memory object for a specific room"""
        if room_id not in self._rooms:
            self._rooms[room_id] = RoomMemory(room_id)
        return self._rooms[room_id]
    
    def delete_room_memory(self, room_id: str) -> None:
        """Delete a room's memory when the room is deleted"""
        if room_id in self._rooms:
            del self._rooms[room_id]
        
        # Remove file if it exists
        file_path = HISTORY_DIR / f"{room_id}.json"
        if file_path.exists():
            file_path.unlink()
    
    def list_rooms(self) -> List[str]:
        """List all rooms that have memory files"""
        return [f.stem for f in HISTORY_DIR.glob("*.json")]

# Create a singleton instance
memory_manager = MemoryManager()

def get_memory_manager() -> MemoryManager:
    """Get the memory manager instance"""
    return memory_manager