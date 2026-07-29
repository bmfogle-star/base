const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const Fa = require("react-icons/fa");
const { chromium } = require("playwright");
const fs = require("fs");

const CHROME = "/opt/pw-browsers/chromium";
const OUT = __dirname;
const INFO_PNG = "/home/user/base/infographic/preview.png";

// palette (no leading #)
const P = {
  deep: "1F3D1F", forest: "2C5F2D", moss: "97BC62", amber: "D8892B",
  cream: "F3F6EC", ink: "2E2E2E", muted: "6E7566", line: "DDE3D2",
  brown: "8A5A44", blue: "3E6E7A", white: "FFFFFF", red: "B04A3A",
  softgreen: "E6EEDB",
};
const BODY = "Calibri", SERIF = "Georgia";

// ---- icon rasterization ----
async function rasman(Comp, hex, px = 256) {
  const svg = RDS.renderToStaticMarkup(React.createElement(Comp, { color: "#" + hex, size: px }));
  const buf = await sharp(Buffer.from(svg)).resize(px, px).png().toBuffer();
  return buf.toString("base64");
}
let IC = {};
async function loadIcons() {
  const w = "FFFFFF";
  const set = {
    apple: [Fa.FaAppleAlt, w], trash: [Fa.FaTrashAlt, w], leaf: [Fa.FaLeaf, w],
    users: [Fa.FaUsers, w], paw: [Fa.FaPaw, w], user: [Fa.FaUser, w],
    landmark: [Fa.FaLandmark, w], globe: [Fa.FaGlobeAmericas, w], scale: [Fa.FaBalanceScale, w],
    bulb: [Fa.FaLightbulb, w], seed: [Fa.FaSeedling, w], industry: [Fa.FaIndustry, w],
    store: [Fa.FaStore, w], utensils: [Fa.FaUtensils, w], home: [Fa.FaHome, w],
    dollar: [Fa.FaDollarSign, w],
    check: [Fa.FaCheckCircle, P.moss],
  };
  for (const k of Object.keys(set)) IC[k] = await rasman(set[k][0], set[k][1]);
}
const infoB64 = fs.readFileSync(INFO_PNG).toString("base64");

// ================= element helpers =================
function newShadow() { return { type: "outer", color: "9AA394", opacity: 0.35, blur: 6, offset: 2, angle: 90 }; }

// text runs: [{t, b, i, color, size, face}]  (t may contain \n)
function T(x, y, w, h, runs, o = {}) { return { k: "text", x, y, w, h, runs, ...o }; }
function R(t, opt = {}) { return { t, ...opt }; }
function rect(x, y, w, h, fill, o = {}) { return { k: "rect", x, y, w, h, fill, ...o }; }
function oval(x, y, w, h, fill, o = {}) { return { k: "oval", x, y, w, h, fill, ...o }; }
function img(x, y, w, h, b64, o = {}) { return { k: "img", x, y, w, h, b64, ...o }; }
function iconOn(cx, cy, d, bg, icon, ipad) { // returns [oval, img]
  const ip = ipad == null ? d * 0.27 : ipad;
  return [oval(cx - d / 2, cy - d / 2, d, d, bg), img(cx - d / 2 + ip, cy - d / 2 + ip, d - ip * 2, d - ip * 2, icon)];
}

// ---- pptx rendering ----
function addToSlide(slide, p, el) {
  if (el.k === "rect") {
    const o = { x: el.x, y: el.y, w: el.w, h: el.h, fill: { color: el.fill } };
    if (el.line) o.line = { color: el.line.color, width: el.line.width || 1 };
    if (el.shadow) o.shadow = newShadow();
    if (el.radius) { o.rectRadius = el.radius; slide.addShape(p.ShapeType.roundRect, o); }
    else slide.addShape(p.ShapeType.rect, o);
  } else if (el.k === "oval") {
    const o = { x: el.x, y: el.y, w: el.w, h: el.h, fill: { color: el.fill } };
    if (el.line) o.line = { color: el.line.color, width: el.line.width || 1 };
    slide.addShape(p.ShapeType.ellipse, o);
  } else if (el.k === "img") {
    const o = { data: "image/png;base64," + el.b64, x: el.x, y: el.y, w: el.w, h: el.h };
    if (el.contain) o.sizing = { type: "contain", w: el.w, h: el.h };
    slide.addImage(o);
  } else if (el.k === "line") {
    slide.addShape(p.ShapeType.line, { x: el.x, y: el.y, w: el.w, h: 0, line: { color: el.color, width: el.width || 1 } });
  } else if (el.k === "text") {
    const runs = el.runs.map(r => ({ text: r.t, options: { bold: !!r.b, italic: !!r.i, color: r.color || P.ink, fontSize: r.size || 14, fontFace: r.face || BODY } }));
    slide.addText(runs, {
      x: el.x, y: el.y, w: el.w, h: el.h, align: el.align || "left", valign: el.valign || "top",
      margin: el.pad == null ? 0 : el.pad, lineSpacingMultiple: el.lh || 1.12, fontFace: BODY,
    });
  }
}

