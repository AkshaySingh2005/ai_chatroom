import asyncio
from chatroom.liveKit import create_room, create_token, list_rooms, list_participants, close_api_client

async def test_livekit():
    """Test LiveKit functionality"""
    try:
        # Create a test room
        room_name = "test_room"
        print(f"Creating room: {room_name}")
        room = await create_room(room_name)
        if not room:
            print("Failed to create room")
            return False
        
        print(f"Room created successfully: {room}")
        
        # List all rooms
        print("\nListing all rooms:")
        rooms = await list_rooms()
        for room in rooms:
            print(f"- {room.name}: {room.num_participants} participants")
        
        # Create a token for a test user
        user_name = "test_user"
        print(f"\nCreating token for user {user_name} in room {room_name}")
        token = create_token(room_name, user_name)
        if not token:
            print("Failed to create token")
            return False
        
        print(f"Token created successfully: {token}")
        
        return True
    finally:
        # Ensure client session is closed properly
        await close_api_client()

if __name__ == "__main__":
    print("Testing LiveKit integration...")
    asyncio.run(test_livekit())
    print("\nTest complete!")