# Nisarg Patel — Interactive Portfolio

A responsive static portfolio website built with HTML, CSS, SVG and vanilla JavaScript. No npm install or build step is required.

## Run locally

1. Extract the ZIP.
2. Open the `Nisarg_Portfolio_Final` folder in VS Code.
3. Install the **Live Server** extension if needed.
4. Right-click `index.html` and choose **Open with Live Server**.

Opening `index.html` directly in a browser may also work, but Live Server is recommended for local preview.

## Project order

1. **SAATHI** — an in-progress independent healthcare app UI/UX concept, intentionally shown before the academic projects.
2. **CampusCore** — academic smart-campus software project.
3. **MedCore** — academic pharmacy-management project.
4. **WhereNext** — academic travel-booking project.

Each project links to `project.html` with a query string, for example `project.html?project=campuscore`.

## Files

- `index.html` — homepage structure and content.
- `style.css` — base layout and component styles.
- `live-effects.css` — interactive dark visual theme.
- `signature-refinement.css` — SAATHI showcase, academic project grid, process and contact refinements.
- `script.js` — navigation, scroll reveals, buttons and cursor behavior.
- `live-effects.js` — animated background canvas, subtle pointer light, hover light and ripple effects.
- `project.html` / `project.js` — reusable project detail page.
- `assets/` — SVG visual assets.

## Before using as a final portfolio

- Replace or supplement the illustrative SAATHI interface direction with actual Figma screenshots once the screens are final.
- The CampusCore cover is an illustrative dashboard preview; replace it with verified project screenshots if available.
- MedCore and WhereNext covers are custom CSS illustrations rather than actual application screenshots.
- Check each technology list and project description against the submitted project and your contribution.
- Add a real Figma prototype link if you wish to show it. The email button already uses `nisargpatel1807@gmail.com`.
- No professional experience, awards, clients or performance results are claimed.

## Motion and accessibility

The site includes animated ambient backgrounds, scroll-reveal transitions, card hover feedback, button ripple effects and a small desktop-only custom cursor. It respects `prefers-reduced-motion` and disables desktop-only pointer effects on touch devices.
