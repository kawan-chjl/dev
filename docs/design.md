# Kawan — Design Direction ("Warm Witness")

> **Status:** working north-star for the **skeleton build**. A full redesign pass follows once the
> skeleton stands — treat exact values as locked-enough-to-build, not final. Source references:
> the eye logo (`kawan-logo`), a warm editorial co-working SaaS layout, and a set of
> Claude-style hand-drawn doodle illustrations (terracotta + sage, medium-bold black outlines).

---

## 1. Concept

Kawan is a **skeptical-but-fair accountability companion**. The brand mark is an **eye** — watching,
witnessing, _"I see you."_ The product should feel like a **candid friend with taste**: warm, hand-made,
human, and a little editorial — never corporate-clinical, never cold-surveillance.

Two moods, one palette:

- **Credible** — the structure borrows from premium editorial SaaS (rounded cards, pill buttons, lots of air).
- **Warm & playful** — the soul is hand-drawn: medium-bold doodle line-art, grid-paper and halftone textures, a terracotta accent that is "where the eye looks."

**Design values (non-negotiable):** _excellent UX & HCI_ — clarity over cleverness, low-friction flows
(compose in <30 s, spec §5), obvious affordances, forgiving states, and microcopy that matches the
three-valued verdict (`unclear` never punishes).

---

## 2. Color tokens

