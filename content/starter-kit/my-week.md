---
title: "My week"
description: "A template for the shape of a normal week, which Semester HQ reads so its plans fit your real schedule."
---

`my-week.md` describes the shape of a normal week: recurring classes, labs, and other commitments, and when you actually do focused work. [Semester HQ](/starter-kit/semester-hq/) reads it so its plans fit your real schedule. Update it only when the pattern itself changes, such as at the start of a semester or after a schedule change. What's happening this particular week goes in the [context log](/starter-kit/context-log/).

## What to put in it

- **Recurring commitments.** One line per class, lab, or obligation, with the day and time.
- **Typical study blocks.** When you really do focused work. Blocks you plan and never use will mislead Semester HQ, so write down the pattern you actually follow.
- **Notes on the pattern.** Anything that makes a normal week uneven, for example "Thursdays are always tight because of lab".

## Set it up

1. Copy the template below into a new file called `my-week.md`.
2. Fill in each section. A few lines per section is enough.
3. Add the file to Semester HQ's project knowledge. If you uploaded it, replace the uploaded copy when the pattern changes.

This file is a map of where you are each week, so keep it private. The toolkit repository's `.gitignore` excludes `my-week.md`, so a filled-in copy kept in a clone of it won't be committed by accident.

## The template

The canonical file is [templates/my-week-template.md](https://github.com/EngineersWithAI/toolkit/blob/main/templates/my-week-template.md) in the toolkit repository.

```text
# my-week.md — weekly pattern template

This describes the *shape* of a normal week. Update it only when the pattern itself changes (new semester, schedule change) — not every week. For what's actually going on right now, that's `context.md`, not this file.

## Recurring commitments

- [Day, time, class / lab / obligation — one line per commitment]

## Typical study blocks

- [When you actually do focused work — real patterns, not aspirational blocks you never hit]

## Notes on this pattern

- [Anything that makes a normal week unusual — e.g. "Thursdays are always tight because of X"]
```

## An example

This filled-in version was written for this page to show the level of detail that works.

```text
## Recurring commitments

- Mon, Wed, Fri 9:00 to 9:50: Thermodynamics lecture
- Tue 13:00 to 15:50: Materials lab
- Tue, Thu 11:00 to 12:15: Statics lecture
- Wed 18:00 to 21:00: Design team build night
- Sat 10:00 to 16:00: Part-time job

## Typical study blocks

- Mon and Wed afternoons, 14:00 to 17:00, in the library
- Sunday afternoon for problem sets due Monday

## Notes on this pattern

- Tuesdays are full because of lab. Nothing new gets started on a Tuesday.
- Lab reports are due the Monday after each lab.
```
