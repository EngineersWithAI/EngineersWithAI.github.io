# Writing guide

How pages on engineerswithai.com are written and formatted. Read it before adding or editing content.

## Pages and front matter

Every page is a Markdown file in `content/`. Its path sets its address:

| File | Address |
|---|---|
| `content/about.md` | `/about/` |
| `content/starter-kit/index.md` | `/starter-kit/` |
| `content/course/level-1/first-page.md` | `/course/level-1/first-page/` |

Each file starts with front matter:

```yaml
---
title: "Page title"
description: "One sentence, under 160 characters, shown in search results."
---
```

Don't repeat the title as a `#` heading; the template prints it. Start with a short introduction, then use `##` headings, and don't skip levels (`##` then `###`).

Course pages must also be listed in `data/course.yml`, which sets their order, section, and menu entry. The comments in that file explain how.

## Markdown you can use

- Standard Markdown: paragraphs, lists, links, emphasis, tables, and fenced code blocks with a language (` ```python `).
- Callouts, rendered as plain boxes. Use them sparingly.

  ```
  !!! note "Title"
      Indented body text.
  ```

  Types: `note`, `tip`, `warning`, `danger`, `example`.
- Collapsible blocks, for answers to exercises:

  ```
  ??? success "Answers"
      Indented body.
  ```

- Checklists: `- [ ] item`.
- Math, rendered with KaTeX: inline `$E = mc^2$`, or a display equation on its own lines between `$$` markers.
- Internal links: absolute paths ending in a slash, such as `[Community](/community/)`. The build fails on a broken internal link.
- Community boards: `[Questions](/community/#questions)` links to a board's section on the community page. The link target `community:<board id>` goes straight to the board on GitHub, and a line `[[posting-template: <board id>]]` inserts the board's posting template. Boards are defined in `data/community.yml`.

Don't use raw HTML, emoji, images, icons, or badges.

## Style

Write like an experienced engineer explaining something to a capable junior colleague.

- Plain, specific, direct. Second person ("you"), active voice, short paragraphs, sentence-case headings.
- Be concrete: real quantities, units, standards, and tools. Show the numbers.
- Define a term the first time you use it.
- American spelling. SI units first, US customary units where the field uses them.
- Use lists and tables only when the content is list-shaped.
- Use em dashes rarely. No exclamation marks, emoji, or rhetorical questions.
- Avoid words and patterns that read as filler or generated text: delve, leverage, unlock, harness, empower, elevate, streamline, supercharge, revolutionize, seamless, cutting-edge, game-changer, transformative, crucial, "in today's fast-paced world", "it's important to note", "let's dive in", "not just X, but Y", "it's not X, it's Y", and sentences that exist only to sound good. If a sentence could appear on any website about anything, delete it.

## Accuracy

- Never invent facts, statistics, quotes, studies, citations, URLs, datasets, product features, or company practices. If you can't source it, leave it out.
- Link every non-obvious factual claim to its primary source, and date numbers that change ("Boeing says…, December 2025").
- Don't present text as something an AI tool said unless it's a real, reproducible transcript. A made-up example for an exercise must be labeled as written for the site.
- Tools change fast. Don't hard-code prices, plan names, or model names; describe capabilities and link the vendor's page.
- Run every calculation and every code example before publishing it. Show only output you actually produced.
- For laws and regulations, say what the rule says, with its date and a link, and send readers to their employer's compliance team. It isn't legal advice.

## Privacy

- The site may say that Engineers with AI started at UIUC. Don't name the founder or add personal details about anyone.
- Nothing from private planning material (outreach drafts, contact lists, speaker leads) goes on the site.
