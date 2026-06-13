# Lane B owns the consuming ports; Lane C provides implementations

Lane B's check-in pipeline (B3) and verdict handling (B4) depend on Lane C's
evidence adapters and structured LLM calls, which are built in parallel. We
apply dependency inversion: **Lane B defines the interfaces it consumes** — the
`EvidenceAdapter` Protocol (spec §10.1) plus `EvidenceBundle`/`Verdict` types and
a narrow `LLMClient` port for the intake/plan/check-in/verdict calls — in a
module Lane B controls (`app/contracts.py`), and ships **deterministic in-repo
stubs** so the scheduler, state machine, WS hub, and `check now` run end-to-end
today. Lane C swaps real implementations behind the identical signatures.

## Considered options

- **C owns the interfaces, B imports them** — rejected: B3 (Phase 3) would block
  on C2/C3, which are mid-flight in the same phase.
- **B defines ports but ships no stubs (mock-only tests)** — rejected: no working
  demo path or integration test reachable from Lane B alone.

## Consequences

- A "fake judge"/"fake GitHub" lives in the repo by design; it must be obviously
  labelled as a stub so no one mistakes it for the real adapter.
- The stub LLM/judge are also the deterministic demo levers (a stub that always
  returns a fixed verdict is exactly what a scripted demo wants) — they stay
  useful even after Lane C lands, behind a flag.
