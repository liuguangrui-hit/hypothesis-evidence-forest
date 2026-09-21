# Connecting a real project

The workbench runs in one of two modes.

```bash
npm start                                   # demo: a private simulated workspace per visitor
AIS_SOURCE=project AIS_PROJECT_DIR=/path/to/project npm start   # a live project directory
AIS_SOURCE=project AIS_PROJECT_DIR=/path AIS_READONLY=1 npm start  # look, do not write
```

In project mode every screen reads the directory, all visitors see the same
workspace, and the files are re-read whenever their mtimes change — no restart.
`GET /api/source` reports the mode, the resolved root, whether it is writable,
and every problem found while reading.

Try it against the sample that ships with the repo:

```bash
AIS_SOURCE=project AIS_PROJECT_DIR=fixtures/project-sample npm start
```

## Who writes what

The workbench is a decision surface, not a second writer. It only ever produces
three things, and each one is an append or a new file:

| The human does | The workbench writes |
| --- | --- |
| rules on a hypothesis | `verdicts/<hyp>.json` |
| queues a run | one line in `queue.jsonl` |
| anything at all | one line in `events.jsonl` with `"module": "human"` |

Everything else — `tree.json`, `index.jsonl`, `experiments.jsonl`, `artifacts/`
— belongs to the agents. Actions that would edit them are refused with a message
saying so, and the simulated clock is off: a run finishes when the executor says
it finished, not when a browser has been open long enough.

## Files read

All are optional. A missing file leaves that part of the interface empty rather
than breaking it; a malformed row is skipped and reported.

### `tree.json` — ideas, hypotheses, and the trees that connect them

```json
{
  "settings": { "parallel": 3, "budget": 120, "gpus": 4 },
  "agents": { "surveyor": "deepseek", "executor": "codex", "reviewer": "claude" },
  "ideas": [{ "id": "P-001", "name": "Geometric correction", "status": "running" }],
  "hypotheses": [{
    "id": "H-1",
    "claim": "Gradient noise can be characterised by a scale parameter",
    "status": "self_verified",
    "depends": ["H-0"],
    "pivots": 0,
    "evidence": [{ "exp": "x_01", "idea": "P-001", "delta": 1.2, "note": "stable across three batch sizes", "at": "2026-09-18T09:00:00Z" }]
  }],
  "trees": {
    "P-001": [{ "k": "1", "hyp": "H-1", "parent": null, "role": "own_to_prove" }]
  },
  "cross_deps": [["H-4", "H-1"]]
}
```

- `status` — idea: `running` · `candidate` · `done` · `parked`; hypothesis:
  `untested` · `active` · `self_verified` · `pending_review` · `closed` ·
  `inductive_unverified` · `lit_supported`. Anything else is reported and
  treated as the default.
- `role` — `own_to_prove` or `borrowed_assumption`.
- A hypothesis listed in several trees **is** the shared hypothesis: its
  evidence accumulates across ideas and its role in each tree is read from that
  tree. This is the one thing the interface is built around.
- `evidence[].delta` is signed. The sum is the hypothesis' score; ≥ 1.0 reads as
  self-verified, and ≤ −1.0 or three consecutive PIVOTs puts it in the verdict queue.

### `experiments.jsonl` — one run per line

```json
{"id":"x_03","hyp":"H-2","idea":"P-002","status":"running","started_at":"2026-09-21T08:00:00Z",
 "duration_h":6,"progress":0.4,"cost":95,"gpu":0,
 "cfg":{"model":"ResNet-50 / CIFAR-100","batch":"32-512","seed":"0,1,2","opt":"SGD","steps":"40k","measure":"noise scale"},
 "outcome":{"delta":1.2,"rec":"PROCEED","conf":0.8},"label":"noise scale sweep"}
```

`status` is `queued` · `running` · `done` · `failed` · `paused` · `withdrawn`.
Finished and failed runs also populate the occupancy timeline and the spend
breakdown on the compute screen.

### `events.jsonl` — the activity stream

```json
{"t":"2026-09-19T10:05:00Z","module":"executor","kind":"experiment","title":"x_02 done · H-2 evidence −0.8","detail":"trend did not reproduce","hyp":"H-2","exp":"x_02"}
```

`kind` is free text; `collect` · `experiment` · `hypothesis` · `verdict` ·
`idea` · `paper` get their own filter on the events screen.

### `verdicts/<hyp>.json` — rulings

```json
{"hyp":"H-2","verdict":"narrow_scope","scope":"narrowed","affected_ideas":["P-001","P-002"],
 "next_action":"reopen","reviewer":"claude","at":"2026-09-21T11:31:42.859Z"}
```

`verdict` is `close` · `return_active` · `narrow_scope` · `downgrade`. This is
the file the workbench writes when you rule on something.

### `index.jsonl` — the literature

```json
{"id":"arxiv-2601-00001","title":"…","authors":"A. Author, B. Author","venue":"NeurIPS","year":2019,
 "level":2,"tracks":["optimisation"],"keywords":["noise scale"],"fetched_at":"2026-09-14",
 "include_reason":"source of H-1",
 "digest":{"problem":"…","threat":"…","method":"…","eval":"…","conclusion":"…","limits":"…"}}
```

`level` 1 = record + abstract, 2 = full text + digest, 3 = plus translations.
The digest fields are the fixed set the paper-detail screen shows.

### `venues.yaml` and `topics.md`

```yaml
- id: NEURIPS
  name: NeurIPS
  type: conf          # conf | journal | preprint
  level: CCF-A
  scan: core          # core = enumerate everything, watch = keyword-gated
  entry: papers.nips.cc
  cursor: "2025"
  added: 14
  status: ok          # ok | broken | parked
```

`topics.md` contributes its headings as track names.

### `paper/manuscript.json` and `paper/claims.json` — optional

```json
{ "idea": "P-001", "title": "P-001 Geometric correction",
  "sections": [{ "k": "4.2", "title": "Effective step versus batch size", "hyps": ["H-2"],
                 "status": "missing", "paras": ["…"] }] }
```

```json
[{ "id": "c2", "sec": "2", "text": "The correction works for any optimiser", "hyp": "H-3",
   "ev": [], "status": "overclaim", "why": "only tested on SGD", "soften": "The correction works on SGD." }]
```

## Languages

Every user-visible string may be a plain string or a `{ "zh": …, "en": … }`
pair. A plain string shows on both sides of the language switch — that is the
honest default for a project written in one language. When someone edits text in
the interface, only the language they are typing in is changed; the other side is
left alone.

## Timestamps

`at` / `t` / `started_at` accept an ISO-8601 string, epoch milliseconds or epoch
seconds. Anything unparseable is reported as a problem.

## Checking a directory before you point the site at it

```bash
node tools/check-project.js /path/to/project
```

It prints what was found, every problem, and exits non-zero if nothing loaded.
