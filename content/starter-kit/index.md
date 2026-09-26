---
title: "Starter Kit"
description: "Claude Project templates and worked examples for engineering students starting to use AI in their courses. Free and MIT-licensed."
---

The Starter Kit is the basic level of Engineers with AI. It is a set of Claude Project templates and worked examples for engineering students who are starting to use AI in their courses. It helps you keep your context across courses, plan your weeks, and study with AI while doing the thinking yourself.

It is an organizing and studying system. Nothing in it is designed to produce work you hand in as your own. If you use these templates to have AI write your lab report's analysis, you've missed the point: the system exists to make you faster and sharper, and it can't do that if the AI does the work.

## Why it exists

Building AI systems and using AI as a tool inside the discipline you already work in, such as aerospace, mechanical, or civil engineering, are different jobs. This kit is for the second.

A study published in *Management Science* found that AI and algorithms complement domain expertise, and create the most value when the ability to work with them is spread widely across a workforce instead of concentrated among specialists ([Tambe, 2025](https://pubsonline.informs.org/doi/10.1287/mnsc.2022.03968)). An engineer who knows their discipline and uses AI well can check and apply what the tools produce in a way that neither a specialist without the engineering nor an engineer without the tools can.

## What's in it

- [Semester HQ](/starter-kit/semester-hq/): a Claude Project template that coordinates across all your courses, covering deadlines, workload, and the view of the whole semester.
- [Course projects](/starter-kit/course-projects/): a template for one project per course, built to plug into Semester HQ. It works through problems with you instead of handing you answers.
- [My week](/starter-kit/my-week/): a template for the shape of a normal week, updated only when the pattern changes.
- [Context log](/starter-kit/context-log/): an append-only log of what's going on right now, so you don't re-explain your situation every session.
- [Workflow examples](/starter-kit/workflow-examples/): four engineering coursework situations and what using AI well looks like in each.
- [Know when it's wrong](/starter-kit/know-when-its-wrong/): the most important page in the kit. How AI gets engineering details wrong while sounding right, and how to catch it.

## Set it up in four steps

You need a Claude account. The templates use Claude's projects feature: a project holds instructions and reference files that apply to every chat inside it ([Claude Help Center](https://support.claude.com/en/articles/9517075-what-are-projects)).

1. **Create Semester HQ.** In Claude, create a new project called "Semester HQ". Open its project instructions, paste in the [Semester HQ template](/starter-kit/semester-hq/#the-template), and replace everything in square brackets with your own details.
2. **Create one project per course.** For each course, create a separate project from the [course project template](/starter-kit/course-projects/#the-template), filled in with your syllabus and course details.
3. **Write your weekly pattern and context log.** Fill in the [My week](/starter-kit/my-week/) and [Context log](/starter-kit/context-log/) templates, save them as `my-week.md` and `context.md`, and add both files to Semester HQ's project knowledge. A chat in a project doesn't see what was said in other chats unless it's in the project knowledge ([Claude Help Center](https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects)), so these two files are how Semester HQ knows your situation.
4. **Read [Know when it's wrong](/starter-kit/know-when-its-wrong/) before you rely on any of it.** It's short, and it's the part that matters most.

!!! note "How many projects you can create"
    Claude's help center says free accounts can create up to five projects (checked September 2026). Semester HQ plus four courses uses all five. If you take more courses than that, give projects to the courses where you'll use them most.

You can keep `my-week.md` and `context.md` anywhere Semester HQ can read them. If you keep them in a copy of the toolkit repository, its `.gitignore` already excludes both filenames, so your personal details won't be committed by accident.

## The ideas behind it

The templates favor judgment over fixed rules. A checklist can't adapt to a week that doesn't fit the pattern, so the templates ask Claude to decide what matters from your actual context, and to say when it's unsure instead of giving a generic answer. Treat the templates the same way: change whatever doesn't fit how you work.

Every template also tells Claude to act like a coworker: confident when it has reason to be, plain about what it doesn't know, and direct when it thinks you're making a mistake. A system that only ever agrees with you doesn't help you think.

## If you use a different assistant

The templates are plain text. If you use another AI assistant, paste them wherever it keeps standing instructions for a group of chats, and check how it handles reference files before you rely on it.

## License and source

The Starter Kit is released under the MIT License. You can use, change, and share the templates; if you share copies, keep the license notice with them. The canonical files are in the [EngineersWithAI/toolkit](https://github.com/EngineersWithAI/toolkit) repository on GitHub, and each page here links to its file.

## Next step

The Starter Kit covers organizing and studying. A full course on using AI in engineering work itself is [in development](/course/). Until it's ready, share what you try and ask questions on the [community boards](/community/).
