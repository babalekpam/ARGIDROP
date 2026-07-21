const pptxgen = require("pptxgenjs");

const FOREST = "1B4332";
const DEEP = "0F2A1F";
const CREAM = "F7F3EB";
const SAND = "F7EFE0";
const BRONZE = "9C6B2F";
const GREEN_LT = "86EFAC";
const MUTED = "5B6B60";
const WHITE = "FFFFFF";
const ICON = "/home/runner/workspace/web/public/argidrop-icon.png";

const p = new pptxgen();
p.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
p.layout = "WIDE";
p.author = "ARGILETTE LLC";
p.title = "ArgiDrop — Investor Deck";

const W = 13.33, H = 7.5;

function bg(s, color) { s.background = { color }; }
function bar(s, color = BRONZE) {
  s.addShape("rect", { x: 0, y: H - 0.18, w: W, h: 0.18, fill: { color } });
}
function eyebrow(s, text, color = BRONZE, x = 0.8, y = 0.55) {
  s.addText(text.toUpperCase(), { x, y, w: 8, h: 0.4, fontSize: 12, color, bold: true, charSpacing: 3, fontFace: "Georgia" });
}
function title(s, text, color = DEEP, x = 0.8, y = 1.0, size = 34) {
  s.addText(text, { x, y, w: W - 1.6, h: 1.0, fontSize: size, color, bold: true, fontFace: "Georgia" });
}
function footer(s, n, dark = false) {
  s.addText(`ArgiDrop · Investor Deck · ${n}`, { x: W - 4.2, y: H - 0.55, w: 3.5, h: 0.3, fontSize: 9, color: dark ? "A8BDB0" : MUTED, align: "right", fontFace: "Calibri" });
}

// ---------- 1. Title ----------
let s = p.addSlide(); bg(s, DEEP);
s.addShape("rect", { x: 0, y: 0, w: 0.25, h: H, fill: { color: BRONZE } });
s.addImage({ path: ICON, x: 0.9, y: 0.8, w: 0.85, h: 0.85 });
s.addText("ArgiDrop", { x: 1.9, y: 0.8, w: 5, h: 0.9, fontSize: 36, color: WHITE, bold: true, fontFace: "Georgia" });
s.addText("West Africa moves with ArgiDrop.", { x: 0.9, y: 2.9, w: 11.4, h: 1.4, fontSize: 44, color: WHITE, bold: true, fontFace: "Georgia" });
s.addText("The all-in-one delivery platform built for francophone West Africa.\nDeliveries, food, rides and payments — one application.", { x: 0.9, y: 4.4, w: 9.5, h: 1.1, fontSize: 18, color: "D9E5DD", fontFace: "Calibri" });
s.addText("SEED ROUND · $25,000  |  ARGILETTE LLC · Launching in Lomé, Togo", { x: 0.9, y: 6.3, w: 11, h: 0.4, fontSize: 13, color: GREEN_LT, bold: true, charSpacing: 2, fontFace: "Calibri" });

// ---------- 2. Problem ----------
s = p.addSlide(); bg(s, CREAM); bar(s);
eyebrow(s, "The Problem");
title(s, "B2B delivery in francophone West Africa is informal and unreliable.");
const probs = [
  ["No trust layer", "Merchants hand goods to unverified couriers with no proof of pickup or delivery. Theft and disputes are settled by phone calls."],
  ["Cash-based & opaque", "Payments happen in cash, off the books. No escrow, no receipts, no recourse when something goes wrong."],
  ["Fragmented supply", "Independent moto-taxi drivers have no steady demand pipeline; merchants have no reliable driver pool."],
];
probs.forEach((pr, i) => {
  const x = 0.8 + i * 4.05;
  s.addShape("rect", { x, y: 2.6, w: 3.7, h: 3.4, fill: { color: WHITE }, line: { color: "E5DCCB", width: 1 } });
  s.addText(pr[0], { x: x + 0.3, y: 2.9, w: 3.1, h: 0.6, fontSize: 18, bold: true, color: FOREST, fontFace: "Georgia" });
  s.addText(pr[1], { x: x + 0.3, y: 3.6, w: 3.1, h: 2.2, fontSize: 13, color: MUTED, fontFace: "Calibri" });
});
footer(s, 2);

