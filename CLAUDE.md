# CLAUDE.md

## What this is

The source for engineerswithai.com, the public website of Engineers with AI. It lives in the "AI in Engineering" umbrella folder as `website/`, next to `toolkit/`, `projects/`, and `community/`, and is its own git repository (`EngineersWithAI/EngineersWithAI.github.io`). GitHub Actions builds it with `build.py` and publishes it to GitHub Pages on every push to `main`.

The site has three parts:

- **Starter Kit** (`content/starter-kit/`): the toolkit's templates and examples as readable pages. The canonical templates live in the `EngineersWithAI/toolkit` repository; if they change there, update these pages to match.
- **Course** (`content/course/`, `data/course.yml`): being written by the author. Right now it's a placeholder page with no sections. Don't write course content unless asked.
- **Community** (`content/community/`, `data/community.yml`): three GitHub Discussions boards (Show and tell, Questions, Problems to solve) in the EngineersWithAI organization.

## Before changing anything

- Read `README.md` (how the build works and how to add pages), `DESIGN.md` (design system and the patterns that make a site look AI-generated, all banned), and `WRITING.md` (style, accuracy, and privacy rules).
- Build with `python build.py` and fix every error. Screenshot changed pages in light and dark mode at desktop and phone widths before calling it done.

## Content rules

- The site may say the community is starting at UIUC. It never names the author or includes personal details.
- Nothing from the private `community/` folder (names, outreach drafts, speaker leads) goes on the site.
- No invented facts, figures, quotes, sources, or AI transcripts. Link primary sources and date numbers.
- Follow the "Rules for public use" in the project's research notes: date every number, attribute company figures, don't call a pilot a deployment.

## How to work with the author

Be a coworker, not an extension of the person you're working with. Make confident calls when there's good reason to. When you're not sure, say so plainly instead of sounding certain anyway. If something being asked or done looks like a mistake, say so directly: "no, and here's why" beats silent compliance or a hedge buried in a paragraph. Don't default to agreement because it's easier.

## Working notes

- Machine-specific notes (how git behaves from Cowork's VM, for example) go in `CLAUDE.local.md`, which is gitignored. Read it too if it exists.
