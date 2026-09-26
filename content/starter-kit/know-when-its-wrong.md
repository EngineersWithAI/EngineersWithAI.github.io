---
title: "Know when it's wrong"
description: "How AI tools get engineering details wrong while sounding right, and the checks that catch it. The most important page in the Starter Kit."
---

This is the skill the whole Starter Kit exists to build. AI tools are fluent, confident, and sometimes wrong in ways that sound completely plausible to someone without the domain background to catch it. Your engineering knowledge is what separates using AI well from being quietly misled by it.

## Example 1: unit consistency

Asked to convert a stress or a load, an AI tool can give you a number in the wrong unit system while the explanation around it reads perfectly. It is reproducing the shape of a unit conversion without checking the arithmetic the way someone who has done it by hand many times would.

**How to catch it:** check the magnitude against physical intuition every time, and don't assume a conversion is right because it looks tidy.

For example, 1 ksi (1,000 lbf/in²) is about 6.9 MPa, so a stress of 250 MPa is about 36 ksi. A result of 1,724 ksi means the value was multiplied by 6.9 instead of divided. A result of 36,260 ksi means psi and ksi were mixed up (36,260 psi is the right value in psi). A rough estimate before you read the answer catches both: at about 7 MPa per ksi, 250 MPa has to be a few tens of ksi.

## Example 2: plausible material properties

Asked for a property of a material, such as a yield strength or a thermal conductivity, an AI tool can produce a number that is the right order of magnitude and sounds confident, but is wrong for the specific alloy, temper, temperature, or condition you're working with. It is recalling a general value instead of the value for your exact case.

**How to catch it:** verify every material property against an actual datasheet or handbook before it goes into a real calculation, especially anything safety-relevant.

The condition can matter a great deal. ASM's data sheet gives a typical yield strength of 55.2 MPa (8,000 psi) for 6061 aluminum in the annealed temper, 6061-O ([ASM Material Data Sheet](https://asm.matweb.com/search/SpecificMaterial.asp?bassnum=ma6061o)). The same alloy in a heat-treated temper such as T6 is much stronger, so a value quoted for "6061 aluminum" with no temper can be far off for your part.

## The general pattern

AI is good at producing something with the right shape: the structure of a correct answer, the tone of confidence, the right units mentioned even when the value itself is wrong. Domain expertise is what lets you check the substance. That judgment has to come from somewhere, and it has to be yours.

## Checks to run

These are the core checks. Each example above fails at least one of them: the unit error fails the order-of-magnitude check, and the material property fails the primary-source check.

- **Units and dimensions.** Carry units through every step, and check that both sides of each equation have the same dimensions.
- **Order of magnitude.** Estimate the answer roughly before you look at the AI's number.
- **Limiting cases.** Set a parameter to zero or make it very large, and check that the result behaves the way the physics says it must.
- **Conservation.** Mass, energy, and charge that go in must come out or be stored.
- **Independent recalculation.** Work the key number a different way: by hand, in a spreadsheet, or with a simpler model.
- **The primary source.** Find every property, clause, and citation in the original document. If you can't find it there, don't use it.

If you catch an AI tool getting an engineering detail wrong, post it on [Show and tell](/community/#show-and-tell) with the question you asked, the answer you got, and the check that caught it.
