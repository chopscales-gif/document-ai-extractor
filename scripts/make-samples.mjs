/**
 * Draws the sample documents. Run with `node scripts/make-samples.mjs` (needs Google Chrome).
 *
 * Each document is laid out as a web page and photographed by a headless
 * browser, so the result is a picture of a page, like a scan. Two things are saved:
 *
 *   public/samples/<key>-<page>.jpg   the picture the demo shows, and the only thing the AI was given
 *   src/data/words/<key>.json         where every printed word sits on each page
 *
 * The word positions play the part of the text layer an OCR step would give a
 * real installation. The demo uses them to highlight where a value came from.
 * Every business, person and number below is invented.
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9341;

const money = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd = (n) => `$${money(n)}`;
const round = (n) => Math.round(n * 100) / 100;
const sum = (lines) => round(lines.reduce((total, [, qty, , price]) => total + round(qty * price), 0));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

/* ---------- shared page furniture ---------- */

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; }
  html, body { background: #fff; }
  #page { position: relative; width: 850px; height: 1100px; overflow: hidden; background: #fff; }
  .sheet { position: absolute; inset: 0; padding: 64px 68px; font: 13px/1.45 "Helvetica Neue", Helvetica, Arial, sans-serif; color: #16181d; background: #fff; }
  table { border-collapse: collapse; width: 100%; }
  .r { text-align: right; }
  .hand { font-family: "Bradley Hand", "Noteworthy", cursive; color: #1c3f94; font-weight: 700; }
  /* A page that has been through a scanner or a phone camera. */
  .scanned { background: #54585c; }
  .scanned .sheet { filter: grayscale(1) contrast(1.12) brightness(0.985) blur(0.45px); background: #f4f2ec; box-shadow: 0 0 40px rgba(0,0,0,.5); }
  .grain { position: absolute; inset: 0; opacity: .16; pointer-events: none; mix-blend-mode: multiply; }
`;

const GRAIN = `<svg class="grain" data-skip xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .9 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;

const page = ({ css = "", body, scanned = false, tilt = 0, shrink = 1, width = 850, height = 1100 }) => `<!doctype html><meta charset="utf-8"><style>${BASE_CSS}
  #page { width: ${width}px; height: ${height}px; }
  ${scanned ? `.sheet { transform: rotate(${tilt}deg) scale(${shrink}); }` : ""}
  ${css}</style><div id="page" class="${scanned ? "scanned" : ""}"><div class="sheet">${body}</div>${scanned ? GRAIN : ""}</div>`;

const lineRows = (lines, unitColumn = false) =>
  lines
    .map(
      ([description, qty, unit, price]) =>
        `<tr><td>${esc(description)}</td><td class="r">${qty}</td>${unitColumn ? `<td>${unit}</td>` : ""}<td class="r">${money(price)}</td><td class="r">${money(round(qty * price))}</td></tr>`,
    )
    .join("");

/* ---------- invoices ---------- */

/** A plain, well-made invoice: letterhead left, details right, totals at the foot of the table. */
function classicInvoice(d) {
  const subtotal = d.subtotal ?? sum(d.lines);
  const tax = d.tax ?? 0;
  const total = d.total ?? round(subtotal + tax);
  return page({
    scanned: d.scanned,
    tilt: d.tilt,
    shrink: d.shrink,
    css: `
      h1 { font: 700 30px/1 Georgia, serif; letter-spacing: .5px; color: ${d.color}; }
      .from { font-size: 12px; color: #444; margin-top: 8px; }
      .top { display: flex; justify-content: space-between; align-items: flex-start; }
      .title { font: 700 26px/1 "Helvetica Neue", sans-serif; letter-spacing: 3px; color: #222; text-align: right; }
      .meta { margin-top: 14px; font-size: 13px; }
      .meta td { padding: 2px 0 2px 18px; }
      .meta td:first-child { color: #555; text-align: right; }
      .meta td:last-child { text-align: right; font-weight: 600; }
      .parties { display: flex; gap: 60px; margin: 38px 0 26px; }
      .parties h2 { font-size: 11px; font-weight: 700; color: ${d.color}; margin-bottom: 4px; }
      .items th { background: ${d.color}; color: #fff; text-align: left; font-size: 12px; padding: 7px 10px; }
      .items th.r { text-align: right; }
      .items td { padding: 7px 10px; border-bottom: 1px solid #dcdcdc; }
      .totals { width: 300px; margin: 14px 0 0 auto; }
      .totals td { padding: 5px 10px; }
      .totals tr:last-child td { font-weight: 700; font-size: 15px; border-top: 2px solid #222; }
      .foot { position: absolute; left: 68px; right: 68px; bottom: 60px; font-size: 11.5px; color: #555; border-top: 1px solid #ccc; padding-top: 10px; }
      .stamp { position: absolute; top: 250px; right: 90px; transform: rotate(-14deg); border: 4px solid #a32a2a; color: #a32a2a; font: 700 30px/1 "Arial Narrow", Arial, sans-serif; letter-spacing: 4px; padding: 8px 16px; opacity: .72; }
      .note { position: absolute; }
    `,
    body: `
      <div class="top">
        <div><h1>${esc(d.vendor)}</h1><div class="from">${d.vendorAddress.map(esc).join("<br>")}</div></div>
        <div><div class="title">INVOICE</div>
          <table class="meta">
            <tr><td>Invoice no.</td><td>${d.number}</td></tr>
            <tr><td>Invoice date</td><td>${d.date}</td></tr>
            ${d.po ? `<tr><td>P.O. number</td><td>${d.po}</td></tr>` : ""}
            <tr><td>Terms</td><td>${d.terms}</td></tr>
            <tr><td>Due date</td><td>${d.due}</td></tr>
          </table></div>
      </div>
      <div class="parties">
        <div><h2>Bill to</h2>${d.billTo.map(esc).join("<br>")}</div>
        ${d.shipTo ? `<div><h2>Deliver to</h2>${d.shipTo.map(esc).join("<br>")}</div>` : ""}
      </div>
      <table class="items"><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr>${lineRows(d.lines)}</table>
      <table class="totals">
        <tr><td>Subtotal</td><td class="r">${usd(subtotal)}</td></tr>
        <tr><td>${d.taxLabel ?? "Sales tax"}</td><td class="r">${usd(tax)}</td></tr>
        <tr><td>Total due</td><td class="r">${usd(total)}</td></tr>
      </table>
      ${d.stamp ? `<div class="stamp">${d.stamp}</div>` : ""}
      ${d.extra ?? ""}
      <div class="foot">${esc(d.foot)}</div>`,
  });
}

/** A service company's invoice: boxed header, a job description, typewriter numbers. */
function serviceInvoice(d) {
  return page({
    css: `
      .sheet { font: 13px/1.5 Arial, sans-serif; }
      .head { border: 2px solid #1d1d1d; padding: 14px 18px; display: flex; justify-content: space-between; }
      .head b.name { font-size: 22px; display: block; }
      .head .lic { font-size: 11px; color: #444; }
      .no { text-align: right; font-size: 13px; }
      .no b { font: 700 22px/1.2 "Courier New", monospace; color: #b3261e; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; border: 2px solid #1d1d1d; border-top: 0; }
      .grid div { padding: 10px 18px; }
      .grid div + div { border-left: 2px solid #1d1d1d; }
      .lbl { font-size: 10.5px; font-weight: 700; color: #555; display: block; }
      .job { margin: 22px 0 8px; font-size: 12.5px; }
      .items th { border-bottom: 2px solid #1d1d1d; text-align: left; padding: 6px 8px; font-size: 12px; }
      .items th.r { text-align: right; }
      .items td { padding: 8px; border-bottom: 1px dotted #999; font-family: "Courier New", monospace; font-size: 13.5px; }
      .totals { width: 280px; margin: 16px 0 0 auto; font-family: "Courier New", monospace; font-size: 14px; }
      .totals td { padding: 4px 8px; }
      .totals tr:last-child td { font-weight: 700; border-top: 2px solid #1d1d1d; border-bottom: 2px solid #1d1d1d; }
      .foot { margin-top: 44px; font-size: 11.5px; color: #444; }
    `,
    body: `
      <div class="head">
        <div><b class="name">${esc(d.vendor)}</b>${d.vendorAddress.map(esc).join(" &nbsp;|&nbsp; ")}<div class="lic">${esc(d.license)}</div></div>
        <div class="no">INVOICE<br><b>No. ${d.number}</b></div>
      </div>
      <div class="grid">
        <div><span class="lbl">CUSTOMER</span>${d.billTo.map(esc).join("<br>")}</div>
        <div><span class="lbl">DATE OF SERVICE</span>${d.date}<br><span class="lbl" style="margin-top:8px">PAYMENT</span>${d.terms}</div>
      </div>
      <p class="job"><b>Work performed:</b> ${esc(d.job)}</p>
      <table class="items"><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>${lineRows(d.lines)}</table>
      <table class="totals">
        <tr><td>Subtotal</td><td class="r">${money(d.subtotal)}</td></tr>
        <tr><td>Tax (parts)</td><td class="r">${money(d.tax)}</td></tr>
        <tr><td>TOTAL</td><td class="r">${usd(d.total)}</td></tr>
      </table>
      <p class="foot">${esc(d.foot)}</p>`,
  });
}

/** A supplier's long invoice that runs onto a second sheet. */
function supplyInvoice(d, pageNo) {
  const first = pageNo === 1;
  const lines = first ? d.lines.slice(0, d.split) : d.lines.slice(d.split);
  const subtotal = sum(d.lines);
  const tax = round(subtotal * d.taxRate);
  return page({
    css: `
      .sheet { padding: 50px 56px; font: 12px/1.4 Arial, sans-serif; }
      .bar { background: #20412f; color: #fff; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; }
      .bar b { font: 700 22px/1 Georgia, serif; }
      .sub { display: flex; justify-content: space-between; font-size: 11.5px; color: #333; padding: 8px 2px 14px; border-bottom: 1px solid #999; }
      .boxes { display: grid; grid-template-columns: 1.2fr 1.2fr 1fr; gap: 14px; margin: 16px 0; }
      .boxes > div { border: 1px solid #999; padding: 8px 10px; min-height: 86px; }
      .boxes h2 { font-size: 10px; color: #20412f; margin-bottom: 3px; }
      .kv td { padding: 1px 0; } .kv td:last-child { text-align: right; font-weight: 700; }
      .items th { background: #e6ebe7; border: 1px solid #999; text-align: left; padding: 5px 7px; font-size: 11px; }
      .items th.r { text-align: right; }
      .items td { border-left: 1px solid #999; border-right: 1px solid #999; padding: 5px 7px; }
      .items tr:last-child td { border-bottom: 1px solid #999; }
      .items tr:nth-child(odd) td { background: #f6f8f6; }
      .cont { text-align: right; font-style: italic; margin-top: 10px; color: #333; }
      .totals { width: 290px; margin: 14px 0 0 auto; }
      .totals td { padding: 4px 8px; border: 1px solid #999; }
      .totals tr:last-child td { font-weight: 700; font-size: 14px; background: #e6ebe7; }
      .foot { position: absolute; left: 56px; right: 56px; bottom: 44px; font-size: 10.5px; color: #444; display: flex; justify-content: space-between; border-top: 1px solid #999; padding-top: 8px; }
    `,
    body: `
      <div class="bar"><b>${esc(d.vendor)}</b><span>INVOICE ${d.number}</span></div>
      <div class="sub"><span>${d.vendorAddress.map(esc).join(" &nbsp;&bull;&nbsp; ")}</span><span>Page ${pageNo} of 2</span></div>
      ${
        first
          ? `<div class="boxes">
        <div><h2>SOLD TO</h2>${d.billTo.map(esc).join("<br>")}</div>
        <div><h2>JOB SITE</h2>${d.shipTo.map(esc).join("<br>")}</div>
        <div><table class="kv">
          <tr><td>Invoice</td><td>${d.number}</td></tr>
          <tr><td>Date</td><td>${d.date}</td></tr>
          <tr><td>Cust. PO</td><td>${d.po}</td></tr>
          <tr><td>Terms</td><td>${d.terms}</td></tr>
          <tr><td>Due</td><td>${d.due}</td></tr>
        </table></div></div>`
          : `<p style="margin:16px 0 12px">Invoice ${d.number} dated ${d.date}, continued. Sold to ${esc(d.billTo[0])}.</p>`
      }
      <table class="items"><tr><th>Description</th><th class="r">Qty</th><th>U/M</th><th class="r">Price</th><th class="r">Extension</th></tr>${lineRows(lines, true)}</table>
      ${
        first
          ? `<p class="cont">Continued on page 2</p>`
          : `<table class="totals">
        <tr><td>Merchandise</td><td class="r">${money(subtotal)}</td></tr>
        <tr><td>Sales tax ${(d.taxRate * 100).toFixed(2)}%</td><td class="r">${money(tax)}</td></tr>
        <tr><td>INVOICE TOTAL</td><td class="r">${usd(round(subtotal + tax))}</td></tr>
      </table>`
      }
      <div class="foot"><span>${esc(d.foot)}</span><span>Thank you for your business</span></div>`,
  });
}

/* ---------- receipts ---------- */

function receipt(d) {
  return page({
    width: 440,
    height: d.height,
    scanned: true,
    tilt: d.tilt,
    shrink: 0.9,
    css: `
      .sheet { padding: 34px 30px; font: 15px/1.5 "Courier New", monospace; color: #2a2a2a; background: #f7f5ef !important; }
      .c { text-align: center; }
      .big { font-size: 20px; font-weight: 700; }
      hr { border: 0; border-top: 1px dashed #555; margin: 10px 0; }
      .row { display: flex; justify-content: space-between; gap: 10px; }
      .fade { opacity: ${d.fade ?? 1}; }
      .hand { font-size: 24px; }
      .write { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #333; margin-top: 16px; height: 38px; }
    `,
    body: d.body,
  });
}

/* ---------- W-9 ---------- */

/** Not the real IRS form: a simplified layout with the same boxes, marked as a sample. */
function w9(d) {
  const box = (on) => `<span class="cb">${on ? "X" : ""}</span>`;
  const kinds = ["Individual/sole proprietor", "C corporation", "S corporation", "Partnership", "Trust/estate", "LLC"];
  const tinBoxes = (digits, groups) => {
    let at = 0;
    return groups.map((n) => `<span class="tin">${Array.from({ length: n }, () => `<i>${digits[at++] ?? ""}</i>`).join("")}</span>`).join(`<b class="dash">-</b>`);
  };
  return page({
    scanned: d.scanned,
    tilt: d.tilt,
    shrink: d.shrink,
    css: `
      .sheet { padding: 48px 54px; font: 12px/1.4 Arial, sans-serif; }
      .hd { display: grid; grid-template-columns: 150px 1fr 170px; border-bottom: 3px solid #000; }
      .hd > div { padding: 6px 10px; }
      .hd .form b { font: 700 34px/1 Arial, sans-serif; }
      .hd .mid { text-align: center; border-left: 2px solid #000; border-right: 2px solid #000; }
      .hd .mid b { font-size: 19px; display: block; }
      .sample { font-size: 10.5px; color: #333; }
      .f { border-bottom: 1px solid #000; padding: 5px 8px 7px; min-height: 50px; }
      .f small { display: block; font-size: 10.5px; color: #222; }
      .v { font: 16px/1.3 "Courier New", monospace; font-weight: 700; padding-top: 4px; display: block; }
      .hand.v { font: 700 21px/1.2 "Bradley Hand", "Noteworthy", cursive; }
      .cb { display: inline-block; width: 13px; height: 13px; border: 1.5px solid #000; margin: 0 5px 0 0; vertical-align: -2px; font: 700 12px/11px Arial; text-align: center; }
      .kinds { display: flex; flex-wrap: wrap; gap: 6px 18px; padding-top: 5px; }
      .part { background: #000; color: #fff; font-weight: 700; padding: 3px 8px; margin-top: 16px; display: flex; gap: 14px; }
      .tinrow { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; padding: 12px 8px; border-bottom: 1px solid #000; }
      .tin i { display: inline-block; vertical-align: top; width: 24px; height: 30px; border: 1px solid #000; margin-right: -1px; font: 700 19px/28px "Courier New", monospace; font-style: normal; text-align: center; }
      .dash { padding: 0 6px; font-size: 18px; }
      .cert { font-size: 10.8px; padding: 8px; }
      .sign { display: grid; grid-template-columns: 90px 1fr 220px; border-top: 2px solid #000; border-bottom: 2px solid #000; margin-top: 6px; }
      .sign > div { padding: 8px; min-height: 62px; }
      .sign .lbl { font-weight: 700; font-size: 15px; }
      .sig { font: 700 30px/1 "Snell Roundhand", "Bradley Hand", cursive; color: #1c2f7a; display: block; padding-top: 4px; }
      .date { font: 700 21px/1.2 "Bradley Hand", cursive; color: #1c2f7a; }
    `,
    body: `
      <div class="hd">
        <div class="form">Form <b>W-9</b><div class="sample">Sample layout for a demonstration. Not an official form.</div></div>
        <div class="mid"><b>Request for Taxpayer Identification Number and Certification</b></div>
        <div>Give this form to the requester. Do not send it to the tax authority.</div>
      </div>
      <div class="f"><small><b>1</b> Name of entity or individual (as shown on your income tax return)</small><span class="v ${d.hand ? "hand" : ""}">${esc(d.name)}</span></div>
      <div class="f"><small><b>2</b> Business name, if different from above</small><span class="v ${d.hand ? "hand" : ""}">${esc(d.business ?? "")}</span></div>
      <div class="f"><small><b>3</b> Federal tax classification. Check only one box.</small>
        <div class="kinds">${kinds.map((k) => `<span>${box(k === d.kind)}${k}</span>`).join("")}</div></div>
      <div class="f"><small><b>5</b> Address (number, street, and apt. or suite no.)</small><span class="v ${d.hand ? "hand" : ""}">${esc(d.street)}</span></div>
      <div class="f"><small><b>6</b> City, state, and ZIP code</small><span class="v ${d.hand ? "hand" : ""}">${esc(d.city)}</span></div>
      <div class="part"><span>Part I</span><span>Taxpayer Identification Number (TIN)</span></div>
      <div class="tinrow">
        <div><small>Social security number</small><div style="margin-top:6px">${tinBoxes(d.ssn ?? "", [3, 2, 4])}</div></div>
        <div><small>Employer identification number</small><div style="margin-top:6px">${tinBoxes(d.ein ?? "", [2, 7])}</div></div>
      </div>
      <div class="part"><span>Part II</span><span>Certification</span></div>
      <p class="cert">Under penalties of perjury, I certify that the number shown on this form is my correct taxpayer identification number, that I am not subject to backup withholding, and that I am a U.S. citizen or other U.S. person.</p>
      <div class="sign">
        <div class="lbl">Sign<br>Here</div>
        <div><small>Signature of U.S. person</small><span class="sig">${esc(d.signature ?? "")}</span></div>
        <div><small>Date</small> <span class="date">${esc(d.signed ?? "")}</span></div>
      </div>`,
  });
}

/* ---------- the documents ---------- */

const linen = {
  vendor: "Bellwether Linen Service",
  vendorAddress: ["2210 Foundry Row", "Ogden, UT 84401", "(801) 555-0164  billing@bellwetherlinen.example"],
  color: "#2a4d7a",
  number: "BL-10772",
  date: "November 2, 2026",
  due: "December 2, 2026",
  terms: "Net 30",
  billTo: ["Copper Kettle Cafe", "418 Larch Street", "Ogden, UT 84401"],
  lines: [
    ["Bib aprons, weekly service", 40, "ea", 0.85],
    ["Kitchen towels, weekly service", 200, "ea", 0.22],
    ["Table linens, weekly service", 60, "ea", 1.1],
    ["Entry floor mats", 4, "ea", 6.5],
  ],
  tax: 12.33,
  taxLabel: "Sales tax 7.25%",
  foot: "Please include the invoice number with your payment. A late fee of 1.5% per month applies to balances past due.",
};

const lumberLines = [
  ["2x4x8 SPF stud", 240, "EA", 3.98],
  ["2x6x12 Douglas fir #2", 64, "EA", 11.42],
  ["2x10x16 Douglas fir #2", 28, "EA", 27.9],
  ["4x4x10 pressure treated post", 12, "EA", 19.75],
  ["7/16 OSB sheathing 4x8", 96, "SHT", 13.6],
  ["3/4 T&G plywood subfloor 4x8", 40, "SHT", 38.25],
  ["LVL beam 1-3/4 x 11-7/8 x 20 ft", 4, "EA", 186.0],
  ["Joist hanger 2x10", 60, "EA", 1.85],
  ["Hurricane tie H2.5A", 120, "EA", 0.92],
  ["16d framing nails 50 lb", 3, "BOX", 64.0],
  ["8d sinker nails 50 lb", 2, "BOX", 61.5],
  ["Construction adhesive 28 oz", 24, "TUBE", 7.15],
  ["House wrap 9 ft x 100 ft", 4, "ROLL", 142.0],
  ["Seam tape 3 in", 8, "ROLL", 11.25],
  ["Anchor bolt 1/2 x 10", 80, "EA", 1.4],
  ["Sill seal 5-1/2 in x 50 ft", 6, "ROLL", 8.9],
  ["Z-flashing 10 ft", 20, "EA", 6.35],
  ["Drip edge 10 ft white", 30, "EA", 5.8],
  ["Roofing felt #30", 10, "ROLL", 31.0],
  ["Ridge vent 4 ft", 12, "EA", 14.5],
  ["Delivery, boom truck", 1, "EA", 185.0],
  ["Pallet deposit", 6, "EA", 15.0],
];
const lumber = {
  vendor: "Ponderosa Building Supply",
  vendorAddress: ["900 Millrace Road, Layton, UT 84041", "(801) 555-0127", "ar@ponderosasupply.example"],
  number: "771204",
  date: "11/04/2026",
  due: "12/04/2026",
  po: "3F-1188",
  terms: "Net 30",
  billTo: ["Three Forks Builders", "77 Quarry Lane", "Layton, UT 84041"],
  shipTo: ["Hollis residence addition", "1420 Bitterroot Circle", "Kaysville, UT 84037"],
  lines: lumberLines,
  split: 14,
  taxRate: 0.0725,
  foot: "Returns within 30 days with this invoice. Special orders are not returnable.",
};

const DOCUMENTS = {
  "produce-invoice": [
    classicInvoice({
      vendor: "Marrowfield Produce Co.",
      vendorAddress: ["1150 Canal Street", "Ogden, UT 84404", "(801) 555-0119  orders@marrowfield.example"],
      color: "#2f6b3c",
      number: "MP-48213",
      date: "November 3, 2026",
      due: "November 18, 2026",
      terms: "Net 15",
      billTo: ["Copper Kettle Cafe", "418 Larch Street", "Ogden, UT 84401"],
      shipTo: ["Copper Kettle Cafe, kitchen door", "418 Larch Street (alley side)", "Ogden, UT 84401"],
      lines: [
        ["Romaine hearts, case", 6, "cs", 28.5],
        ["Roma tomatoes, 25 lb", 4, "cs", 31.25],
        ["Yellow onions, 50 lb", 2, "bag", 22.0],
        ["Lemons, case", 1, "cs", 46.75],
        ["Fresh herbs, assorted", 3, "flat", 18.4],
        ["Delivery", 1, "ea", 12.0],
      ],
      taxLabel: "Sales tax (food, exempt)",
      foot: "Shortages must be reported on the day of delivery. Thank you for buying local.",
    }),
  ],
  "linen-invoice": [classicInvoice(linen)],
  // The same invoice, sent again a few days later as a crooked scan.
  "linen-invoice-copy": [classicInvoice({ ...linen, scanned: true, tilt: -1.6, shrink: 0.93, stamp: "SECOND NOTICE" })],
  "plumbing-invoice": [
    serviceInvoice({
      vendor: "Dry Creek Plumbing & Heating",
      vendorAddress: ["36 Sandhill Road", "Roy, UT 84067", "(801) 555-0182"],
      license: "State contractor license no. 00-DEMO-4471",
      number: "2291",
      date: "November 5, 2026",
      terms: "Due upon receipt",
      billTo: ["Sagebrush Veterinary Clinic", "1090 Meadowlark Drive", "Roy, UT 84067"],
      job: "No hot water in the treatment room. Replaced the thermocouple on the 50 gallon water heater, relit and tested.",
      lines: [
        ["Service call", 1, "ea", 95.0],
        ["Thermocouple, universal 24 in", 1, "ea", 48.6],
        ["Labor, hours", 2.5, "hr", 110.0],
      ],
      // The vendor's own arithmetic is off by ten dollars: the lines come to 418.60.
      subtotal: 428.6,
      tax: 3.52,
      total: 432.12,
      foot: "All work guaranteed for 90 days. Checks payable to Dry Creek Plumbing & Heating.",
    }),
  ],
  "lab-invoice": [
    classicInvoice({
      vendor: "Kestrel Veterinary Diagnostics",
      vendorAddress: ["5 Research Park Way, Suite 210", "Salt Lake City, UT 84108", "(801) 555-0173  accounts@kestrelvetdx.example"],
      color: "#6a3d7c",
      number: "KVD-0093155",
      date: "November 6, 2026",
      due: "November 21, 2026",
      terms: "Net 15",
      billTo: ["Sagebrush Veterinary Clinic", "Attn: Accounts payable", "1090 Meadowlark Drive", "Roy, UT 84067"],
      lines: [
        ["Chemistry panel, comprehensive", 14, "ea", 38.0],
        ["Complete blood count", 14, "ea", 22.0],
        ["Histopathology, single site", 2, "ea", 96.0],
        ["Courier pickup, October", 1, "ea", 25.0],
      ],
      taxLabel: "Sales tax",
      foot: "Account no. SVC-2207. Results are available in the client portal. Questions about this invoice: (801) 555-0173.",
    }),
  ],
  "lumber-invoice": [supplyInvoice(lumber, 1), supplyInvoice(lumber, 2)],
  "concrete-invoice": [
    classicInvoice({
      vendor: "Graniteview Ready Mix",
      vendorAddress: ["4400 Gravel Pit Road", "Farmington, UT 84025", "(801) 555-0151  dispatch@graniteview.example"],
      color: "#444444",
      number: "GV-55820",
      date: "October 30, 2026",
      due: "November 14, 2026",
      po: "3F-1179",
      terms: "Net 15",
      billTo: ["Three Forks Builders", "77 Quarry Lane", "Layton, UT 84041"],
      shipTo: ["Hollis residence addition", "1420 Bitterroot Circle", "Kaysville, UT 84037"],
      lines: [
        ["4000 PSI concrete, per yard", 18, "yd", 142.0],
        ["Delivery, per load", 2, "ea", 95.0],
        ["Fuel surcharge", 1, "ea", 100.0],
      ],
      taxLabel: "Sales tax",
      scanned: true,
      tilt: 2.1,
      shrink: 0.92,
      extra: `<div class="note hand" style="left:96px; top:690px; font-size:25px; line-height:1.35; transform:rotate(-4deg)">Deposit pd 10/28 &nbsp;ck #2206<br>&minus; $1,000.00<br><u>Bal due &nbsp;$1,846.00</u></div>`,
      foot: "Tickets 118204 and 118209. Standby time over 7 minutes per yard is billed at $2.00 per minute.",
    }),
  ],
  "hardware-receipt": [
    receipt({
      height: 860,
      tilt: 1.2,
      fade: 0.78,
      body: `<div class="fade">
        <p class="c big">ANVIL &amp; OAK HARDWARE</p>
        <p class="c">212 Depot Street<br>Layton, UT 84041<br>(801) 555-0138</p><hr>
        <div class="row"><span>11/07/2026</span><span>2:14 PM</span></div>
        <div class="row"><span>Reg 03</span><span>Trans 048117</span></div><hr>
        <div class="row"><span>DECK SCREW 3IN 5LB</span><span></span></div>
        <div class="row"><span>&nbsp;2 @ 34.99</span><span>69.98</span></div>
        <div class="row"><span>CHALK LINE REEL</span><span>12.49</span></div>
        <div class="row"><span>UTILITY BLADES 50PK</span><span>16.99</span></div>
        <div class="row"><span>CAULK EXT WHT 10OZ</span><span></span></div>
        <div class="row"><span>&nbsp;6 @ 7.29</span><span>43.74</span></div>
        <div class="row"><span>SAFETY GLASSES CLR</span><span>8.99</span></div><hr>
        <div class="row"><span>SUBTOTAL</span><span>152.19</span></div>
        <div class="row"><span>TAX 7.25%</span><span>11.03</span></div>
        <div class="row big"><span>TOTAL</span><span>163.22</span></div><hr>
        <div class="row"><span>VISA ************4417</span><span>163.22</span></div>
        <div class="row"><span>AUTH 07731B</span><span>CHIP</span></div><hr>
        <p class="c">PO/JOB: HOLLIS ADDITION<br>Returns within 30 days with receipt<br>THANK YOU</p></div>`,
    }),
  ],
  "lunch-receipt": [
    receipt({
      height: 800,
      tilt: -2.4,
      body: `
        <p class="c big">DOS HERMANAS TAQUERIA</p>
        <p class="c">61 Meadowlark Drive, Roy, UT<br>(801) 555-0190</p><hr>
        <div class="row"><span>Server: Itzel</span><span>Table 12</span></div>
        <div class="row"><span>Nov 6, 2026</span><span>12:41 PM</span></div>
        <div class="row"><span>Guests: 5</span><span>Check 3308</span></div><hr>
        <div class="row"><span>3 Taco plate</span><span>35.25</span></div>
        <div class="row"><span>1 Burrito verde</span><span>11.50</span></div>
        <div class="row"><span>1 Tortilla soup</span><span>7.75</span></div>
        <div class="row"><span>5 Agua fresca</span><span>10.00</span></div><hr>
        <div class="row"><span>Subtotal</span><span>64.50</span></div>
        <div class="row"><span>Tax</span><span>5.00</span></div>
        <div class="row big"><span>Amount</span><span>69.50</span></div>
        <div class="row"><span>MASTERCARD ****8802</span><span></span></div>
        <div class="write"><span>Tip</span><span class="hand">12.00</span></div>
        <div class="write"><span>Total</span><span class="hand">81.50</span></div>
        <div class="write"><span>Sign</span><span class="hand" style="font-size:22px">R. Okonjo-Bell</span></div>
        <p class="c" style="margin-top:16px">Merchant copy</p>`,
    }),
  ],
  "w9-kestrel": [
    w9({
      name: "Kestrel Veterinary Diagnostics, Inc.",
      kind: "C corporation",
      street: "5 Research Park Way, Suite 210",
      city: "Salt Lake City, UT 84108",
      ein: "004471209",
      signature: "Marta Oyelaran",
      signed: "11/02/2026",
    }),
  ],
  // Filled in by hand, photographed, and one digit short.
  "w9-farrow": [
    w9({
      name: "Lucinda Farrow",
      business: "Farrow Sign Painting",
      kind: "Individual/sole proprietor",
      street: "309 Tamarack Ave",
      city: "Ogden, UT 84403",
      ssn: "00048217",
      signature: "Lucinda Farrow",
      signed: "Nov 4, 2026",
      hand: true,
      scanned: true,
      tilt: 1.4,
      shrink: 0.93,
    }),
  ],
  // Complete except for the signature and date.
  "w9-ironwood": [
    w9({
      name: "Ironwood Fence & Gate LLC",
      kind: "LLC",
      street: "1288 Old Mill Road",
      city: "Kaysville, UT 84037",
      ein: "007719034",
    }),
  ],
};

/* ---------- photograph them ---------- */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Every printed word and its box, as fractions of the page, in reading order. */
const COLLECT_WORDS = `(() => {
  const pageBox = document.getElementById("page").getBoundingClientRect();
  const walker = document.createTreeWalker(document.getElementById("page"), NodeFilter.SHOW_TEXT);
  const words = [];
  const fix = (n) => Math.round(n * 10000) / 10000;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement.closest("[data-skip], style")) continue;
    for (const match of node.textContent.matchAll(/\\S+/g)) {
      const range = document.createRange();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const box = range.getBoundingClientRect();
      if (!box.width) continue;
      words.push([match[0], fix((box.left - pageBox.left) / pageBox.width), fix((box.top - pageBox.top) / pageBox.height), fix(box.width / pageBox.width), fix(box.height / pageBox.height)]);
    }
  }
  return { width: pageBox.width, height: pageBox.height, words };
})()`;

async function main() {
  const only = process.argv[2];
  const profile = mkdtempSync(path.join(tmpdir(), "samples-"));
  const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  await sleep(2500);
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  const socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve) => (socket.onopen = resolve));
  let id = 0;
  const waiting = new Map();
  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.id && waiting.has(data.id)) waiting.get(data.id)(data.result);
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      waiting.set(++id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });

  mkdirSync(path.join(ROOT, "public/samples"), { recursive: true });
  mkdirSync(path.join(ROOT, "src/data/words"), { recursive: true });
  const { frameTree } = await send("Page.getFrameTree");

  for (const [key, pages] of Object.entries(DOCUMENTS)) {
    if (only && only !== key) continue;
    const layout = [];
    for (const [index, html] of pages.entries()) {
      await send("Emulation.setDeviceMetricsOverride", { width: 900, height: 1200, deviceScaleFactor: 2, mobile: false });
      await send("Page.setDocumentContent", { frameId: frameTree.frame.id, html });
      await sleep(400);
      const { result } = await send("Runtime.evaluate", { expression: COLLECT_WORDS, returnByValue: true });
      const { width, height, words } = result.value;
      const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
      writeFileSync(path.join(ROOT, `public/samples/${key}-${index + 1}.jpg`), Buffer.from(shot.data, "base64"));
      layout.push({ width: width * 2, height: height * 2, words });
    }
    writeFileSync(path.join(ROOT, `src/data/words/${key}.json`), JSON.stringify({ pages: layout }) + "\n");
    console.log(key, layout.map((p) => p.words.length).join(" + "), "words");
  }
  chrome.kill();
  process.exit(0);
}

main();
