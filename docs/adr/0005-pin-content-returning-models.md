# Pin structured calls to content-returning models, not the reasoning models

Our whole AI layer reads the model's answer from `choices[0].message.content` and
`json.loads()`-es it (`ChutesClient.structured`, spec §9.2). The live Chutes TEE
catalog's strong _reasoning_ models — Kimi-K2.6, Qwen3.5-397B, and (intermittently)
Qwen3.6-27B — return HTTP 200 but emit their output to `reasoning_content`, leaving
`content` null or empty. `json.loads(None/"")` then raises, and Chutes' inline
comma-failover only fires on non-200, so it never rescues a 200-with-null-content. Net
effect: the vision judge (those two were the configured pair) failed 100% of the time,
and any persona on a reasoning primary failed intermittently.

We therefore **pin every structured call to the two TEE models that reliably populate
`content`: `gemma-4-31B-turbo` (text + image) and `DeepSeek-V3.2` (text).** The vision
judge — which must accept an image — uses gemma-4 (the only reliable content-returning
multimodal TEE model); personas and the GitHub text judge use the gemma-4 / DeepSeek
pair. `scripts/smoke_chutes.py --invoke` now asserts each configured model returns
_parseable `content`_ (not merely HTTP 200), so this regression class is caught before
activation.

## Considered options

- **Keep per-persona diversity across the big reasoning models** (the Gate-1
  "best-effort diversity" choice) — rejected once measured: those models don't return
  usable `content`, so diversity bought intermittent or total failure.
- **Make `structured()` fall back to `reasoning_content`** — rejected: it is
  chain-of-thought prose with the JSON embedded mid-text, not reliably parseable for the
  real verdict/workspace schemas; too fragile for a live demo.
- **Disable thinking per model (`enable_thinking=false` / `chat_template_kwargs`)** —
  rejected for now: model-specific, untested across the catalog, fragile under time
  pressure. A post-demo option if the bigger judges are wanted back.

## Consequences

- Tone diversity now comes from the **per-persona system prompt**, not the base model
  (only two reliable models remain) — acceptable, since tone was always prompt-driven.
- gemma-4 also showed **variable >60 s latency** on long chat prompts (persona*qa.py), so
  personas run DeepSeek-V3.2 primary (fast) with gemma-4 as failover; gemma-4 is a
  \_primary* only for the vision judge, where no faster content-returning multimodal TEE
  model exists (a residual latency risk to confirm in the live screenshot beat).
- The screenshot vision judge runs on a single model (gemma-4); no reliable
  content-returning multimodal TEE failover exists today. The stub backend + demo
  determinism levers remain the on-stage backstop.
- The `--invoke` gate is now part of activation: it must pass (parseable content per
  model) before flipping `KAWAN_AI_BACKEND=chutes`.

## Update — diversity restored by the transport fix

The "disable thinking + json_object" option above (then rejected as fragile) was
implemented at the transport layer in `c1d87f7` (merged via #72): `structured()` now
disables thinking (`chat_template_kwargs={"enable_thinking": False}`), uses
`response_format: json_object` with a schema reminder, and parses via `_extract_json`.
Re-validating the dropped models **through that real path** (2× each, live): **gemma-4
(~4–6 s — the >60 s latency is gone), DeepSeek-V3.2, and Kimi-K2.6 all return
schema-valid `content` fast.** So per-persona diversity is **restored** — kawan→gemma-4,
adik→DeepSeek-V3.2, cik_maid→Kimi-K2.6, each with gemma-4 as the (fastest) failover. The
two **Qwen** TEE chutes stay out: they now **400 on the `enable_thinking` payload**.
`smoke_chutes.py --invoke` was rewritten to call through `structured()` so the gate
reflects this. The vision judge stays gemma-4 (Kimi-vision not yet validated with an image).
