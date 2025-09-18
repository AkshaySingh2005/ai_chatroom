import { useState } from "react";

import "./styles/globals.css";
import Lobby from "./lobby/chat_lobby";
import ChatRoom from "./room/chat_room";

function App() {
  const [currentRoom, setCurrentRoom] = useState<{
    token: string;
    name: string;
    username: string;
  } | null>(null);

  const handleJoinRoom = (
    token: string,
    roomName: string,
    username: string
  ) => {
    setCurrentRoom({
      token,
      name: roomName,
      username,
    });
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {currentRoom ? (
        <ChatRoom
          token={currentRoom.token}
          roomName={currentRoom.name}
          username={currentRoom.username}
          onLeaveRoom={handleLeaveRoom}
        />
      ) : (
        <div className="container mx-auto py-12">
          <Lobby onJoinRoom={handleJoinRoom} />
        </div>
      )}
    </div>
  );
}

export default App;
