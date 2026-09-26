# Design system: engineerswithai.com

This is the design contract for the site. Read it before changing templates or CSS.

The site should look like a professional technical publication: a well-made course site from a serious engineering school or standards body. Think GOV.UK Design System, MIT OpenCourseWare, or good product documentation. Content first. Hierarchy comes from typography and spacing, not decoration. It must not look like a generated landing page.

If a choice isn't covered here, choose the plainer option.

## 1. Banned patterns (these read as AI-generated; do not use any of them)

Visual:
- Gradients of any kind (backgrounds, buttons, text). Gradient text. Glows, halos, radial spotlights, colored shadows.
- Purple/violet or cyan accent palettes. Cream/beige "paper" backgrounds.
- Glassmorphism, frosted blur, translucent sticky headers.
- Decorative grid-line or dot backgrounds. Repeating stripe fills.
- Colored left-border (or thick top-border) accent stripes on cards, callouts, or blockquotes.
- Identical card grids (icon tile + bold label + grey paragraph, repeated). Icon tiles above headings. Nested cards.
- Large border radii (anything over 6px), pill-shaped buttons and tags, "badge" chips.
- Box shadows on cards (shadows are allowed only for focus rings and dropdown menus).
- Emoji anywhere. Icon sets used as decoration. Stock photos, AI-generated images, decorative illustrations, mascots.
- Status dots, pulsing or static. Blinking cursors. Marquees. Hover zoom on images. Fade-in-on-scroll animations. Bounce easing.

Typography and layout:
- Small uppercase letter-spaced "eyebrow" labels above headings. Tiny numbered section labels ("01", "02") on content that isn't a real sequence.
- Badges or pills above the main headline. Centered hero text. Oversized hero headlines filling the screen.
- Italic serif display headlines, or a single italic accent word in a heading.
- All-caps headings or labels. Wide letter spacing on text. Crushed (very negative) letter spacing.
- Stat banner rows ("10k+ users"), fake metrics, testimonials, logo walls.
- Equal spacing everywhere; related things must sit closer together than unrelated things.

