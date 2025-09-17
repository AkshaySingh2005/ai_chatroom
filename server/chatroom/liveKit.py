import os
from dotenv import load_dotenv
from livekit.api import LiveKitAPI, CreateRoomRequest, DeleteRoomRequest, ListRoomsRequest

load_dotenv()

API_KEY = os.getenv("LIVEKIT_API_KEY")
API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "https://aichatroom-3h6ow9nw.livekit.cloud")

# Don't create the client at module level
# Instead, use a function to get or create it when needed
_lkapi = None

async def get_api_client():
    global _lkapi
    if _lkapi is None:
        _lkapi = LiveKitAPI(
            url=LIVEKIT_URL,
            api_key=API_KEY,
            api_secret=API_SECRET
        )
    return _lkapi

async def create_room(room_name):
    """Create a new room in LiveKit"""
    try:
        # Get the API client inside the async function
        lkapi = await get_api_client()
        room = await lkapi.room.create_room(CreateRoomRequest(
            name=room_name,
            empty_timeout=300,
            max_participants=10
        ))
        return room
    except Exception as e:
        print(f"Error creating room: {e}")
        return None

async def delete_room(room_name):
    """Delete a room in LiveKit"""
    try:
        lkapi = await get_api_client()
        await lkapi.room.delete_room(DeleteRoomRequest(room=room_name))
        return True
    except Exception as e:
        print(f"Error deleting room: {e}")
        return False

def create_token(room_name, participant_name, can_publish=True, can_subscribe=True):
    """Create an access token for a participant to join a room"""
    try:
        # Import from livekit.api module as shown in the docs
        from livekit import api
        
        # Create token with specified permissions
        token = api.AccessToken(API_KEY, API_SECRET)
        
        # Set identity and name
        token = token.with_identity(participant_name).with_name(participant_name)
        
        # Add grants - use VideoGrants (plural) instead of VideoGrant
        grants = api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=can_publish,
            can_subscribe=can_subscribe
        )
        token = token.with_grants(grants)
        
        # Generate token
        jwt_token = token.to_jwt()
        return jwt_token
    except Exception as e:
        print(f"Error creating token: {e}")
        import traceback
        traceback.print_exc()
        return None

async def list_rooms():
    """List all active rooms"""
    try:
        lkapi = await get_api_client()
        rooms = await lkapi.room.list_rooms(ListRoomsRequest())
        return rooms.rooms  # Return the list of rooms
    except Exception as e:
        print(f"Error listing rooms: {e}")
        return []

async def list_participants(room_name):
    """List all participants in a room"""
    try:
        from livekit.api import ListParticipantsRequest
        lkapi = await get_api_client()
        response = await lkapi.room.list_participants(ListParticipantsRequest(room=room_name))
        return response.participants
    except Exception as e:
        print(f"Error listing participants: {e}")
        return []

# Add this function to close the API client properly
async def close_api_client():
    global _lkapi
    if _lkapi is not None:
        # The correct method name is aclose, not close
        await _lkapi.aclose()
        _lkapi = None