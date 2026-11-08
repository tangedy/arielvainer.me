# Ariel Vainer — site

Static, no build step. Pages: `index.html` (landing + first-visit loader), `about.html`, `experience.html`, `games.html`, `contact.html`. Shared `styles.css` and `main.js`.

Run locally: `python3 -m http.server 5178`

## Layout

Inner pages use one 12-column grid. Each section is a `.block`: a hairline rule, then the heading and text in `.side` (columns 1–4) and the photos or content in `.main` (columns 5–12), top-aligned. Under 860px everything stacks in reading order. Keep new sections on this pattern so the alignment lines stay consistent.

## Palette

Light only. Off-white ground, near-black text, orange (`--orange`, `--orange-text` for small text) and soft pink (`--pink`, `--pink-deep`) accents. All colours are variables at the top of `styles.css`.

## Images

- `img/` holds Ariel's photos (hero, about, triathlon, snowboarding, travel, DeltaHacks).
- `img/games/` holds screenshots pulled from arielvainer.itch.io. Hovering a game cycles through its screenshots.

## Still to confirm with Ariel

- Faire: dates and what Ariel worked on (the ticket currently has role and company only).
- Triathlon, snowboarding and travel blurbs on About are placeholder wording.
- No gameplay video yet: itch.io has no trailers, so the game page uses screenshots.
