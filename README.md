# Ariel Vainer — portfolio site

Static site, no build step. Live at https://www.arielvainer.online (Vercel deploys every push to `main`).

```
index.html  about.html  experience.html  games.html  contact.html  404.html
styles.css  main.js     vercel.json      robots.txt  sitemap.xml
img/        photos (WebP), img/games/ screenshots, img/logos/, img/icons/, img/og.jpg (share image)
fonts/      Inter Tight, self-hosted (SIL Open Font License)
```

Preview locally: `python3 -m http.server 5178`, then open http://localhost:5178.

## Editing

The HTML pages are the source. Edit text directly in them.

**After changing `styles.css` or `main.js`, update the version stamps.** Every page links them as `styles.css?v=xxxxxxxx` and `main.js?v=xxxxxxxx`. Those files are cached for a year, so a new stamp is what makes browsers fetch the new version:

```bash
NJ=$(md5 -q main.js | cut -c1-8); NC=$(md5 -q styles.css | cut -c1-8)
sed -i '' -e "s/main\.js?v=[a-f0-9]*/main.js?v=$NJ/g" -e "s/styles\.css?v=[a-f0-9]*/styles.css?v=$NC/g" *.html
```

## Layout

Inner pages use one 12-column grid. Each section is a `.block`: a hairline rule, then the heading and text in `.side` (columns 1–4) and the photos or content in `.main` (columns 5–12), top-aligned. Under 860px everything stacks. Keep new sections on this pattern.

## Images

- Photos are WebP, at most 1600px on the long side (game screenshots 1200px). Resize before adding; a phone photo straight off the camera is 5–10x too big.
- Give every `<img>` its `width`/`height` (the file's real pixel size) so the page doesn't jump while it loads, and `loading="lazy" decoding="async"` unless it's at the top of the page.
- Logos on the experience tickets are single-colour (#151515) on a transparent background.

## Colours

Variables at the top of `styles.css`: off-white `--bg`, near-black `--ink`, `--muted` grey text, `--orange` / `--orange-text` accents, `--pink` / `--pink-deep` fills, `--cafe` (third column of the page transition). Light mode only.

## How the pieces work

- **Loader** (landing page, first visit per session) and **page wipe** between pages live in `main.js`. Links to a section of the same page (`#triathlon`) scroll instead of wiping.
- **Failsafe:** an inline script in each page's `<head>` adds the `js` class and, if `main.js` hasn't started within 4 seconds, removes the loader, wipe and fade-in states so the page is always readable.
- **Stats** on Experience hold their real values in the HTML; the script counts up from zero only when it runs.
- **Tower game** (Game dev page): best height is saved in the visitor's browser (`localStorage`).

## Vercel (`vercel.json`)

- Short URLs: `/about`, `/experience`, `/games`, `/contact` serve the `.html` pages.
- Caching: fonts, `styles.css` and `main.js` for a year (safe because of the version stamps); images for a week.
- Security headers on every response.
- Share previews use `img/og.jpg` (1200×630).
