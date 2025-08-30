/*
  Google Gemini API client (REST) with streaming support.
  - Uses SSE via `streamGenerateContent` endpoint when possible
  - Falls back to `generateContent` on error

  This module is server-only. Do not import on the client.
*/

import * as Sentry from "@sentry/nextjs";

export type Role = "user" | "model" | "system";

export type GenerationConfig = {
  readonly temperature?: number;
  readonly topP?: number;
  readonly topK?: number;
  readonly maxOutputTokens?: number;
};

export type ContentPart = { readonly text: string };

export type Content = {
  readonly role?: Role;
  readonly parts: readonly ContentPart[];
};

export type GenerateRequest = {
  readonly model: string;
  readonly apiKey: string;
  readonly contents: readonly Content[];
  readonly systemInstruction?: Content;
  readonly generationConfig?: GenerationConfig;
};

export type StreamHandlers = {
  onChunkText: (text: string) => void;
  onDone: () => void;
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta" as const;

function toHeaders(apiKey: string): HeadersInit {
  // Gemini API accepts API key via query (?key=) or header x-goog-api-key
  return {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey,
  } satisfies HeadersInit;
}

function toBody(
  req: Omit<GenerateRequest, "apiKey" | "model"> & { readonly model?: string },
): string {
  const payload = {
    contents: req.contents,
    systemInstruction: req.systemInstruction,
    generationConfig: req.generationConfig,
  };
  return JSON.stringify(payload);
}

function parseStreamLine(line: string): string | null {
  // Expect lines like: "data: {json}"
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const jsonStr = trimmed.slice("data:".length).trim();
  if (!jsonStr || jsonStr === "[DONE]") return null;
  try {
    const obj = JSON.parse(jsonStr) as {
      readonly candidates?: Array<{
        readonly content?: {
          readonly parts?: Array<{ readonly text?: string }>;
        };
      }>;
    };
    const text = obj.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return text;
  } catch {
    return null;
  }
}

export async function generateWithStreaming(
  req: GenerateRequest,
  handlers: StreamHandlers,
): Promise<void> {
  const { model, apiKey, contents, systemInstruction, generationConfig } = req;
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

  await Sentry.startSpan(
    { op: "http.client", name: "gemini.streamGenerateContent" },
    async (span) => {
      span.setAttribute("model", model);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: toHeaders(apiKey),
          body: toBody({ contents, systemInstruction, generationConfig }),
        });
        if (!res.ok || !res.body) {
          span.setAttribute("http.status_code", res.status);
          throw new Error(`gemini_stream_http_${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        // Read SSE stream
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // Split by newlines and parse lines prefixed with data:
          const lines = buffer.split(/\r?\n/);
          // keep last partial line in buffer
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const chunkText = parseStreamLine(line);
            if (chunkText) handlers.onChunkText(chunkText);
          }
        }
        // flush remaining buffer
        if (buffer.length > 0) {
          const chunkText = parseStreamLine(buffer);
          if (chunkText) handlers.onChunkText(chunkText);
        }
        handlers.onDone();
      } catch (err) {
        Sentry.captureException(err);
        throw err;
      } finally {
        span.end();
      }
    },
  );
}

export async function generateOnce(req: GenerateRequest): Promise<string> {
  const { model, apiKey, contents, systemInstruction, generationConfig } = req;
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`;

  return Sentry.startSpan(
    { op: "http.client", name: "gemini.generateContent" },
    async (span) => {
      span.setAttribute("model", model);
      try {
        const res = await fetch(url + `?key=${encodeURIComponent(apiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: toBody({ contents, systemInstruction, generationConfig }),
        });
        if (!res.ok) {
          span.setAttribute("http.status_code", res.status);
          throw new Error(`gemini_generate_http_${res.status}`);
        }
        const data = (await res.json()) as {
          readonly candidates?: Array<{
            readonly content?: {
              readonly parts?: Array<{ readonly text?: string }>;
            };
          }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        return text;
      } catch (err) {
        Sentry.captureException(err);
        throw err;
      } finally {
        span.end();
      }
    },
  );
}
