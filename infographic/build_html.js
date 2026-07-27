const React = require("react");
const RDS = require("react-dom/server");
const Fa = require("react-icons/fa");
const { chromium } = require("playwright");

const CHROME = "/opt/pw-browsers/chromium";

// palette
const C = {
  deep: "#1F3D1F", forest: "#2C5F2D", moss: "#97BC62", amber: "#D8892B",
  cream: "#F3F6EC", ink: "#2E2E2E", muted: "#6E7566", line: "#DDE3D2",
  brown: "#8A5A44", red: "#B04A3A", white: "#FFFFFF",
};

function svg(Comp, color) {
  return RDS.renderToStaticMarkup(React.createElement(Comp, { color, size: 40 }));
}
const ic = {
  apple: svg(Fa.FaAppleAlt, "#fff"),
  trash: svg(Fa.FaTrashAlt, "#fff"),
  leaf: svg(Fa.FaLeaf, "#fff"),
  dollar: svg(Fa.FaDollarSign, "#fff"),
  users: svg(Fa.FaUsers, "#fff"),
  heart: svg(Fa.FaHandHoldingHeart, "#fff"),
  recycle: svg(Fa.FaRecycle, "#fff"),
  basket: svg(Fa.FaShoppingBasket, "#fff"),
  scale: svg(Fa.FaBalanceScale, "#fff"),
};

const rate = (w) => w === "HIGH" ? C.forest : (w === "MED" ? C.amber : C.red);