| Token            | Hex         | Role                                                               |
| ---------------- | ----------- | ------------------------------------------------------------------ |
| `--bg`           | `#F4F0E9`   | app background — warm bone/cream (from logo field)                 |
| `--surface`      | `#FBF9F4`   | cards / raised panels — a hair lighter than bg                     |
| `--surface-sunk` | `#E7E0D4`   | sunken/secondary surfaces, input wells                             |
| `--ink`          | `#2A211C`   | primary text + doodle outlines — warm near-black (never pure #000) |
| `--ink-soft`     | `#6B5F55`   | secondary text                                                     |
| `--muted`        | `#B8AFA2`   | borders (use at ~50–60% via `--line`), disabled, hairlines         |
| `--line`         | `#2A211C1F` | hairline borders — ink @ ~12%                                      |
| `--accent`       | `#C16A47`   | **terracotta — the iris.** The single signature color              |
| `--accent-press` | `#A8552F`   | terracotta active/pressed                                          |
| `--sage`         | `#AFC2B4`   | secondary — calm / momentum / positive states                      |
| `--sage-deep`    | `#7E9684`   | sage text/icon on light                                            |
| `--evening`      | `#2E2722`   | AI-workspace deep backdrop (Zone 2) so Haru + terracotta pop       |

**Contrast rules (HCI, AA):**

- Body text is always `--ink` / `--ink-soft` on light, or cream on `--ink`/`--evening`.
- **Terracotta fails AA for small body text on cream** (~2.9:1). Use it only for: fills, large/bold
  headings, icons, borders, and active accents — never small paragraph text.
- **Primary button = espresso fill (`--ink`) + cream text** (mirrors the reference's dark pill; safest contrast).
  Terracotta is the _secondary emphasis / active_ color, not the default button fill.

---

## 3. Typography

| Use                           | Family                                 | Notes                                           |
| ----------------------------- | -------------------------------------- | ----------------------------------------------- |
| Display / headings            | **Fraunces** (warm transitional serif) | soft, characterful — gives editorial warmth     |
| Character voice (chat, Kawan) | **Fraunces** (lighter weight/italic)   | Kawan _speaks_ in serif — feels human, literary |
| UI / body / forms / data      | **Inter** (humanist sans)              | maximum legibility for the SaaS shell           |

Scale (rem, 1rem = 16px): `display 2.5–3.5` · `h1 2` · `h2 1.5` · `h3 1.25` · `body 1` · `small 0.875` · `caption 0.75`.
Line-height: 1.15 headings, 1.55 body. Tracking: slightly tight on large serif display.

---

## 4. Shape, elevation & spacing

- **Radii:** `sm 8` · `md 12` · `lg 16` · `xl 24` (cards) · `pill 999`. The references are **generously
  rounded** — prefer `lg`/`xl` for cards, `pill` for buttons & chips.
- **Borders:** hairline `--line`; doodle/illustration strokes are **medium-bold** (3–4px, rounded caps).
- **Shadows:** soft and **warm-tinted**, almost none. `0 2px 8px rgba(42,33,28,.06)`,
  `0 8px 24px rgba(42,33,28,.08)` for raised/overlay. No hard grey drop-shadows.
- **Spacing:** 4px base scale (4 · 8 · 12 · 16 · 24 · 32 · 48 · 64). Whitespace is a feature — let it breathe.

---

## 5. Iconography & illustration

- **Icons:** line icons, medium-bold, rounded caps/joins, often inside a **rounded-square chip**
  (`md`/`lg` radius, `--surface-sunk` or `--ink` fill for active — see the reference's value cards).
- **Doodles ("Claude-inspired"):** hand-drawn black medium-bold line-art for empty states, onboarding,
  section spots, and Kawan's "thinking" moments. Keep them loose and human, not vector-perfect.
- **Textures (sparingly):** subtle **grid/graph-paper** and **halftone dot** fills as section backgrounds —
  echoes the reference, reinforces the hand-made notebook feel.
- **The momentum journey:** the squiggle-line-with-dots from the reference _is_ the timeline/momentum
  motif — a hand-drawn path with **terracotta iris-dots** marking check-ins. Reuse it for A4.
- **The eye motif:** the terracotta iris-dot is a recurring **presence glyph** — Kawan's thinking
  indicator, the active check-in pulse, momentum dots. Idle = the eye relaxes. Tasteful recurrence only.

---

## 6. Layout — three zones

**Zone 0 — Landing page (public, pre-auth).** A marketing front door at `/` — hero stating the
skeptical-companion promise, the eye motif, a doodle or two, and a single primary CTA: **Sign in with
Chutes (SIWC)**. Warm cream, editorial, generous; sets the brand tone before anyone signs in. No app chrome.

**Zone 1 — SaaS shell (de-emphasized, character-free).** A familiar dashboard with tabs
(**Home · Commitments · Timeline · Settings**), bright cream, airy, quiet — the credible container,
_not_ the star. Built as **four stacked layers** (z-order, top → bottom):

1. **Nav sidebar** — top layer; an **overlay drawer** that renders _over_ content when open (not a
   static push-column). On mobile: off-canvas drawer + bottom tab bar.
2. **Topbar** — app header (logo, context title, account).
3. **App content** — the scrolling content plane (rounded cards).
4. **Footer** — bottom layer with a **fold-over / scroll-reveal** behavior: content lifts to expose it
   at the end of scroll. _(Confirm exact fold behavior.)_

**Zone 2 — AI workflow (the hero, character-present).** Commitment creation (Compose → Context → Plan),
workspace chat, and check-ins — staged as a **light-novel / RPG dialogue** experience (Genshin, Wuthering
Waves), full-screen with Haru on an `--evening` stage. **Two interchangeable views over one shared
conversation state:**

- **Stage mode (default, cinematic):**
  - **Kawan speaking** → a floating **dialogue overlay at bottom-center** (VN dialogue box: speaker name +
    Fraunces serif line, tap/advance, driven by voice + lip-sync).
  - **Kawan asks / user must act** → a floating **action surface at middle-center**: RPG-style option
    cards, a structured action modal, or an open-question text input — whichever the turn calls for.
- **Messages mode (toggle button):** flips to a familiar **messaging interface** (iMessage/Messenger
  style) — full conversation history, free-text input, and the AI's prompted actions rendered **inline**
  in the thread. Same conversation, different surface.

Stage mode is mobile-native by construction; Messages mode is the power-user / catch-up view.

**Cross-platform is a core requirement, not a polish item.** Kawan is a single responsive web app that
must feel native and beautiful on **both desktop and mobile**: the shell sidebar collapses to a drawer +
bottom-nav, the VN stage and messaging modes map cleanly to small screens. Design every skeleton screen
mobile-first _and_ desktop-up from the start.

The terracotta accent and the eye/doodle motifs are the thread tying the quiet shell to the lively workflow.

---

## 7. Core component patterns

- **Buttons:** primary = espresso pill (`--ink` fill, cream text); secondary = outline pill (`--line`
  border, ink text); accent = terracotta pill for the single most important CTA on a surface. Generous
  hit areas (≥44px), clear hover/active/focus.
- **Cards:** `--surface`, `xl` radius, hairline border, soft warm shadow. **Selected/active card** =
  filled `--ink` (or terracotta) with inverted text — the reference's standout pattern; reuse for the
  persona picker and option selects.
- **Inputs / sentence-builder:** large, low-friction, `--surface-sunk` wells, pill or `md` radius.
  Compose reads like a sentence with fill-in chips. AI-read-only hard fields look visibly locked.
- **VN dialogue box (Stage mode):** bottom-center overlay — speaker name + Fraunces line, tap-to-advance,
  voice/lip-sync driven. **Action surface (Stage mode):** middle-center floating option cards / action
  modal / open-question input. **Messaging thread (Messages mode):** Kawan = serif on a terracotta-tinted
  bubble, user = sans on `--surface-sunk`, AI actions inline; proposal cards carry `[Apply]` / `[Dismiss]`.
- **Momentum:** the doodle journey-line with terracotta iris check-in dots + celebration/identity beats.

---

## 8. Motion

Subtle, warm, purposeful. Ease-out ~180–240ms for UI; the character's idle + lip-sync carries the life.
Respect `prefers-reduced-motion`. No bouncy/springy excess — friendly, not childish.

---

## 9. Accessibility & HCI checklist

- AA contrast on all text (see §2 terracotta caveat); visible focus rings on every interactive element.
- Hit targets ≥44px; keyboard-navigable; semantic landmarks for the shell tabs.
- Forgiving, plain-language microcopy; `unclear` verdicts read neutral/curious, never punishing.
- Loading/empty/error states designed (use doodles for empty states), not afterthoughts.

---

## 10. Deferred to the redesign pass

Final palette/contrast lock, the full Fraunces/Inter weight set + licensing, real doodle asset
production, dark/evening-mode polish, and motion choreography. **Responsive cross-platform is NOT
deferred — it is core (§6).** Build the skeleton against §1–§9; don't gold-plate before the redesign.
