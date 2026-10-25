// Per-million-token USD pricing used only to produce an ESTIMATED cost
// figure for the teacher-facing usage log — never treated as an
// authoritative bill (the actual invoice comes from Anthropic's/Google's own
// billing). These rates must be re-verified against each provider's current
// pricing page before being relied on for real financial decisions; they
// drift over time and this table is not automatically kept in sync.
//
// Source read at the time this was written: anthropic.com/pricing (Claude)
// and ai.google.dev/gemini-api/docs/pricing (Gemini), both for their
// standard (non-batch, non-cached) text/vision tier.
interface ModelRate {
  inputPerMillion: number;
  outputPerMillion: number;
}

const RATES: Record<string, ModelRate> = {
  "claude-sonnet-5": { inputPerMillion: 3, outputPerMillion: 15 },
  "claude-opus-5": { inputPerMillion: 15, outputPerMillion: 75 },
  "claude-haiku-5": { inputPerMillion: 0.8, outputPerMillion: 4 },
  "gemini-flash-latest": { inputPerMillion: 0.3, outputPerMillion: 2.5 },
  "gemini-pro-latest": { inputPerMillion: 1.25, outputPerMillion: 10 },
};

// A model string that doesn't match any known rate (a newer model id, an
// alias this table hasn't been updated for) falls back to the nearest known
// tier's rate for its provider rather than silently reporting zero cost,
// which would misleadingly suggest the call was free.
const FALLBACK_RATE: ModelRate = { inputPerMillion: 3, outputPerMillion: 15 };

function findRate(model: string): ModelRate {
  if (RATES[model]) return RATES[model];
  const prefixMatch = Object.keys(RATES).find((known) => model.startsWith(known.split("-").slice(0, 2).join("-")));
  return prefixMatch ? RATES[prefixMatch] : FALLBACK_RATE;
}

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const rate = findRate(model);
  return (inputTokens / 1_000_000) * rate.inputPerMillion + (outputTokens / 1_000_000) * rate.outputPerMillion;
}
