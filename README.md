# Pulse landing page (Perimity)

A single-page marketing site for Pulse, built with plain HTML/CSS/JS — no
framework, no build step. Designed to be edited directly and deployed as-is
via GitHub Pages.

## Structure

```
index.html      Page markup (one file, semantic sections)
styles.css      All styling, driven by CSS custom properties in :root
script.js       Small, dependency-free JS: nav/scroll behavior, footer year
assets/
  perimity-logo.png   Full logo (wordmark + mark)
  perimity-mark.png   Cropped ring mark only (used in nav/footer/favicon)
```

## Before you deploy

1. **Lead capture is wired to `mailto:cjacobs@perimity.io`.** The "Request
   access" form (`#access-form` in `index.html`) is handled two ways:
   - With JS enabled (the common case), `script.js` builds a pre-filled
     `mailto:` link — subject "Pulse demo request," body with the
     visitor's entered email — and opens it in their default mail app.
   - As a no-JS fallback, the form's native `action="mailto:..."` attribute
     does the same thing less reliably (mail-client support for form-based
     mailto varies).

   This means every submission requires the visitor to hit **send** in
   their own mail client — there's no silent/hosted capture. If you want
   frictionless capture later (no second click from the visitor), swap in
   a hosted form service (Formspree, etc.) — the markup change is small,
   just ask.

   To change the destination address, update it in two places:
   `action="mailto:..."` in `index.html` and `const DEST` in `script.js`.

2. **Check the copy.** All product/positioning copy is placeholder-free and
   pulled directly from what you described — but it's worth a founder read
   before this goes live, especially the "Who it's for" section.

3. **Add a real favicon set** (optional). `assets/perimity-mark.png` is used
   as-is for the favicon. For crisper results across devices, generate a
   proper favicon set (e.g. via [realfavicongenerator.net](https://realfavicongenerator.net))
   from that same mark.

## Deploying to GitHub Pages

1. Push this folder to a GitHub repo (either the repo root, or a `/docs`
   folder — either works).
2. In the repo: **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch."
4. Pick the branch (usually `main`) and the folder (`/root` or `/docs`,
   matching where you put these files).
5. Save. GitHub will publish at `https://<username>.github.io/<repo>/`
   (or your custom domain, see below).

### Custom domain (optional)

1. Add a `CNAME` file at the repo root containing just your domain, e.g.:
   ```
   pulse.perimity.com
   ```
2. At your DNS provider, add a `CNAME` record pointing that subdomain at
   `<username>.github.io`.
3. In **Settings → Pages**, enter the same domain and enable "Enforce HTTPS"
   once it's verified.

## Local preview

No build step needed — just serve the folder locally, e.g.:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Design notes

- **Palette** is sampled directly from the logo: deep purple `#6731A3`,
  lavender `#A484C7`, near-black ink, and a cool off-white background — all
  defined as CSS custom properties at the top of `styles.css` so they're
  easy to retune later.
- **Type**: Fraunces (display/headlines), IBM Plex Sans (body), IBM Plex
  Mono (eyebrows, labels, pipeline numbers) — loaded from Google Fonts in
  `index.html`.
- **Signature element**: the hero waveform (inline SVG in `index.html`)
  visualizes Pulse's core job — noisy raw evidence resolving into a clean,
  standardized signal. It's reused as the visual thesis of the page rather
  than a generic hero illustration.
- Motion is intentionally restrained: the waveform draws in once on load,
  and sections fade up on scroll. Both respect `prefers-reduced-motion`.
