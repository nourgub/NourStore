// Replaces blindly keeping only the first N characters of an uploaded
// curriculum/reference document — which silently drops the relevant section
// whenever it isn't near the very start of the file — with a lightweight,
// deterministic relevance-based chunk selection. No embeddings call (no
// extra cost, no network, fully offline and testable): the document is split
// into paragraph-ish chunks, each scored by how many of the requested
// topics/keywords it mentions, and the highest-scoring chunks are kept (in
// their original reading order) up to the character budget. When nothing in
// the document matches any keyword (empty topics, or a genuine mismatch),
// it falls back to the first `maxChars` characters — the same behavior the
// truncation it replaces always had — so this never does worse than before.

export interface ChunkSelectionOptions {
  maxChars: number;
  // Target size of each candidate chunk before scoring — small enough to
  // isolate a relevant paragraph from an irrelevant one, large enough to
  // keep each kept chunk coherent on its own.
  chunkSize?: number;
}

interface ScoredChunk {
  text: string;
  start: number;
  score: number;
}

function splitIntoChunks(text: string, chunkSize: number): { text: string; start: number }[] {
  // Prefer paragraph breaks as chunk boundaries where they exist, so a
  // selected chunk reads as a complete thought rather than a mid-sentence
  // fragment; falls back to a hard character split for text with no
  // paragraph structure at all (e.g. a single huge block from a PDF with no
  // preserved line breaks).
  const paragraphs = text.split(/\n{2,}/);
  if (paragraphs.length <= 1) {
    const chunks: { text: string; start: number }[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push({ text: text.slice(i, i + chunkSize), start: i });
    }
    return chunks;
  }

  const chunks: { text: string; start: number }[] = [];
  let buffer = "";
  let bufferStart = 0;
  let cursor = 0;
  for (const para of paragraphs) {
    if (buffer === "") bufferStart = cursor;
    buffer += (buffer ? "\n\n" : "") + para;
    cursor += para.length + 2;
    if (buffer.length >= chunkSize) {
      chunks.push({ text: buffer, start: bufferStart });
      buffer = "";
    }
  }
  if (buffer) chunks.push({ text: buffer, start: bufferStart });
  return chunks;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function scoreChunk(chunkText: string, keywords: string[]): number {
  const normalizedChunk = normalize(chunkText);
  let score = 0;
  for (const kw of keywords) {
    const needle = normalize(kw);
    if (!needle) continue;
    let fromIndex = 0;
    while (true) {
      const idx = normalizedChunk.indexOf(needle, fromIndex);
      if (idx === -1) break;
      score++;
      fromIndex = idx + needle.length;
    }
  }
  return score;
}

export function selectRelevantChunks(text: string, keywords: string[], options: ChunkSelectionOptions): string {
  const { maxChars, chunkSize = 1200 } = options;
  if (text.length <= maxChars) return text;

  const rawChunks = splitIntoChunks(text, chunkSize);
  const scored: ScoredChunk[] = rawChunks.map((c) => ({ ...c, score: scoreChunk(c.text, keywords) }));

  const anyMatch = scored.some((c) => c.score > 0);
  if (!anyMatch) {
    // No keyword signal at all — preserve the old, simple behavior exactly
    // rather than guessing: keep the document's opening.
    return text.slice(0, maxChars);
  }

  // Greedily take the highest-scoring chunks first until the budget is
  // used, then re-sort the kept set back into original document order so
  // the model reads a coherent (if non-contiguous) excerpt instead of
  // chunks shuffled by relevance rank.
  const ranked = [...scored].sort((a, b) => b.score - a.score || a.start - b.start);
  const kept: ScoredChunk[] = [];
  let used = 0;
  for (const chunk of ranked) {
    if (chunk.score === 0) break; // never pad with zero-relevance filler once real matches exist
    if (used + chunk.text.length > maxChars && kept.length > 0) continue;
    kept.push(chunk);
    used += chunk.text.length;
    if (used >= maxChars) break;
  }
  kept.sort((a, b) => a.start - b.start);

  return kept.map((c) => c.text.trim()).join("\n\n[...]\n\n");
}
