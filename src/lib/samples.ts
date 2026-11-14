/**
 * The fictional firm, its clients, and the sample documents in the order they
 * arrived. Everything here is invented.
 */

export const FIRM = { name: "Wren & Abacus Bookkeeping", town: "Ogden, Utah" };

export type Sample = {
  /** Names the page images, the saved word positions and the recorded reading. */
  key: string;
  client: string;
  pages: number;
  /** How the document reached the firm. */
  source: string;
  received: string;
};

export const SAMPLES: Sample[] = [
  { key: "produce-invoice", client: "Copper Kettle Cafe", pages: 1, source: "Emailed by the vendor", received: "Mon, Nov 9" },
  { key: "linen-invoice", client: "Copper Kettle Cafe", pages: 1, source: "Emailed by the vendor", received: "Mon, Nov 9" },
  { key: "lab-invoice", client: "Sagebrush Veterinary Clinic", pages: 1, source: "Emailed by the vendor", received: "Mon, Nov 9" },
  { key: "w9-kestrel", client: "Sagebrush Veterinary Clinic", pages: 1, source: "Uploaded by the client", received: "Mon, Nov 9" },
  { key: "plumbing-invoice", client: "Sagebrush Veterinary Clinic", pages: 1, source: "Uploaded by the client", received: "Mon, Nov 9" },
  { key: "lumber-invoice", client: "Three Forks Builders", pages: 2, source: "Emailed by the vendor", received: "Mon, Nov 9" },
  { key: "concrete-invoice", client: "Three Forks Builders", pages: 1, source: "Scanned at the client's office", received: "Tue, Nov 10" },
  { key: "hardware-receipt", client: "Three Forks Builders", pages: 1, source: "Photo from a phone", received: "Tue, Nov 10" },
  { key: "lunch-receipt", client: "Sagebrush Veterinary Clinic", pages: 1, source: "Photo from a phone", received: "Tue, Nov 10" },
  { key: "w9-farrow", client: "Copper Kettle Cafe", pages: 1, source: "Photo from a phone", received: "Tue, Nov 10" },
  { key: "w9-ironwood", client: "Three Forks Builders", pages: 1, source: "Uploaded by the client", received: "Tue, Nov 10" },
  { key: "linen-invoice-copy", client: "Copper Kettle Cafe", pages: 1, source: "Scanned at the client's office", received: "Tue, Nov 10" },
];

export const SAMPLE_BY_KEY: Record<string, Sample> = Object.fromEntries(SAMPLES.map((sample) => [sample.key, sample]));

/** Vendors each client already pays. A bill from anyone else is flagged until someone adds them. */
export const VENDORS_ON_FILE: Record<string, string[]> = {
  "Copper Kettle Cafe": ["Marrowfield Produce Co.", "Bellwether Linen Service"],
  "Sagebrush Veterinary Clinic": ["Dry Creek Plumbing & Heating"],
  "Three Forks Builders": ["Ponderosa Building Supply", "Graniteview Ready Mix"],
};

export const KIND_LABEL = { invoice: "Invoice", receipt: "Receipt", w9: "W-9" } as const;

export const pageImage = (key: string, page: number) => `/samples/${key}-${page}.jpg`;
