# engineerswithai.com

The source for [engineerswithai.com](https://engineerswithai.com): free templates, a course in development, and a community for engineering students learning to use AI well in their own field.

The site is plain Markdown built into static HTML by a short Python script. There's no framework and no tracking. Every push to `main` rebuilds and publishes the site through GitHub Actions.

## What's where

| Path | What it is |
|---|---|
| `content/` | The pages, one Markdown file each. The file's path sets the page's address. |
| `data/course.yml` | The course structure: sections and pages in reading order. |
| `data/community.yml` | The community boards and their GitHub Discussions links. |
| `templates/` | Jinja2 page templates. |
| `static/` | CSS, JavaScript, fonts, icons, and the share image, copied to the site as-is. |
| `build.py` | Builds everything into `public/` and checks every internal link. |
| `DESIGN.md` | The design system: colors, type, layouts, and the patterns the site avoids. |
| `WRITING.md` | How pages are written: front matter, Markdown features, style, and accuracy rules. |
| `.github/workflows/pages.yml` | Builds and publishes the site on every push to `main`. |

## Preview locally

You need Python 3.12 or later.

```sh
python -m pip install -r requirements.txt
python build.py --serve
```

Then open http://localhost:8000. `python build.py` on its own just builds into `public/`.

The build prints warnings (for example, a course page listed in `data/course.yml` that has no file yet) and fails on errors such as a broken link or a missing title. `python build.py --strict` also fails on course pages that aren't written yet.

## Add or change a page

1. Create or edit a Markdown file under `content/`. Start it with front matter (see `WRITING.md`).
2. For a course page, also add it to `data/course.yml`, which sets its section and order.
3. Build and preview, then commit and push to `main`. The site updates a minute or two later.

## Add course content

The course is being written, so `data/course.yml` has no sections yet and the course page is a placeholder (`content/course/index.md`). To add a section:

1. In `data/course.yml`, add a section with an `id` and a `title`, and list its pages (each with a `slug` and a `title`). The comments in the file show an example.
2. Write `content/course/<section id>/<slug>.md` for each page, and optionally `content/course/<section id>/index.md` as the section's introduction.

Once a section exists, course pages get a course menu, previous and next links, and an "I've finished this page" checkbox. Pages listed without a file show as "coming soon".

## Publishing

GitHub Pages publishes the site from the GitHub Actions workflow, at the custom domain engineerswithai.com. The DNS records at the registrar point the domain at GitHub Pages:

| Type | Host | Value |
|---|---|---|
| A | *(blank)* | 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 (one record each) |
| AAAA | *(blank)* | 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153 (one record each) |
| CNAME | www | engineerswithai.github.io |

There should be no other A records for the bare domain, and no wildcard (`*`) records.

## Licenses

The Starter Kit templates come from the [EngineersWithAI/toolkit](https://github.com/EngineersWithAI/toolkit) repository and are MIT-licensed. IBM Plex fonts are under the SIL Open Font License (`static/fonts/`), and KaTeX is MIT-licensed (`static/katex/LICENSE`).