// ---------- 3. Solution ----------
s = p.addSlide(); bg(s, CREAM); bar(s);
eyebrow(s, "The Solution");
title(s, "A verified marketplace with fraud-proof delivery, built in.");
s.addText("ArgiDrop connects merchants with KYC-verified drivers, holds payment in escrow, and verifies every hand-off with a triple QR scan chain — pickup, transit, delivery. Funds release only when the recipient confirms.", { x: 0.8, y: 2.1, w: 11.7, h: 1.0, fontSize: 15, color: MUTED, fontFace: "Calibri" });
const sol = [
  ["Verified drivers", "KYC documents, vehicle checks and ratings before a driver can accept a single job."],
  ["Triple QR chain", "Three cryptographic scans per delivery. No scan, no payment. Fraud is structurally blocked."],
  ["Escrow payments", "Mobile money and cards held by the platform; released on confirmed delivery."],
  ["Live GPS tracking", "Merchants and recipients watch the driver in real time — no more phone-call chasing."],
];
sol.forEach((it, i) => {
  const x = 0.8 + (i % 2) * 6.1, y = 3.3 + Math.floor(i / 2) * 1.65;
  s.addShape("rect", { x, y, w: 5.85, h: 1.45, fill: { color: WHITE }, line: { color: "E5DCCB", width: 1 } });
  s.addText(it[0], { x: x + 0.3, y: y + 0.15, w: 5.3, h: 0.45, fontSize: 15, bold: true, color: FOREST, fontFace: "Georgia" });
  s.addText(it[1], { x: x + 0.3, y: y + 0.6, w: 5.3, h: 0.75, fontSize: 12, color: MUTED, fontFace: "Calibri" });
});
footer(s, 3);

// ---------- 4. Product (built) ----------
s = p.addSlide(); bg(s, DEEP);
eyebrow(s, "Product — built and live", GREEN_LT);
title(s, "The platform is finished software, not a prototype.", WHITE);
const prod = [
  ["Merchant & driver mobile app", "One Expo app serving both roles — post deliveries, schedule up to 90 days ahead, scan QR codes, upload proof of delivery, cash out earnings."],
  ["Web dashboard", "Merchant listings, admin operations, disputes, payouts and live tracking pages."],
  ["Full backend", "Dynamic pricing engine, wallets and escrow, driver payouts, scheduled-delivery promotion, push/SMS/email notifications, 25+ database tables."],
  ["In the app stores", "Live on Google Play and Apple App Store pipelines (EAS), production API deployed and serving argidrop.com."],
];
prod.forEach((it, i) => {
  const x = 0.8 + (i % 2) * 6.1, y = 2.4 + Math.floor(i / 2) * 2.1;
  s.addShape("rect", { x, y, w: 5.85, h: 1.9, fill: { color: "16342А".replace("А","A") }, line: { color: "2E5442", width: 1 } });
  s.addText(it[0], { x: x + 0.3, y: y + 0.15, w: 5.3, h: 0.45, fontSize: 15, bold: true, color: GREEN_LT, fontFace: "Georgia" });
  s.addText(it[1], { x: x + 0.3, y: y + 0.62, w: 5.3, h: 1.2, fontSize: 12, color: "C9D8CE", fontFace: "Calibri" });
});
footer(s, 4, true);

// ---------- 5. Market ----------
s = p.addSlide(); bg(s, CREAM); bar(s);
eyebrow(s, "Market");
title(s, "Launching in Lomé. Built for ECOWAS.");
s.addText("~400M", { x: 0.8, y: 2.3, w: 5.5, h: 1.6, fontSize: 80, bold: true, color: FOREST, fontFace: "Georgia" });
s.addText("people across the ECOWAS region — one of the world's fastest-urbanizing markets, where informal commerce dominates and delivery infrastructure is still being defined.", { x: 0.8, y: 4.0, w: 5.3, h: 1.6, fontSize: 14, color: MUTED, fontFace: "Calibri" });
const mk = [
  ["Beachhead: Lomé, Togo", "Dense commercial hub, moto-taxi driver supply, mobile-money-first economy."],
  ["Expansion path", "Bénin, Côte d'Ivoire, Ghana, Sénégal, Nigeria — same rails, region-specific payment providers already integrated (Flutterwave, Paystack)."],
  ["Why francophone-first", "Global platforms build for anglophone markets first. ArgiDrop is French-native from day one."],
];
mk.forEach((it, i) => {
  const y = 2.3 + i * 1.45;
  s.addShape("rect", { x: 6.6, y, w: 5.9, h: 1.3, fill: { color: WHITE }, line: { color: "E5DCCB", width: 1 } });
  s.addText(it[0], { x: 6.9, y: y + 0.1, w: 5.3, h: 0.4, fontSize: 14, bold: true, color: FOREST, fontFace: "Georgia" });
  s.addText(it[1], { x: 6.9, y: y + 0.5, w: 5.3, h: 0.7, fontSize: 11.5, color: MUTED, fontFace: "Calibri" });
});
footer(s, 5);

