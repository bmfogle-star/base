const React = require("react");
const RDS = require("react-dom/server");
const Fa = require("react-icons/fa");
const { chromium } = require("playwright");

const CHROME = "/opt/pw-browsers/chromium";

const C = {
  deep: "#1F3D1F", forest: "#2C5F2D", moss: "#97BC62", amber: "#D8892B",
  cream: "#F3F6EC", ink: "#2E2E2E", muted: "#6E7566", line: "#DDE3D2",
  brown: "#8A5A44", blue: "#3E6E7A", red: "#B04A3A", white: "#FFFFFF",
};

const S = (Comp, color) => RDS.renderToStaticMarkup(React.createElement(Comp, { color, size: 40 }));
const ic = {
  apple: S(Fa.FaAppleAlt, "#fff"), trash: S(Fa.FaTrashAlt, "#fff"),
  leaf: S(Fa.FaLeaf, "#fff"), dollar: S(Fa.FaDollarSign, "#fff"),
  users: S(Fa.FaUsers, "#fff"), paw: S(Fa.FaPaw, "#fff"),
  user: S(Fa.FaUser, "#fff"), landmark: S(Fa.FaLandmark, "#fff"),
  globe: S(Fa.FaGlobeAmericas, "#fff"), scale: S(Fa.FaBalanceScale, "#fff"),
  bulb: S(Fa.FaLightbulb, "#fff"), seed: S(Fa.FaSeedling, "#fff"),
};

// a card with icon header + two bullet impacts/solutions
function card(color, icon, title, items) {
  const lis = items.map(it =>
    `<li><span class="lead2">${it[0]}</span> ${it[1]}</li>`
  ).join("");
  return `<div class="col">
    <div class="col-ic" style="background:${color}">${icon}</div>
    <h3 class="serif">${title}</h3>
    <ul>${lis}</ul>
  </div>`;
}

