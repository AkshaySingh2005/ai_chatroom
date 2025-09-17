import { useState, useEffect, FormEvent, useRef } from 'react';
import { Room, RoomEvent, RemoteParticipant, LocalParticipant } from 'livekit-client';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';

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

export default function ChatRoom({ token, roomName, username, onLeaveRoom }: ChatRoomProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<(RemoteParticipant | LocalParticipant)[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  
  // Add a ref to the messages container for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
            let data;
            
            try {
              data = JSON.parse(decoder.decode(payload));
              console.log("Received data:", data);
              
              if (data.type === 'chat') {
                const newMessage: Message = {
                  id: Date.now().toString(),
                  sender: participant?.identity || 'Unknown',
                  text: data.message,
                  isAI: data.isAI || false,
                  timestamp: new Date()
                };
                
                setMessages((prev) => [...prev, newMessage]);
                
                // Check if message mentions @AI and it's not from the AI itself
                console.log("Checking for @AI mention:", 
                  data.message.includes('@AI'), 
                  "Is AI?:", data.isAI, 
                  "Sender:", participant?.identity
                );
                
                if (data.message.includes('@AI') && !data.isAI && participant?.identity !== 'AI Assistant') {
                  console.log("@AI mention detected, calling AI");
                  // Don't call handleAIResponse here - we handle it in our own message send flow
                  // This is to prevent duplicate AI responses when multiple clients are connected
                  
                  // Only the original sender should trigger the AI response
                  if (participant?.identity === username) {
                    handleAIResponse(data.message);
                  }
                }
              }
            } catch (error) {
              console.error("Error processing received data:", error);
            }
          });

        // Connect to room
        await room.connect(import.meta.env.VITE_LIVEKIT_URL, token);
        console.log('Connected to room:', room.name);
        setRoom(room);
        setIsConnected(true);
        updateParticipants(room);
      } catch (error) {
        console.error('Failed to connect to room:', error);
      }
    };

    connectToRoom();

    // Cleanup when component unmounts
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [token, username]);

const updateParticipants = (room: Room) => {
    const participants = Array.from(room.remoteParticipants.values());
    const allParticipants = [room.localParticipant, ...participants];
    setParticipants(allParticipants);
  };

  const handleAIResponse = async (messageText: string) => {
    if (!room) return;
    
    console.log("AI Response handler called with:", messageText);
    
    // Show "AI is typing..." indicator
    setIsAITyping(true);
    
    try {
      // Extract the actual query - remove the @AI mention
      const query = messageText.replace(/@AI/g, '').trim();
      console.log("Sending query to API:", query);
      
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: username,
          message: query
        }),
      });

      console.log("API response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("API response data:", data);
        
        // Add AI message to local state
        const newAIMessage: Message = {
          id: Date.now().toString() + '-ai',
          sender: 'AI Assistant',
          text: data.response || "Sorry, I couldn't process that request.",
          isAI: true,
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, newAIMessage]);
        
        // Send AI response to the room
        const aiMessage = {
          type: 'chat',
          message: data.response || "Sorry, I couldn't process that request.",
          sender: 'AI Assistant',
          isAI: true
        };
        
        // Publish AI response to the room
        const encoder = new TextEncoder();
        room.localParticipant.publishData(encoder.encode(JSON.stringify(aiMessage)), { reliable: true });
      } else {
        console.error("API returned error:", response.statusText);
        
        // Add error message from AI
        const errorMessage: Message = {
          id: Date.now().toString() + '-ai-error',
          sender: 'AI Assistant',
          text: "Sorry, I encountered an error processing your request.",
          isAI: true,
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Add error message from AI
      const errorMessage: Message = {
        id: Date.now().toString() + '-ai-error',
        sender: 'AI Assistant',
        text: "Sorry, I'm having trouble connecting to the AI service.",
        isAI: true,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      // Hide typing indicator
      setIsAITyping(false);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !room) return;

    // Encode message
    const encoder = new TextEncoder();
    const message = {
      type: 'chat',
      message: inputMessage,
      sender: username,
      isAI: false
    };

    // Add message to local state immediately for better UX
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: username,
      text: inputMessage,
      isAI: false,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, newMessage]);

    // Send message to room
    room.localParticipant.publishData(encoder.encode(JSON.stringify(message)), { reliable: true });
    
    // IMPORTANT: Check here directly if we need to call the AI
    // This ensures we handle AI requests directly when sending the message
    if (inputMessage.includes('@AI')) {
      console.log("Local @AI mention detected, calling AI directly");
      handleAIResponse(inputMessage);
    }
    
    // Clear input
    setInputMessage('');
  };

  const handleLeaveRoom = () => {
    if (room) {
      room.disconnect();
    }
    onLeaveRoom();
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-900 text-white">
      {/* Fixed header */}
      <div className="bg-zinc-800 p-4 flex justify-between items-center shadow-md">
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
      
      {/* Main content - fixed height, scrollable chat */}
      <div className="flex flex-1 overflow-hidden">
        {/* Participants sidebar - scrollable independently */}
        <div className="w-64 bg-zinc-800 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-zinc-400 mb-2 sticky top-0 bg-zinc-800 py-1">
            PARTICIPANTS
          </h3>
          <ul className="space-y-1">
            {participants.map((participant) => (
              <li 
                key={participant.sid} 
                className="flex items-center text-sm py-1"
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${participant.connectionQuality === "excellent" ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span>{participant.identity}</span>
                {participant instanceof LocalParticipant && (
                  <Badge className="ml-2 text-xs" variant="outline">You</Badge>
                )}
              </li>
            ))}
            {/* Add AI as a special participant */}
            <li className="flex items-center text-sm py-1">
              <div className="w-2 h-2 rounded-full mr-2 bg-purple-500" />
              <span>AI Assistant</span>
              <Badge className="ml-2 text-xs" variant="outline" 
                style={{ backgroundColor: '#6b21a8', color: 'white' }}>
                Bot
              </Badge>
            </li>
          </ul>
          
          {/* Add help text for @AI */}
          <div className="mt-4 p-3 bg-zinc-700 rounded-md">
            <h4 className="text-xs font-semibold text-zinc-300 mb-1">How to use AI:</h4>
            <p className="text-xs text-zinc-400">
              Type <span className="text-purple-400 font-mono">@AI</span> followed by your question to get AI assistance.
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Example: <span className="italic">@AI What's the weather like?</span>
            </p>
          </div>
        </div>
        
        {/* Chat area - with fixed layout */}
        <div className="flex-1 flex flex-col">
          {/* Messages - scrollable */}
          <div className="flex-1 p-4 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {messages.length === 0 ? (
              <div className="text-center text-zinc-500 mt-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.sender === username ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${
                        msg.isAI 
                          ? 'bg-purple-700 text-white' 
                          : msg.sender === username 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-zinc-700 text-white'
                      }`}
                    >
                      <div className="text-xs text-zinc-300 mb-1">{msg.sender}</div>
                      <div>{msg.text}</div>
                    </div>
                  </div>
                ))}
                {/* AI typing indicator */}
                {isAITyping && (
                  <div className="flex justify-start">
                    <div className="bg-purple-700/50 text-white px-4 py-2 rounded-lg max-w-[80%]">
                      <div className="text-xs text-zinc-300 mb-1">AI Assistant</div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '200ms' }} />
                        <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '400ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          {/* Input area - fixed at bottom */}
          <form 
            onSubmit={handleSendMessage}
            className="bg-zinc-800 p-4 flex gap-2 shadow-inner"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type a message... (Use @AI to talk to the AI)"
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