// ---------- 6. Business model ----------
s = p.addSlide(); bg(s, CREAM); bar(s);
eyebrow(s, "Business Model");
title(s, "Commission on every delivery, plus merchant subscriptions.");
s.addText("18%", { x: 0.8, y: 2.3, w: 4.5, h: 1.6, fontSize: 88, bold: true, color: BRONZE, fontFace: "Georgia" });
s.addText("platform commission on each completed delivery — collected automatically at escrow release. Drivers keep 82%.", { x: 0.8, y: 4.0, w: 4.6, h: 1.4, fontSize: 14, color: MUTED, fontFace: "Calibri" });
const tiers = [["FREE", "Entry — post & pay per delivery"], ["STANDARD", "Volume merchants"], ["PREMIUM", "Priority matching & support"], ["PRO", "High-volume B2B accounts"]];
s.addText("Merchant subscription tiers", { x: 6.0, y: 2.3, w: 6, h: 0.4, fontSize: 15, bold: true, color: FOREST, fontFace: "Georgia" });
tiers.forEach((t, i) => {
  const y = 2.9 + i * 0.95;
  s.addShape("rect", { x: 6.0, y, w: 6.4, h: 0.8, fill: { color: WHITE }, line: { color: "E5DCCB", width: 1 } });
  s.addText(t[0], { x: 6.3, y: y + 0.17, w: 2.0, h: 0.45, fontSize: 13, bold: true, color: BRONZE, charSpacing: 2, fontFace: "Calibri" });
  s.addText(t[1], { x: 8.4, y: y + 0.17, w: 3.9, h: 0.45, fontSize: 12, color: MUTED, fontFace: "Calibri" });
});
s.addText("Additional revenue: dynamic pricing (urgency & surge), scheduled-delivery premium features.", { x: 0.8, y: 6.55, w: 11.7, h: 0.4, fontSize: 12, italic: true, color: MUTED, fontFace: "Calibri" });
footer(s, 6);

// ---------- 7. How it works ----------
s = p.addSlide(); bg(s, CREAM); bar(s);
eyebrow(s, "How It Works");
title(s, "Post. Match. Scan. Deliver. Release.");
const steps = [
  ["1 · Post", "Merchant posts a delivery — now or scheduled up to 90 days ahead. Dynamic price quoted instantly."],
  ["2 · Pay into escrow", "Mobile money or card. Funds held by the platform."],
  ["3 · Match", "A verified driver accepts. Live GPS from that moment."],
  ["4 · Triple QR scan", "Scan at pickup, in transit, and with the recipient at delivery."],
  ["5 · Release", "Recipient's scan releases funds: 82% to driver earnings, 18% to platform."],
];
steps.forEach((st, i) => {
  const x = 0.8 + i * 2.42;
  s.addShape("rect", { x, y: 2.7, w: 2.22, h: 3.2, fill: { color: i === 4 ? FOREST : WHITE }, line: { color: "E5DCCB", width: 1 } });
  s.addText(st[0], { x: x + 0.18, y: 2.95, w: 1.9, h: 0.7, fontSize: 14, bold: true, color: i === 4 ? GREEN_LT : BRONZE, fontFace: "Georgia" });
  s.addText(st[1], { x: x + 0.18, y: 3.7, w: 1.9, h: 2.0, fontSize: 11, color: i === 4 ? "D9E5DD" : MUTED, fontFace: "Calibri" });
});
footer(s, 7);

