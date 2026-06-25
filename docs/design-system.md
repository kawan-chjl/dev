# Kawan Design System (v2 — redesign north star)

> Supersedes `docs/design.md` (v1 "Warm Witness") where they differ. Source inputs: beige.social (palette), noteworthy.studio (aesthetics/type/motion), `1.png` (card dashboard), SolarSim `/home/adam/CS/solar-layout-generator/frontend` (app-shell structure + behavior), and three PO directives: split-partition auth, warm dark theme, **zero emdashes in any app copy**.

## 0. Principles (HCI first)

1. **Warm, not clinical.** Cream + espresso, never white-on-black. Soft shadows, rounded cards, generous whitespace.
2. **Plain language, no jargon.** Headings/subheads/descriptions a first-time user understands instantly. No internal terms (no "soft context", "hard fields", "TR-xx", "escalation tier", "lapse"). Rephrase to human words.
3. **Zero emdashes (—).** Anywhere in product copy. Use a period, comma, "so", or parentheses instead. (Audit found ~109 source hits, mostly comments + copy to rewrite.)
4. **One thing at a time.** Kawan holds you to a single commitment. The UI should never feel like a busy SaaS; the dashboard is calm.
5. **Character through restraint.** Personality lives in Fraunces-italic emphasis words + occasional hand-drawn squiggle motif + the Live2D companion, not loud animation.
6. **Accessible.** Body text AA (4.5:1) on its surface; focus rings; 44px tap targets; respects `prefers-reduced-motion`.

## 1. Color tokens

### Light (default)

```
--bg:            #ECE5DC   /* warm oat canvas (beige linen) */
--surface:       #F6F1EA   /* cards/raised — lighter warm */
--surface-2:     #FBF8F3   /* topmost (inputs, popovers) */
--surface-sunk:  #E2D8CB   /* wells, track backgrounds */
--ink:           #3A2A1E   /* primary text — deep espresso (AA on bg) */
--ink-soft:      #6E5849   /* secondary text / espresso-brown (beige noir) */
--ink-faint:     #9C8A7A   /* captions, placeholders */
--line:          #D8CCBD   /* hairline borders */
--line-strong:   #C8B7A4
--accent:        #D9643A   /* burnt orange — fills/CTA (beige pumpkin, deepened) */
--accent-press:  #B8502C   /* pressed / accessible accent TEXT on cream */
--accent-tint:   #F7E2D5   /* accent wash (selected card, badges) */
--sage:          #A9B388   /* secondary accent (calm/positive) */
--sage-deep:     #7C8A5A   /* sage text/fills (moss) */
--sage-tint:     #E7ECDA
--clay:          #B18973   /* tertiary warm neutral (beige sandal) */
--success:       #7C8A5A   /* = sage-deep (verified/on-track) */
--warning:       #C98A3C   /* amber (slipping, gentle) */
--danger:        #B8502C   /* = accent-press (missed; used sparingly) */
```

### Dark (warm, `[data-theme="dark"]`)

Modeled on SolarSim's warm-dark (espresso near-black, NOT `#0c0a09` cold). Vetted: hues stay in the orange/brown family; no blue-gray.

```
--bg:            #1A140F   /* warm espresso near-black */
--surface:       #241B14   /* cards */
--surface-2:     #2E231A   /* raised */
--surface-sunk:  #140F0B
--ink:           #F4ECE1   /* warm off-white */
--ink-soft:      #C9B6A4
--ink-faint:     #8C7867
--line:          #3A2C20
--line-strong:   #4A3829
--accent:        #E4733D   /* brightened burnt orange */
--accent-press:  #F0875A
--accent-tint:   #3A2218
--sage:          #B7C091
--sage-deep:     #9CA977
--sage-tint:     #28281C
--clay:          #C49A82
```

