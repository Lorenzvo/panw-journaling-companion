import type { GuidedSessionQA, ParsedGuidedSession } from "./types";

export function parseGuidedSession(text: string): ParsedGuidedSession | null {
  const lines = (text ?? "").split("\n").map((l) => l.trimEnd());
  const header = (lines[0] ?? "").trim();
  const headerMatch = header.match(/^Guided Session\s*(?:—|-|:)\s*(.+)$/i);
  if (!headerMatch) return null;

  const modeTitle = (headerMatch[1] ?? "").trim();
  const qa: GuidedSessionQA[] = [];

  let i = 1;
  while (i < lines.length) {
    const line = (lines[i] ?? "").trim();
    const m = line.match(/^\d+\.\s+(.*)$/);
    if (!m) {
      i++;
      continue;
    }

    const q = m[1].trim();
    i++;
    const answerLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i] ?? "";
      const curTrim = cur.trim();
      if (!curTrim) {
        i++;
        break;
      }
      if (/^\d+\.\s+/.test(curTrim) || /^One-line takeaway:/i.test(curTrim)) break;
      answerLines.push(curTrim);
      i++;
    }

    const a = answerLines.join("\n").trim();
    if (q) qa.push({ q, a });
  }

  const takeawayIdx = lines.findIndex((l) => /^One-line takeaway:/i.test(l.trim()));
  const takeaway = takeawayIdx >= 0 ? (lines[takeawayIdx + 1] ?? "").trim() : undefined;

  return { modeTitle, qa, takeaway };
}
