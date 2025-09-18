import { Button } from "../components/ui/button";
import { useChatRoom } from "../hooks/useChatRoom";
import { ParticipantsList, MessagesList, MessageInput } from "./ChatUI";

interface ChatRoomProps {
  token: string;
  roomName: string;
  username: string;
  onLeaveRoom: () => void;
}

export default function ChatRoom({
  token,
  roomName,
  username,
  onLeaveRoom,
}: ChatRoomProps) {
  const {
    participants,
    messages,
    inputMessage,
    setInputMessage,
    isConnected,
    isAITyping,
    isLoadingHistory,
    messagesEndRef,
    handleSendMessage,
  } = useChatRoom(token, roomName, username);

  return (
    <div className="flex flex-col h-screen bg-zinc-900 text-white">
      {/* Header */}
      <div className="bg-zinc-800 p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">{roomName}</h2>
        <Button variant="destructive" onClick={onLeaveRoom}>
          Leave Room
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <ParticipantsList participants={participants} />
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto">
            <MessagesList
              messages={messages}
              isAITyping={isAITyping}
              username={username}
              messagesEndRef={messagesEndRef}
              isLoadingHistory={isLoadingHistory}
            />
          </div>
          <MessageInput
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            isConnected={isConnected}
            handleSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
}

