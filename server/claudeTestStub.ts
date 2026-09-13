// Shared test scaffolding for the teacher-assistant modules (NOT a test file
// itself — vitest only collects server/**/*.test.ts).
//
// Only the HTTP layer is stubbed, never the SDK: the real client still builds
// the request and parses the response, so a wrong model id, a dropped beta
// flag or a mis-read response shape fails a test instead of reaching
// production. Same vi.resetModules()/vi.stubEnv() pattern as
// chargilyProvider.test.ts — ENV reads process.env once at module load.

import { vi } from "vitest";

export type CapturedRequest = {
  url: string;
  headers: Headers;
  body: Record<string, unknown>;
};

export const TEST_API_KEY = "sk-ant-test-not-a-real-key";

/**
 * Stubs the environment and fetch, then hands back the list that every
 * outgoing request is recorded into. Call it BEFORE dynamically importing the
 * module under test, so that import sees the fresh, stubbed modules.
 */
export async function stubClaude(
  respond: () => Response,
  extraEnv: Record<string, string> = {}
): Promise<CapturedRequest[]> {
  vi.resetModules();
  vi.stubEnv("ANTHROPIC_API_KEY", TEST_API_KEY);
  for (const [name, value] of Object.entries(extraEnv)) vi.stubEnv(name, value);
  const captured: CapturedRequest[] = [];
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      captured.push({
        url: String(input),
        headers: new Headers(init?.headers),
        body: JSON.parse(String(init?.body ?? "{}")),
      });
      return respond();
    }
  );
  const { resetClaudeClient } = await import("./claudeClient");
  resetClaudeClient();
  return captured;
}

/** A raw Messages API HTTP response. */
export function claudeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** A successful single-text-block reply. */
export function claudeText(
  text: string,
  options: { stopReason?: string; model?: string } = {}
): Response {
  return claudeResponse({
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: options.model ?? "claude-opus-5",
    content: [{ type: "text", text }],
    stop_reason: options.stopReason ?? "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 700, output_tokens: 1200 },
  });
}

/** Restores env/global stubs — call from afterEach. */
export function unstubClaude(): void {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
}
