/**
 * What the AI read on each sample page.
 *
 * These were recorded ahead of time: Claude (an AI model made by Anthropic)
 * was shown each page as a picture, the same picture the demo shows, and what
 * it read was written down here. The public demo replays these recordings
 * and never calls a model, which is why it needs no key and costs nothing to run.
 *
 * The recordings have not been tidied up afterwards. `raw` is the text as
 * printed, `value` is the tidied form (a date as a date, an amount as a number),
 * and `note` is something the reader thought a person should look at. There
 * are no confidence scores, because the reader did not produce any.
 */

export type DocKind = "invoice" | "receipt" | "w9";
export type FieldKind = "text" | "money" | "date";

export type RecordedField = {
  key: string;
  label: string;
  kind: FieldKind;
  value: string;
  /** The text on the page this was read from. Absent when the value is not printed anywhere. */
  raw?: string;
  /** Printed text next to it, to tell apart two places with the same text. */
  near?: string;
  page?: number;
  note?: string;
  /** True for a value the reader proposed instead of reading, such as a bookkeeping category. */
  suggested?: boolean;
};

export type Line = { description: string; qty: string; unitPrice: string; amount: string };
/** `raw` lists the printed pieces of the row in reading order, starting with the description. */
export type RecordedLine = Line & { raw: string[]; page?: number };

export type Recording = {
  kind: DocKind;
  title: string;
  fields: RecordedField[];
  lines: RecordedLine[];
  /** Things about the page as a whole that the reader flagged. */
  notes: string[];
};

const text = (key: string, label: string, value: string, more: Partial<RecordedField> = {}): RecordedField => ({ key, label, kind: "text", value, raw: value, ...more });
const money = (key: string, label: string, value: string, raw: string, near?: string, more: Partial<RecordedField> = {}): RecordedField => ({ key, label, kind: "money", value, raw, near, ...more });
const date = (key: string, label: string, value: string, raw: string, near?: string): RecordedField => ({ key, label, kind: "date", value, raw, near });
const category = (value: string): RecordedField => ({ key: "category", label: "Category", kind: "text", value, suggested: true });

const plain = (n: string) => n.replace(/,/g, "");
/** A table row printed as: description, quantity, [unit], unit price, amount. */
const row = (description: string, qty: string, unitPrice: string, amount: string, unit?: string, page?: number): RecordedLine => ({
  description,
  qty,
  unitPrice: plain(unitPrice),
  amount: plain(amount),
  raw: unit ? [description, qty, unit, unitPrice, amount] : [description, qty, unitPrice, amount],
  page,
});

const linenFields: RecordedField[] = [
  text("vendor", "Vendor", "Bellwether Linen Service"),
  text("number", "Invoice number", "BL-10772", { near: "Invoice no." }),
  date("date", "Invoice date", "2026-11-02", "November 2, 2026", "Invoice date"),
  date("due_date", "Due date", "2026-12-02", "December 2, 2026", "Due date"),
  text("terms", "Terms", "Net 30", { near: "Terms" }),
  text("bill_to", "Billed to", "Copper Kettle Cafe", { near: "Bill to" }),
  money("subtotal", "Subtotal", "170.00", "$170.00", "Subtotal"),
  money("tax", "Tax", "12.33", "$12.33", "Sales tax 7.25%"),
  money("total", "Total", "182.33", "$182.33", "Total due"),
  category("Linen and laundry"),
];
const linenLines = [
  row("Bib aprons, weekly service", "40", "0.85", "34.00"),
  row("Kitchen towels, weekly service", "200", "0.22", "44.00"),
  row("Table linens, weekly service", "60", "1.10", "66.00"),
  row("Entry floor mats", "4", "6.50", "26.00"),
];

