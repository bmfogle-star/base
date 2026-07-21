# Lead-Scraping Handoff Sheet — Nova App Development

Paste this whole document into any lead-scraping tool or AI assistant. It contains
everything needed to find and format coffee-shop leads for our outreach campaigns.

## Who we are / what we sell

Nova App Development sells independent coffee shops their own white-label mobile
ordering + rewards app (their name, their logo, their menu). We reach shop owners by
email. Every lead you produce becomes one personalized cold email, so accuracy
matters more than volume.

## What counts as a qualified lead (ALL required)

1. **Independent coffee shop** (or a small local group of 2–7 locations — those are
   BONUS targets, one deal covers several stores). NOT a national/regional chain,
   NOT owned by a restaurant group or large roaster conglomerate.
2. **Currently open.** Verify against a current listing (Google/Yelp updated
   recently). Many "best coffee shop" blog lists include closed shops — always check.
3. **Strong social proof:** roughly 250+ Google reviews preferred (150+ acceptable in
   smaller cities if the shop is clearly a neighborhood anchor). Note the count and
   where you saw it.
4. **Does NOT have its own branded mobile app.** Check the Apple App Store and Google
   Play for the shop's name. Shops using ONLY a generic web-ordering page (Square,
   Toast, Clover, Dripos, NetWaiter, Upserve), the third-party "joe" marketplace app,
   or delivery apps (Grubhub/DoorDash/Uber Eats) QUALIFY — that gap is our pitch.
   A shop with its own app is DISQUALIFIED (note it and move on).
   Watch for name collisions: an app with the same name may belong to an unrelated
   shop in another city — confirm the developer/city before disqualifying.
5. **A REAL email address found on an official source:** the shop's own website
   (contact page, footer, FAQ), its Instagram bio, its own Facebook page, or its
   Google Business listing. NEVER guess, construct, or pattern-infer an address
   (no "firstname@domain.com" guesses, no ZoomInfo/RocketReach/ContactOut scrapes).
   Record the exact URL where the email appears. If no public email exists, the shop
   does not go on the list (note it as "no public email" instead).

## Output format (one record per shop)

Return results as a JSON array. Each object must have exactly these keys:

```
{
  "shop": "Full shop name",
  "short": "Natural short name used conversationally (e.g. 'Wormhole')",
  "city": "City name",
  "neighborhood": "Neighborhood / area",
  "email": "the verified address",
  "email_source_url": "exact URL where the email was seen",
  "reviews_estimate": "e.g. '~800 Google reviews at 4.7 stars (source)'",
  "owner_first": "Owner's first name if publicly known and current, else ''",
  "greeting": "'Hi <first name>,' if owner known, else 'Hi,'",
  "opener": "1-2 sentence personalized hook (rules below)",
  "no_app_evidence": "One sentence: how you confirmed there is no branded app",
  "notes": "anything else useful (optional)"
}
```

## Opener rules (important — this is the first line of the email)

- 1–2 complete sentences containing a concrete, specific, flattering fact about the
  shop: signature drink, founding story, review count, press coverage, community role.
- Facts must come from your research. Never invent anything.
- NO em dashes or en dashes (— or –) anywhere. Use commas, colons, or periods.
- Do NOT include any phrase like "that's why I'm reaching out."
- It must stand alone as its own statement.

Style examples (match this voice):
- "A perfect 5.0 rating across 800 Google reviews is almost impossible for a coffee
  shop, and people say you greet your regulars by name, which explains it."
- "Jazz nights, comedy shows, board games, and a craft-beer license: 700+ reviewers
  say Nook figured out what a neighborhood actually wants."
- "Three generations roasting on Court Street since 1948. The roaster in the
  storefront and the Red Hook Blend are Brooklyn history you can drink."

## Do not duplicate — shops already contacted or drafted

Skip every shop on this list (any location of it):

