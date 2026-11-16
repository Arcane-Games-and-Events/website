# The AGE design system

Everything new on the site is built from this system.

## Where things live

| What                                            | Where                                              |
| ----------------------------------------------- | -------------------------------------------------- |
| Tokens (every colour, radius, shadow, typeface) | `src/lib/ds/tokens.css`, imported by `src/app.css` |
| Components                                      | `src/lib/ds/*.svelte` — import from `$lib/ds`      |
| Icons                                           | `src/lib/ds/icons.js`                              |
| Token names for the page and the contrast pairs | `src/lib/ds/tokens.js`                             |
| The rules, checked                              | `tests/unit/design-system.test.js`                 |

## Two looks, light and dark

- **Editorial** is the public site: paper, ink, Libre Franklin and Newsreader, square corners. It's the default, so pages that don't choose a look keep today's styling.
- **App** is for working tools (the admin, Desk, Classroom, Studio and stores): zinc neutrals, Inter, softly rounded, lifted cards.
- **Choosing a look:** a wrapper sets `data-look="app"` or `data-look="editorial"`.
- **Dark mode:** the `dark` class on that wrapper or an ancestor.
- **Components don't change:** the tokens change underneath them.

## The rules

1. **Scales:** use only Tailwind's own scales (`text-sm`, `p-4`, `h-9`, `rounded-card`). No one-off values in brackets.
2. **Colour comes from tokens:**
   - `bg-surface`, `text-fg-muted`, `border-border`, `bg-accent`, `text-success-text`…;
   - or a brand colour: `bg-prem`, `bg-studio`, the circuits.
   - No raw hex and no Tailwind palette colours in components.
   - A colour that comes from data, such as a circuit's colour, goes through the CSS variable `--tone` (`bg-(--tone)`).
3. **One component per job:**
   - Look in `$lib/ds` before writing markup.
   - The `class` prop is for layout only (margins, width), never for restyling.
   - If a component is missing something, add it to the component.
4. **Status colours mean status:**
   - green = paid or done, amber = needs a look, red = failed or destructive, sky = news;
   - always with words, not colour alone.
5. **One main action:** one primary (accent) button per view. Destructive actions are danger buttons that ask first; in menus they go last.
6. **Readable everywhere:**
   - text reaches 4.5:1 contrast in every look and mode (tested);
   - visible focus;
   - icon-only buttons have a label;
   - phone touch targets are at least 40px.
7. **Calm motion:** 150ms for colour, 200ms for movement, `ease-out`, and `motion-reduce:` on anything that moves.
8. **Phones first:** works at 390px with no sideways scrolling.

The unit test enforces rules 1, 2 and 6 for everything in `src/lib/ds`.

## Type, space, shape

- **Type:**
  - `text-xs` for badges, table headings and counts;
  - `text-sm` for interface text and labels;
  - `text-base` for reading;
  - `text-lg`, `text-xl` and `text-2xl` for titles;
  - `text-3xl` for figures.
  - Weights: 400, 500 and 600.
  - Use `tabular-nums` for numbers that line up.
- **Space:** steps 1, 2, 3, 4, 6, 8, 12 and 16. Page gutters are `px-4 sm:px-6 lg:px-8`, inside `max-w-7xl`.
- **Controls:** `h-9` (small `h-8`, large `h-10`).
- **Shape and depth:**
  - corners: `rounded-control`, `rounded-card`, `rounded-pill`;
  - shadows: `shadow-raised` (cards and controls), `shadow-overlay` (menus, dialogs, toasts).

## Components

| Group      | Components                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| Actions    | Button, IconButton, ButtonGroup                                                                               |
| Forms      | Field, Input, Textarea, Select, Checkbox, RadioGroup, Switch, SearchInput, SegmentedControl                   |
| Display    | Badge, Avatar, Card, Stat, StatGroup, List, ListItem, Table, ProgressBar, Skeleton, EmptyState, Spinner, Icon |
| Feedback   | Alert, Toaster with `toast()`                                                                                 |
| Navigation | Tabs, Pagination, Breadcrumbs, Menu with MenuItem                                                             |
| Overlays   | Dialog, ConfirmDialog (with `typeToConfirm` for what can't be undone), Sheet                                  |
| Patterns   | AppShell, PageHeader, FormSection, Wordmark                                                                   |

Each component's header comment lists its props.

## Adding to the system

1. **A new token:** add it to all four blocks in `tokens.css` and to the `@theme` list, and name it in `tokens.js`. If it's a text colour, add its pairs to `CONTRAST_PAIRS`.
2. **A new component:**
   - goes in `src/lib/ds`, is exported from `index.js`;
   - uses tokens and Tailwind scales only (the test checks);
   - has a header comment saying what it's for and its props.
