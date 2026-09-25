# How to use JEV

JEV is TypeSafe's System One model. It returns **typed judgments** (noul / choice / score) with probabilities — not generated text. In this repo:

- **Agents/dev use JEV through the wrapper only:** `node scripts/jev/jev.mjs`
- **Project code must NEVER call JEV.** No runtime feature in `apps/`, `packages/`, or `scripts/job-*` talks to TypeSafe. JEV is a *decision tool while building*, not a dependency.
- **The key is invisible.** It lives in `.env` at the repo root as `typesafe_api=...` (gitignored). The wrapper reads it and never prints, logs, or returns it. Do not `cat .env`, do not echo the key, do not pass it on a command line.

Design guidance (which primitive, how to word questions, when to trust confidence) comes from the installed skill: `.agents/skills/typesafe-ai/SKILL.md`, which points at the live docs: https://docs.typesafe.ai/llms.txt

## Quick start

```bash
# smoke test (key picked up from .env automatically)
node scripts/jev/jev.mjs --demo
```

## The three question types

| Need | `type` | Criteria shape |
|---|---|---|
| Yes / no | `noul` | optional `{ "true": "...", "false": "..." }` |
| Pick one of a set | `choice` | required map `{ option: rubric }` |
| Grade along levels | `score` | required array, ordered `["low", ..., "high"]` |

## Sending questions

Payload shape: `{ "state": ..., "questions": { "<id>": { "type", "instructions", "criteria"? } } }`.
`state` is what JEV judges (string, or object/array with named fields). Question ids are yours — the model never sees them.

**From a file:**

```bash
node scripts/jev/jev.mjs --file my-judgment.json
```

**Inline:**

```bash
node scripts/jev/jev.mjs --body '{"state":"Talent Acquisition Lead, Bengaluru, 2 years exp, apply by Friday","questions":{"seniority":{"type":"noul","instructions":"Does this job require prior full-time work experience?"}}}'
```

**From stdin:**

```bash
echo '{"state":"...","questions":{...}}' | node scripts/jev/jev.mjs
```

## Example: choice + score together

```json
{
  "state": {
    "role": "Senior Backend Engineer",
    "jd": "Own the payments platform. 5+ years. Go, Postgres, Kafka.",
    "candidate": "Fresher, Node.js + React, 2 internship projects"
  },
  "questions": {
    "realistic": {
      "type": "choice",
      "instructions": "How realistic is it that this candidate should apply?",
      "criteria": {
        "apply": "Skills substantially overlap the core requirements",
        "stretch": "Meets some fundamentals but key seniority/skills missing",
        "skip": "Requirements and candidate barely overlap"
      }
    },
    "signal": {
      "type": "score",
      "instructions": "Rate how strong the job ad is as a signal of a real vacancy",
      "criteria": ["Vague or recycled", "Specific but generic", "Concrete team, stack, deadline"]
    }
  }
}
```

## Reading the answer

```json
{
  "model": "jev-1.13.0",
  "answers": {
    "realistic": { "type": "choice", "choice": "skip",
      "probabilities": { "apply": 0.02, "stretch": 0.21, "skip": 0.77 }, "confidence": 0.62 },
    "signal": { "type": "score", "score": 1.4, "probabilities": { "0": 0.1, "1": 0.7, "2": 0.2 }, "confidence": 0.55 }
  },
  "usage": { "input_tokens": 420, "output_tokens": 75 }
}
```

- `noul` → probability of yes, 0..1 (0.5 = coin flip).
- `choice` → winning option + full distribution; `confidence` = how concentrated.
- `score` → probability-weighted position across your levels; can sit between levels.
- **Confidence is about the distribution, not about being right.** Thresholds must be judged on real cases. Typed output guarantees the interface, not the truth.

## Rules

1. Key never leaves `.env`/process env. Never commit it, never print it, never put it in URLs or logs.
2. JEV answers **judgments only** — no code generation, no long reasoning. Code does the work; JEV supplies semantic understanding.
3. Keep known rules, calculations, exact lookups, and execution in code. Ask JEV only what plain code cannot know (intent, relevance, semantic match).
4. Ask narrow questions — one judgment per id; independent questions in the *same* request (they run in parallel).
5. Server-side / agent-side only. No `NEXT_PUBLIC_`, no client bundle, no mobile app calls.
6. Errors: wrapper retries 429/529 with backoff; other statuses print `HTTP <code> + detail` with no key material.

## Where JEV is worth using (decisions while building)

- Ranking/`For You` relevance judgment wording and match explanations
- Duplicate-opportunity detection rubric (admin `DuplicateCheck`)
- Moderation severity triage rubric (reports queue)
- SEO thin-content / title-quality judgment calls
- Choosing between two designs when the docs/audits don't settle it
