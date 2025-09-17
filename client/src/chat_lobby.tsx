import { useState, useEffect, FormEvent } from 'react';
import { Button } from './components/ui/button';


interface Room {
  sid: string;
  name: string;
  num_participants: number;
}

interface LobbyProps {
  onJoinRoom: (token: string, roomName: string, username: string) => void;
}

export default function Lobby({ onJoinRoom }: LobbyProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [username, setUsername] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch available rooms
  const fetchRooms = async () => {
    try {
      const response = await fetch('http://localhost:8000/rooms');
      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms || []);
      } else {
        console.error('Failed to fetch rooms');
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  useEffect(() => {
    fetchRooms();
    // Refresh rooms list periodically
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !username.trim()) {
      setError('Please enter both your name and a room name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create room
      const roomResponse = await fetch('http://localhost:8000/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ room_name: newRoomName }),
      });

      if (!roomResponse.ok) {
        throw new Error('Failed to create room');
      }

      // Get token for the new room
      const tokenResponse = await fetch('http://localhost:8000/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_name: newRoomName,
          participant_name: username,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get token');
      }

      const tokenData = await tokenResponse.json();
      onJoinRoom(tokenData.token, newRoomName, username);
    } catch (error) {
      console.error('Error creating room:', error);
      setError('Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!selectedRoom || !username.trim()) {
      setError('Please enter your name and select a room');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_name: selectedRoom,
          participant_name: username,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get token');
      }

      const data = await response.json();
      onJoinRoom(data.token, selectedRoom, username);
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-zinc-800 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-white text-center">AI Chatroom</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-100 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Your Name
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your name"
          className="w-full bg-zinc-700 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-medium text-zinc-300 mb-2">Join a Room</h2>
        {rooms.length === 0 ? (
          <div className="text-zinc-400 text-sm mb-2">No rooms available</div>
        ) : (
          <div className="space-y-2 mb-4">
            {rooms.map((room) => (
              <div 
                key={room.sid}
                onClick={() => setSelectedRoom(room.name)}
                className={`p-3 rounded-md cursor-pointer flex justify-between items-center ${
                  selectedRoom === room.name 
                    ? 'bg-blue-900/30 border border-blue-700' 
                    : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
              >
                <div>
                  <div className="font-medium text-white">{room.name}</div>
                  <div className="text-xs text-zinc-400">{room.num_participants} participants</div>
                </div>
                {selectedRoom === room.name && (
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <Button 
          onClick={handleJoinRoom} 
          className="w-full" 
          disabled={!selectedRoom || !username || isLoading}
        >
          {isLoading ? 'Joining...' : 'Join Selected Room'}
        </Button>
      </div>
      
      <div className="pt-6 border-t border-zinc-700">
        <h2 className="text-lg font-medium text-zinc-300 mb-2">Create a New Room</h2>
        <form onSubmit={handleCreateRoom}>
          <div className="mb-4">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Enter room name"
              className="w-full bg-zinc-700 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!newRoomName || !username || isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Room'}
          </Button>
        </form>
      </div>
    </div>
  );
}