// ---- HTML rendering (mirror) ----
const PX = 96; // px per inch
function css(el) {
  return `position:absolute;left:${el.x * PX}px;top:${el.y * PX}px;width:${el.w * PX}px;height:${el.h * PX}px;`;
}
function htmlEl(el) {
  if (el.k === "rect") {
    let s = css(el) + `background:#${el.fill};`;
    if (el.radius) s += `border-radius:${el.radius * PX}px;`;
    if (el.line) s += `border:${(el.line.width || 1)}px solid #${el.line.color};box-sizing:border-box;`;
    if (el.shadow) s += `box-shadow:0 2px 6px rgba(0,0,0,.18);`;
    return `<div style="${s}"></div>`;
  }
  if (el.k === "oval") {
    let s = css(el) + `background:#${el.fill};border-radius:50%;`;
    if (el.line) s += `border:${(el.line.width || 1)}px solid #${el.line.color};box-sizing:border-box;`;
    return `<div style="${s}"></div>`;
  }
  if (el.k === "img") {
    return `<div style="${css(el)}"><img src="data:image/png;base64,${el.b64}" style="width:100%;height:100%;object-fit:${el.contain ? "contain" : "contain"}"></div>`;
  }
  if (el.k === "line") {
    return `<div style="position:absolute;left:${el.x * PX}px;top:${el.y * PX}px;width:${el.w * PX}px;border-top:${el.width || 1}px solid #${el.color};"></div>`;
  }
  if (el.k === "text") {
    const va = el.valign === "middle" ? "center" : el.valign === "bottom" ? "flex-end" : "flex-start";
    const spans = el.runs.map(r =>
      `<span style="font-weight:${r.b ? 700 : 400};font-style:${r.i ? "italic" : "normal"};color:#${r.color || P.ink};font-size:${(r.size || 14) * 1.3333}px;font-family:${(r.face || BODY) === SERIF ? "Georgia,serif" : "Arial,Helvetica,sans-serif"};">${r.t.replace(/</g, "&lt;")}</span>`
    ).join("");
    const pad = el.pad == null ? 0 : el.pad * PX;
    return `<div style="${css(el)}display:flex;align-items:${va};padding:${pad}px;box-sizing:border-box;">
      <div style="width:100%;text-align:${el.align || "left"};white-space:pre-wrap;line-height:${el.lh || 1.2};">${spans}</div></div>`;
  }
  return "";
}

// ================= slide builders =================
const SW = 13.333, SH = 7.5, M = 0.6;
const CW = SW - 2 * M;
function title(txt, o = {}) {
  return T(1.35, 0.42, SW - 1.9, 0.75, [R(txt, { size: 28, b: true, color: o.color || P.deep, face: SERIF })], { valign: "middle" });
}
function sectionIcon(icon, bg) { return iconOn(M + 0.35, 0.42 + 0.375, 0.7, bg, icon, 0.19); }

