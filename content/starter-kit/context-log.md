---
title: "Context log"
description: "An append-only log of what's going on right now, so Semester HQ knows your situation without you re-explaining it every session."
---

`context.md` is a running log of what's going on: upcoming deadlines, how the week is actually going, and anything that changes what useful support looks like right now. [Semester HQ](/starter-kit/semester-hq/) reads the newest entries first and treats the log as the source of truth for anything that has changed since you wrote [My week](/starter-kit/my-week/).

It exists because a chat in a Claude project doesn't see what was said in other chats unless it's in the project knowledge ([Claude Help Center](https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects)). Without the log, you'd re-explain your situation at the start of every session.

## Rules for the log

- **Append only.** Add a new entry each time something changes that Claude should know about. Don't edit old entries.
- **Date every entry.** Start each entry with the date, and put the newest entries at the bottom.
- **Keep entries short.** A few bullet points each is enough.

## What goes in an entry

- Deadlines that are coming up or have moved.
- How the week is actually going, including when you're behind or short on time.
- Anything that should change what normal support looks like right now.

Write only what you're comfortable storing in the AI service you use. The toolkit repository's `.gitignore` excludes `context.md`, so a copy kept in a clone of it won't be committed by accident.

## Set it up

1. Copy the template below into a new file called `context.md`.
2. Write your first entry.
3. Add the file to Semester HQ's project knowledge. If you uploaded it, replace the uploaded copy after you add entries, so the project sees the current version.

## The template

The canonical file is [templates/context-log-template.md](https://github.com/EngineersWithAI/toolkit/blob/main/templates/context-log-template.md) in the toolkit repository.

```text
# context.md — running context log

Append-only. Add a new entry each time something changes that Claude should know about — don't edit old entries, just add new ones. Keep entries short; this is a log, not a journal.

## [Date]

- [What's going on: upcoming deadlines, how the week's actually going, anything that changes what "normal" support should look like right now]

---

*Start every new entry with the date. Newest entries go at the bottom.*
```

## An example entry

This entry was written for this page to show the level of detail that works.

```text
## 2026-10-05

- Statics exam moved from Friday to Thursday. The fluids lab report is due Thursday too.
- Working extra shifts this week, so I have about half my usual study time.
```
