# The dynamic hypothesis–evidence forest

English · [中文](CONCEPTS.zh-CN.md)

The system rests on one design decision, and everything else follows from it:
**a hypothesis is a global entity and belongs to no single project.**

The usual arrangement gives each project its own tree, and the trees never touch. So the
same hypothesis gets verified three times in three projects, and when one run overturns it,
the other two carry on regardless. Here every project's hypotheses live in one forest: the
trees are each project's own line of argument, and the hypotheses their nodes point at are
shared.

---

## 1. What the forest is made of

```
idea (project)        one tree — one line of argument
  └─ node             a position in that tree: k=1.2.1, parent, role
       └─ hyp         the hypothesis it points at — globally unique, pointed at by many trees
```

The relationship is: **a tree owns its nodes, a node references a hypothesis, and the
hypothesis belongs to no tree.**

The same hypothesis `H-02` can be:

| In which tree | Where it sits | How that tree uses it |
| --- | --- | --- |
| P-014 | mid-layer node, depth 2 | proven inside this project; supports its parent |
| P-016 | root premise | adopted as given, never decomposed — the whole argument starts here |
| P-017 | proven leaf | cited as a verified premise; no re-run needed |

The position is decided by **each tree's own argument**, not by the hypothesis. Everything
below is a consequence of that.

### Roles

Each node states how it intends to treat the hypothesis it points at:

- `own_to_prove` — this project will prove it, and will keep decomposing it into
  sub-hypotheses;
- `borrowed_assumption` — taken as given, not expanded further.

The same hypothesis can be `own_to_prove` in one tree and `borrowed_assumption` in another.

---

## 2. Evidence is a signed delta

When a run finishes it writes one piece of evidence onto the **hypothesis**, not onto a tree:

```json
{ "exp": "e_15", "idea": "P-014", "delta": 0.6, "note": "seven-tier fit, R²=0.98", "at": "..." }
```

- `delta` is signed. The sum is the hypothesis' **cumulative score**.
- `idea` records which project the run happened under — evidence has a provenance, but no owner.
- At **+1.0** the hypothesis reads as `self_verified`; at **−1.0**, or after three consecutive
  `PIVOT`s with no improvement, it is escalated to the verdict queue.

**One write, every citing project updated.** That is the direct payoff of sharing: the
baseline three projects have in common is re-measured once, and downstream nodes unfreeze on
all three sides.

### State is derived, never typed in

What you see on screen is **computed**:

```
a run is in progress        → testing
submitted for a verdict     → pending_review
cumulative ≥ +1.0           → self_verified
has evidence, below threshold → active
nothing at all              → untested
```

So "marked verified while the evidence is negative" cannot happen.

---

## 3. The frontier: what can be run right now

The frontier is the global set of hypotheses whose dependencies are ready. A hypothesis
enters it only when all of these hold:

1. every entry in its `depends_on` is `self_verified`;
2. nothing is running on it, and nothing is queued for it;
3. its node is not frozen by a verdict;
4. it is not already settled (self-verified and not flagged for a re-run drops out);
5. **it is a leaf in at least one tree** — a claim with children is settled by its children,
   not by an experiment of its own.

The frontier is ordered across all projects, with hypotheses serving several projects first.
That makes scheduling answer a concrete question: *given one free slot, which hypothesis buys
the most?*

---

## 4. A verdict: one failure, three different costs

When evidence contradicts itself, or three changes of method bring no improvement, the
executor **stops expanding that hypothesis** and hands it to a human. This is the only place
the system stops and waits.

The question a verdict answers is not "is it true" but "if it does not hold, what does each
project lose":

| Its position in that tree | Consequence | Scope |
| --- | --- | --- |
| root premise | every node returns to `untested`; written sections must be rewritten | **global** |
| mid-layer node | its downstream subtree freezes; queued runs are withdrawn | **branch** |
| leaf with independent positive evidence in that project | untouched | **local** |

Four possible rulings:

- `close` — it does not hold; freeze propagates per the table above;
- `return_active` — the evidence is not decisive; return it to the frontier with a new direction;
- `narrow_scope` — rewrite the claim to a narrower domain and reopen (positive evidence kept,
  out-of-scope negative evidence dropped);
- `downgrade` — demote it to a borrowed premise, marked unverified.

**A verdict writes only `verdicts/<hyp>.json`; node state is derived from it.** The reviewer
never edits the tree. The boundary is deliberate: who writes which file is fixed, so a
mistake can be traced to a person (or an agent).

---

## 5. Write boundaries for the three agents

| agent | writes only | never touches |
| --- | --- | --- |
| surveyor | `index.jsonl`, `sources/`, the cursor `state.json` | hypothesis trees, verdicts |
| executor | `events.jsonl`, `artifacts/`, experiment records | state in `tree.json`, verdicts |
| reviewer | `verdicts/` | tree structure, experiment artifacts |
| human | verdicts, queueing, approving a new project | — |

No party can both manufacture evidence and judge it.

---

## 6. The experiment tree: how a hypothesis actually gets tested

The hypothesis tree answers *what must be shown*; the experiment tree answers *how it was
tried*, in four stages:

```
probe  →  tune  →  main  →  ablation
```

- Nodes are typed **new / fix / improve**, and failed nodes are **kept**, so the same mistake
  is not repeated;
- only a node marked **representative** writes back to the hypothesis tree; the rest stay as
  a record and never become evidence;
- an entire batch × seed sweep matrix yields **exactly one piece of evidence** — the sentence
  "the trend holds, adjacent tiers are indistinguishable", not eighteen numbers.

---

## 7. Writing is another view of the evidence

Sections map from the hypothesis tree: when a node changes state, its section is flagged for
update.

- every claim must point back to its hypothesis and the run ids behind it;
- a scan flags words like *any*, *generally*, *always* and goes back to check the **scope**
  recorded in the evidence;
- while an overclaim remains, the button that packages the submission refuses and lists which
  sentences are at fault.

Gaps found while writing (a paragraph resting on a single run) go straight back into the run
queue, which closes the loop.

---

## 8. Where the human sits

The system does not decide three things:

1. **direction** — the source whitelist, the topics, whether a project starts;
2. **verdicts on hypotheses** — what to do when the evidence contradicts itself;
3. **when to submit** — when the writing is done.

Everything else — collecting, grading, inducing, queueing runs, pruning, retrying, plotting,
auditing claims — the system does on its own, writing every step into `events.jsonl`.

---

## Glossary

| Term | Meaning |
| --- | --- |
| idea / project | one hypothesis tree |
| hypothesis | a global entity, referenced by any number of trees |
| evidence | a signed delta written onto a hypothesis |
| verdict | a human ruling on a hypothesis, written to `verdicts/` |
| frontier | hypotheses whose dependencies are ready and that can be run now |
| borrowed assumption | a node role: adopted as given, not expanded |
| self_verified | cumulative evidence crossed the +1.0 threshold |
| representative node | the one experiment-tree result that writes evidence back |

The file formats and how to connect a real project: [DATA.md](DATA.md).
