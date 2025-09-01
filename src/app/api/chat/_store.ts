/*
  In-memory chat session store (temporary for polling-based real-time updates)
  NOTE: This persists per server instance only and is intended as a stub
  until the proper AI integration and persistence are implemented.
*/

export type ChatStatus = "queued" | "running" | "partial" | "done" | "error";

export type ChatSession = {
  readonly sessionId: string;
  readonly startedAt: number;
  status: ChatStatus;
  text: string;
  updatedAt: number;
  error?: string;
  assessmentPersisted: boolean;
};

// Persist across Next.js dev HMR by hoisting to globalThis (typed)
type GlobalWithChat = typeof globalThis & {
  __chatSessions?: Map<string, ChatSession>;
};
const g = globalThis as GlobalWithChat;
const sessions: Map<string, ChatSession> =
  g.__chatSessions ?? new Map<string, ChatSession>();
g.__chatSessions = sessions;

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function createSession(): ChatSession {
  const sessionId = randomId("sess");
  const now = Date.now();
  const session: ChatSession = {
    sessionId,
    startedAt: now,
    status: "queued",
    text: "",
    updatedAt: now,
    assessmentPersisted: false,
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): ChatSession | undefined {
  return sessions.get(sessionId);
}

export function setRunning(sessionId: string): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.status = "running";
  s.updatedAt = Date.now();
}

export function appendPartial(sessionId: string, chunk: string): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.text += chunk;
  s.status = "partial";
  s.updatedAt = Date.now();
}

export function setDone(sessionId: string): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.status = "done";
  s.updatedAt = Date.now();
}

export function setError(sessionId: string, message: string): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.status = "error";
  s.error = message;
  s.updatedAt = Date.now();
}

export function setAssessmentPersisted(sessionId: string): boolean {
  const s = sessions.get(sessionId);
  if (!s) return false;
  if (s.assessmentPersisted) {
    return false; // Already persisted, lock not acquired
  }
  s.assessmentPersisted = true;
  s.updatedAt = Date.now();
  return true; // Lock acquired
}

/**
 * Remove stale sessions and cap the total number of sessions kept in memory.
 * This is a best-effort GC to keep the stub store bounded in MVP.
 */
export function cleanupStaleSessions(
  maxAgeMs: number,
  maxEntries: number,
): void {
  const now = Date.now();
  // Remove by age
  for (const [id, s] of sessions) {
    if (now - s.updatedAt > maxAgeMs) {
      sessions.delete(id);
    }
  }
  // Cap by size
  if (sessions.size > maxEntries) {
    const arr: ChatSession[] = Array.from(sessions.values());
    arr.sort((a, b) => a.updatedAt - b.updatedAt); // oldest first
    const toRemove = Math.min(sessions.size - maxEntries, arr.length);
    for (let i = 0; i < toRemove; i += 1) {
      const s = arr[i];
      if (s) sessions.delete(s.sessionId);
    }
  }
}
