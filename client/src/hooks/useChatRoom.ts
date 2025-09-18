import { useState, useEffect, useRef, FormEvent } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  LocalParticipant,
} from "livekit-client";

export interface Message {
  id: string;
  sender: string;
  text: string;
  isAI: boolean;
  timestamp: Date;
}

export function useChatRoom(
  token: string,
  roomName: string,
  username: string
) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<
    (RemoteParticipant | LocalParticipant)[]
  >([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // Auto scroll
  useEffect(scrollToBottom, [messages]);

  // Fetch history
  useEffect(() => {
    const fetchMessageHistory = async () => {
      if (!roomName) return;
      setIsLoadingHistory(true);
      try {
        const res = await fetch(`http://localhost:8000/rooms/${roomName}/history`);
        if (res.ok) {
          const data = await res.json();
          setMessages(
            data.messages.map((msg: {
              id: string;
              sender: string;
              text: string;
              is_ai: boolean;
              timestamp: string;
            }) => ({
              id: msg.id,
              sender: msg.sender,
              text: msg.text,
              isAI: msg.is_ai,
              timestamp: new Date(msg.timestamp),
            }))
          );
        }
      } catch (err) {
        console.error("History error:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchMessageHistory();
  }, [roomName]);

  // Connect to LiveKit
  useEffect(() => {
    let isMounted = true;
    const r = new Room();
    r.on(RoomEvent.ParticipantConnected, () => updateParticipants(r));
    r.on(RoomEvent.ParticipantDisconnected, () => updateParticipants(r));
    r.on(RoomEvent.DataReceived, (payload, participant) => {
      const decoder = new TextDecoder();
      try {
        const data = JSON.parse(decoder.decode(payload));
        if (data.type === "chat") {
          const newMsg: Message = {
            id: Date.now().toString(),
            sender: participant?.identity || "Unknown",
            text: data.message,
            isAI: data.isAI || false,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, newMsg]);
          if (
            data.message.includes("@AI") &&
            !data.isAI &&
            participant?.identity === username
          ) {
            handleAIResponse(data.message, r);
          }
        }
      } catch (e) {
        console.error("Data parse error:", e);
      }
    });

    (async () => {
      try {
        await r.connect(import.meta.env.VITE_LIVEKIT_URL, token);
        if (isMounted) {
          setRoom(r);
          setIsConnected(true);
          updateParticipants(r);
        }
      } catch (err) {
        console.error("Room connection failed:", err);
      }
    })();

    return () => {
      isMounted = false;
      r.disconnect();
    };
  }, [token, username]);

  const updateParticipants = (r: Room) => {
    const all = [r.localParticipant, ...Array.from(r.remoteParticipants.values())];
    setParticipants(all);
  };

  const handleAIResponse = async (text: string, r: Room) => {
    setIsAITyping(true);
    try {
      const query = text.replace(/@AI/g, "").trim();
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: username, message: query, room_id: roomName }),
      });
      const data = await res.json();
      const reply = data.response || "AI error";
      const aiMsg: Message = {
        id: Date.now().toString() + "-ai",
        sender: "AI Assistant",
        text: reply,
        isAI: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      r.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "chat", message: reply, isAI: true })),
        { reliable: true }
      );
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + "-ai-error", sender: "AI Assistant", text: "AI unavailable", isAI: true, timestamp: new Date() },
      ]);
    } finally {
      setIsAITyping(false);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !room) return;
    const msg: Message = {
      id: Date.now().toString(),
      sender: username,
      text: inputMessage,
      isAI: false,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ type: "chat", message: inputMessage, sender: username, isAI: false })),
      { reliable: true }
    );
    if (inputMessage.includes("@AI")) handleAIResponse(inputMessage, room);
    setInputMessage("");
  };

  return {
    participants,
    messages,
    inputMessage,
    setInputMessage,
    isConnected,
    isAITyping,
    isLoadingHistory,
    messagesEndRef,
    handleSendMessage,
  };
}
