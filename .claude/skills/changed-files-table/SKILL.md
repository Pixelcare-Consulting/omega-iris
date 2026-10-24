---
name: changed-files-table
description: List the files the current work added, modified, or deleted as a two-column table. Runs only when the user types /changed-files-table.
disable-model-invocation: true
---

# changed-files-table

Show a two-column table of every file the work added, modified, or deleted. Git decides what goes in the table, not memory.

## 1. Collect the files

Uncommitted work:

```bash
git status --porcelain
```

If the work made commits, also diff from the commit it started on:

```bash
git diff --name-status <base>..HEAD
```

`<base>` is the commit the user passed, as in `/changed-files-table HEAD~3`. Without one, use the last commit before this session's first commit. If this session made no commits, list the uncommitted work alone.

For an untracked folder (`?? some/dir/`), list the files inside it, not the folder.

## 2. Filter

Keep only files this work touched. Leave out:

- changes that were already in `git status` before the plan started
- `docs/superpowers/` plans and specs
- generated output, such as `prisma/generated/`

## 3. Write the table

The columns are `File` and `Change`. The Change cell is the status word in bold, a colon, then a one-line description written the way the next section says.

```markdown
| File                                | Change                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `actions/calendar.ts`               | **Added**: `getCalendarEvents` by date window, `upsertCalendarEvent`, soft delete and restore |
| `app/(protected)/calendar/page.tsx` | **Added**: calendar page, redirects users without `view` on `p-calendar`                      |
| `constants/config.ts`               | **Modified**: Calendar menu item under Records, gated on `p-calendar`                         |
| `prisma/schema.prisma`              | **Modified**: `CalendarEvent` model, linked to `RefCalendarEventType` for colour              |
| `lib/old-helper.ts`                 | **Deleted**: colour lookup moved to `lib/full-calendar-color.ts`                              |
```

- Use one of these status words: **Added**, **Modified**, **Deleted**, **Renamed**. For a rename, write `old/path.ts` → `new/path.ts` in the File cell.
- Group the rows as Added, then Modified, then Renamed, then Deleted. Within a group, sort by path.
- Write paths relative to the repo root, in backticks.
- Put nothing after the table except open items, such as a failed lint or a step you skipped.

If nothing changed, say "No files changed" and skip the table.

## Writing the description

Run `git diff <base> -- <file>` for each modified file before you write its row. For an added file, read its exports. Write the description from what you read.

A good description names the thing and what it now does:

- **The names.** The function, component, field, model, route, or permission code that changed, in backticks.
- **The behaviour.** What that thing now does, or does differently. "Filters out soft-deleted rows" or "defaults dates to the council's term".
- **For a deletion,** where the code went, or that nothing replaced it.

Keep it to one line, about 8 to 15 words. If a file has several changes, name the two that matter most.

| Weak                | Meaningful                                                              |
| ------------------- | ----------------------------------------------------------------------- |
| update user actions | `upsertUser` rejects a duplicate email with a `paths` error on `email`  |
| add form            | `RefCouncilMemberForm` modal, dates default to the council's term       |
| fix bug             | `getItems` now filters `deletedAt: null`, so deleted items stop listing |
| refactor            | `buildColumnFiltersWhere` moved from the page into `lib/data-table.ts`  |
| update schema       | `Item.councilCode` is now optional, so items can exist before a council |
