# Workspace side drawers, design

Date: 2026-06-29
Status: approved (decisions captured below), implementing

## Problem

The per-commitment workspace floats four to five islands (Context, Plan, Activity, Check-In,
Finish) in two absolutely-positioned columns over the Live2D stage. They crowd the stage and
intercept the dialogue. The owner wants an uninterrupted stage with the islands tucked into two
slide-in drawers, one per screen edge.

## Decisions (from the owner)

1. Open/close: hover the edge label to peek the drawer out; mouse-leave closes it; clicking the
   label pins it open (also the touch and keyboard path).
2. While any drawer is open: blur and dim everything except the drawer(s).
3. Island split stays on its current side: left drawer holds Plan + Activity, right drawer holds
   Context + Check-In + Finish.
4. Demo tour: auto-open the relevant drawer for each step so the spotlight lands on the island
   inside it.

## Architecture

A single presentational component, `WorkspaceDrawer` (in `src/zone2/WorkspaceDrawer.tsx`):

```
interface WorkspaceDrawerProps {
  side: 'left' | 'right'
  label: string
  open: boolean          // controlled by the parent
  instant?: boolean      // disable the slide transition (used for tour-forced opens)
  onHoverChange: (hovered: boolean) => void
  onToggle: () => void   // pin toggle
  children: ReactNode
}
```

It renders an edge-anchored `<aside>` with an always-visible vertical tab (the label) and a panel
holding the islands. Closed, the aside is translated off-screen so only the tab pokes in. Open, it
slides to `translateX(0)`. The tab is absolutely positioned so it never affects the panel's box and
the spotlight can measure the panel cleanly.

`WorkspaceLayout` owns the open state so it can coordinate a single backdrop:

- `pinned: { left, right }` toggled by the tab.
- `hovered: 'left' | 'right' | null` from `onHoverChange` (the cursor is only ever in one place).
- `tourDrawer`: derived `'right'` during the `islands` / `checkin` / `finish` substeps, else null.
- `leftOpen = pinned.left || hovered === 'left'`
- `rightOpen = pinned.right || hovered === 'right' || tourDrawer === 'right'`
- A `.ws-drawer-backdrop` renders when either is open; clicking it unpins both. Hover-opened
  drawers close on their own via mouse-leave.

## Layering (z-index)

- backdrop: 44, `backdrop-filter: blur` + dim. Everything painted below it (stage, dialogue at
  z <= 40) blurs; the drawers and topbar, painted above, stay sharp.
- drawers: 46 (above the backdrop, below the topbar at 50, so the topbar stays usable).
- demo spotlight ring/tooltip: 69 (unchanged), draws its accent ring over the open drawer.

## Demo tour integration

The spotlight is a `pointer-events: none` ring positioned from the target's
`getBoundingClientRect`, so the only requirement is that the target island be on-screen when its
step is active. We force the right drawer open (and `instant`, so no slide lag mis-measures the
ring) during `islands`, `checkin`, and `finish`. The `islands` step's target moves from the deleted
`.workspace-island-topright` to the right drawer aside (`.ws-drawer--right`); `.checkin-island` and
`.finish-island` keep their classes (the islands just move into the drawer) and resolve once it is
open.

## Cleanup

The old `.workspace-island-topleft` / `.workspace-island-topright` columns (JSX + CSS) are orphaned
by this change and removed.

## Out of scope

No change to island internals (expand/collapse, evidence persistence, scroll), the dialogue box,
or the stage. No new island. Touch users get the click-to-pin path; the hover peek is a desktop
enhancement, not a requirement.

```

```
