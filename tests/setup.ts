import { vi } from "vitest";

// Mock convex-nextjs server token provider to avoid importing next/server in tests
vi.mock("@convex-dev/auth/nextjs/server", () => ({
  convexAuthNextjsToken: vi.fn(async () => null),
}));
