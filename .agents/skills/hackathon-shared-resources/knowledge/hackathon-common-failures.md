# Hackathon Common Failures

Patterns that cause hackathon teams to underperform or lose despite having a strong idea.

---

## Category 1: Scope Failures

- **Feature creep after scope lock.** Adding features after the first 25% of the hackathon almost always results in a broken demo. Every new feature competes with polish time.
- **Building infrastructure before the demo path.** Teams that spend the first 4 hours on auth, database migrations, and deployment pipelines rarely finish the product. The demo path must be first.
- **Optimizing for code quality over demo quality.** Refactoring, testing, and CI/CD are valuable — but they cost time that should go to the demo. Judges never see the codebase.
- **Treating the MVP as the minimum, not the demo.** The hackathon MVP is the smallest slice that _looks complete to a judge_, not the smallest slice that _technically functions_.
- **Scope paralysis.** Teams that spend more than 90 minutes in ideation and cannot commit to a direction consistently underperform teams that commit early and iterate.

---

## Category 2: Technical Failures

- **Untested demo environment.** The demo works on the developer's machine but not on the judging laptop. Always test on the final demo machine at least 1 hour before judging.
- **Live API dependency without a fallback.** OpenAI, Stripe, Twilio, and other APIs have rate limits and outages. Every live API call in the demo needs a fallback recording.
- **No seed data loaded.** A demo that starts from a blank state forces the presenter to type during judging, which wastes time, introduces errors, and disrupts the narrative.
- **Auth blocking the demo.** Login screens that fail, expire, or require email verification kill momentum instantly. Use a hardcoded demo credential or skip auth entirely.
- **Integration left until the end.** When frontend and backend are developed in isolation and only connected in the final hours, integration bugs regularly sink otherwise-complete projects.
- **No error handling on demo-critical paths.** An unhandled exception on the demo path turns a winning project into a disqualified one.

---

## Category 3: Presentation Failures

- **Starting the pitch with team introductions.** Judges form their first impression in the opening 15 seconds. Teams that open with "Hi, we're Team X and we're from Y University" waste the most valuable moment.
- **Demo longer than 50% of pitch time.** A 3-minute demo inside a 3-minute pitch leaves no room for the problem, team, or vision. Cap demo time at 40–50% of total pitch time.
- **No rehearsal.** Teams that rehearse zero or one time consistently stumble over transitions, run over time, and lose confidence during Q&A. Minimum: 3 full rehearsals.
- **Apologizing for what isn't finished.** Every apology draws the judge's attention to a weakness that may not have been noticed. Pivot gracefully; never apologize.
- **Reading bullets from slides.** Judges can read. Narrate the story, not the text.
- **No answer for the obvious hard question.** Every project has one obvious attack vector (safety, scale, monetization, technical feasibility). Teams that are unprepared for it lose credibility instantly.
- **Going over time.** Judges who have 8 more teams to see will cut off a team mid-sentence. Rehearse to 80% of the limit to buffer for live demo lag.

---

## Category 4: Team & Process Failures

- **No explicit scope lock moment.** Without a clear "scope is locked" decision, individuals continue adding ideas throughout the hackathon, creating conflicts and incomplete features.
- **Parallel work with no integration plan.** Frontend and backend that are never synchronized until the final hour produce integration failures under pressure.
- **No sleep in a 36–48h event.** Decision quality, code quality, and pitch performance all degrade significantly after 20+ hours without sleep. Two 4-hour sleep windows in a 48h event beat continuous coding.
- **The "we'll figure it out" demo strategy.** Winging the demo is not a strategy. Every presenter must have a scripted flow and a fallback for every failure point.
- **Submitting in the final 15 minutes.** Platform traffic spikes near the deadline. Late submissions that fail to upload are disqualified. Submit with at least 1 hour to spare.

---

## Category 5: Judging Misalignment Failures

- **Building what sounds cool, not what matches the rubric.** Teams that read the judging rubric after building score lower than teams that build explicitly for the rubric from the start.
- **Ignoring sponsor tracks.** Most hackathons have separate sponsor prizes with separate criteria. A project that uses a sponsor API poorly beats one that doesn't use it at all.
- **Underframing impact.** Technical judges love clever implementations. Impact judges love human stories. Most panels have both. The pitch must satisfy both perspectives.
- **No differentiation from obvious solutions.** Judges see dozens of projects. Teams that do not explicitly state why their approach is different from the obvious solution invite comparison and lose.
