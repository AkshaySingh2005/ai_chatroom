import os
import chromadb
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from sentence_transformers import SentenceTransformer

# Directory for storing ChromaDB data
CHROMA_DIR = Path(os.path.dirname(os.path.abspath(__file__))) / "chroma_db"

class SemanticMemory:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize the semantic memory service"""
        # Create ChromaDB client
        self.client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        
        # Create or get collection
        self.collection = self.client.get_or_create_collection("chat_memories")
        
        # Load the sentence transformer model
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        
        # Dictionary to track room-specific contexts
        self.room_contexts = {}
    
    def add_memory(self, room_id: str, user_id: str, text: str, is_ai: bool = False) -> str:
        """Add a new memory to the semantic database"""
        # Generate a unique ID for this memory
        memory_id = str(uuid.uuid4())
        
        # Create metadata
        metadata = {
            "room_id": room_id,
            "sender": "AI Assistant" if is_ai else user_id,
            "is_ai": "true" if is_ai else "false",  # ChromaDB requires string values
            "timestamp": datetime.now().isoformat()
        }
        
        # Add to collection
        self.collection.add(
            documents=[text],
            metadatas=[metadata],
            ids=[memory_id]
        )
        
        # Update room context tracking
        if room_id not in self.room_contexts:
            self.room_contexts[room_id] = {
                "last_active": datetime.now(),
                "participants": set()
            }
        
        if not is_ai:
            self.room_contexts[room_id]["participants"].add(user_id)
        
        self.room_contexts[room_id]["last_active"] = datetime.now()
        
        return memory_id
    
    def get_relevant_context(self, room_id: str, query: str, limit: int = 5) -> str:
        """Retrieve relevant context based on semantic search"""
        # Search for relevant memories
        results = self.collection.query(
            query_texts=[query],
            where={"room_id": room_id},
            n_results=limit
        )
        
        # No results
        if not results or not results["documents"] or len(results["documents"][0]) == 0:
            return "No previous conversation in this room."
        
        # Format context for LLM
        context_lines = ["Recent and relevant conversation:"]
        
        for i, doc in enumerate(results["documents"][0]):
            metadata = results["metadatas"][0][i]
            sender = metadata.get("sender", "Unknown")
            is_ai = metadata.get("is_ai", "false") == "true"
            
            try:
                timestamp = datetime.fromisoformat(metadata.get("timestamp", datetime.now().isoformat()))
                time_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")
            except:
                time_str = "Unknown time"
            
            prefix = "[AI]" if is_ai else f"[{sender}]"
            context_lines.append(f"{time_str} {prefix} {doc}")
        
        return "\n".join(context_lines)
    
    def get_room_history(self, room_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve chat history for a room chronologically"""
        # Get all messages for the room
        results = self.collection.query(
            query_texts=[""],  # Empty query to match everything
            where={"room_id": room_id},
            n_results=limit
        )
        
        # Format as list of message dictionaries
        messages = []
        if not results or not results["documents"] or len(results["documents"][0]) == 0:
            return messages
        
        for i, doc in enumerate(results["documents"][0]):
            metadata = results["metadatas"][0][i]
            memory_id = results["ids"][0][i]
            
            try:
                timestamp = datetime.fromisoformat(metadata.get("timestamp", datetime.now().isoformat()))
            except:
                timestamp = datetime.now()
            
            messages.append({
                "id": memory_id,
                "sender": metadata.get("sender", "Unknown"),
                "text": doc,
                "is_ai": metadata.get("is_ai", "false") == "true",
                "timestamp": timestamp.isoformat()
            })
        
        # Sort by timestamp
        messages.sort(key=lambda x: x["timestamp"])
        
        return messages
    
    def delete_room_memories(self, room_id: str) -> None:
        """Delete all memories for a specific room"""
        # Find all memories for this room
        results = self.collection.query(
            query_texts=[""],
            where={"room_id": room_id},
            n_results=1000  # Set a high limit to get all
        )
        
        if results and results["ids"] and len(results["ids"][0]) > 0:
            # Delete the memories
            self.collection.delete(ids=results["ids"][0])
        
        # Remove room context
        if room_id in self.room_contexts:
            del self.room_contexts[room_id]

# Singleton instance
semantic_memory = SemanticMemory()

def get_semantic_memory() -> SemanticMemory:
    """Get the semantic memory service instance"""
    return semantic_memory

# Backwards compatibility with old memory manager
def get_memory_manager():
    """Legacy function for compatibility"""
    return get_semantic_memory()