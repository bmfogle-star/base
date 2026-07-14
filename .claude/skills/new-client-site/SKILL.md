---
name: new-client-site
description: Build a demo website/app mockup for a prospective business client (coffee shop, café, etc.). Use when Brayden says "build a site for <shop>", "make a demo for <client>", or invokes /new-client-site with a shop name.
---

# New Client Site

Build a polished single-page demo website for a prospective client, used as the
"no strings attached example" in Brayden's outreach.

## Inputs
Take the shop name from the arguments. Look the shop up in
`coffee-shop-contacts.csv` for the owner's name and details. If a website domain
is known, fetch it for real menu items, hours, address, and branding cues.

## Steps
1. Create `demos/<shop-slug>/index.html` — a self-contained page (inline CSS/JS,
   no external CDNs) with:
   - Hero section with the shop's name, tagline, and location
   - Menu/products section (real items if found, tasteful placeholders if not)
   - "Order ahead" mockup section demonstrating the online-ordering flow
   - Rewards program section (points per purchase, free-drink milestones)
   - Hours, address, contact footer
2. Style it warm and coffee-shop appropriate; mobile-first, since owners will
   open the link on their phones.
3. Commit and push to the session branch.
4. Publish the page as an Artifact so Brayden gets a shareable private link,
   and send him the file.

## Rules
- Never present the demo as the shop's real site or use copyrighted assets;
  it's clearly a concept mockup made by Brayden's agency.
- Do not put any contact-list data (phone numbers, emails) inside the demo page.
