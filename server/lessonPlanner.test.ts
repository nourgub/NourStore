import { describe, expect, it, vi, afterEach } from "vitest";
import {
  MATH_LESSON_PLAN_TEMPLATE,
  UNSPECIFIED_PRIOR_KNOWLEDGE,
  fillMathLessonPlanPrompt,
} from "./prompts/mathLessonPlan";
import {
  DEFAULT_LESSON_PLANNER_MODEL,
  generateMathLessonPlan,
  isLessonPlannerConfigured,
  lessonPlannerModel,
} from "./lessonPlanner";

// ---------------------------------------------------------------------------
// The prompt itself. These pin the pedagogical contract: the six sections a
// teacher is promised are the reason this feature exists, so a refactor that
// quietly drops one should fail here rather than in a classroom.
// ---------------------------------------------------------------------------
describe("maths lesson-plan prompt", () => {
  it("asks for all six sections, in order", () => {
    const required = [
      "أهداف تعلمية",
      "وضعية استهلالية",
      "سير الدرس",
      "مثالين محلولين",
      "تمارين تطبيقية",
      "أخطاء شائعة",
    ];
    let cursor = -1;
    for (const section of required) {
      const at = MATH_LESSON_PLAN_TEMPLATE.indexOf(section);
      expect(at, `missing section: ${section}`).toBeGreaterThan(-1);
      expect(at, `section out of order: ${section}`).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it("keeps the constraints that make the output usable", () => {
    // Maths notation, the hard time ceiling, and the rule that Claude asks
    // instead of inventing missing context.
    expect(MATH_LESSON_PLAN_TEMPLATE).toContain("$...$");
    expect(MATH_LESSON_PLAN_TEMPLATE).toContain("لا تتجاوز الزمن الإجمالي");
    expect(MATH_LESSON_PLAN_TEMPLATE).toContain("اسأل قبل المتابعة");
  });

  it("fills every placeholder, including the repeated ones", () => {
    const prompt = fillMathLessonPlanPrompt({
      level: "السنة الرابعة متوسط",
      topic: "المعادلات من الدرجة الثانية",
      durationMinutes: 55,
      priorKnowledge: "الحساب الحرفي والمتطابقات الشهيرة",
    });
    expect(prompt).not.toMatch(/\{[^}\n]+\}/);
    // "المستوى" and "المدة" each appear twice in the template (context block
    // + constraints) — a single-shot replace would leave one behind.
    expect(prompt.match(/السنة الرابعة متوسط/g)).toHaveLength(2);
    expect(prompt.match(/55/g)).toHaveLength(2);
    expect(prompt).toContain("المعادلات من الدرجة الثانية");
    expect(prompt).toContain("الحساب الحرفي والمتطابقات الشهيرة");
  });

  it("marks blank prior knowledge as unspecified rather than dropping it", () => {
    const prompt = fillMathLessonPlanPrompt({
      level: "3AS رياضيات",
      topic: "الدوال اللوغاريتمية",
      durationMinutes: 60,
      priorKnowledge: "   ",
    });
    expect(prompt).toContain(
      `المكتسبات القبلية للتلاميذ: ${UNSPECIFIED_PRIOR_KNOWLEDGE}`
    );
  });
});

// ---------------------------------------------------------------------------
// Unconfigured behaviour — this environment has no ANTHROPIC_API_KEY, which
// is exactly the state a fresh self-hosted deployment starts in.
// ---------------------------------------------------------------------------
describe("lesson planner (no API key in this environment)", () => {
  it("reports itself as unconfigured", () => {
    expect(isLessonPlannerConfigured()).toBe(false);
  });

  it("defaults to Claude Opus 5 when ANTHROPIC_MODEL is unset", () => {
    expect(lessonPlannerModel()).toBe(DEFAULT_LESSON_PLANNER_MODEL);
  });

  it("never fabricates a lesson plan when unconfigured", async () => {
    const result = await generateMathLessonPlan({
      level: "السنة الرابعة متوسط",
      topic: "نظرية فيثاغورس",
      durationMinutes: 60,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_configured");
      expect(result.message).toContain("ANTHROPIC_API_KEY");
    }
  });
});

// ---------------------------------------------------------------------------
// Configured behaviour, against a stubbed HTTP layer. Same
// vi.resetModules()/vi.stubEnv()/dynamic re-import pattern as
// chargilyProvider.test.ts — ENV reads process.env once at module load.
// Only fetch is stubbed, so the real SDK still builds the request and parses
// the response: a wrong model id or a dropped beta flag shows up here.
// ---------------------------------------------------------------------------
type CapturedRequest = {
  url: string;
  headers: Headers;
  body: Record<string, unknown>;
};

async function withStubbedClaude(
  respond: () => Response,
  key = "sk-ant-test-not-a-real-key"
) {
  vi.resetModules();
  vi.stubEnv("ANTHROPIC_API_KEY", key);
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
  const planner = await import("./lessonPlanner");
  planner.resetLessonPlannerClient();
  return { planner, captured };
}

function claudeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const SAMPLE_PLAN = "## الأهداف التعلمية\n- يكون التلميذ قادراً على…";

describe("lesson planner, once configured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("sends the filled prompt to Claude and returns the plan", async () => {
    const { planner, captured } = await withStubbedClaude(() =>
      claudeResponse({
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-opus-5",
        content: [{ type: "text", text: SAMPLE_PLAN }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 700, output_tokens: 1200 },
      })
    );
    const result = await planner.generateMathLessonPlan({
      level: "السنة الرابعة متوسط",
      topic: "نظرية فيثاغورس",
      durationMinutes: 45,
      priorKnowledge: "المثلث القائم",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.markdown).toBe(SAMPLE_PLAN);
      expect(result.model).toBe("claude-opus-5");
      expect(result.truncated).toBe(false);
    }
    expect(captured).toHaveLength(1);
    const [request] = captured;
    expect(request.url).toContain("/v1/messages");
    expect(request.body.model).toBe(DEFAULT_LESSON_PLANNER_MODEL);
    expect(String(request.body.system)).toContain("نظرية فيثاغورس");
    expect(String(request.body.system)).toContain("45");
    expect(String(request.body.system)).not.toMatch(/\{[^}\n]+\}/);
    // Server-side refusal fallback keeps a declined request from simply
    // dying on the teacher — assert both halves reach the API.
    expect(request.body.fallbacks).toBe("default");
    expect(request.headers.get("anthropic-beta")).toContain(
      "server-side-fallback-2026-07-01"
    );
  });

  it("honours an ANTHROPIC_MODEL override", async () => {
    vi.stubEnv("ANTHROPIC_MODEL", "claude-sonnet-5");
    const { planner, captured } = await withStubbedClaude(() =>
      claudeResponse({
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-5",
        content: [{ type: "text", text: SAMPLE_PLAN }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 700, output_tokens: 1200 },
      })
    );
    await planner.generateMathLessonPlan({
      level: "3AS",
      topic: "النهايات",
      durationMinutes: 60,
    });
    expect(captured[0].body.model).toBe("claude-sonnet-5");
  });

  it("flags a plan that hit the output ceiling instead of passing it off as complete", async () => {
    const { planner } = await withStubbedClaude(() =>
      claudeResponse({
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-opus-5",
        content: [{ type: "text", text: SAMPLE_PLAN }],
        stop_reason: "max_tokens",
        stop_sequence: null,
        usage: { input_tokens: 700, output_tokens: 16000 },
      })
    );
    const result = await planner.generateMathLessonPlan({
      level: "3AS",
      topic: "النهايات",
      durationMinutes: 60,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.truncated).toBe(true);
  });

  it("surfaces a refusal as a refusal, not as an empty plan", async () => {
    const { planner } = await withStubbedClaude(() =>
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
    const result = await planner.generateMathLessonPlan({
      level: "3AS",
      topic: "النهايات",
      durationMinutes: 60,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("refused");
      expect(result.message).toBe("طلب غير مقبول");
    }
  });

  it("reports a rejected API key as a provider error", async () => {
    const { planner } = await withStubbedClaude(() =>
      claudeResponse(
        {
          type: "error",
          error: { type: "authentication_error", message: "invalid x-api-key" },
        },
        401
      )
    );
    const result = await planner.generateMathLessonPlan({
      level: "3AS",
      topic: "النهايات",
      durationMinutes: 60,
    });
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
    const planner = await import("./lessonPlanner");
    planner.resetLessonPlannerClient();
    const result = await planner.generateMathLessonPlan({
      level: "3AS",
      topic: "النهايات",
      durationMinutes: 60,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("provider_error");
  });
});
