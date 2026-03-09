import type { ChatMessage, ChatThread } from "@/types";

type StreamPayload = {
  tenant_id: string;
  device_id: string;
  chat_id?: string;
  message: string;
  page_context?: {
    url?: string;
    title?: string;
    content?: string;
  };
};

export type PlaceSuggestionOption = {
  code: string;
  label: string;
};

export type AirportSuggestion = {
  code: string;
  name: string;
  city: string;
  label: string;
};

function resolveBaseUrl(override?: string) {
  return (override || import.meta.env.VITE_CHAT_BACKEND_URL || "http://localhost:4000").replace(/\/$/, "");
}

async function parseError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { error?: string };
    return json.error || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export async function listChats(input: {
  tenantId: string;
  deviceId: string;
  backendUrl?: string;
}): Promise<ChatThread[]> {
  const base = resolveBaseUrl(input.backendUrl);
  const response = await fetch(
    `${base}/api/chats?tenant_id=${encodeURIComponent(input.tenantId)}&device_id=${encodeURIComponent(input.deviceId)}`
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const json = (await response.json()) as { chats: ChatThread[] };
  return json.chats;
}

export async function createChat(input: {
  tenantId: string;
  deviceId: string;
  backendUrl?: string;
}): Promise<ChatThread> {
  const base = resolveBaseUrl(input.backendUrl);
  const response = await fetch(`${base}/api/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenant_id: input.tenantId,
      device_id: input.deviceId
    })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const json = (await response.json()) as { chat: ChatThread };
  return json.chat;
}

export async function renameChat(input: {
  chatId: string;
  tenantId: string;
  deviceId: string;
  title: string;
  backendUrl?: string;
}): Promise<ChatThread> {
  const base = resolveBaseUrl(input.backendUrl);
  const response = await fetch(`${base}/api/chats/${input.chatId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenant_id: input.tenantId,
      device_id: input.deviceId,
      title: input.title
    })
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const json = (await response.json()) as { chat: ChatThread };
  return json.chat;
}

export async function deleteChat(input: {
  chatId: string;
  tenantId: string;
  deviceId: string;
  backendUrl?: string;
}): Promise<void> {
  const base = resolveBaseUrl(input.backendUrl);
  const response = await fetch(
    `${base}/api/chats/${input.chatId}?tenant_id=${encodeURIComponent(input.tenantId)}&device_id=${encodeURIComponent(input.deviceId)}`,
    {
      method: "DELETE"
    }
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export async function listMessages(input: {
  chatId: string;
  tenantId: string;
  deviceId: string;
  backendUrl?: string;
}): Promise<ChatMessage[]> {
  const base = resolveBaseUrl(input.backendUrl);
  const response = await fetch(
    `${base}/api/chats/${input.chatId}/messages?tenant_id=${encodeURIComponent(input.tenantId)}&device_id=${encodeURIComponent(input.deviceId)}`
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const json = (await response.json()) as { messages: ChatMessage[] };
  return json.messages;
}

export async function streamChat(input: {
  payload: StreamPayload;
  backendUrl?: string;
  onToken: (token: string) => void;
  onError: (message: string) => void;
}): Promise<{ chat_id: string }> {
  const base = resolveBaseUrl(input.backendUrl);
  const response = await fetch(`${base}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input.payload)
  });

  if (!response.ok || !response.body) {
    throw new Error(await parseError(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let donePayload: { chat_id: string } = { chat_id: input.payload.chat_id ?? "" };

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const lines = rawEvent.split("\n");
      let event = "message";
      let dataRaw = "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        }

        if (line.startsWith("data:")) {
          dataRaw += line.slice(5).trim();
        }
      }

      if (dataRaw) {
        const data = JSON.parse(dataRaw) as unknown;

        if (event === "token") {
          input.onToken(String(data));
        } else if (event === "error") {
          const message =
            typeof data === "object" && data !== null && "message" in data
              ? String((data as { message?: string }).message ?? "Unknown error")
              : "Unknown stream error";
          input.onError(message);
        } else if (event === "done" && typeof data === "object" && data !== null) {
          donePayload = { chat_id: String((data as { chat_id?: string }).chat_id ?? donePayload.chat_id) };
        }
      }

      boundary = buffer.indexOf("\n\n");
    }
  }

  return donePayload;
}

export async function searchPlaceSuggestions(input: {
  tenantId: string;
  query: string;
  backendUrl?: string;
}): Promise<PlaceSuggestionOption[]> {
  const base = resolveBaseUrl(input.backendUrl);
  const response = await fetch(
    `${base}/api/flights/place-suggestions?tenant_id=${encodeURIComponent(input.tenantId)}&query=${encodeURIComponent(input.query)}&limit=8`
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const json = (await response.json()) as { suggestions?: PlaceSuggestionOption[] };
  return Array.isArray(json.suggestions) ? json.suggestions : [];
}

function toAirportSuggestions(raw: unknown): AirportSuggestion[] {
  const seen = new Set<string>();
  const suggestions: AirportSuggestion[] = [];

  function addSuggestion(item: Record<string, unknown>) {
    const code = String(item.iata_code ?? "").toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) {
      return;
    }

    const name = String(item.name ?? code).trim();
    const city = String(
      item.city_name ??
      (typeof item.city === "object" && item.city ? (item.city as Record<string, unknown>).name : "") ??
      ""
    ).trim();

    const key = `${code}:${name}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    suggestions.push({
      code,
      name,
      city,
      label: city ? `${code} - ${name} (${city})` : `${code} - ${name}`
    });
  }

  if (!raw || typeof raw !== "object") {
    return suggestions;
  }

  const data = (raw as { data?: unknown[] }).data;
  if (!Array.isArray(data)) {
    return suggestions;
  }

  for (const entry of data) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const item = entry as Record<string, unknown>;
    const airports = item.airports;
    if (Array.isArray(airports)) {
      for (const airport of airports) {
        if (airport && typeof airport === "object") {
          addSuggestion(airport as Record<string, unknown>);
        }
      }
    }

    if (item.type === "airport") {
      addSuggestion(item);
    }
  }

  return suggestions.slice(0, 10);
}

export async function fetchAirportSuggestions(query: string, backendUrl?: string): Promise<AirportSuggestion[]> {
  const normalized = query.trim();
  if (normalized.length < 2) {
    return [];
  }

  const base = resolveBaseUrl(backendUrl);
  const response = await fetch(
    `${base}/api/flights/place-suggestions?query=${encodeURIComponent(normalized)}`
  );

  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as unknown;
  return toAirportSuggestions(json);
}