function evalRow(name, cells) {
  const tds = cells.map(([w, note]) =>
    `<td><span class="rt" style="color:${rate(w)}">${w}</span><span class="rn">${note}</span></td>`
  ).join("");
  return `<tr><td class="sol">${name}</td>${tds}</tr>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:850px; }
  body { font-family: Arial, "Liberation Sans", Helvetica, sans-serif; color:${C.ink}; background:#fff; }
  .serif { font-family: Georgia, "Times New Roman", serif; }
  .wrap { width:850px; }
  .pad { padding: 0 44px; }

  /* header */
  .hero { background:${C.deep}; color:#fff; padding:34px 44px 30px; position:relative; overflow:hidden; }
  .hero .c1 { position:absolute; width:230px; height:230px; border-radius:50%; background:${C.forest}; opacity:.5; top:-90px; right:-40px; }
  .hero .c2 { position:absolute; width:150px; height:150px; border-radius:50%; background:${C.moss}; opacity:.3; top:70px; right:120px; }
  .hero .row { display:flex; align-items:center; gap:18px; position:relative; z-index:2; }
  .badge { width:74px; height:74px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
  .badge svg { width:38px; height:38px; }
  .kick { color:${C.moss}; font-size:12px; font-weight:bold; letter-spacing:3px; }
  .htitle { font-size:33px; font-weight:bold; line-height:1.1; margin-top:3px; }
  .hsub { color:#D9E4C6; font-style:italic; font-size:15px; margin-top:12px; position:relative; z-index:2; }

  /* sections */
  .sec { padding:26px 44px 4px; }
  .sechead { display:flex; align-items:center; gap:14px; margin-bottom:14px; }
  .sechead .ico { width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
  .sechead .ico svg { width:24px; height:24px; }
  .sechead h2 { font-size:24px; color:${C.deep}; font-weight:bold; }
  p.lead { font-size:14.5px; line-height:1.5; color:${C.ink}; }

  /* stat cards */
  .stats { display:flex; gap:16px; margin-top:16px; }
  .stat { flex:1; background:${C.cream}; border:1px solid ${C.line}; border-radius:12px; padding:16px 12px; text-align:center; }
  .stat .big { font-size:34px; font-weight:bold; color:${C.amber}; }
  .stat .lbl { font-size:11.5px; color:${C.muted}; margin-top:6px; line-height:1.3; }

  /* impact cards */
  .impacts { display:flex; gap:16px; margin-top:6px; }
  .icard { flex:1; background:#fff; border:1px solid ${C.line}; border-radius:12px; padding:18px 16px 20px; text-align:center;
           box-shadow:0 3px 8px rgba(0,0,0,.06); }
  .icard .ico { width:56px; height:56px; border-radius:50%; margin:0 auto 10px; display:flex; align-items:center; justify-content:center; }
  .icard .ico svg { width:28px; height:28px; }
  .icard h3 { font-size:16px; color:${C.deep}; font-weight:bold; }
  .icard .big { font-size:28px; font-weight:bold; margin:4px 0 8px; }
  .icard p { font-size:11.5px; line-height:1.45; text-align:left; color:${C.ink}; }

  /* solutions */
  .sol-row { display:flex; align-items:center; gap:16px; background:${C.cream}; border:1px solid ${C.line};
             border-radius:10px; padding:12px 16px; margin-bottom:11px; }
  .num { width:40px; height:40px; border-radius:50%; background:${C.forest}; color:#fff; font-weight:bold;
         font-size:19px; display:flex; align-items:center; justify-content:center; flex:0 0 auto; font-family:Georgia,serif; }
  .sol-ic { width:44px; height:44px; border-radius:50%; background:${C.moss}; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
  .sol-ic svg { width:22px; height:22px; }
  .sol-txt h4 { font-size:15px; color:${C.deep}; font-weight:bold; margin-bottom:3px; }
  .sol-txt p { font-size:12px; line-height:1.4; color:${C.ink}; }

  /* eval table */
  .note { font-style:italic; font-size:12px; color:${C.muted}; margin:2px 0 12px; }
  table { width:100%; border-collapse:collapse; }
  th { background:${C.forest}; color:#fff; font-size:13px; padding:9px 8px; text-align:center; border:1px solid ${C.line}; }
  th:first-child { text-align:left; padding-left:12px; }
  td { border:1px solid ${C.line}; padding:10px 10px; vertical-align:top; font-size:11.5px; }
  td.sol { background:${C.cream}; font-weight:bold; color:${C.deep}; font-family:Georgia,serif; font-size:12.5px; width:210px; }
  .rt { display:block; font-weight:bold; font-size:12.5px; margin-bottom:3px; }
  .rn { display:block; line-height:1.35; color:${C.ink}; }
  .legend { margin-top:12px; font-size:12px; color:${C.muted}; }
  .legend b { color:${C.forest}; } .legend .m { color:${C.amber}; }

  /* footer */
  .foot { margin:26px 44px 30px; padding-top:14px; border-top:1px solid ${C.line};
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
    <div class="hsub">How the food we waste harms the planet, our wallets, and our neighbors.</div>
  </div>

  <div class="sec">
    <div class="sechead"><div class="ico" style="background:${C.forest}">${ic.trash}</div><h2 class="serif">The Problem</h2></div>
    <p class="lead">About a third of all the food grown for people around the world never gets eaten. In the United States,
      close to 30 to 40 percent of the food supply is thrown out. Most of that waste starts in our own kitchens, along with
      restaurants, grocery stores, and farms.</p>
    <div class="stats">
      <div class="stat"><div class="big serif">1/3</div><div class="lbl">of all food made worldwide is wasted every year</div></div>
      <div class="stat"><div class="big serif">30&ndash;40%</div><div class="lbl">of the U.S. food supply is never eaten</div></div>
      <div class="stat"><div class="big serif">#1</div><div class="lbl">source of food waste is our own homes</div></div>
    </div>
  </div>

  <div class="sec">
    <div class="sechead"><div class="ico" style="background:${C.forest}">${ic.scale}</div><h2 class="serif">Why It Matters</h2></div>
    <div class="impacts">
      <div class="icard">
        <div class="ico" style="background:${C.forest}">${ic.leaf}</div>
        <h3 class="serif">Environment</h3>
        <div class="big serif" style="color:${C.forest}">8&ndash;10%</div>
        <p>of the world's greenhouse gas emissions come from wasted food. In landfills it gives off methane, a gas far
          stronger than carbon dioxide, and it wastes the water, land, and fuel used to grow it.</p>
      </div>
      <div class="icard">
        <div class="ico" style="background:${C.amber}">${ic.dollar}</div>
        <h3 class="serif">Economy</h3>
        <div class="big serif" style="color:${C.amber}">$218B</div>
        <p>worth of food is thrown away in the U.S. every year. That comes to about $1,500 for the average family of four
          that ends up straight in the trash.</p>
      </div>
      <div class="icard">
        <div class="ico" style="background:${C.brown}">${ic.users}</div>
        <h3 class="serif">Society</h3>
        <div class="big serif" style="color:${C.brown}">34M</div>
        <p>Americans, including millions of children, struggle to get enough to eat, even while good, edible food is being
          thrown out every single day.</p>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="sechead"><div class="ico" style="background:${C.forest}">${ic.recycle}</div><h2 class="serif">Top Solutions</h2></div>
    <div class="sol-row">
      <div class="num">1</div><div class="sol-ic">${ic.heart}</div>
      <div class="sol-txt"><h4 class="serif">Rescue and donate surplus food</h4>
        <p>Connect grocery stores, restaurants, and farms with food banks so extra food feeds people instead of filling landfills.</p></div>
    </div>
    <div class="sol-row">
      <div class="num">2</div><div class="sol-ic">${ic.recycle}</div>
      <div class="sol-txt"><h4 class="serif">Community and home composting</h4>
        <p>Turn food scraps into healthy soil through curbside pickup and backyard bins instead of sending them to the dump.</p></div>
    </div>
    <div class="sol-row">
      <div class="num">3</div><div class="sol-ic">${ic.basket}</div>
      <div class="sol-txt"><h4 class="serif">Smart shopping and clear date labels</h4>
        <p>Help people plan meals, buy what they need, and read labels correctly so they stop tossing food that is still good.</p></div>
    </div>
  </div>

  <div class="sec">
    <div class="sechead"><div class="ico" style="background:${C.amber}">${ic.scale}</div><h2 class="serif">Rating the Top 3 on the Three E's</h2></div>
    <div class="note">Each solution weighed against the three pillars of sustainability: Environment, Economy, and Equity.</div>
    <table>
      <tr><th>Top Solution</th><th>Environment</th><th>Economy</th><th>Equity</th></tr>
      ${evalRow("Rescue &amp; donate surplus food", [
        ["HIGH","Keeps edible food out of landfills and cuts methane."],
        ["MED","Transport and storage cost money, but donor tax breaks help."],
        ["HIGH","Feeds people facing hunger right away."],
      ])}
      ${evalRow("Community &amp; home composting", [
        ["HIGH","Cuts landfill methane and rebuilds healthy soil."],
        ["MED","Startup and pickup costs, but creates jobs and usable compost."],
        ["MED","Greens neighborhoods, but does not feed people directly."],
      ])}
      ${evalRow("Smart shopping &amp; clear labels", [
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
  await page.pdf({
    path: __dirname + "/Food_Waste_Infographic.pdf",
    width: "850px", height: h + "px", printBackground: true, pageRanges: "1",
  });
  await page.screenshot({ path: __dirname + "/qa.png", fullPage: true });
  await browser.close();
  console.log("rendered, height px =", h);
})();
