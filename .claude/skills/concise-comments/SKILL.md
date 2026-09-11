---
name: concise-comments
description: Write short code comments in plain, everyday words using this repo's //* //? //! //TODO: markers. Use this whenever you add or edit a comment in any .ts/.tsx file here — including comments written as a side effect of adding a function, action, schema, component, or Prisma model, and when a review or cleanup pass touches comments. Also use it when asked to "simplify the comments", "make comments concise", "explain this in simpler words", or when a comment runs past one line.
---

# Concise Comments

Comments in this repo are short labels in plain words. They mark what a block does so the file can be skimmed. They are not paragraphs of prose, and they don't restate the code.

The failure mode to avoid is a comment that reads like documentation: two or three lines, an em-dash mid-thought, and a precise-sounding word the reader has to slow down for. It feels thorough while making the file harder to skim than no comment at all.

## Markers

| Marker    | Use for                                              |
| --------- | ---------------------------------------------------- |
| `//*`     | a plain note — the default, covers almost everything |
| `//?`     | a known issue or open question                       |
| `//!`     | a warning: something that breaks if changed          |
| `//TODO:` | work left to do                                      |

## The shape

**Default to a label of three to six words.** Most comments just name the step:

```ts
//* initialize where input
//* global filter
//* check if existing
//* create account
//* if isDefault, update others to isDefault: false
```

**Add a reason only when the code cannot show it.** Worth a clause when the code looks wrong, arbitrary, or easy to "fix" into a bug — an order that matters, a guard against something non-obvious, a workaround. Then keep it to one line:

```ts
//! navigate before refresh — refreshing here 404s when the code was renamed
//* a deleted row is invisible everywhere it would be offered, so it can never be the default
```

**One line, always.** If it needs two, the comment is explaining too much — cut to the single fact the reader needs. A comment that wraps past the 140-column print width is too long.

**Skip the comment when the name already says it.** `//* delete the user` above `deleteUser(...)` is noise.

## Plain words

Prefer the word you'd use out loud. Precise-sounding vocabulary costs the reader a beat and rarely buys accuracy:

| Instead of       | Write            |
| ---------------- | ---------------- |
| non-alphanumeric | punctuation      |
| desync / diverge | get out of sync  |
| outlive          | still work after |
| degrades to      | falls back to    |
| derived from     | comes from       |
| restated         | repeated         |
| invalidate       | clear            |
| enforce          | check            |
| shadows          | overrides        |

Established terms of art are fine when they're the clearest option — `soft-deleted`, `foreign key`, `transaction`, `race`. The test is whether a plainer word would say the same thing.

Write lowercase, like the surrounding comments. No trailing period on a label.

## Em-dashes

One em-dash joining a label to its reason is the pattern this repo already uses, and it reads well. Two in one comment means the thought is too big for a comment — split it or cut it.

## Examples

**1. Too long**

Before:

```ts
//! the trim is derived from REF_CODE_SEPARATOR, not hardcoded — a name like 'Corollary Resolution (if applicable)'
//! ends in a non-alphanumeric and would otherwise keep a dangling separator
```

After:

```ts
//* matches separators at the start or end, so a name ending in punctuation keeps no dangling one
```

Two lines and "non-alphanumeric" became one line and "punctuation". The `//!` was also wrong — nothing breaks here, so it's a `//*`.

**2. Restating the code**

Before:

```ts
//* map over the permissions array and filter out the ones with no actions, then create the rows
```

After:

```ts
//* create new role permissions
```

**3. Reason worth keeping**

Before:

```ts
//* revoke sessions
```

After:

```ts
//! revoke the EDITED user's sessions, not the caller's — revokeOtherSessions reads the admin's own cookies
```

Here the plain label hides the trap, so the reason earns its line.

## Checking your own comment

Before moving on, reread it and ask: is any word one I wouldn't say out loud? Does it survive on one line? Does it tell the reader something the code doesn't? If the answer to the last one is no, delete it — a deleted comment is a good outcome, not a failure.
