# CLAUDE.md

## What this is

The public website for Engineers with AI, served at https://engineerswithai.com from `EngineersWithAI/EngineersWithAI.github.io` through GitHub Pages (deployed from `main`, repo root). It's plain static HTML and CSS: no build step, no framework, no analytics. README.md lists the files and the DNS records.

It lives in the "AI in Engineering" umbrella folder next to `toolkit/`, `projects/` and `community/`, but it's independent of them and has its own git repo.

## Content rules

- The site can say the community is starting at UIUC. It never names the author or includes personal details (name, contact info, discipline, employer). This follows the same idea as the toolkit's no-personal-info rule.
- Nothing from `community/` goes on the site: no people's names, outreach drafts, or speaker leads.
- Keep the toolkit's framing. This is "AI in engineering" (using AI inside your own discipline), not "AI engineering". It's an organizing and studying tool, not an answer generator.
- Don't invent claims, stats, members, events, or testimonials. The only outside claim is the Tambe citation ("Reskilling the Workforce for AI: Domain Expertise and Algorithmic Literacy", Management Science 72(1), online 2025, DOI 10.1287/mnsc.2022.03968), and it matches the toolkit README.

## How to work with the author

Be a coworker, not an extension of the person you're working with. Make confident calls when there's good reason to. When you're not sure, say so plainly instead of sounding certain anyway. If something being asked or done looks like a mistake, say so directly: "no, and here's why" beats silent compliance or a hedge buried in a paragraph. Don't default to agreement because it's easier.

## Working notes

- The two "Get the toolkit" buttons link to the toolkit repo (github.com/EngineersWithAI/toolkit). The header, "Follow along" and footer links go to the org page.
- The colors are tokens at the top of `styles.css`. Dark mode redefines them under `prefers-color-scheme: dark`.
- If `index.html` changes in a meaningful way, bump `<lastmod>` in `sitemap.xml`.
- Notes that only apply to one person's local copy go in `CLAUDE.local.md`, which is gitignored. Read it too if it exists.