**Live2D stage** uses a dark band in BOTH themes (the character pops on dark): a near-black warm vignette `#161009` behind the model, regardless of theme (this is noteworthy's light/dark banding applied — warm UI, dramatic dark stage).

## 2. Typography

- **Display / personality:** `Fraunces` (variable serif). Headings use the upright cut; **Fraunces _italic_ is the "voice"** applied only to emotionally-loaded words (Kawan's quips, verdicts, the one emphasized noun in a heading) — this is noteworthy's dual-voice move done with one warm serif.
- **UI / body:** `Inter` (system-ui fallback). All controls, labels, body copy, data.
- **Word-level accent:** in display headings, swap the key noun to `--accent` color and/or Fraunces-italic (beige's emphasis technique). Use once per heading, max.

Scale (keep current, add display-lg):

```
--text-display-lg: 3.5rem;  --text-display: 2.75rem;  --text-h1: 2rem;
--text-h2: 1.5rem;  --text-h3: 1.25rem;  --text-body: 1rem;
--text-small: 0.875rem;  --text-caption: 0.75rem;
--lh-heading: 1.12;  --lh-body: 1.55;
--tracking-label: 0.08em;  /* tracked-out uppercase mini-labels (beige/SolarSim) */
```

## 3. Shape, elevation, motion

```
--radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px;
--radius-card: 20px;   /* bento cards (noteworthy 1.25–1.5rem) */
--radius-xl: 28px; --radius-pill: 999px;
--shadow-sm: 0 1px 3px rgba(58,42,30,.06), 0 1px 2px rgba(58,42,30,.04);
--shadow-md: 0 8px 24px rgba(58,42,30,.10);
--shadow-lg: 0 20px 48px -16px rgba(58,42,30,.22);   /* floating pills / popovers */
--shadow-pill: 0 6px 20px rgba(58,42,30,.16);
--glass-bg: linear-gradient(135deg, rgba(246,241,234,.72), rgba(246,241,234,.55));
--glass-border: rgba(58,42,30,.10);
--blur-nav: blur(20px) saturate(180%);
--blur-backdrop: blur(12px);
--duration-ui: 180ms; --duration-panel: 220ms;
--ease-out: cubic-bezier(.16,1,.3,1);
--ease-smooth: cubic-bezier(.4,0,.2,1);   /* noteworthy motion */
```

Motion: restrained + eased. Scroll-reveal (fade+rise 8px) on cards; subtle parallax allowed on the Live2D stage only. All gated by `prefers-reduced-motion: reduce` → no transforms.

## 4. App shell (4 layers — SolarSim structure/behavior, Kawan tokens)

Replace `ShellLayout` + `NavSidebar` + `Topbar` + `ScrollRevealFooter` with this. Desktop content offset = collapsed sidebar width (64px) via `margin-left`.

**Layer 1 — Sidebar (hover-expand).** `<aside data-sidebar>` fixed left, `z-60`, `width 64↔200px` (CSS transition `width 150ms var(--ease-smooth)`, defined in CSS so React never resets it). Collapsed shows centered icons (`w-8`); on `:hover` (`group/sidebar`) labels + section headings crossfade in (`opacity 0→1 150ms`), and a soft shadow + expanded backdrop appear. Active item: `--accent-tint` bg + 2px rounded `--accent` left bar. Logo strip at top (height 56px = topbar), name fades in on expand. Mobile: slide-in drawer (`translate-x`), dim backdrop, body-scroll lock, close on route change. Icons: a lightweight icon set (inline SVG or `lucide-react` if added) — Home, Commitments, Timeline, Settings.

**Layer 2 — Topbar (glass).** `<nav>` fixed top, `z-50`, height 56px, `backdrop-filter: var(--blur-nav)`, `--glass-bg`, bottom hairline. Left: page title / breadcrumb (plain words). Right: **theme toggle** (sun/moon), **Chutes balance pill**, **persona/account menu** (avatar = persona glyph, popover with Settings + Sign out, eased framer-style scale/fade). Mobile: hamburger opens the drawer.

**Layer 3 — Content.** `<main>` offset `padding-top: 56px; margin-left: 64px` (desktop). Pages are centered `max-width` columns of **bento cards**. Calm, airy, not dense.

**Layer 4 — Foldover footer.** Keep Kawan's scroll-reveal behavior (already fixed: `.shell-page { flex: 1 0 auto }` pins footer to bottom on short pages, reveals on scroll for long). Restyle: dark warm band, "Kawan is watching, with your permission." (no emdash), footer nav.

**Ambient blur-blobs:** two large fixed radial `--accent`/`--sage` blobs at low opacity behind everything (`-z-10`, blur 120–140px) for warm depth (SolarSim's treatment).

## 5. Auth (split partition — PO directive)

`min-h-screen flex`. **Left brand panel** (`hidden lg:flex w-1/2`): warm gradient (`--accent → deeper terracotta`), ambient blur blobs, Kawan **eye logo** top, big Fraunces heading + one-line tagline mid, faint footer meta bottom. **Right form panel** (`flex-1`, centered `max-w-sm`): heading ("Welcome to Kawan" / "Let's get you set up"), **Sign in with Chutes** (primary), **Continue as guest** (secondary), one-line plain explainer of what Chutes sign-in gives you, theme toggle top-right. No email/password (removed). `/sign-up` redirects to `/sign-in` already.

## 6. Components

- **Card (bento):** `--surface`, `--radius-card`, `--shadow-sm`, 1px `--line`; hover lift to `--shadow-md`. Selected (persona): `--accent` ring + `--accent-tint`.
- **Button:** primary = `--accent` fill / `--surface` text; secondary = `--surface` + `--line` border; ghost = transparent. Pill or `--radius-md`. 44px min height. Press = `--accent-press`.
- **Pill / chip:** tracked-out mini-labels; status chips use sage/amber/accent tints.
- **Floating pill** (optional): soft-shadow logo/menu pill pattern for the workspace overlay.
- **Inputs:** `--surface-2`, `--line`, focus ring `--accent`.
- **Stat / number:** large Fraunces figure + small tracked label (1.png "+20%" pattern).

## 7. Copy / HCI renames (no jargon, no emdash)

| Current (jargon)                                       | Rewrite (human)                                    |
| ------------------------------------------------------ | -------------------------------------------------- |
| "Soft context intake"                                  | "A few questions about your goal"                  |
| "Hard fields are locked"                               | "Only you can change these"                        |
| "Check-in tone: Gentle/Direct/Blunt"                   | keep tone words; label "How Kawan checks in"       |
| "Skip days 0/1"                                        | "Rest days left: 1"                                |
| "Escalation"                                           | "How firm Kawan is"                                |
| "Roadmap appears here once Kawan reviews your context" | "Your plan shows up here after we talk it through" |
| "Kawan is watching — with your permission."            | "Kawan is watching, with your permission."         |
| empty value `—`                                        | "Not set" / "None yet"                             |
| "Audit log: every hard-field change"                   | "History: every change you made"                   |

(Full sweep during rebuild; the above are anchors.)

## 8. Build approach

- Pure CSS tokens + `[data-theme="dark"]` block (no Tailwind/shadcn import; match Biome style). Theme stored in `localStorage` + `prefers-color-scheme` initial, toggled in the topbar; set `data-theme` on `<html>`.
- Keep React 18 + Vite + the three-zone architecture + VN workspace (archetype C) + all working functionality (SIWC+Guest auth, personas, Live2D, timeline, WS).
- Add icons (inline SVG set, or `lucide-react` as a dep) for the sidebar/topbar.
- Fonts already loaded (Fraunces + Inter); ensure Fraunces italic axis is available.
- Live2D stage gets a dark warm band background in both themes.
  </content>
