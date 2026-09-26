---
title: "Workflow examples"
description: "Four engineering coursework situations and what using AI well looks like in each: simulations, hand calculations, reports, and dense technical reading."
---

These are real engineering coursework situations, each with a weaker and a better way to use AI. In every case the better use keeps you doing the engineering thinking, and uses AI to make that thinking faster or better checked. The example requests were written for this page; adapt them to your own work.

## A simulation that won't converge

**Weaker use:** paste the whole script and ask the AI to fix it.

**Better use:** describe what you expect physically and what you're actually seeing, and ask for help narrowing down where the divergence comes from: a bad initial condition, a time step that's too large, or a sign error. You want to understand the bug. Code that happens to run doesn't give you that.

```text
I'm simulating a mass-spring-damper in Python with explicit time stepping.
m = 1 kg, k = 1000 N/m, c = 2 N·s/m, time step 0.01 s, released from rest at 0.05 m.
Physically I expect a decaying oscillation. Instead the oscillation grows: the
displacement passes 2 m after one second of simulated time.
Don't rewrite my code. Help me narrow down where the growth could come from,
and what I should check first.
```

Working through it this way, you'd check the physics first (the damping is positive, so the true response decays) and then the numerics. For this system, the plain forward Euler method is unstable at any time step longer than c/k = 0.002 s, however correct the rest of the code is. Knowing that tells you to shorten the step or change the integration scheme, and why.

## Sanity-checking a hand calculation

Ask AI to check your work for unit consistency and order-of-magnitude sanity, and keep the calculation itself yours. "Does 400 kN sound right for this size beam under this load?" is a useful question. "What's the answer?" is not.

```text
I calculated the maximum bending moment in a simply supported steel beam:
span 6 m, uniform load 20 kN/m including self-weight. Using M = wL²/8 I got
M = 90 kN·m. Check my units and whether the magnitude is sensible for a beam
this size. Don't redo the calculation; tell me what looks off, if anything.
```

If it flags something, check the point yourself against your notes or textbook before you change your answer.

## Scaffolding a lab or design report

AI can help with structure: what sections a report like this needs, how to organize results so they're clear, and how to phrase something you already understand but are struggling to write cleanly. It should never write the analysis, findings, or conclusions. Those have to be yours, because that's the point of the assignment and because AI can't verify physical results it didn't generate.

```text
I'm writing a lab report on tensile tests of aluminum specimens. Suggest a
section structure and what belongs in each section. Don't write any analysis
or conclusions; I'll write those from my own data.
```

Your course's report guidelines come first. Use the AI's structure only where it fits them.

## Parsing a dense datasheet or technical reading

Ask for a structured summary of what matters for your specific use, then verify the numbers you actually need against the original source before you use them anywhere real. Treat the summary as a map to the material, and read the relevant sections yourself.

```text
Attached is the datasheet for a MOSFET I'm considering for a 12 V, 5 A motor
driver. List the parameters that matter for this use, with the page and table
where each one appears, so I can check them in the datasheet.
```

Asking for page and table references makes the check quick. It also catches a common loss in summaries: a datasheet gives each value under stated conditions (a MOSFET's on-resistance, for example, is specified at a particular gate voltage and temperature), and a summary that drops the conditions can mislead you.

## Where these fit

These examples follow the way the [course project template](/starter-kit/course-projects/) tells Claude to help. For the checks themselves, read [Know when it's wrong](/starter-kit/know-when-its-wrong/).
