import { FormEvent } from "react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Message } from "../hooks/useChatRoom";
import { RemoteParticipant, LocalParticipant } from "livekit-client";

export function ParticipantsList({
  participants,
}: {
  participants: (RemoteParticipant | LocalParticipant)[];
}) {
  return (
    <div className="w-64 bg-zinc-800 p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-zinc-400 mb-2">PARTICIPANTS</h3>
      <ul className="space-y-1">
        {participants.map((p) => (
          <li key={p.sid} className="flex items-center text-sm py-1">
            <div className="w-2 h-2 rounded-full mr-2 bg-green-500" />
            <span>{p.identity}</span>
            {p instanceof LocalParticipant && (
              <Badge variant="outline">You</Badge>
            )}
          </li>
        ))}
        <li className="flex items-center text-sm py-1">
          <div className="w-2 h-2 rounded-full mr-2 bg-purple-500" />
          <span>AI Assistant</span>
          <Badge className="ml-2 text-xs" variant="outline">
            Bot
          </Badge>
        </li>
      </ul>
    </div>
  );
}

export function MessagesList({
  messages,
  isAITyping,
  username,
  messagesEndRef,
  isLoadingHistory,
}: {
  messages: Message[];
  isAITyping: boolean;
  username: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isLoadingHistory: boolean;
}) {
  if (isLoadingHistory)
    return <div className="text-center">Loading history...</div>;
  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${
            msg.sender === username ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`px-4 py-2 rounded-lg ${
              msg.isAI
                ? "bg-purple-700"
                : msg.sender === username
                ? "bg-blue-600"
                : "bg-zinc-700"
            }`}
          >
            <div className="text-xs">
              {msg.sender}{" "}
              {msg.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div>{msg.text}</div>
          </div>
        </div>
      ))}
      {isAITyping && (
        <div className="flex justify-start">
          <div className="bg-purple-700/50 text-white px-4 py-2 rounded-lg max-w-[80%]">
            <div className="text-xs text-zinc-300 mb-1">AI Assistant</div>
            <div className="flex items-center space-x-1">
              <div
                className="w-2 h-2 rounded-full bg-white animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-white animate-bounce"
                style={{ animationDelay: "200ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-white animate-bounce"
                style={{ animationDelay: "400ms" }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

export function MessageInput({
  inputMessage,
  setInputMessage,
  isConnected,
  handleSendMessage,
}: {
  inputMessage: string;
  setInputMessage: (s: string) => void;
  isConnected: boolean;
  handleSendMessage: (e: FormEvent) => void;
}) {
  return (
    <form onSubmit={handleSendMessage} className="bg-zinc-800 p-4 flex gap-2">
      <input
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        placeholder="Type a message... (@AI for assistant)"
        className="flex-1 bg-zinc-700 px-4 py-2 rounded-md"
        disabled={!isConnected}
      />
      <Button type="submit" disabled={!isConnected || !inputMessage.trim()}>
        Send
      </Button>
    </form>
  );
}
