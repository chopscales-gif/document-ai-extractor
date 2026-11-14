import { describe, expect, it } from "vitest";
import { locate, type PageWords, type Word } from "./locate";

/** A page with one line of words per row of text, each word 0.1 wide. */
function page(...rows: string[]): PageWords {
  const words: Word[] = rows.flatMap((row, r) => row.split(" ").map((text, c): Word => [text, 0.1 + c * 0.12, 0.1 + r * 0.05, 0.1, 0.02]));
  return { width: 1700, height: 2200, words };
}

describe("locate", () => {
  it("finds text whatever the case, spacing or punctuation", () => {
    const [box] = locate(page("ANVIL & OAK HARDWARE", "Total due $1,057.00"), 1, "Anvil & Oak Hardware");
    expect(box).toMatchObject({ page: 1, x: 0.1, y: 0.1 });
    expect(box.w).toBeCloseTo(0.46);
    expect(locate(page("Total due $1,057.00"), 1, "1057.00")).toHaveLength(1);
  });

  it("puts together a number printed one digit to a box", () => {
    const [box] = locate(page("Employer identification number", "0 0 - 4 4 7 1 2 0 9"), 1, "00-4471209");
    expect(box.y).toBeCloseTo(0.15);
    expect(box.w).toBeCloseTo(0.1 + 9 * 0.12);
  });

  it("uses the label beside it to choose between two places with the same text", () => {
    const words = page("Subtotal $2,846.00", "Sales tax $0.00", "Total due $2,846.00");
    expect(locate(words, 1, "$2,846.00", "Subtotal")[0].y).toBeCloseTo(0.1);
    expect(locate(words, 1, "$2,846.00", "Total due")[0].y).toBeCloseTo(0.2);
    expect(locate(words, 1, "$2,846.00")[0].y).toBeCloseTo(0.1);
  });

  it("does not match part of a word", () => {
    expect(locate(page("SUBTOTAL 152.19"), 1, "TOTAL")).toEqual([]);
  });

  it("gives one box per printed line when the text wraps", () => {
    expect(locate(page("5 Research Park", "Way, Suite 210"), 2, "5 Research Park Way, Suite 210").map((box) => box.page)).toEqual([2, 2]);
  });

  it("returns nothing for text that is not on the page", () => {
    expect(locate(page("Invoice no. 2291"), 1, "2292")).toEqual([]);
    expect(locate(page("Invoice no. 2291"), 1, "")).toEqual([]);
  });
});