function threeCol(y, h, items) {
  // items: [{bg, icon, head, runs}]
  const gap = 0.4, cw = (CW - 2 * gap) / 3;
  const els = [];
  items.forEach((it, i) => {
    const x = M + i * (cw + gap);
    els.push(rect(x, y, cw, h, P.white, { radius: 0.1, line: { color: P.line }, shadow: true }));
    const cx = x + cw / 2;
    els.push(...iconOn(cx, y + 0.62, 0.86, it.bg, it.icon, 0.24));
    els.push(T(x, y + 1.12, cw, 0.4, [R(it.head, { size: 15, b: true, color: P.deep, face: SERIF })], { align: "center", valign: "middle" }));
    els.push(T(x + 0.26, y + 1.62, cw - 0.52, h - 1.75, it.runs, { lh: 1.16 }));
  });
  return els;
}
function bullets(pairs) { // pairs: [[label, text], ...] -> runs
  const runs = [];
  pairs.forEach((pr, i) => {
    runs.push(R("•  ", { b: true, color: P.moss, size: 13 }));
    runs.push(R(pr[0] + " ", { b: true, color: P.forest, size: 12.5 }));
    runs.push(R(pr[1] + (i < pairs.length - 1 ? "\n\n" : ""), { color: P.ink, size: 12.5 }));
  });
  return runs;
}

