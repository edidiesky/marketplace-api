# Writing Technical Docs Like a Senior Engineer / EM
6 modules x 4 days = 24 days. Order: README -> API Design Doc -> TDD -> Tradeoffs Doc (ADR) -> Runbook -> Postmortem.

This order is deliberate. It roughly follows a service's lifecycle: README is the front door that exists from day 1, API design and TDD happen before/during build, ADRs accumulate throughout, runbooks come online once you're in production, postmortems happen after things break. By the end you'll have a full doc set for one running example service.

We'll use ONE running example service throughout (pick something from your real backlog, or I'll give you a synthetic "order notification service" if you'd rather not use real work). Every module's practice builds on the same service so the docs stay consistent with each other, which is itself a lesson: in real orgs these docs cross-reference each other constantly.

---

## Module 1: README

**Day 1, Lecture: Audience and scope**
The README's job is to get a new engineer from "I have repo access" to "I can run this and make a change" in under 15 minutes, and to get an on-call engineer to "I know where to look" in under 60 seconds. That's it. Two audiences, both time-pressured. Everything else (why decisions were made, architecture rationale) belongs in a linked TDD/ADR. A README that explains WHY you chose Postgres is failing its actual job, which is telling someone HOW to run the thing.

**Day 2, Lecture: Anatomy and anti-patterns**
Standard sections, roughly in this order: one-line description of what the service does and who uses it, local setup (prereqs, install, run, test, in commands that can be copy-pasted), architecture diagram or 3-sentence summary with a link to the full TDD, key configuration/env vars and what they control, deploy process or link to it, links: runbook, dashboards, on-call rotation, related TDDs/ADRs. Anti-patterns: setup instructions that are stale because nobody re-runs them (this is the #1 README failure, test yours on a clean machine), a wall of architecture prose that duplicates the TDD and will drift out of sync with it, missing the "who do I talk to / where do I look when this breaks" pointer entirely.

**Day 3, Practice**
Write the README for your example service. Constraint: actually try following your own setup steps from a clean checkout (or mentally walk through them line by line) and fix anything that doesn't work as written.

**Day 4, Review checklist**
- Can a new hire run the service locally using ONLY this doc?
- Does it link out to TDD/runbook/dashboards rather than duplicating their content?
- Is anything in here likely to go stale within a month, and if so, can it be replaced with a link to a source of truth instead of inline text?

---

## Module 2: API Design Doc

**Day 1, Lecture: When this is its own doc, and contract-first thinking**
As discussed, this is standalone when other teams build against your API independently of your internal design, otherwise it's a section of your TDD. The core discipline is contract-first: define the request/response shapes, error model, and versioning strategy BEFORE implementation, because changing an API after consumers integrate is 10x more expensive than changing internals. Write your contracts as actual TypeScript interfaces/types, not prose descriptions, prose hides ambiguity that types force you to resolve.

**Day 2, Lecture: Structure and the parts people forget**
Sections: resource model (what entities exist, their relationships), endpoint list with request/response types and status codes, error model (consistent error shape across all endpoints, what error codes mean), auth/authz model, versioning strategy (how do you ship breaking changes, URL versioning vs header vs field-level deprecation), pagination/filtering conventions, rate limiting if relevant. The parts people forget: error model consistency (every endpoint inventing its own error shape is the most common API design failure I review) and versioning strategy (decided AFTER the first breaking change request comes in, which is too late).

**Day 3, Practice**
Write the API design doc for your example service's primary external-facing API (even if currently it's internal-only, treat it as if another team will consume it). Include: resource model, 3-5 endpoint contracts as TS interfaces, error model, versioning approach.

**Day 4, Review checklist**
- Are error responses structured identically across every endpoint?
- If you need to add a required field to a response in 6 months, does your versioning strategy say how?
- Could a consumer team generate a client from your types alone, without asking you questions?

---

## Module 3: TDD (Technical Design Doc)

This module reuses the structure from our earlier discussion, condensed into 2 lecture days since the API/data-model portions now have their own treatment from Module 2.

**Day 1, Lecture: Overview, Context, Goals/Non-Goals, and Design**
Overview answers why this exists in under 5 sentences. Context describes what exists today and why it's insufficient (cite a metric or incident, not "it'd be nice"). Goals are measurable outcomes, Non-Goals are explicit, slightly uncomfortable scope cuts. The Design section gives architecture at the altitude where a teammate could predict your PR's shape: components, data model changes, primary data flow happy path, then failure-mode data flows. Reference your Module 2 API doc here rather than re-deriving the contracts.

**Day 2, Lecture: Why this doc exists and how it's read**
The TDD is read differently by different people: a peer engineer checks "will this work and is it the simplest thing that works," a senior/staff engineer checks "does this fit how the rest of the system is built, what does it cost us in 2 years," an EM checks "is the scope right, what's the risk if this slips, what cross-team dependencies exist." Write knowing all three readers exist. The most common failure is writing only for the first reader.

**Day 3, Practice**
Write Overview, Context, Goals/Non-Goals, and Design for your example service's next significant change (a new feature, a scaling fix, whatever's realistic). Link to your Module 2 API doc instead of repeating it.

**Day 4, Review checklist**
- Does Context cite something concrete (metric, ticket volume, incident) as the motivation?
- Does the Design section let a teammate predict the shape of the implementation?
- Would each of the three reader types (peer, staff eng, EM) find what they're looking for?

---

## Module 4: Tradeoffs Doc / ADR

