import os
from dotenv import load_dotenv
from livekit import api

# Load environment variables
load_dotenv()

# Get LiveKit credentials from environment variables
API_KEY = os.getenv("LIVEKIT_API_KEY")
API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "ws://localhost:7880")

# Initialize LiveKit client
room_client = api.RoomServiceClient(
    url=LIVEKIT_URL,
    api_key=API_KEY, 
    api_secret=API_SECRET
)

def create_room(room_name):
    """Create a new room in LiveKit"""
    try:
        room = room_client.create_room(
            name=room_name,
            empty_timeout=300,  # Room will be deleted after 5 minutes of inactivity
            max_participants=10
        )
        return room
    except Exception as e:
        print(f"Error creating room: {e}")
        return None

def delete_room(room_name):
    """Delete a room in LiveKit"""
    try:
        room_client.delete_room(room_name)
        return True
    except Exception as e:
        print(f"Error deleting room: {e}")
        return False

def create_token(room_name, participant_name, can_publish=True, can_subscribe=True):
    """Create an access token for a participant to join a room"""
    try:
        # Create token with specified permissions
        token = api.AccessToken(
            api_key=API_KEY,
            api_secret=API_SECRET
        )
        
        # Set token identity
        token.identity = participant_name
        
        # Add grants for the token
        grant = api.VideoGrant(
            room_join=True,
            room=room_name,
            can_publish=can_publish,
            can_subscribe=can_subscribe
        )
        token.add_grant(grant)
        
        # Generate JWT token
        jwt_token = token.to_jwt()
        
        return jwt_token
    except Exception as e:
        print(f"Error creating token: {e}")
        return None

def list_rooms():
    """List all active rooms"""
    try:
        rooms = room_client.list_rooms()
        return rooms
    except Exception as e:
        print(f"Error listing rooms: {e}")
        return []

def list_participants(room_name):
    """List all participants in a room"""
    try:
        participants = room_client.list_participants(room_name)
        return participants
    except Exception as e:
        print(f"Error listing participants: {e}")
        return []