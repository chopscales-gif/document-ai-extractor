/**
 * Finds where on the page a piece of recorded text was printed.
 *
 * The AI reading gives the text; the positions come from the sample pages
 * themselves, whose word positions were saved when they were drawn. In a real
 * build the same positions come from the text-recognition step.
 */

/** One printed word: text, then left, top, width and height as fractions of the page. */
export type Word = [text: string, x: number, y: number, w: number, h: number];
export type PageWords = { width: number; height: number; words: Word[] };
/** A rectangle on a page, as fractions of the page. Pages are numbered from 1. */
export type Box = { page: number; x: number; y: number; w: number; h: number };

const norm = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Every run of consecutive words that spells out `text`, ignoring case, spacing and punctuation. */
function runs(words: Word[], text: string): Word[][] {
  const target = norm(text);
  const found: Word[][] = [];
  if (!target) return found;
  for (let start = 0; start < words.length; start++) {
    if (!norm(words[start][0])) continue;
    let spelled = "";
    for (let end = start; end < words.length; end++) {
      spelled += norm(words[end][0]);
      if (!target.startsWith(spelled)) break;
      if (spelled === target) {
        found.push(words.slice(start, end + 1));
        break;
      }
    }
  }
  return found;
}

const centre = (run: Word[]) => {
  const first = run[0];
  const last = run[run.length - 1];
  return { x: (first[1] + last[1] + last[3]) / 2, y: (first[2] + last[2] + last[4]) / 2 };
};

/** One box per printed line of the run, so text that wraps is not covered by one big rectangle. */
function boxes(run: Word[], page: number): Box[] {
  const out: Box[] = [];
  for (const [text, x, y, w, h] of run) {
    if (!norm(text)) continue;
    const last = out[out.length - 1];
    const sameLine = last && y < last.y + last.h && y + h > last.y && x >= last.x;
    if (sameLine) {
      const right = Math.max(last.x + last.w, x + w);
      const bottom = Math.max(last.y + last.h, y + h);
      last.y = Math.min(last.y, y);
      last.w = right - last.x;
      last.h = bottom - last.y;
    } else out.push({ page, x, y, w, h });
  }
  return out;
}

/**
 * Where `raw` is printed on the page. When the same text appears more than
 * once, `near` (a label printed beside the right one) picks between them;
 * without it the first is used. Returns no boxes when the text is not found.
 */
export function locate(pageWords: PageWords, page: number, raw: string, near?: string): Box[] {
  const candidates = runs(pageWords.words, raw);
  if (!candidates.length) return [];
  if (candidates.length === 1 || !near) return boxes(candidates[0], page);

  const anchors = runs(pageWords.words, near).map(centre);
  if (!anchors.length) return boxes(candidates[0], page);
  // Pages are taller than they are wide, and a label sits on the same line as its value far more often than above it.
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, (a.y - b.y) * 4);
  let best = candidates[0];
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const at = centre(candidate);
    const d = Math.min(...anchors.map((anchor) => distance(anchor, at)));
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return boxes(best, page);
}
