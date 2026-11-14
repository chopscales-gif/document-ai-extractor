import { describe, expect, it } from "vitest";
import { RECORDINGS } from "@/data/recordings";
import { WORDS } from "@/data/words";
import { assess, type DocState } from "./assess";
import { locate } from "./locate";
import { SAMPLES, VENDORS_ON_FILE } from "./samples";

/** The recorded readings, the saved pages and the checks, taken together as the inbox a visitor first sees. */

const docs: DocState[] = SAMPLES.map((sample, position) => ({
  key: sample.key,
  position,
  status: "needs_review",
  values: Object.fromEntries(RECORDINGS[sample.key].fields.map((field) => [field.key, field.value])),
}));
const onFile = Object.entries(VENDORS_ON_FILE).flatMap(([client, names]) => names.map((name) => ({ client, name })));
const problems = (key: string) => assess(docs.find((doc) => doc.key === key)!, docs, onFile).failed.map((check) => check.key);

describe("every sample", () => {
  it("has a recording and saved word positions for each of its pages", () => {
    for (const sample of SAMPLES) {
      expect(RECORDINGS[sample.key], sample.key).toBeDefined();
      expect(WORDS[sample.key].pages, sample.key).toHaveLength(sample.pages);
    }
    expect(Object.keys(RECORDINGS).sort()).toEqual(SAMPLES.map((sample) => sample.key).sort());
  });

  it("has every value that was read from the page found on that page", () => {
    for (const sample of SAMPLES) {
      const { pages } = WORDS[sample.key];
      for (const field of RECORDINGS[sample.key].fields) {
        if (!field.raw) continue;
        const page = field.page ?? 1;
        expect(locate(pages[page - 1], page, field.raw, field.near), `${sample.key} ${field.key}`).not.toHaveLength(0);
      }
      for (const line of RECORDINGS[sample.key].lines) {
        const page = line.page ?? 1;
        expect(locate(pages[page - 1], page, line.raw.join(" ")), `${sample.key} ${line.description}`).not.toHaveLength(0);
      }
    }
  });
});

describe("the starting inbox", () => {
  it("has five documents that pass everything and were not flagged", () => {
    const clean = docs.filter((doc) => assess(doc, docs, onFile).clean).map((doc) => doc.key);
    expect(clean).toEqual(["produce-invoice", "linen-invoice", "w9-kestrel", "lumber-invoice", "hardware-receipt"]);
  });

  it("catches the plumber's subtotal, which is 10.00 more than the lines", () => {
    expect(problems("plumbing-invoice")).toEqual(["lines_sum"]);
    const [check] = assess(docs.find((doc) => doc.key === "plumbing-invoice")!, docs, onFile).failed;
    expect(check.detail).toBe("The lines add up to 418.60. The subtotal says 428.60, a difference of 10.00.");
  });

  it("flags the second copy of the linen invoice, and not the first", () => {
    expect(problems("linen-invoice")).toEqual([]);
    expect(problems("linen-invoice-copy")).toEqual(["duplicate"]);
  });

  it("stops flagging the copy once the first one is rejected", () => {
    const rejected = docs.map((doc) => (doc.key === "linen-invoice" ? { ...doc, status: "rejected" } : doc));
    expect(assess(rejected.find((doc) => doc.key === "linen-invoice-copy")!, rejected, onFile).failed).toEqual([]);
  });

  it("flags the lab, which this client has not paid before", () => {
    expect(problems("lab-invoice")).toEqual(["vendor"]);
  });

  it("flags the short tax ID and the unsigned form", () => {
    expect(problems("w9-farrow")).toEqual(["tin"]);
    expect(problems("w9-ironwood")).toEqual(["signed", "dated"]);
  });

  it("passes the arithmetic on the handwritten ones, but holds them for a person because the AI left notes", () => {
    for (const key of ["concrete-invoice", "lunch-receipt"]) {
      const result = assess(docs.find((doc) => doc.key === key)!, docs, onFile);
      expect(result.failed, key).toEqual([]);
      expect(result.notes.length, key).toBeGreaterThan(0);
      expect(result.clean, key).toBe(false);
    }
  });
});