function build() {
  const slides = [];

  // ---------- Slide 1: Title ----------
  {
    const els = [];
    els.push(oval(10.4, -1.4, 3.6, 3.6, P.forest)); // decorative (bg deep so slightly lighter)
    els.push(oval(11.6, 1.7, 2.2, 2.2, P.moss, {}));
    els.push(...iconOn(SW / 2, 1.95, 1.5, P.amber, IC.apple, 0.44));
    els.push(T(0, 3.05, SW, 0.4, [R("FOOD WASTE & SUSTAINABILITY", { size: 13, b: true, color: P.moss })], { align: "center", valign: "middle" }));
    els.push(T(0, 3.5, SW, 1.0, [R("The Real Cost of What We Throw Away", { size: 40, b: true, color: P.white, face: SERIF })], { align: "center", valign: "middle" }));
    els.push(T(0, 4.75, SW, 0.5, [R("A closer look at the food we waste, and how we can fix it", { size: 16, i: true, color: "D9E4C6" })], { align: "center", valign: "middle" }));
    els.push(T(0, 6.5, SW, 0.4, [R("Name: ________________     ·     Course: ________________     ·     Date: __________", { size: 12, color: "B9C7A8" })], { align: "center", valign: "middle" }));
    slides.push({ bg: P.deep, els, notes: "Hi, my name is ___. My topic for this project is food waste, and how it connects to sustainability. Food waste is one of those problems that sits quietly in the background, but once you look at the numbers it turns out to be a big deal for our economy, the environment, and the people around us. Over the next few minutes I'll cover what food waste actually is, why it matters, and some realistic ways we can cut it down." });
  }

  // ---------- Slide 2: What is food waste ----------
  {
    const els = [];
    els.push(...sectionIcon(IC.trash, P.forest));
    els.push(title("What Is Food Waste?"));
    els.push(T(M, 1.55, 7.0, 3.6, [
      R("Food waste is any food that was grown or made for people to eat, but ends up thrown out instead. Experts usually split the problem into two parts:\n\n", { size: 14, color: P.ink }),
      R("Food loss ", { b: true, color: P.forest, size: 14 }),
      R("happens early, on farms and in factories, when crops spoil or get damaged before they reach us.\n\n", { size: 14, color: P.ink }),
      R("Food waste ", { b: true, color: P.forest, size: 14 }),
      R("happens later, at grocery stores, restaurants, and in our own kitchens, when good food gets tossed.", { size: 14, color: P.ink }),
    ], { lh: 1.2 }));
    // right stat cards
    const rx = 8.05, rw = 4.65;
    els.push(rect(rx, 1.6, rw, 1.55, P.cream, { radius: 0.1, line: { color: P.line } }));
    els.push(T(rx, 1.74, 1.9, 1.3, [R("1/3", { size: 40, b: true, color: P.amber, face: SERIF })], { align: "center", valign: "middle" }));
    els.push(T(rx + 1.9, 1.72, rw - 2.05, 1.3, [R("of all food made worldwide is never eaten", { size: 13, color: P.ink })], { valign: "middle", lh: 1.15 }));
    els.push(rect(rx, 3.35, rw, 1.55, P.cream, { radius: 0.1, line: { color: P.line } }));
    els.push(T(rx, 3.49, 1.9, 1.3, [R("30–40%", { size: 30, b: true, color: P.forest, face: SERIF })], { align: "center", valign: "middle" }));
    els.push(T(rx + 1.9, 3.47, rw - 2.05, 1.3, [R("of the U.S. food supply is thrown out each year", { size: 13, color: P.ink })], { valign: "middle", lh: 1.15 }));
    els.push(T(M, 5.55, CW, 1.2, [
      R("Why it counts as sustainability:  ", { b: true, size: 14, color: P.deep, face: SERIF }),
      R("wasting food wastes everything used to make it, the water, land, fuel, and money, while people who need that food go without.", { size: 14, color: P.ink }),
    ], { lh: 1.2 }));
    slides.push({ bg: P.white, els, notes: "So what counts as food waste? It's any food that was grown or made for people to eat but ends up thrown out instead. Experts usually split it into two parts. Food loss happens early, on farms and in factories, when crops spoil or get damaged before they reach us. Food waste happens later, at stores, restaurants, and in our own kitchens. Globally, about a third of all food is never eaten. In the U.S. it's even higher, somewhere between 30 and 40 percent of everything we produce." });
  }

  // ---------- Slide 3: Where it happens ----------
  {
    const els = [];
    els.push(...sectionIcon(IC.store, P.forest));
    els.push(title("Where Does It Happen?"));
    els.push(T(M, 1.35, CW, 0.5, [R("Food is lost and wasted at every step, from the farm all the way to your plate.", { size: 14, i: true, color: P.muted })], {}));
    const stages = [
      { c: P.forest, ic: IC.seed, lab: "Farms" },
      { c: P.moss, ic: IC.industry, lab: "Processing" },
      { c: P.blue, ic: IC.store, lab: "Stores" },
      { c: P.brown, ic: IC.utensils, lab: "Restaurants" },
      { c: P.amber, ic: IC.home, lab: "Homes" },
    ];
    const centers = [1.9, 4.35, 6.8, 9.25, 11.7];
    const cyc = 2.95, d = 1.05;
    els.push({ k: "line", x: centers[0], y: cyc, w: centers[4] - centers[0], color: P.line, width: 3 });
    stages.forEach((st, i) => {
      els.push(...iconOn(centers[i], cyc, d, st.c, st.ic, 0.3));
      els.push(T(centers[i] - 1.1, cyc + 0.68, 2.2, 0.4, [R(st.lab, { size: 13, b: true, color: P.deep })], { align: "center", valign: "middle" }));
    });
    // highlight callout
    els.push(rect(M, 4.15, CW, 0.95, P.softgreen, { radius: 0.1, line: { color: P.moss } }));
    els.push(T(M + 0.3, 4.15, CW - 0.6, 0.95, [
      R("Homes are the #1 source of food waste in the U.S.  ", { b: true, size: 15, color: P.forest, face: SERIF }),
      R("Roughly 40–50% of it happens after food reaches us.", { size: 14, color: P.ink }),
    ], { valign: "middle", lh: 1.1 }));
    els.push(T(M, 5.45, CW, 1.3, [
      R("Why so much at home?  ", { b: true, size: 14, color: P.deep, face: SERIF }),
      R("We tend to over-buy at the store, get confused by “sell by” and “best by” dates and toss food that is still fine, and cook bigger portions than we actually eat. Because this waste is so close to us, it is also some of the easiest to prevent.", { size: 14, color: P.ink }),
    ], { lh: 1.22 }));
    slides.push({ bg: P.white, els, notes: "Food gets wasted at every step of the chain. Some is lost on farms and during processing. Stores toss food that looks less than perfect or passes a sell-by date, and restaurants over-prepare. But in the U.S., the single biggest source is our own homes. We buy more than we can use, we get confused by date labels, and we serve portions that are too big. The good news is that because so much waste happens at the consumer end, a lot of it is within our control." });
  }

  // ---------- Slide 4: Impacts ----------
  {
    const els = [];
    els.push(...sectionIcon(IC.scale, P.forest));
    els.push(title("Why It Matters: The Impacts"));
    els.push(...threeCol(1.55, 4.2, [
      { bg: P.brown, icon: IC.users, head: "On People", runs: bullets([
        ["Higher costs.", "Wasted food costs the average U.S. family of four about $1,500 a year."],
        ["Hunger nearby.", "About 34 million Americans go hungry while edible food is thrown out."],
      ]) },
      { bg: P.forest, icon: IC.leaf, head: "On the Environment", runs: bullets([
        ["More emissions.", "Food in landfills gives off methane and drives 8–10% of global greenhouse gases."],
        ["Wasted resources.", "It burns up water, land, and fuel used to grow food no one eats."],
      ]) },
      { bg: P.blue, icon: IC.paw, head: "On Wildlife", runs: bullets([
        ["Lost habitat.", "Clearing land for food we never eat destroys homes for wildlife."],
        ["Polluted water.", "Fertilizer runoff creates ocean “dead zones” where fish cannot survive."],
      ]) },
    ]));
    els.push(rect(M, 6.05, CW, 0.75, P.softgreen, { radius: 0.09 }));
    els.push(T(M + 0.3, 6.05, CW - 0.6, 0.75, [
      R("The Three E's:  ", { b: true, size: 14, color: P.forest, face: SERIF }),
      R("these impacts hit the Economy (money and resources), the Environment (emissions and habitat), and Equity (people going hungry) all at the same time.", { size: 13.5, color: P.ink }),
    ], { valign: "middle", lh: 1.12 }));
    slides.push({ bg: P.white, els, notes: "Food waste hurts in three directions, which lines up with the three E's of sustainability. For people, it costs the average family of four around 1,500 dollars a year, and it feels unfair when 34 million Americans don't have enough to eat while good food gets thrown out. For the environment, food rotting in landfills releases methane, a strong greenhouse gas, and all the water and land used to grow that food is wasted too. And for wildlife, clearing land destroys habitat, while fertilizer runoff pollutes rivers and creates dead zones in the ocean." });
  }

  // ---------- Slide 5: Solutions ----------
  {
    const els = [];
    els.push(...sectionIcon(IC.bulb, P.forest));
    els.push(title("Solutions at Every Level"));
    els.push(...threeCol(1.55, 4.5, [
      { bg: P.forest, icon: IC.user, head: "Individual", runs: bullets([
        ["Shop smart.", "Make a meal plan and a list so you only buy what you will use."],
        ["Store & reuse.", "Keep food fresh, eat leftovers, and treat “best by” as quality, not safety."],
      ]) },
      { bg: P.amber, icon: IC.landmark, head: "Local & National", runs: bullets([
        ["Curbside composting.", "Cities can collect scraps and turn them into soil, not landfill."],
        ["Donation laws & labels.", "Rules and clear dates help stores send extra food to food banks."],
      ]) },
      { bg: P.blue, icon: IC.globe, head: "Global", runs: bullets([
        ["Better storage.", "Fund refrigeration and transport so food does not spoil in transit."],
        ["Shared goals.", "Back the UN target to cut food waste in half by 2030."],
      ]) },
    ]));
    els.push(T(M, 6.35, CW, 0.6, [
      R("The takeaway:  ", { b: true, size: 14, color: P.deep, face: SERIF }),
      R("no single fix solves this. Real progress needs action from all of us, our leaders, and the world together.", { size: 14, color: P.ink }),
    ], { valign: "middle", lh: 1.12 }));
    slides.push({ bg: P.white, els, notes: "The encouraging part is that we already know how to fix a lot of this, at every level. As individuals, we can plan meals, shop with a list, store food properly, and stop treating best-by dates as hard deadlines. At the local and national level, cities can offer curbside composting, and governments can pass donation laws and clearer labeling so stores send extra food to food banks. And globally, wealthier countries can help fund better storage and transport, and support shared goals like the UN's target to cut food waste in half by 2030." });
  }

  // ---------- Slide 6: Evaluation ----------
  {
    const els = [];
    els.push(...sectionIcon(IC.scale, P.blue));
    els.push(title("Rating the Top 3 on the Three E's"));
    els.push(T(M, 1.35, CW, 0.4, [R("My three highest-impact solutions, weighed against Environment, Economy, and Equity.", { size: 13.5, i: true, color: P.muted })], {}));
    const cols = [
      { x: M, w: 3.3, lab: "Top Solution" },
      { x: M + 3.3, w: 2.94, lab: "Environment" },
      { x: M + 3.3 + 2.94, w: 2.94, lab: "Economy" },
      { x: M + 3.3 + 2.94 * 2, w: 2.95, lab: "Equity" },
    ];
    const hy = 1.9, hh = 0.5, rh = 1.28;
    // header
    cols.forEach((c, i) => {
      els.push(rect(c.x, hy, c.w, hh, P.forest, { line: { color: P.line } }));
      els.push(T(c.x, hy, c.w, hh, [R(c.lab, { size: 13, b: true, color: P.white })], { align: i === 0 ? "left" : "center", valign: "middle", pad: 0.1 }));
    });
    const rate = (r) => r === "HIGH" ? P.forest : (r === "MED" ? P.amber : P.red);
    const rows = [
      ["Donation laws to rescue surplus food",
        ["HIGH", "Keeps edible food out of landfills and cuts methane."],
        ["MED", "Costs money to move and store, but tax breaks help donors."],
        ["HIGH", "Feeds people facing hunger right away."]],
      ["Curbside & community composting",
        ["HIGH", "Cuts landfill methane and rebuilds healthy soil."],
        ["MED", "Startup and pickup costs, but creates jobs and compost."],
        ["MED", "Greens neighborhoods, but does not feed people directly."]],
      ["Smart shopping & clear date labels",
        ["HIGH", "Stops waste at the source, where most of it starts."],
        ["HIGH", "Costs little and saves families money."],
        ["MED", "Helps households save, but reaches people unevenly."]],
    ];
    rows.forEach((row, ri) => {
      const ry = hy + hh + ri * rh;
      els.push(rect(cols[0].x, ry, cols[0].w, rh, P.cream, { line: { color: P.line } }));
      els.push(T(cols[0].x + 0.12, ry, cols[0].w - 0.24, rh, [R(row[0], { size: 12.5, b: true, color: P.deep, face: SERIF })], { valign: "middle", lh: 1.1 }));
      for (let ci = 1; ci <= 3; ci++) {
        const c = cols[ci];
        els.push(rect(c.x, ry, c.w, rh, P.white, { line: { color: P.line } }));
        els.push(T(c.x + 0.12, ry + 0.1, c.w - 0.24, rh - 0.2, [
          R(row[ci][0] + "\n", { b: true, size: 13, color: rate(row[ci][0]) }),
          R(row[ci][1], { size: 10.5, color: P.ink }),
        ], { valign: "top", lh: 1.1 }));
      }
    });
    els.push(T(M, hy + hh + 3 * rh + 0.12, CW, 0.4, [
      R("HIGH", { b: true, color: P.forest, size: 12 }), R(" = strong benefit      ", { color: P.muted, size: 12 }),
      R("MED", { b: true, color: P.amber, size: 12 }), R(" = some trade-offs", { color: P.muted, size: 12 }),
    ], {}));
    slides.push({ bg: P.white, els, notes: "To figure out which solutions are worth pushing hardest, I rated my top three against the three E's. Rescuing and donating surplus food scores high for the environment and for equity, since it feeds people directly, but it costs money to move and store. Composting is strong for the environment and creates jobs, but it doesn't feed anyone directly. Smart shopping and clearer labels might be the best all-around option. It stops waste at the source, it's cheap, and it saves families money, though it reaches people unevenly." });
  }

  // ---------- Slide 7: Infographic ----------
  {
    const els = [];
    els.push(...sectionIcon(IC.apple, P.forest));
    els.push(title("The Full Picture"));
    // infographic image on right, tall aspect 850x1541
    const ih = 6.2, iw = ih * (850 / 1541);
    const ix = SW - M - iw;
    els.push(rect(ix - 0.06, 1.15 - 0.06, iw + 0.12, ih + 0.12, P.line, { radius: 0.06 }));
    els.push(img(ix, 1.15, iw, ih, infoB64, { contain: true }));
    // left takeaways
    const lx = M, lw = ix - M - 0.5;
    els.push(T(lx, 1.55, lw, 0.6, [R("Everything on one page:", { size: 16, b: true, color: P.deep, face: SERIF })], {}));
    const tk = [
      ["The problem and its link to the Three E's.", ""],
      ["Impacts on people, the environment, and wildlife.", ""],
      ["Solutions at the individual, local, and global levels.", ""],
      ["An evaluation of the top three solutions.", ""],
    ];
    const runs = [];
    tk.forEach((t, i) => { runs.push(R("•  ", { b: true, color: P.moss, size: 14 })); runs.push(R(t[0] + (i < tk.length - 1 ? "\n\n" : ""), { size: 14, color: P.ink })); });
    els.push(T(lx, 2.35, lw, 2.6, runs, { lh: 1.2 }));
    els.push(rect(lx, 5.2, lw, 1.2, P.softgreen, { radius: 0.09 }));
    els.push(T(lx + 0.25, 5.2, lw - 0.5, 1.2, [
      R("Big takeaway:  ", { b: true, size: 14, color: P.forest, face: SERIF }),
      R("food waste is something we all touch every day, which means we all have a part in the fix.", { size: 14, color: P.ink }),
    ], { valign: "middle", lh: 1.18 }));
    slides.push({ bg: P.white, els, notes: "I pulled all of this together into a one-page infographic. It lays out the problem, the impacts on people, the environment, and wildlife, the solutions at each level, and the same evaluation table. The big takeaway is that food waste is a problem we all touch every day, which also means we all have a part in the solution. Small changes at home add up quickly when millions of people make them." });
  }

  // ---------- Slide 8: Conclusion ----------
  {
    const els = [];
    els.push(oval(-1.3, 5.4, 3.4, 3.4, P.forest));
    els.push(oval(11.9, -1.2, 2.6, 2.6, P.forest));
    els.push(T(M, 0.7, CW, 0.8, [R("What We Can Do", { size: 32, b: true, color: P.white, face: SERIF })], { valign: "middle" }));
    els.push(T(M, 1.55, CW, 0.4, [R("Simple habits and smart policies that add up fast", { size: 15, i: true, color: "D9E4C6" })], {}));
    const acts = [
      "Plan meals and shop with a list, buy only what you will use.",
      "Store food well and eat leftovers, don't fear “best by” dates.",
      "Compost food scraps instead of sending them to the trash.",
      "Support food donation laws and curbside composting programs.",
    ];
    acts.forEach((a, i) => {
      const y = 2.25 + i * 0.82;
      els.push(...iconOn(M + 0.35, y + 0.28, 0.56, P.forest, IC.check, 0.0));
      els.push(T(M + 0.85, y, CW - 1.2, 0.6, [R(a, { size: 15, color: P.white })], { valign: "middle", lh: 1.1 }));
    });
    els.push(rect(M, 5.75, CW, 0.9, P.amber, { radius: 0.1 }));
    els.push(T(M + 0.3, 5.75, CW - 0.6, 0.9, [R("Waste a little less, and we save money, cut emissions, protect habitats, and help feed our neighbors, all at once.", { size: 16, b: true, color: P.white, face: SERIF })], { valign: "middle", lh: 1.15 }));
    els.push(T(M, 6.95, CW, 0.35, [R("Sources: FAO, USDA, U.S. EPA, ReFED, and Feeding America.", { size: 11, color: "9FB090" })], {}));
    slides.push({ bg: P.deep, els, notes: "So to wrap up, food waste is a sustainability problem hiding in plain sight, but it's also one of the most fixable. Plan your meals, save your leftovers, compost what you can, and support policies that move extra food to people who need it. If we each waste a little less, we save money, cut emissions, protect habitats, and help feed our neighbors, all at once. Thanks for listening, and I'm happy to take any questions." });
  }

  return slides;
}

(async () => {
  await loadIcons();
  const slides = build();

  // ---- pptx ----
  const p = new pptxgen();
  p.defineLayout({ name: "W", width: SW, height: SH });
  p.layout = "W";
  slides.forEach(sl => {
    const slide = p.addSlide();
    slide.background = { color: sl.bg };
    sl.els.forEach(el => addToSlide(slide, p, el));
    if (sl.notes) slide.addNotes(sl.notes);
  });
  await p.writeFile({ fileName: OUT + "/Food_Waste_Presentation.pptx" });

  // ---- HTML mirror + screenshots ----
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: Math.round(SW * PX), height: Math.round(SH * PX) } });
  for (let i = 0; i < slides.length; i++) {
    const sl = slides[i];
    const body = sl.els.map(htmlEl).join("\n");
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}
      body{width:${SW * PX}px;height:${SH * PX}px;overflow:hidden}
      .slide{position:relative;width:${SW * PX}px;height:${SH * PX}px;background:#${sl.bg};}</style></head>
      <body><div class="slide">${body}</div></body></html>`;
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${OUT}/slide-${i + 1}.png` });
  }
  await browser.close();
  console.log("built", slides.length, "slides");
})();
