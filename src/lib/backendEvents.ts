export type BackendEvent = {
  event: string;
  payload: unknown;
};

type BackendEventSubscription = {
  url: string;
  headers?: Record<string, string>;
  onEvent: (event: BackendEvent) => void;
};

function parseSseFrame(frame: string): BackendEvent | null {
  let event = "message";
  const dataLines: string[] = [];

  for (const rawLine of frame.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(":")) {
      continue;
    }
    const separatorIndex = rawLine.indexOf(":");
    const field = separatorIndex === -1 ? rawLine : rawLine.slice(0, separatorIndex);
    const value = separatorIndex === -1 ? "" : rawLine.slice(separatorIndex + 1).replace(/^ /, "");

    if (field === "event") {
      event = value;
    } else if (field === "data") {
      dataLines.push(value);
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  try {
    return {
      event,
      payload: JSON.parse(dataLines.join("\n")) as unknown
    };
  } catch {
    return null;
  }
}

export function subscribeToBackendEvents(input: BackendEventSubscription) {
  const controller = new AbortController();
  let stopped = false;
  let retryTimer: number | null = null;

  async function connect() {
    try {
      const response = await fetch(input.url, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "text/event-stream",
          ...(input.headers ?? {})
        },
        signal: controller.signal
      });

      if (!response.ok || !response.body) {
        throw new Error(`Event stream failed: HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const parsed = parseSseFrame(frame);
          if (parsed && parsed.event !== "ping" && parsed.event !== "ready") {
            input.onEvent(parsed);
          }
        }
      }
    } catch (error) {
      if (stopped || controller.signal.aborted) {
        return;
      }
    }

    if (!stopped) {
      retryTimer = window.setTimeout(connect, 1200);
    }
  }

  void connect();

  return () => {
    stopped = true;
    if (retryTimer !== null) {
      window.clearTimeout(retryTimer);
      retryTimer = null;
    }
    controller.abort();
  };
}