**New York City (61):** Balancero; Roots Cafe; Buunni Coffee; Culture Espresso;
Urban Backyard; Voyager Espresso; Bakeri; Moss Café; Bibble & Sip; Colina Cuervo;
Interlude Coffee & Tea; Butler; Hibiscus Brew; Saltwater Coffee; Third Rail Coffee;
Sey Coffee; Little Collins; Abraço; Mudspot; Ninth Street Espresso; Everyman
Espresso; La Parisienne; Seven Grams Caffe; Bird & Branch; Kos Kaffe; C&B Cafe;
Rhythm Zero; Nook; Sweetleaf Coffee Roasters; Espresso 77; Postmark Cafe; Beans &
Leaves Cafe; Picky Barista; Plowshares Coffee; Frisson Espresso; D'Amico Coffee
Roasters; Bittersweet; Ciao, Gloria; Little Canal; Gasoline Alley Coffee; Gotan;
Merriweather Coffee + Kitchen; Black Press Coffee; Sipsteria; Ginjan Cafe; Kuro Kuma
Espresso; Ludlow Coffee Supply; Book Club Bar; Black Fox Coffee; Irving Farm; Variety
Coffee Roasters; Cafe Erzulie; Terremoto Coffee; One Girl Cookies; Peck's; Rex; About
Coffee; Saturn Road; Not As Bitter; Fellini Coffee; Cafe Con Libros

**Chicago (16):** The Wormhole Coffee; Hexe Coffee Co.; Metropolis Coffee Company;
Metric Coffee; Sputnik Coffee Company; Plein Air Cafe & Eatery; Loba Pastry + Coffee;
Damn Fine Coffee Bar; Cafe Jumping Bean; Bourgeois Pig Cafe; Hero Coffee Bar; Backlot
Coffee; The Coffee & Tea Exchange; La Catedral Cafe & Restaurant; Cafe Mustache;
Robust Coffee Lounge

**Philadelphia (15):** ReAnimator Coffee; Ultimo Coffee; Rival Bros Coffee; Menagerie
Coffee; Vibrant Coffee Roasters; Herman's Coffee; Front Street Cafe; Old City Coffee;
Cafe y Chocolate; Gran Caffe L'Aquila; Uncle Bobbie's Coffee & Books; One Shot Coffee
& Cafe; OX Coffee; Chapterhouse Cafe & Gallery; Shot Tower Coffee

**Pittsburgh (16):** Commonplace Coffee; De Fer Coffee & Tea; La Prima Espresso
Company; Constellation Coffee; Tazza D'Oro; Redhawk Coffee Roasters; Ka-Fair Coffee
and Cakery; KLVN Coffee Lab; Gasoline Street Coffee Company; Kaibur Coffee & Cafe;
Convive Coffee Roastery; Nicholas Coffee & Tea Co.; Ineffable Ca Phe; Everyday Cafe;
Biddle's Escape; Cafe Moulin

**Minneapolis–St. Paul (15):** Dogwood Coffee Co.; Backstory Coffee Roasters; FRGMNT
Coffee; Wildflyer Coffee; Northern Coffeeworks; Claddagh Coffee Cafe; Golden Thyme
Cafe; Cafe Latte; The Coffee Shop Northeast; Cafe Astoria; Workhorse Coffee Bar; The
Get Down Coffee Co.; Caydence Records & Coffee; Sisters' Sludge; Sencha Tea Bar

**Also in progress (skip these cities entirely unless told otherwise):** Cincinnati,
Boston, Denver, Nashville — plus Louisville KY (earlier campaign).

**Known disqualified (own app — do not re-research):** Big Shoulders, Fairgrounds,
Ipsento, Kribi, Everybody's Coffee, Dark Matter (Chicago); La Colombe (Philadelphia);
Spyhouse (Minneapolis); Pavement (Boston); Huckleberry, Blue Sparrow (Denver); Red
Bicycle, Elegy, Sam & Zoe's (Nashville); Urbana Cafe (Cincinnati).

## Good target cities for new lists

Columbus OH, Indianapolis, San Diego, Phoenix, Kansas City, St. Louis, Milwaukee,
Detroit, Baltimore, Richmond, Charlotte, Raleigh-Durham, Austin, San Antonio,
Portland ME, Providence, Buffalo, Cleveland, Salt Lake City, Sacramento.
(Avoid: Seattle, Portland OR, San Francisco — most saturated with existing apps.)

## Delivery

Hand the JSON back in one block (or a .json file). 15–20 qualified leads per city is
the target. Quality over quantity: a wrong email wastes a send and hurts our sender
reputation; fewer verified leads always beats more unverified ones.