**Day 1, Lecture: What makes a decision ADR-worthy, and format**
Not every decision needs a doc. ADR-worthy decisions share traits: hard or expensive to reverse later, affects multiple people/teams, or you expect someone to ask "wait, why did we do it this way" in 6 months. Format is deliberately small: Title, Status (proposed/accepted/superseded), Context (1 paragraph: what forced this decision), Decision (1-2 sentences, stated plainly), Consequences (what you're accepting, both good and bad). Numbered and kept in `/docs/adr/`, never deleted, only superseded by a new ADR that links back.

**Day 2, Lecture: Writing honest tradeoffs, avoiding post-hoc rationalization**
The single most common failure in tradeoffs writing is reverse-engineering justification for a decision you already made for other reasons (often: familiarity, deadline pressure, what a senior person preferred). That's fine, but say so. "We chose X primarily because the team has production experience with it and we have a 2-week deadline; Y would likely be the better long-term choice but the learning curve cost is too high for this iteration" is an honest ADR. It also means when circumstances change (more time, more team experience), the ADR itself signals "revisit this."

**Day 3, Practice**
Write 2 ADRs for decisions embedded in your Module 3 TDD, things you decided but didn't fully justify there. Be honest about non-technical factors (deadline, team familiarity, existing infra) if they were real factors.

**Day 4, Review checklist**
- Is the "Decision" stated in 1-2 sentences, unambiguously, without hedging?
- Are Consequences honest about downsides, not just upsides?
- If a non-technical factor (deadline, familiarity) drove the decision, is that stated rather than hidden behind technical-sounding justification?

---

## Module 5: Runbook

**Day 1, Lecture: Audience is a stressed person at 3am**
Runbook readers are under time pressure, possibly unfamiliar with the service (cross-team on-call rotations are common), and possibly half-asleep. Every assumption of context you'd normally rely on is gone. Structure: list of alerts this service can fire and what each one means in plain terms, for each alert: likely causes ranked by frequency, diagnostic steps with EXACT commands/dashboard links (not "check the logs," but "run `kubectl logs -n orders deployment/order-svc --tail=200` and look for X"), remediation steps including how to roll back a deploy or fail over, escalation path (who to page if remediation doesn't work, and when to give up and escalate).

**Day 2, Lecture: Anti-patterns and the "could a stranger follow this" test**
Anti-patterns: steps that assume tooling access or knowledge specific to the original author ("run the usual script," whose script, where), diagnostic steps without a clear "if X then do Y, if Z then do W" branching structure (a wall of "things to check" with no decision tree is nearly useless at 3am), and runbooks that exist but were never updated after the architecture changed (worse than no runbook, because it actively misleads). Test: could someone from a different team, who has never touched this service, follow this and at least correctly diagnose the problem.

**Day 3, Practice**
Pick 2-3 realistic failure modes for your example service (informed by the cross-cutting concerns / failure data flows from your Module 3 TDD) and write runbook entries for each: alert, likely causes, diagnostic steps with concrete commands, remediation, escalation.

**Day 4, Review checklist**
- Are diagnostic steps concrete commands/links, not vague instructions?
- Is there a clear branching structure (if this, then that) rather than a flat checklist?
- Could someone outside your team follow this and make progress?

---

## Module 6: Postmortem

**Day 1, Lecture: Blameless, and the standard structure**
Postmortems exist to fix systems, not assign blame, because blame-oriented postmortems make people hide information next time, which is strictly worse for the org. Structure: Summary (what happened, impact, duration, in 2-3 sentences), Timeline (timestamped sequence of events: detection, escalation, mitigation, resolution, in UTC, with sources like alert links or commit hashes), Root Cause(s) (plural is normal, incidents are usually multi-causal), Impact (users affected, revenue/SLA impact, quantified where possible), Action Items (specific, owned, with target dates, split into "prevents recurrence" vs "reduces detection/mitigation time").

**Day 2, Lecture: Root cause vs proximate cause, and action items that actually happen**
The proximate cause is the thing that directly triggered the incident (a bad deploy, a dependency outage). The root cause is usually about WHY that trigger was able to cause this much damage: missing alerting, no canary deploy, a single point of failure, insufficient rate limiting on a dependency. "5 whys" is useful but stop when you hit something actionable, going too far ("root cause: the universe has entropy") is as useless as stopping too early ("root cause: someone made a typo"). Action items fail when they're vague ("improve monitoring") or have no owner/deadline. Every action item should be specific enough that in 3 months you can check a box: did this happen, yes or no.

**Day 3, Practice**
Write a postmortem for a hypothetical incident in your example service, ideally one that would plausibly arise from a gap you identified in Module 5's runbook (e.g. "the alert this runbook describes fired, but the remediation step didn't work because X, here's what we're changing"). This ties the whole doc set together.

**Day 4, Review and course wrap-up**
Review your postmortem against the checklist below, then we'll do a final pass looking at all 6 docs together as a set: does the README link to the TDD, does the TDD reference the API doc and relevant ADRs, does the runbook reflect the failure modes discussed in the TDD's cross-cutting concerns, does the postmortem's action items point back to updates needed in the runbook/ADRs. This cross-referencing is what separates a doc SET from 6 disconnected documents, and it's the thing senior engineers do almost unconsciously and junior engineers usually don't do at all.

**Day 4 checklist**
- Are root causes distinguished from proximate cause?
- Does every action item have an owner and a target date?
- Do the action items connect back to gaps in your TDD/runbook from earlier modules?

---

## Logistics
Pick your example service now (real or synthetic) and we start Module 1 Day 1. Send me your Day 3 practice doc at the end of each module and I'll review it before we move to the Day 4 wrap-up and the next module.