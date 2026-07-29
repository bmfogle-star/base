# Food Waste & Sustainability Infographic

`Food_Waste_Infographic.pdf` is the finished one-page infographic, ready to submit.

It covers all of the rubric sections:

- **The Issue** – topic defined, problem identified, and its connection to the Three E's (Economy, Environment, Equity)
- **Why It Matters: The Impacts** – two impacts each on people, the environment, and non-human organisms (wildlife)
- **Solutions at Every Level** – two solutions each at the individual, local/national, and global levels
- **Evaluating the Top 3 Solutions on the Three E's** – each weighed against Environment, Economy, and Equity

`preview.png` is a quick image preview of the same page.

## Presentation

`Food_Waste_Presentation.pptx` is an 8-slide PowerPoint built for a ~5-minute talk. It
goes deeper than the infographic (what food waste is, where it happens along the supply
chain, the impacts, solutions at every level, and the top-3 evaluation) and includes the
infographic itself on a slide. Every slide has speaker notes with talking points.
Slide previews are in `presentation_preview/`.

## Editing

Update the copy or styling in `build_html.js`, then rebuild:

```bash
npm install react react-dom react-icons playwright
node build_html.js
```

This regenerates `Food_Waste_Infographic.pdf` and a `qa.png` preview.

Sources referenced in the graphic: FAO, USDA, U.S. EPA, ReFED, and Feeding America.