const rate = (w) => w === "HIGH" ? C.forest : (w === "MED" ? C.amber : C.red);
function evalRow(name, cells) {
  const tds = cells.map(([w, note]) =>
    `<td><span class="rt" style="color:${rate(w)}">${w}</span><span class="rn">${note}</span></td>`).join("");
  return `<tr><td class="sol">${name}</td>${tds}</tr>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:850px; }
  body { font-family: Arial, "Liberation Sans", Helvetica, sans-serif; color:${C.ink}; background:#fff; }
  .serif { font-family: Georgia, "Times New Roman", serif; }
  .wrap { width:850px; }

  .hero { background:${C.deep}; color:#fff; padding:32px 44px 28px; position:relative; overflow:hidden; }
  .hero .c1 { position:absolute; width:230px; height:230px; border-radius:50%; background:${C.forest}; opacity:.5; top:-90px; right:-40px; }
  .hero .c2 { position:absolute; width:150px; height:150px; border-radius:50%; background:${C.moss}; opacity:.3; top:70px; right:120px; }
  .hero .row { display:flex; align-items:center; gap:18px; position:relative; z-index:2; }
  .badge { width:74px; height:74px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
  .badge svg { width:38px; height:38px; }
  .kick { color:${C.moss}; font-size:12px; font-weight:bold; letter-spacing:3px; }
  .htitle { font-size:32px; font-weight:bold; line-height:1.1; margin-top:3px; }
  .hsub { color:#D9E4C6; font-style:italic; font-size:15px; margin-top:12px; position:relative; z-index:2; }

  /* the issue box */
  .issue { margin:22px 44px 6px; background:${C.cream}; border:1px solid ${C.line}; border-left:6px solid ${C.forest};
           border-radius:12px; padding:18px 22px; }
  .issue h2 { font-size:20px; color:${C.deep}; margin-bottom:7px; }
  .issue p { font-size:13.5px; line-height:1.5; }
  .issue b { color:${C.forest}; }
  .chips { display:flex; gap:10px; margin-top:14px; }
  .chip { flex:1; background:#fff; border:1px solid ${C.line}; border-radius:9px; padding:9px 8px; display:flex; align-items:center; gap:9px; }
  .chip .d { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
  .chip .d svg { width:16px; height:16px; }
  .chip .t { font-size:11px; line-height:1.25; }
  .chip .t b { display:block; font-size:12.5px; color:${C.deep}; }

  .sec { padding:24px 44px 2px; }
  .sechead { display:flex; align-items:center; gap:14px; margin-bottom:14px; }
  .sechead .ico { width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
  .sechead .ico svg { width:24px; height:24px; }
  .sechead h2 { font-size:23px; color:${C.deep}; font-weight:bold; }

  .cols { display:flex; gap:16px; }
  .col { flex:1; background:#fff; border:1px solid ${C.line}; border-radius:12px; padding:16px 15px 16px;
         box-shadow:0 3px 8px rgba(0,0,0,.06); }
  .col-ic { width:50px; height:50px; border-radius:50%; margin:0 auto 8px; display:flex; align-items:center; justify-content:center; }
  .col-ic svg { width:25px; height:25px; }
  .col h3 { font-size:15px; color:${C.deep}; text-align:center; font-weight:bold; margin-bottom:10px; }
  .col ul { list-style:none; }
  .col li { font-size:11.5px; line-height:1.4; color:${C.ink}; padding-left:15px; position:relative; margin-bottom:9px; }
  .col li:last-child { margin-bottom:0; }
  .col li:before { content:""; position:absolute; left:0; top:5px; width:7px; height:7px; border-radius:50%; background:${C.moss}; }
  .lead2 { font-weight:bold; color:${C.forest}; }

  .note { font-style:italic; font-size:12px; color:${C.muted}; margin:2px 0 12px; }
  table { width:100%; border-collapse:collapse; }
  th { background:${C.forest}; color:#fff; font-size:13px; padding:9px 8px; text-align:center; border:1px solid ${C.line}; }
  th:first-child { text-align:left; padding-left:12px; }
  td { border:1px solid ${C.line}; padding:10px 10px; vertical-align:top; font-size:11.5px; }
  td.sol { background:${C.cream}; font-weight:bold; color:${C.deep}; font-family:Georgia,serif; font-size:12.5px; width:200px; }
  .rt { display:block; font-weight:bold; font-size:12.5px; margin-bottom:3px; }
  .rn { display:block; line-height:1.35; color:${C.ink}; }
  .legend { margin-top:12px; font-size:12px; color:${C.muted}; }
  .legend b { color:${C.forest}; } .legend .m { color:${C.amber}; }

  .foot { margin:24px 44px 30px; padding-top:13px; border-top:1px solid ${C.line};
          display:flex; justify-content:space-between; font-size:11px; color:${C.muted}; }
</style></head><body><div class="wrap">

  <div class="hero">
    <div class="c1"></div><div class="c2"></div>
    <div class="row">
      <div class="badge" style="background:${C.amber}">${ic.apple}</div>
      <div>
        <div class="kick">FOOD WASTE &amp; SUSTAINABILITY</div>
        <div class="htitle serif">The Real Cost of What We Throw Away</div>
      </div>
    </div>
    <div class="hsub">How the food we waste harms people, the planet, and the living things around us.</div>
  </div>

  <div class="issue">
    <h2 class="serif">The Issue</h2>
    <p><b>Topic:</b> food waste. <b>The problem:</b> about a third of all the food grown for people is never eaten. In
      the U.S., close to 30 to 40 percent of the food supply is thrown out, most of it from our own homes, plus farms,
      stores, and restaurants. Food waste is a sustainability problem because it hits all <b>three E's</b> at once.</p>
    <div class="chips">
      <div class="chip"><div class="d" style="background:${C.amber}">${ic.dollar}</div><div class="t"><b>Economy</b>Billions of dollars and resources are thrown away.</div></div>
      <div class="chip"><div class="d" style="background:${C.forest}">${ic.leaf}</div><div class="t"><b>Environment</b>Wasted food drives emissions and uses up land and water.</div></div>
      <div class="chip"><div class="d" style="background:${C.blue}">${ic.scale}</div><div class="t"><b>Equity</b>Food is trashed while many people go hungry.</div></div>
    </div>
  </div>

  <div class="sec">
    <div class="sechead"><div class="ico" style="background:${C.forest}">${ic.trash}</div><h2 class="serif">Why It Matters: The Impacts</h2></div>
    <div class="cols">
      ${card(C.brown, ic.users, "On People", [
        ["Higher costs.", "Wasted food costs the average U.S. family of four about $1,500 a year."],
        ["Hunger nearby.", "Around 34 million Americans go hungry while edible food is tossed, and low-income families feel it most."],
      ])}
      ${card(C.forest, ic.leaf, "On the Environment", [
        ["More emissions.", "Food rotting in landfills gives off methane and drives roughly 8&ndash;10% of global greenhouse gases."],
        ["Wasted resources.", "Growing food no one eats wastes about a quarter of the freshwater used for farming, plus land and fuel."],
      ])}
      ${card(C.blue, ic.paw, "On Wildlife &amp; Other Species", [
        ["Lost habitat.", "Clearing forests and land for food we never eat destroys homes for birds, insects, and other animals."],
        ["Polluted water.", "Fertilizer runoff from wasted crops creates ocean “dead zones” where fish and marine life cannot survive."],
      ])}
    </div>
  </div>

  <div class="sec">
    <div class="sechead"><div class="ico" style="background:${C.forest}">${ic.bulb}</div><h2 class="serif">Solutions at Every Level</h2></div>
    <div class="cols">
      ${card(C.forest, ic.user, "Individual", [
        ["Plan and shop smart.", "Make a meal plan and a shopping list so you only buy what you will actually use."],
        ["Store and reuse.", "Keep food fresh longer, eat leftovers, and remember “best by” is about quality, not safety."],
      ])}
      ${card(C.amber, ic.landmark, "Local &amp; National", [
        ["Curbside composting.", "Cities can collect food scraps and turn them into soil instead of landfill."],
        ["Donation laws &amp; labels.", "National rules and standard date labels help stores send extra food to food banks."],
      ])}
      ${card(C.blue, ic.globe, "Global", [
        ["Better storage.", "Fund refrigeration, roads, and transport so food does not spoil before it reaches people."],
        ["Shared goals.", "Back the UN target to cut food waste in half by 2030 so countries act together."],
      ])}
    </div>
  </div>

  <div class="sec">
    <div class="sechead"><div class="ico" style="background:${C.blue}">${ic.scale}</div><h2 class="serif">Evaluating the Top 3 Solutions on the Three E's</h2></div>
    <div class="note">The three highest-impact solutions, each weighed against Environment, Economy, and Equity.</div>
    <table>
      <tr><th>Top Solution</th><th>Environment</th><th>Economy</th><th>Equity</th></tr>
      ${evalRow("Donation laws to rescue surplus food", [
        ["HIGH","Keeps edible food out of landfills and cuts methane."],
        ["MED","Transport and storage cost money, but donor tax breaks help."],
        ["HIGH","Feeds people facing hunger right away."],
      ])}
      ${evalRow("Curbside &amp; community composting", [
        ["HIGH","Cuts landfill methane and rebuilds healthy soil."],
        ["MED","Startup and pickup costs, but creates jobs and usable compost."],
        ["MED","Greens neighborhoods, but does not feed people directly."],
      ])}
      ${evalRow("Smart shopping &amp; clear date labels", [
        ["HIGH","Stops waste at the source, where most of it starts."],
        ["HIGH","Costs little to run and saves families money."],
        ["MED","Helps households save, but reaches people unevenly."],
      ])}
    </table>
    <div class="legend"><b>HIGH</b> = strong benefit&nbsp;&nbsp;&nbsp;<span class="m">MED</span> = some trade-offs</div>
  </div>

  <div class="foot">
    <div>Sources: FAO, USDA, U.S. EPA, ReFED, and Feeding America.</div>
    <div>Created for Sustainability&nbsp;&nbsp;·&nbsp;&nbsp;Name: ______________</div>
  </div>

</div></body></html>`;

(async () => {
  const fs = require("fs");
  fs.writeFileSync(__dirname + "/index.html", html);
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 850, height: 1200 } });
  await page.setContent(html, { waitUntil: "networkidle" });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.pdf({ path: __dirname + "/Food_Waste_Infographic.pdf", width: "850px", height: h + "px", printBackground: true, pageRanges: "1" });
  await page.screenshot({ path: __dirname + "/qa.png", fullPage: true });
  await browser.close();
  console.log("rendered, height px =", h);
})();
