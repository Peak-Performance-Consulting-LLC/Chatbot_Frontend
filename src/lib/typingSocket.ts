import { io, type Socket } from "socket.io-client";

export type TypingActor = "agent" | "visitor";

export type TypingSocketPayload = {
  chat_id?: string;
  chatId?: string;
  conversation_id?: string;
  conversationId: string;
  actor: TypingActor;
  sender_type?: TypingActor;
  user_id?: string;
  userId: string;
  sender_id?: string;
  userName?: string;
  user_name?: string;
  senderName?: string;
  is_typing?: boolean;
  isTyping?: boolean;
  typing?: boolean;
};

type ServerToClientEvents = {
  typing: (payload: TypingSocketPayload) => void;
  "typing:start": (payload: TypingSocketPayload) => void;
  "typing:stop": (payload: TypingSocketPayload) => void;
};

type ClientToServerEvents = {
  "conversation:join": (payload: TypingSocketPayload) => void;
  "conversation:leave": (payload: TypingSocketPayload) => void;
  "typing:start": (payload: TypingSocketPayload) => void;
  "typing:stop": (payload: TypingSocketPayload) => void;
};

export type TypingSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const sockets = new Map<string, TypingSocket>();

export function getTypingSocket(baseUrl: string): TypingSocket {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const existing = sockets.get(normalizedBaseUrl);

  if (existing) {
    if (existing.disconnected) {
      existing.connect();
    }
    return existing;
  }

  const socket = io(normalizedBaseUrl, {
    path: "/socket.io",
    autoConnect: true
  });

  sockets.set(normalizedBaseUrl, socket);
  return socket;
}