Copy (the templates' own text, like the footer and headings):
- No marketing language, no slogans, no "Not X. Y." constructions, no em-dash-heavy lines. Plain labels: "Starter Kit", "Community", "Previous", "Next".

## 2. Principles

1. **Readable first.** Body text 18px on desktop (17px under 640px), line height 1.6, line length 60 to 75 characters.
2. **One accent color, used functionally**: links, primary buttons, current navigation item, focus rings. Nothing else is colored except callout backgrounds.
3. **Structure is visible.** Clear heading sizes, generous space above headings (more than below), 1px rules to separate regions.
4. **Left-aligned** everything, including the home page.
5. **Light and dark both designed.** Light is the default; dark follows `prefers-color-scheme`. Both pass WCAG 2.2 AA.
6. **No JavaScript needed to read anything.** JS only for the mobile menu, progress tracking, and the table-of-contents highlight.

## 3. Tokens

Define these as CSS custom properties on `:root`, and redefine for dark mode inside `@media (prefers-color-scheme: dark)`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | #FFFFFF | #121416 | Page background |
| `--surface` | #F3F4F6 | #1B1E22 | Code blocks, sidebar hover, table header |
| `--text` | #1A1C1F | #E7E9EC | Body text |
| `--text-2` | #43484F | #C0C5CB | Secondary text |
| `--text-3` | #5B616A | #9CA3AB | Meta text (never below 14px) |
| `--rule` | #D5D8DC | #2E3238 | Dividers, table rules |
| `--control` | #6E747C | #858C95 | Borders of inputs, checkboxes, secondary buttons (3:1 minimum) |
| `--accent` | #0B57A4 | #7DB3F2 | Links, primary button, current nav, focus |
| `--accent-hover` | #083F78 | #A8CBF6 | Hover state |
| `--on-accent` | #FFFFFF | #0B1220 | Text on the primary button |
| `--note-bg` / `--note-border` | #EEF3FA / #C6D6EC | #16212E / #2B3F57 | Note callout |
| `--tip-bg` / `--tip-border` | #EDF6F0 / #C3DECB | #15231B / #2A4533 | Tip callout, answers |
| `--warning-bg` / `--warning-border` | #FDF5E3 / #E9D29B | #2A2413 / #54482A | Warning callout |
| `--danger-bg` / `--danger-border` | #FCEDED / #EBC0C0 | #2C1818 / #5A3232 | Danger callout |

These combinations were checked: text, text-2, text-3, and accent all pass 4.5:1 on bg, surface, and every callout background, in both modes. Re-check anything you add with a script.

Typography:
- Fonts: IBM Plex Sans (400, 400 italic, 500, 600, 700) and IBM Plex Mono (400, 500), self-hosted from `static/fonts/` (latin subset, woff2, SIL Open Font License), with `font-display: swap`.
- Scale: h1 2.5rem (40px) desktop / 2rem mobile, weight 600, line-height 1.15, letter-spacing -0.01em. h2 1.75rem, 600, line-height 1.25. h3 1.3rem, 600. h4 1.1rem, 600. Body 1.125rem (18px). Small/meta 0.875rem (14px) minimum.
- Headings in sentence case. Space above h2: 3rem; below: 1rem.

Spacing scale (use only these): 4, 8, 12, 16, 24, 32, 48, 64, 96 px.
Radius: 4px for buttons, boxes, code blocks, inputs; 2px for inline code. Nothing larger.
Borders: 1px solid. Focus ring: `outline: 3px solid var(--accent); outline-offset: 2px`.
Motion: none, except 100ms color transitions on hover. Respect `prefers-reduced-motion`.

## 4. Components

- **Header** (every page): full-width white (or `--bg`) bar with a 1px bottom rule, not sticky. Left: the mark (hexagon nut SVG, 24px, `--accent`) and the name "Engineers with AI" in 600 weight, linking home. Then text nav: "Starter Kit", "Course", "Community". Right: "GitHub" text link to https://github.com/EngineersWithAI. The current section's nav link gets a 2px underline in `--accent` (text-decoration or border-bottom), not a pill. Under 800px: a "Menu" button (text, with `aria-expanded`) that reveals the nav as a vertical list.
- **Footer**: 1px top rule; three columns of text links (Course, Starter Kit, Community) with plain headings; a final line "Engineers with AI · Free and open source · Started at UIUC" plus a link to the source repository. No logo wall, no newsletter box.
- **Buttons**: primary = `--accent` background, `--on-accent` text, 600 weight, 44px min height, 16px horizontal padding, radius 4px. Secondary = transparent, 1px `--control` border, `--text` text. No arrows or icons in buttons. Hover: `--accent-hover`.
- **Links**: always underlined in body text (1px, offset 3px); thicker underline on hover. Nav links not underlined except the current one.
- **Callouts** (`.admonition` from Python-Markdown): full 1px border in the type's border color, type background, 16px 20px padding, radius 4px. Title line in 600 weight using the given title or the type name ("Note", "Tip", "Warning", "Caution", "Example"). No icons. No left stripe.
- **Answers** (`details.success`): 1px `--tip-border` border, radius 4px; `summary` is a clickable line in 600 weight ("Show answers" if no title), with a visible focus ring. Open state shows content with `--tip-bg` background.
- **Tables**: full width inside a horizontal scroll wrapper; header row 600 weight with a 2px bottom rule in `--text`; body rows separated by 1px `--rule`; cell padding 10px 12px; no zebra striping; numbers right-aligned where the column is numeric.
- **Code**: blocks with `--surface` background, 1px `--rule` border, radius 4px, 16px padding, IBM Plex Mono 15px, horizontal scroll. Inline code with `--surface` background, 2px radius, 0.9em. Syntax colors from a restrained Pygments theme generated for light and dark (for example `default` / `github-dark`-like; keep saturation low; check contrast of token colors is at least 4.5:1).
- **Checklists** (task lists): real checkboxes, not styled bullets.
- **Math**: KaTeX, self-hosted (npm `katex`, copy `dist/`), loaded only on pages that contain math.
- **Breadcrumbs**: small text above the page title: "Course / Level 1: Foundations".
- **Page meta** under the h1 of a course page, as one line of `--text-2` text: "1.5 · About 3 hours" (the page number and hours from `data/course.yml`, when given). Not badges.
- **Prev/next**: at the bottom of course pages and Starter Kit pages, two text links in a row separated by a 1px top rule: "Previous: <title>" left, "Next: <title>" right.
- **Progress**: at the bottom of each course page, a real checkbox "I've finished this page" saved in `localStorage` (every access is wrapped in try/catch; the page works without it). Finished pages show a small text mark "✓" (the only non-letter glyph allowed) after the title in the course menu and in section lists. It says "Saved in this browser only."

## 5. Layouts

- **Home** (`/`): left-aligned, max width 1100px. Everything comes from the front matter of `content/index.md`.
  1. Title block: an h1 that states plainly what the site is, one paragraph (max 60 words) on what's here and who it's for, and up to two buttons (the first is primary).
  2. "Three parts": three columns on desktop (stacked on mobile), each a plain text block, no box: an h2 link, an optional status line (for example "In development"), a 2 to 3 sentence description, and an optional short list. Separated by whitespace only.
  3. The page's Markdown body, for example "Get involved".
- **Standard page** (Starter Kit, Community, About): single content column, max 72ch for text, with a right "On this page" list on wide screens (>= 1200px) when the page has two or more h2s.
- **Course page** (everything under `/course/`): while `data/course.yml` has no sections, course pages use the standard page layout. Once it has sections: three columns on wide screens: a left course menu (260px); the content column (max 72ch); the right "On this page" list (220px, sticky, only >= 1200px). Under 1000px the menu collapses behind a "Course menu" button above the page title.
  - Course menu: "Course overview", then each section as a `details` group (open for the current section) with its overview and pages, shown as "1.1 Title" when a page has a number. Pages listed in `course.yml` without a file show as plain text marked "(coming soon)". The current page is in 600 weight and `--accent`.
- **Section page** (`/course/<section id>/`): the section's own introduction (from `content/course/<id>/index.md`, optional), then a generated list of its pages (number, title, hours, one-line summary) as a plain list with rules between items, not cards. The course overview lists the sections the same way.

## 6. Build system

Plain Python, no framework. `build.py` at the repo root:

- Reads `content/**/*.md` (YAML front matter + Markdown) and `data/*.yml`.
- Markdown via Python-Markdown with: `extra` (tables, fenced_code, footnotes, attr_list, def_list, md_in_html), `toc` (ids on headings; no permalink symbols), `admonition`, `pymdownx.details`, `pymdownx.superfences`, `pymdownx.highlight` (Pygments, CSS classes), `pymdownx.inlinehilite`, `pymdownx.arithmatex` (generic mode), `pymdownx.tasklist` (custom checkboxes off), `sane_lists`, `smarty`.
- Jinja2 templates in `templates/`: `base.html`, `home.html`, `page.html`, `course.html`, plus partials. Section page lists and the course menu are generated from `data/course.yml`.
- Output to `public/` with pretty URLs (`content/course/level-1/verification.md` becomes `public/course/level-1/verification/index.html`; `index.md` becomes the folder's `index.html`).
- Copies `static/` to `public/` (css, fonts, js, favicon.svg, favicon.ico, apple-touch-icon.png, og-image.png) and writes `CNAME` (engineerswithai.com), `robots.txt`, `sitemap.xml` (all pages), and `404.html`.
- **Fails the build** on: a broken internal link (any `href` starting with `/` that doesn't resolve to a built page, anchor ids checked too), a missing front-matter title. A page listed in `course.yml` with no content file is a warning (it shows as "coming soon"); `--strict` makes it an error.
- `python build.py --serve` builds then serves `public/` on http://localhost:8000.
- Every page gets: `<title>` ("Page title · Engineers with AI"), meta description, canonical URL on https://engineerswithai.com, Open Graph tags (og-image.png), `lang="en"`, a skip link, landmarks (`header`, `nav`, `main`, `footer`), and one h1.
- `requirements.txt` pins exact versions of markdown, pymdown-extensions, jinja2, pyyaml, pygments.

Deployment: `.github/workflows/pages.yml` builds with Python 3.12 on every push to `main` and deploys `public/` with `actions/upload-pages-artifact` and `actions/deploy-pages`. The repository's GitHub Pages source is "GitHub Actions".

## 7. Quality checks before you finish

- Screenshot every template (home, standard page, course overview, a course page, a section page, 404) at 1440, 1024, 768, and 390px wide, light and dark, with Playwright. Look at them and fix what looks wrong.
- No horizontal scrolling at 320px.
- Keyboard: every interactive element reachable, visible focus ring, menu button works with Enter/Space and announces `aria-expanded`.
- Run an HTML validator (`npx html-validate` is available) on built pages.
- Re-check color contrast of anything you added with a script.
- Lighthouse-style basics: no render-blocking third-party requests (there should be none), fonts preloaded, total CSS under 60 KB.