export const RECORDINGS: Record<string, Recording> = {
  "produce-invoice": {
    kind: "invoice",
    title: "Marrowfield Produce Co.",
    fields: [
      text("vendor", "Vendor", "Marrowfield Produce Co."),
      text("number", "Invoice number", "MP-48213", { near: "Invoice no." }),
      date("date", "Invoice date", "2026-11-03", "November 3, 2026", "Invoice date"),
      date("due_date", "Due date", "2026-11-18", "November 18, 2026", "Due date"),
      text("terms", "Terms", "Net 15", { near: "Terms" }),
      text("bill_to", "Billed to", "Copper Kettle Cafe", { near: "Bill to" }),
      money("subtotal", "Subtotal", "453.95", "$453.95", "Subtotal"),
      money("tax", "Tax", "0.00", "$0.00", "Sales tax (food, exempt)"),
      money("total", "Total", "453.95", "$453.95", "Total due"),
      category("Food and ingredients"),
    ],
    lines: [
      row("Romaine hearts, case", "6", "28.50", "171.00"),
      row("Roma tomatoes, 25 lb", "4", "31.25", "125.00"),
      row("Yellow onions, 50 lb", "2", "22.00", "44.00"),
      row("Lemons, case", "1", "46.75", "46.75"),
      row("Fresh herbs, assorted", "3", "18.40", "55.20"),
      row("Delivery", "1", "12.00", "12.00"),
    ],
    notes: [],
  },

  "linen-invoice": { kind: "invoice", title: "Bellwether Linen Service", fields: linenFields, lines: linenLines, notes: [] },

  "linen-invoice-copy": {
    kind: "invoice",
    title: "Bellwether Linen Service",
    fields: linenFields,
    lines: linenLines,
    notes: ["The page is stamped SECOND NOTICE. It looks like another copy of an invoice that was already sent."],
  },

  "plumbing-invoice": {
    kind: "invoice",
    title: "Dry Creek Plumbing & Heating",
    fields: [
      text("vendor", "Vendor", "Dry Creek Plumbing & Heating"),
      text("number", "Invoice number", "2291", { near: "No." }),
      date("date", "Invoice date", "2026-11-05", "November 5, 2026", "DATE OF SERVICE"),
      { key: "due_date", label: "Due date", kind: "date", value: "" },
      text("terms", "Terms", "Due upon receipt", { near: "PAYMENT" }),
      text("bill_to", "Billed to", "Sagebrush Veterinary Clinic", { near: "CUSTOMER" }),
      money("subtotal", "Subtotal", "428.60", "428.60", "Subtotal", {
        note: "The three line amounts add up to 418.60, but the printed subtotal is 428.60. I have recorded what is printed.",
      }),
      money("tax", "Tax", "3.52", "3.52", "Tax (parts)"),
      money("total", "Total", "432.12", "$432.12", "TOTAL"),
      category("Repairs and maintenance"),
    ],
    lines: [
      row("Service call", "1", "95.00", "95.00"),
      row("Thermocouple, universal 24 in", "1", "48.60", "48.60"),
      row("Labor, hours", "2.5", "110.00", "275.00"),
    ],
    notes: [],
  },

  "lab-invoice": {
    kind: "invoice",
    title: "Kestrel Veterinary Diagnostics",
    fields: [
      text("vendor", "Vendor", "Kestrel Veterinary Diagnostics"),
      text("number", "Invoice number", "KVD-0093155", { near: "Invoice no." }),
      date("date", "Invoice date", "2026-11-06", "November 6, 2026", "Invoice date"),
      date("due_date", "Due date", "2026-11-21", "November 21, 2026", "Due date"),
      text("terms", "Terms", "Net 15", { near: "Terms" }),
      text("bill_to", "Billed to", "Sagebrush Veterinary Clinic", { near: "Bill to" }),
      money("subtotal", "Subtotal", "1057.00", "$1,057.00", "Subtotal"),
      money("tax", "Tax", "0.00", "$0.00", "Sales tax"),
      money("total", "Total", "1057.00", "$1,057.00", "Total due"),
      category("Laboratory fees"),
    ],
    lines: [
      row("Chemistry panel, comprehensive", "14", "38.00", "532.00"),
      row("Complete blood count", "14", "22.00", "308.00"),
      row("Histopathology, single site", "2", "96.00", "192.00"),
      row("Courier pickup, October", "1", "25.00", "25.00"),
    ],
    notes: [],
  },

  "lumber-invoice": {
    kind: "invoice",
    title: "Ponderosa Building Supply",
    fields: [
      text("vendor", "Vendor", "Ponderosa Building Supply"),
      text("number", "Invoice number", "771204", { near: "Invoice" }),
      date("date", "Invoice date", "2026-11-04", "11/04/2026", "Date"),
      date("due_date", "Due date", "2026-12-04", "12/04/2026", "Due"),
      text("terms", "Terms", "Net 30", { near: "Terms" }),
      text("po", "PO number", "3F-1188", { near: "Cust. PO" }),
      text("bill_to", "Billed to", "Three Forks Builders", { near: "SOLD TO" }),
      money("subtotal", "Subtotal", "8875.28", "8,875.28", "Merchandise", { page: 2 }),
      money("tax", "Tax", "643.46", "643.46", "Sales tax 7.25%", { page: 2 }),
      money("total", "Total", "9518.74", "$9,518.74", "INVOICE TOTAL", { page: 2 }),
      category("Job materials"),
    ],
    lines: [
      row("2x4x8 SPF stud", "240", "3.98", "955.20", "EA", 1),
      row("2x6x12 Douglas fir #2", "64", "11.42", "730.88", "EA", 1),
      row("2x10x16 Douglas fir #2", "28", "27.90", "781.20", "EA", 1),
      row("4x4x10 pressure treated post", "12", "19.75", "237.00", "EA", 1),
      row("7/16 OSB sheathing 4x8", "96", "13.60", "1,305.60", "SHT", 1),
      row("3/4 T&G plywood subfloor 4x8", "40", "38.25", "1,530.00", "SHT", 1),
      row("LVL beam 1-3/4 x 11-7/8 x 20 ft", "4", "186.00", "744.00", "EA", 1),
      row("Joist hanger 2x10", "60", "1.85", "111.00", "EA", 1),
      row("Hurricane tie H2.5A", "120", "0.92", "110.40", "EA", 1),
      row("16d framing nails 50 lb", "3", "64.00", "192.00", "BOX", 1),
      row("8d sinker nails 50 lb", "2", "61.50", "123.00", "BOX", 1),
      row("Construction adhesive 28 oz", "24", "7.15", "171.60", "TUBE", 1),
      row("House wrap 9 ft x 100 ft", "4", "142.00", "568.00", "ROLL", 1),
      row("Seam tape 3 in", "8", "11.25", "90.00", "ROLL", 1),
      row("Anchor bolt 1/2 x 10", "80", "1.40", "112.00", "EA", 2),
      row("Sill seal 5-1/2 in x 50 ft", "6", "8.90", "53.40", "ROLL", 2),
      row("Z-flashing 10 ft", "20", "6.35", "127.00", "EA", 2),
      row("Drip edge 10 ft white", "30", "5.80", "174.00", "EA", 2),
      row("Roofing felt #30", "10", "31.00", "310.00", "ROLL", 2),
      row("Ridge vent 4 ft", "12", "14.50", "174.00", "EA", 2),
      row("Delivery, boom truck", "1", "185.00", "185.00", "EA", 2),
      row("Pallet deposit", "6", "15.00", "90.00", "EA", 2),
    ],
    notes: [],
  },

  "concrete-invoice": {
    kind: "invoice",
    title: "Graniteview Ready Mix",
    fields: [
      text("vendor", "Vendor", "Graniteview Ready Mix"),
      text("number", "Invoice number", "GV-55820", { near: "Invoice no." }),
      date("date", "Invoice date", "2026-10-30", "October 30, 2026", "Invoice date"),
      date("due_date", "Due date", "2026-11-14", "November 14, 2026", "Due date"),
      text("terms", "Terms", "Net 15", { near: "Terms" }),
      text("po", "PO number", "3F-1179", { near: "P.O. number" }),
      text("bill_to", "Billed to", "Three Forks Builders", { near: "Bill to" }),
      money("subtotal", "Subtotal", "2846.00", "$2,846.00", "Subtotal"),
      money("tax", "Tax", "0.00", "$0.00", "Sales tax"),
      money("total", "Total", "2846.00", "$2,846.00", "Total due"),
      money("deposit", "Deposit paid", "1000.00", "$1,000.00", "Deposit pd 10/28", { note: "Handwritten: deposit paid 10/28 by check #2206." }),
      money("balance_due", "Balance due", "1846.00", "$1,846.00", "Bal due", {
        note: "Handwritten. The printed total is $2,846.00, and the note takes off a $1,000.00 deposit to leave $1,846.00.",
      }),
      category("Job materials"),
    ],
    lines: [
      row("4000 PSI concrete, per yard", "18", "142.00", "2,556.00"),
      row("Delivery, per load", "2", "95.00", "190.00"),
      row("Fuel surcharge", "1", "100.00", "100.00"),
    ],
    notes: [],
  },

  "hardware-receipt": {
    kind: "receipt",
    title: "Anvil & Oak Hardware",
    fields: [
      text("vendor", "Merchant", "Anvil & Oak Hardware", { raw: "ANVIL & OAK HARDWARE" }),
      text("number", "Transaction number", "048117", { near: "Trans" }),
      date("date", "Date", "2026-11-07", "11/07/2026"),
      money("subtotal", "Subtotal", "152.19", "152.19", "SUBTOTAL"),
      money("tax", "Tax", "11.03", "11.03", "TAX 7.25%"),
      money("total", "Total", "163.22", "163.22", "TOTAL"),
      text("paid_with", "Paid with", "Visa ending 4417", { raw: "VISA ************4417" }),
      text("memo", "Memo", "Job: Hollis addition", { raw: "PO/JOB: HOLLIS ADDITION" }),
      category("Job supplies"),
    ],
    lines: [
      { description: "Deck screw 3in 5lb", qty: "2", unitPrice: "34.99", amount: "69.98", raw: ["DECK SCREW 3IN 5LB", "2 @ 34.99", "69.98"] },
      { description: "Chalk line reel", qty: "1", unitPrice: "12.49", amount: "12.49", raw: ["CHALK LINE REEL", "12.49"] },
      { description: "Utility blades 50pk", qty: "1", unitPrice: "16.99", amount: "16.99", raw: ["UTILITY BLADES 50PK", "16.99"] },
      { description: "Caulk ext wht 10oz", qty: "6", unitPrice: "7.29", amount: "43.74", raw: ["CAULK EXT WHT 10OZ", "6 @ 7.29", "43.74"] },
      { description: "Safety glasses clr", qty: "1", unitPrice: "8.99", amount: "8.99", raw: ["SAFETY GLASSES CLR", "8.99"] },
    ],
    notes: [],
  },

  "lunch-receipt": {
    kind: "receipt",
    title: "Dos Hermanas Taqueria",
    fields: [
      text("vendor", "Merchant", "Dos Hermanas Taqueria", { raw: "DOS HERMANAS TAQUERIA" }),
      text("number", "Check number", "3308", { near: "Check" }),
      date("date", "Date", "2026-11-06", "Nov 6, 2026"),
      money("subtotal", "Subtotal", "64.50", "64.50", "Subtotal"),
      money("tax", "Tax", "5.00", "5.00", "Tax"),
      money("tip", "Tip", "12.00", "12.00", "Tip", { note: "Handwritten." }),
      money("total", "Total", "81.50", "81.50", "Total", { note: "Handwritten. The printed amount before the tip is 69.50." }),
      text("paid_with", "Paid with", "Mastercard ending 8802", { raw: "MASTERCARD ****8802" }),
      text("memo", "Memo", "5 guests", { raw: "Guests: 5" }),
      category("Meals"),
    ],
    lines: [
      { description: "Taco plate", qty: "3", unitPrice: "", amount: "35.25", raw: ["3 Taco plate", "35.25"] },
      { description: "Burrito verde", qty: "1", unitPrice: "", amount: "11.50", raw: ["1 Burrito verde", "11.50"] },
      { description: "Tortilla soup", qty: "1", unitPrice: "", amount: "7.75", raw: ["1 Tortilla soup", "7.75"] },
      { description: "Agua fresca", qty: "5", unitPrice: "", amount: "10.00", raw: ["5 Agua fresca", "10.00"] },
    ],
    notes: ["This is the merchant copy of a card slip. The tip and the total were written in by hand."],
  },

  "w9-kestrel": {
    kind: "w9",
    title: "Kestrel Veterinary Diagnostics, Inc.",
    fields: [
      text("name", "Name", "Kestrel Veterinary Diagnostics, Inc."),
      { key: "business_name", label: "Business name", kind: "text", value: "" },
      text("classification", "Tax classification", "C corporation", { near: "X" }),
      text("address", "Address", "5 Research Park Way, Suite 210"),
      text("city_state_zip", "City, state, ZIP", "Salt Lake City, UT 84108"),
      { key: "tin_type", label: "Tax ID type", kind: "text", value: "EIN", raw: "Employer identification number" },
      text("tin", "Tax ID", "00-4471209", { near: "Employer identification number" }),
      text("signed", "Signed", "Yes", { raw: "Marta Oyelaran" }),
      date("signature_date", "Date signed", "2026-11-02", "11/02/2026", "Date"),
    ],
    lines: [],
    notes: [],
  },

  "w9-farrow": {
    kind: "w9",
    title: "Farrow Sign Painting",
    fields: [
      text("name", "Name", "Lucinda Farrow"),
      text("business_name", "Business name", "Farrow Sign Painting"),
      text("classification", "Tax classification", "Individual/sole proprietor", { near: "X" }),
      text("address", "Address", "309 Tamarack Ave"),
      text("city_state_zip", "City, state, ZIP", "Ogden, UT 84403"),
      { key: "tin_type", label: "Tax ID type", kind: "text", value: "SSN", raw: "Social security number" },
      text("tin", "Tax ID", "000-48-217", { near: "Social security number", note: "Only eight digits are written. The last box is empty." }),
      text("signed", "Signed", "Yes", { raw: "Lucinda Farrow", near: "Signature of U.S. person" }),
      date("signature_date", "Date signed", "2026-11-04", "Nov 4, 2026", "Date"),
    ],
    lines: [],
    notes: ["The form was filled in by hand and photographed."],
  },

  "w9-ironwood": {
    kind: "w9",
    title: "Ironwood Fence & Gate LLC",
    fields: [
      text("name", "Name", "Ironwood Fence & Gate LLC"),
      { key: "business_name", label: "Business name", kind: "text", value: "" },
      text("classification", "Tax classification", "LLC", { near: "X" }),
      text("address", "Address", "1288 Old Mill Road"),
      text("city_state_zip", "City, state, ZIP", "Kaysville, UT 84037"),
      { key: "tin_type", label: "Tax ID type", kind: "text", value: "EIN", raw: "Employer identification number" },
      text("tin", "Tax ID", "00-7719034", { near: "Employer identification number" }),
      { key: "signed", label: "Signed", kind: "text", value: "No", note: "The signature line is blank." },
      { key: "signature_date", label: "Date signed", kind: "date", value: "", note: "No date is written." },
    ],
    lines: [],
    notes: [],
  },
};