// ---------- 8. Traction / status ----------
s = p.addSlide(); bg(s, CREAM); bar(s);
eyebrow(s, "Where We Are");
title(s, "Software done. Capital goes to the market, not the code.");
const st8 = [
  ["Platform", "Backend, web dashboard and mobile app complete — payments, escrow, QR verification, scheduling, payouts, notifications all working in production."],
  ["Deployed", "Production API and site live at argidrop.com. Android build targets Google's latest requirements; iOS pipeline active."],
  ["Integrations ready", "Flutterwave, Paystack and Stripe for payments; Africa's Talking and Twilio for SMS; MapTiler for mapping; Firebase for push."],
  ["Next milestone", "First 50 verified drivers and 100 merchant accounts in Lomé within 90 days of funding."],
];
st8.forEach((it, i) => {
  const x = 0.8 + (i % 2) * 6.1, y = 2.5 + Math.floor(i / 2) * 2.0;
  s.addShape("rect", { x, y, w: 5.85, h: 1.8, fill: { color: WHITE }, line: { color: "E5DCCB", width: 1 } });
  s.addText(it[0], { x: x + 0.3, y: y + 0.15, w: 5.3, h: 0.45, fontSize: 15, bold: true, color: FOREST, fontFace: "Georgia" });
  s.addText(it[1], { x: x + 0.3, y: y + 0.6, w: 5.3, h: 1.1, fontSize: 12, color: MUTED, fontFace: "Calibri" });
});
footer(s, 8);

// ---------- 9. The Ask ----------
s = p.addSlide(); bg(s, DEEP);
eyebrow(s, "The Ask", GREEN_LT);
title(s, "$25,000 to launch Lomé and prove the model.", WHITE);
const ask = [
  ["Driver acquisition & incentives", "$10,000", "Signing bonuses and guaranteed minimums for the first 50 verified drivers."],
  ["Merchant onboarding & local ops", "$6,000", "Local field rep for 4–6 months: KYC, training, merchant activation."],
  ["Marketing & launch", "$4,500", "Radio, WhatsApp/Facebook campaigns, branded driver gear, launch events."],
  ["Working capital & payout float", "$3,000", "Escrow float to guarantee same-day driver cash-outs."],
  ["Legal, admin & infrastructure", "$1,500", "Togo registration, payment-provider KYB, 12 months of hosting & services."],
];
ask.forEach((a, i) => {
  const y = 2.35 + i * 0.88;
  s.addShape("rect", { x: 0.8, y, w: 11.7, h: 0.75, fill: { color: "16342A" }, line: { color: "2E5442", width: 1 } });
  s.addText(a[0], { x: 1.1, y: y + 0.14, w: 6.2, h: 0.45, fontSize: 13, bold: true, color: WHITE, fontFace: "Calibri" });
  s.addText(a[1], { x: 7.3, y: y + 0.14, w: 1.4, h: 0.45, fontSize: 13, bold: true, color: GREEN_LT, fontFace: "Calibri" });
  s.addText(a[2], { x: 8.8, y: y + 0.14, w: 3.5, h: 0.5, fontSize: 10, color: "C9D8CE", fontFace: "Calibri" });
});
s.addText("Goal: 1,000 completed deliveries/month in Lomé within 6 months — the proof point for a regional expansion round.", { x: 0.8, y: 6.85, w: 11.7, h: 0.4, fontSize: 12, italic: true, color: "A8BDB0", fontFace: "Calibri" });
footer(s, 9, true);

// ---------- 10. Closing ----------
s = p.addSlide(); bg(s, DEEP);
s.addShape("rect", { x: 0, y: 0, w: 0.25, h: H, fill: { color: BRONZE } });
s.addImage({ path: ICON, x: W / 2 - 0.5, y: 1.5, w: 1.0, h: 1.0 });
s.addText("ArgiDrop", { x: 0, y: 2.8, w: W, h: 0.9, fontSize: 40, color: WHITE, bold: true, align: "center", fontFace: "Georgia" });
s.addText("West Africa's all-in-one delivery platform.", { x: 0, y: 3.8, w: W, h: 0.5, fontSize: 18, color: "D9E5DD", align: "center", fontFace: "Calibri" });
s.addText("ARGILETTE LLC · St. Louis, MO  ·  argidrop.com", { x: 0, y: 5.2, w: W, h: 0.4, fontSize: 14, color: GREEN_LT, align: "center", fontFace: "Calibri" });
s.addText("Let's move West Africa together.", { x: 0, y: 6.0, w: W, h: 0.5, fontSize: 16, italic: true, color: "A8BDB0", align: "center", fontFace: "Georgia" });

p.writeFile({ fileName: "ArgiDrop-Investor-Deck.pptx" }).then(() => console.log("DECK WRITTEN"));
