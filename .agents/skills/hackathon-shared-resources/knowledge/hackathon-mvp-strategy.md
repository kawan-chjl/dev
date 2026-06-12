# Hackathon MVP Strategy

The MVP-first principle for hackathon development: ship the smallest thing that demonstrates real value and survives a live demo.

---

## Core Principle

> Ship the demonstration of value, not the product.

A hackathon MVP is not a minimum viable product in the startup sense. It is the minimum demonstrable proof of concept — the smallest working slice that makes judges believe the idea works.

---

## The Three MVP Tests

Before writing a line of code, every feature must pass these tests:

1. **Demo Test** — Does this feature appear in the demo flow?
2. **Wow Test** — Does this feature contribute to the wow moment?
3. **Judge Test** — Will a judge notice if this feature is missing?

Features that fail all three tests are deferred.

---

## Scope Hierarchy

```
MUST ship (demo blockers)
├── Core mechanism that proves the concept works
├── The wow-factor feature
└── The user journey that frames the demo

SHOULD ship (if time allows)
├── Onboarding or setup screen
├── Secondary use case
└── Real data instead of mocked data

WILL NOT ship (explicitly deferred)
├── Auth and user accounts
├── Error handling and edge cases
├── Admin dashboards
├── Settings or configuration UIs
├── Performance optimization
└── Mobile responsiveness (unless it IS the demo)
```

---

## The Fake-It-First Rule

If building the real version takes more than 30% of remaining time, fake it first and replace it later if time allows.

| Real Implementation         | Acceptable Hack                      |
| --------------------------- | ------------------------------------ |
| Live ML inference           | Pre-computed results for demo inputs |
| Third-party API integration | Mocked API response JSON             |
| Database with real records  | Hardcoded seed data                  |
| Auth system                 | Single hardcoded user session        |
| Real-time sync              | Page refresh with pre-loaded state   |
| Payment flow                | "Payment processed" mock screen      |

**Rule:** Never fake the wow-factor feature. That one must be real.

---

## Time Budget Allocation

For any hackathon duration, allocate time as follows:

| Phase                      | Allocation |
| -------------------------- | ---------- |
| Ideation & scoping         | 5–10%      |
| Core mechanism build       | 35–40%     |
| Demo flow wiring           | 15–20%     |
| UI polish (demo path only) | 10–15%     |
| Integration & testing      | 10%        |
| Pitch & presentation prep  | 15–20%     |

If the core mechanism is not working by the 50% time mark, cut scope.

---

## Scope Cutting Decision Tree

```
Is this feature in the demo flow?
├── NO → Defer it
└── YES → Can it be faked?
    ├── YES → Fake it, note the debt
    └── NO → Is it the wow feature?
        ├── YES → Protect it; cut something else
        └── NO → Can the demo flow work without it?
            ├── YES → Cut it
            └── NO → Simplify the demo flow
```

---

## Common MVP Mistakes

| Mistake                         | Consequence                         |
| ------------------------------- | ----------------------------------- |
| Building auth first             | Wastes 3–5 hours on non-demo value  |
| Polishing non-demo screens      | Judges never see them               |
| Pursuing feature breadth        | Dilutes demo impact                 |
| Over-engineering the data model | Slows down every subsequent feature |
| Waiting for perfect data        | Mock it and move on                 |
| Building for scale              | Premature optimization kills MVPs   |

---

## MVP Done Criteria

An MVP is done when:

1. The demo flow runs end-to-end without crashing.
2. The wow-factor feature works and looks good.
3. A non-team-member can understand what the product does in 30 seconds.
4. The team can run the demo 5 times in a row without rehearsal.
