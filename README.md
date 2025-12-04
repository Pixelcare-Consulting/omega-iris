# Iris | Omega

Omga GTI Inventory Management System

### Folder Structure

- app/ - next.js app directory
- components/ - global reusable custom components
- components/form - global reusable custom form components
- components/acl - global reusable custom acl components
- components/providers - global reusable custom providers
- constants/ - global constants
- hooks/ - global react custom hooks
- hooks/safe-actions/ - global react custom hooks for next-safe-actions
- prisma/ - prisma schema and migration files
- public/ - public static files
- public/images/ - public static images
- schema - reusable zod schema/types
- styles/ - global custom styles
- styles/devextreme/ - devextreme custom theme styles
- types/ - global custom types
- utils/ - global custom reusable utility functions

### DevExtreme Themes

#### Basic Settings

- Base size: **Normal**
- Accent color: **rgba(237, 28, 36, 1)**
- Text color: **rgba(2, 6, 23, 1)** `slate-950`
- Page background color: **rgba(255, 255, 255, 1)** `white`
- Component background color: **rgba(255, 255, 255, 1)** `white`
- Border color: **rgba(226, 232, 240, 1)** `slate-200`
- Border radius: **6px**
- Success color: **rgba(74, 222, 128, 1)** `green-400`
- Warning color: **rgba(250, 204, 21, 1)** `yellow-400`
- Danger color: **rgba(239, 68, 68, 1)** `red-500`
- Hover state text color: **rgba(23, 2, 2, 1)**

#### Typography

- Label color: **rgba(2, 6, 23, 1)** - `slate-950`
- Link Color: **rgba(2, 6, 23, 1)** - `slate-950`
- Icon color: **rgba(2, 6, 23, 1)** - `slate-950`
- Arrow icon color: **rgba(2, 6, 23, 1)** - `slate-950`

#### DataGrid

- Border radius: **6px**

#### Card View

- Empty cover icon color: **rgba(2, 6, 23, 1)** - `slate-950`
- Border color: **rgba(226, 232, 240, 1)** `slate-200`
- Link Color: **rgba(2, 6, 23, 1)** - `slate-950`
- Text color: **rgba(2, 6, 23, 1)** - `slate-950`
- Icon color: **rgba(2, 6, 23, 1)** - `slate-950`

#### Scheduler

- Appointment background color: **rgba(250, 205, 206, 1)**

#### Editors

- Text color: **rgba(2, 6, 23, 1)** - `slate-950`
- Other month text color: **rgba(237, 28, 36, 1)**

#### List

- Icon color: **rgba(2, 6, 23, 1)** - `slate-950`

#### Accordion

- Item title text color: **rgba(2, 6, 23, 1)** - `slate-950`

#### Stepper - Disabled Step

- Text color: **rgba(148, 163, 184, 1)** - `slate-400`

#### Tabs

- Disabled tab color: **rgba(148, 163, 184, 1)** - `slate-400`
- Disabled tab border color: **rgba(148, 163, 184, 1)** - `slate-400`
- Disabled tab icon color: **rgba(148, 163, 184, 1)** - `slate-400`

### DevExtreme Themes CSS modification

- Used `--font-inter` variable to change font family
- Commented / not include `dx-theme-fluent-typography` for headings
- changed - `color: #5a77f1;` to `color: #94A3B8;` (`slate-400`)
