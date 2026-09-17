import { describe, expect, it, vi, afterEach } from "vitest";
import {
  DEFAULT_CLAUDE_MODEL,
  askClaude,
  claudeModel,
  isClaudeConfigured,
} from "./claudeClient";
import {
  claudeResponse,
  claudeText,
  stubClaude,
  unstubClaude,
} from "./claudeTestStub";

// Unconfigured — the state a fresh self-hosted deployment starts in, and the
// state of this test environment.
describe("claude client (no API key in this environment)", () => {
  it("reports itself as unconfigured", () => {
    expect(isClaudeConfigured()).toBe(false);
  });

  it("defaults to Claude Opus 5 when ANTHROPIC_MODEL is unset", () => {
    expect(claudeModel()).toBe(DEFAULT_CLAUDE_MODEL);
  });

  it("refuses instead of answering when unconfigured", async () => {
    const result = await askClaude({ system: "s", user: "u" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_configured");
      expect(result.message).toContain("ANTHROPIC_API_KEY");
    }
  });
});

describe("claude client, once configured", () => {
  afterEach(unstubClaude);

  it("sends the system prompt and returns the text", async () => {
    const captured = await stubClaude(() => claudeText("النتيجة"));
    const { askClaude: ask } = await import("./claudeClient");
    const result = await ask({ system: "تعليمات", user: "ابدأ" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe("النتيجة");
      expect(result.model).toBe("claude-opus-5");
      expect(result.truncated).toBe(false);
    }
    expect(captured).toHaveLength(1);
    const [request] = captured;
    expect(request.url).toContain("/v1/messages");
    expect(request.body.model).toBe(DEFAULT_CLAUDE_MODEL);
    expect(request.body.system).toBe("تعليمات");
    // Server-side refusal fallback keeps a declined request from simply dying
    // on the teacher — assert both halves actually reach the API.
    expect(request.body.fallbacks).toBe("default");
    expect(request.headers.get("anthropic-beta")).toContain(
      "server-side-fallback-2026-07-01"
    );
  });

  it("honours an ANTHROPIC_MODEL override", async () => {
    const captured = await stubClaude(
      () => claudeText("ok", { model: "claude-sonnet-5" }),
      { ANTHROPIC_MODEL: "claude-sonnet-5" }
    );
    const { askClaude: ask } = await import("./claudeClient");
    await ask({ system: "s", user: "u" });
    expect(captured[0].body.model).toBe("claude-sonnet-5");
  });

  it("flags an answer that hit the output ceiling instead of passing it off as complete", async () => {
    await stubClaude(() => claudeText("مقطوع", { stopReason: "max_tokens" }));
    const { askClaude: ask } = await import("./claudeClient");
    const result = await ask({ system: "s", user: "u" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.truncated).toBe(true);
  });

  it("surfaces a refusal as a refusal, not as an empty answer", async () => {
    await stubClaude(() =>
      claudeResponse({
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-opus-5",
        content: [],
        stop_reason: "refusal",
        stop_details: {
          type: "refusal",
          category: null,
          explanation: "طلب غير مقبول",
        },
        stop_sequence: null,
        usage: { input_tokens: 700, output_tokens: 0 },
      })
    );
    const { askClaude: ask } = await import("./claudeClient");
    const result = await ask({ system: "s", user: "u" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("refused");
      expect(result.message).toBe("طلب غير مقبول");
    }
  });

  it("treats an empty reply as an error rather than an empty result", async () => {
    await stubClaude(() => claudeText(""));
    const { askClaude: ask } = await import("./claudeClient");
    const result = await ask({ system: "s", user: "u" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("provider_error");
  });

  it("reports a rejected API key as a provider error", async () => {
    await stubClaude(() =>
      claudeResponse(
        {
          type: "error",
          error: { type: "authentication_error", message: "invalid x-api-key" },
        },
        401
      )
    );
    const { askClaude: ask } = await import("./claudeClient");
    const result = await ask({ system: "s", user: "u" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("provider_error");
      expect(result.message).toContain("ANTHROPIC_API_KEY");
    }
  });

  it("reports a network failure without throwing", async () => {
    vi.resetModules();
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-not-a-real-key");
    vi.stubGlobal("fetch", async () => {
      throw new Error("socket hang up");
    });
    const claude = await import("./claudeClient");
    claude.resetClaudeClient();
    const result = await claude.askClaude({ system: "s", user: "u" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("provider_error");
  });
});
