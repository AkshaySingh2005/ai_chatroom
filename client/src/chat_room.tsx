import { useState, useEffect, FormEvent } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  LocalParticipant,
} from "livekit-client";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";

interface ChatRoomProps {
  token: string;
  roomName: string;
  username: string;
  onLeaveRoom: () => void;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  isAI: boolean;
  timestamp: Date;
}

export default function ChatRoom({
  token,
  roomName,
  username,
  onLeaveRoom,
}: ChatRoomProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<
    (RemoteParticipant | LocalParticipant)[]
  >([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  // Connect to LiveKit room
  useEffect(() => {
    const connectToRoom = async () => {
      try {
        const room = new Room();

        // Set up event listeners
        room
          .on(RoomEvent.ParticipantConnected, () => updateParticipants(room))
          .on(RoomEvent.ParticipantDisconnected, () => updateParticipants(room))
          .on(RoomEvent.DataReceived, (payload, participant) => {
            const decoder = new TextDecoder();
            const data = JSON.parse(decoder.decode(payload));

            if (data.type === "chat") {
              const newMessage: Message = {
                id: Date.now().toString(),
                sender: participant?.identity || "Unknown",
                text: data.message,
                isAI: data.isAI || false,
                timestamp: new Date(),
              };

              setMessages((prev) => [...prev, newMessage]);
            }
          });

        // Connect to room
        await room.connect(import.meta.env.VITE_LIVEKIT_URL, token);
        console.log("Connected to room:", room.name);
        setRoom(room);
        setIsConnected(true);
        updateParticipants(room);
      } catch (error) {
        console.error("Failed to connect to room:", error);
      }
    };

    connectToRoom();

    // Cleanup when component unmounts
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [token]);

  const updateParticipants = (room: Room) => {
    const participants = Array.from(room.remoteParticipants.values());
    const allParticipants = [
      room.localParticipant,
      ...participants,
    ];
    setParticipants(allParticipants);
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !room) return;

    // Encode message
    const encoder = new TextEncoder();
    const message = {
      type: "chat",
      message: inputMessage,
      sender: username,
      isAI: false,
    };

    // Add message to local state immediately for better UX
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: username,
      text: inputMessage,
      isAI: false,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);

    // Send message to room
    room.localParticipant.publishData(encoder.encode(JSON.stringify(message)), {
      reliable: true,
    });

    // Clear input
    setInputMessage("");

    // Send message to AI endpoint
    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: username,
          message: inputMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Send AI response to the room
        const aiMessage = {
          type: "chat",
          message: data.response,
          sender: "AI Assistant",
          isAI: true,
        };

        // Add AI message to local state
        const newAIMessage: Message = {
          id: Date.now().toString() + "-ai",
          sender: "AI Assistant",
          text: data.response,
          isAI: true,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, newAIMessage]);

        // Publish AI response to the room
        room.localParticipant.publishData(
          encoder.encode(JSON.stringify(aiMessage)),
          { reliable: true }
        );
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
    }
  };

  const handleLeaveRoom = () => {
    if (room) {
      room.disconnect();
    }
    onLeaveRoom();
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-white">
      <div className="bg-zinc-800 p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">{roomName}</h2>
          <div className="text-sm text-zinc-400">
            <span>{participants.length} participants</span>
          </div>
        </div>
        <Button variant="destructive" onClick={handleLeaveRoom}>
          Leave Room
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Participants sidebar */}
        <div className="w-64 bg-zinc-800 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">
            PARTICIPANTS
          </h3>
          <ul className="space-y-1">
            {participants.map((participant) => (
              <li
                key={participant.sid}
                className="flex items-center text-sm py-1"
              >
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${
                    participant.connectionQuality === "excellent"
                      ? "bg-green-500"
                      : "bg-yellow-500"
                  }`}
                />
                <span>{participant.identity}</span>
                {participant instanceof LocalParticipant && (
                  <Badge className="ml-2 text-xs" variant="outline">
                    You
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center text-zinc-500 mt-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender === username ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${
                        msg.isAI
                          ? "bg-purple-700 text-white"
                          : msg.sender === username
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-700 text-white"
                      }`}
                    >
                      <div className="text-xs text-zinc-300 mb-1">
                        {msg.sender}
                      </div>
                      <div>{msg.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input area */}
          <form
            onSubmit={handleSendMessage}
            className="bg-zinc-800 p-4 flex gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-zinc-700 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!isConnected}
            />
            <Button
              type="submit"
              disabled={!isConnected || !inputMessage.trim()}
            >
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
