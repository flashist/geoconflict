# AI-Agents Kit — Transfer Blueprint

**Status:** proposed (design approved, not yet built)
**Date:** 2026-07-03
**Author:** Claude (design), Mark (decisions)
**Purpose:** Make the geoconflict "AI operating system" (the `ai-agents/` structure + the Claude/Codex skills, configs, and roles around it) **transferable** to any project, with a clean split between the generic machinery and the per-project content — and with **project-level, editable model routing** (e.g. "wiki tasks → Codex").

---

## 1. Context — this is extraction, not creation

Geoconflict already contains ~80% of a two-model agent OS, split across both CLIs on disk:

| Concern | Claude side | Codex side |
|---|---|---|
| Project instructions | `CLAUDE.md` | `AGENTS.md` |
| Config / model | `.claude/settings.local.json` | `.codex/config.toml` → `model = "gpt-5.5"` |
| Skills | `.claude/skills/` (producer, stateful-review, process-review, task-done, task-cancelled, update-announcements) + `.claude/commands/` (wiki-*, plan-task) | `.codex/skills/` (plan-task, process-review) + **`~/.codex/skills/` (wiki-ingest/query/lint/sync)** |
| Cross-model delegation | Claude → Codex via the companion (`stateful-review`), `codex:rescue` plugin | — |

The job is to **cleave the generic machinery from the project content**, single-source the shared parts, make routing an editable file, and add a bootstrap/sync so a new project can instantiate the whole thing.

### Approved decisions (2026-07-03)
1. **Distribution:** template repo + bootstrap script (a `sync` script re-pulls generic updates). Plugins are a later north-star.
2. **Shared skills:** single canonical source → **compile** to `.claude` and `.codex` variants (kills the drift below).
3. **Model routing:** a declarative **manifest** (`ai-agents/ai-agents.yml`) that skills consult and that generates the derived config.
4. **First deliverable:** this blueprint + migration plan, before any files change.

---

## 2. The generic / project seam

**Generic (the machinery — transfers to any project):**
- The `ai-agents/` skeleton: `sprints/` (+`done/`), `tasks/{backlog,done,cancelled}/`, `reviews/`, `knowledge-base/`, `wiki-vault/`.
- **Review engine** — `reviews/README.md` ledger schema + `process-review` + `stateful-review`. Nearly pure process; only the `ai-agents/reviews/` path is a convention.
- **Task lifecycle** — `task-done`, `task-cancelled`, `plan-task`.
- **Wiki engine** — the four wiki skills + the wiki schema *skeleton* (page templates).
- **Role-agent template** — the *skeleton* of `producer` (role framing → init/context-load → behavioral rules → output format).
- The dual `CLAUDE.md`+`AGENTS.md` / `.claude`+`.codex` pattern itself.

**Project-specific (authored per project):**
- `CLAUDE.md`/`AGENTS.md` overview + architecture + critical-files.
- Producer's *content* (domain knowledge, sprint refs, owner name, deploy-timing rules).
- The wiki schema's "Domain Reference" section.
- `update-announcements` (fully specific: `announcements.json`, en/ru).
- All content under `knowledge-base/`, `sprints/`, `tasks/`, `reviews/`, `wiki-vault/wiki/`.
- The model choices and the task→model routing.

---

## 3. Gaps this design closes

1. **Hardcoded identity in the machinery.** "Mark" is baked into `producer`, `task-done`, `task-cancelled`, `update-announcements`; "Geoconflict"/domain into `producer` + the wiki schema. → replaced by `{{owner}}` / `{{project_name}}` placeholders filled from the manifest.
2. **Shared-skill drift.** `process-review` exists on both sides and the **Codex copy is 42 lines behind** (89 vs 131 lines) — it's missing the *entire* review-ledger system, the severity-assignment discipline, and the defect-vs-frontier-move classification. This is accidental drift from having two hand-maintained copies. → single source + compile propagates every future improvement to both sides.
3. **Routing is implicit and global, not project-level.** wiki→Codex works, but lives in `~/.codex/skills/` (visible to *every* Codex project), and "which model owns what" is prose/tribal knowledge. → an in-repo `ai-agents.yml` routing block, editable per project.
4. **In-flight rename.** Four Claude commands still reference `karpathy-vault/` while `CLAUDE.md`/`AGENTS.md`/`wiki-ingest` use `ai-agents/wiki-vault/`. The kit ships the wiki skills with the generic `wiki-vault` name only.

---

## 4. Target architecture

### 4.1 The kit repo (source of truth)

Working name **`fkit`** (rename freely). A standalone git repo:

```
fkit/
├── README.md                       # what this is; how to bootstrap/sync
├── VERSION                         # semver; bootstrap stamps it into each project
├── manifest/
│   └── ai-agents.schema.yml        # documented schema for a project's ai-agents.yml
├── generic/
│   ├── ai-agents/                  # the empty skeleton + generic docs
│   │   ├── README.md
│   │   ├── sprints/{,done/}.gitkeep
│   │   ├── tasks/{backlog,done,cancelled}/.gitkeep
│   │   ├── reviews/README.md               # ledger schema (generic)
│   │   ├── knowledge-base/.gitkeep
│   │   └── wiki-vault/
│   │       ├── schema.core.md              # generic wiki page templates
│   │       ├── index.md · log.md           # seeds
│   │       └── wiki/{features,systems,decisions,tasks}/.gitkeep
│   ├── skills/                     # model-agnostic skill SOURCES (single source of truth)
│   │   ├── shared/                 #   → compiled to BOTH .claude and .codex
│   │   │   ├── process-review/{skill.md, meta.yml}
│   │   │   ├── plan-task/{skill.md, meta.yml}
│   │   │   ├── task-done/{skill.md, meta.yml}
│   │   │   ├── task-cancelled/{skill.md, meta.yml}
│   │   │   └── stateful-review/{skill.md, meta.yml}
│   │   ├── claude-only/            #   → compiled to .claude only
│   │   └── codex-only/             #   → compiled to .codex only
│   │       └── wiki-{ingest,query,lint,sync}/{skill.md, meta.yml}
│   └── templates/                  # files with {{placeholders}}
│       ├── CLAUDE.md.tmpl · AGENTS.md.tmpl
│       ├── ai-agents.yml.tmpl              # the project manifest, pre-placeholdered
│       ├── role-agent.skill.md.tmpl        # generalized producer skeleton → any role
│       ├── codex.config.toml.tmpl
│       └── wiki-schema.domain.md.tmpl      # the project-specific Domain Reference section
├── bin/
│   ├── compile-skills.mjs          # single-source + manifest → .claude/.codex variants
│   ├── bootstrap.mjs               # instantiate the kit into a NEW project (interactive)
│   └── sync.mjs                    # re-pull generic updates into an EXISTING project
└── examples/
    └── geoconflict.ai-agents.yml   # a filled manifest, as a worked example
```

**Why Node (`.mjs`) for tooling:** templating + YAML is far cleaner in JS than shell, and it matches the Codex companion's own `.mjs` tooling the user already runs. Requires Node (already present).

### 4.2 The project manifest — `ai-agents/ai-agents.yml`

The heart of "changeable project-level routing." One file; edit it, run `sync`, everything derived updates.

```yaml
kit_version: 0.1.0                  # stamped by bootstrap; sync checks compatibility

project:
  name: Geoconflict
  slug: geoconflict
  owner: Mark                       # replaces hardcoded "Mark" in task/producer skills
  primary_language: TypeScript
  wiki_path: ai-agents/wiki-vault
  overview: >
    OpenFront-style real-time strategy browser game...   # long form stays in CLAUDE/AGENTS

models:                             # concrete ids live here → one place to bump versions
  claude: { cli: claude, id: claude-opus-4-8 }
  codex:  { cli: codex,  id: gpt-5.5 }

roles:                              # your terminal-tab "agents"
  producer:
    model: claude
    entry_skill: producer
    knowledge: ai-agents/knowledge-base/geoconflict-producer-knowledge-base.md
  coder:    { model: claude }       # complex work → Claude
  reviewer: { model: both, entry_skill: stateful-review }

routing:                            # task-type → owning model (edit this to re-route)
  wiki:            codex             # ← dedicate all wiki tasks to Codex
  planning:        claude
  review:          both
  routine-fix:     codex
  complex-feature: claude
  default:         claude

skills:                             # placement (usually derived from kit dirs; override here)
  shared:      [process-review, plan-task, task-done, task-cancelled, stateful-review]
  claude_only: [producer, update-announcements]
  codex_only:  [wiki-ingest, wiki-query, wiki-lint, wiki-sync]
```

This single file answers every part of the ask:
- **"dedicate wiki to Codex"** → `routing.wiki: codex` + wiki skills in `skills.codex_only`.
- **"changeable, project-level"** → edit the block + `sync`.
- **"agents = tabs / roles"** → the `roles` block.
- **de-hardcoding** → `project.owner`, `project.name` feed the compile step.
- **`.codex/config.toml` model** is *generated from* `models.codex.id` — manifest is the source, config is derived (no double-entry).

### 4.3 Single-source skills → compile

Each generic skill has **one** source body. `compile-skills.mjs`:
1. reads `generic/skills/**/skill.md` + its `meta.yml`,
2. substitutes `{{placeholders}}` from the project manifest,
3. emits the per-model file(s):
   - Claude → `.claude/skills/<name>/SKILL.md` (frontmatter: `name`, `description`, `user-invocable`).
   - Codex → `.codex/skills/<name>/SKILL.md` + `agents/openai.yaml` (interface: `display_name`, `short_description`, `default_prompt` — from `meta.yml`).
4. writes an **origin header** into every generated file:

```
---
name: process-review
origin: kit@0.1.0          # GENERATED — edit the source in fkit, then run sync. Do not hand-edit.
---
```

**Two namespaces, one rule:**
- `origin: kit` — generated; `sync` overwrites it; never hand-edit in-project.
- `origin: project` — hand-authored in this repo (e.g. a role agent, `update-announcements`); `sync` never touches it.

This is what permanently kills the drift: the canonical `process-review` body lives once; every project regenerates from it.

### 4.4 The role-agent template (generalizing `producer`)

`producer` becomes the first instance of a reusable **role-agent** scaffold, so "something similar for other agents" is a fill-in-the-blanks operation, not a rewrite. `role-agent.skill.md.tmpl` keeps producer's proven skeleton:

```
---
name: {{role}}
description: Enter {{role}} mode — the {{project_name}} {{role}} agent for {{role_scope}}. {{role_negative}}
user-invocable: true
origin: project            # instance is project-owned; sync won't overwrite your content
---

# {{role_title}} Mode
You are now the {{project_name}} {{role}} agent. Hold this role for the whole session...

## Role
{{role_definition}}

## Initialization — do this now, in order
{{role_init_sequence}}          # e.g. wiki-query role context → load current sprint → briefing

## Behavioral rules
{{role_rules}}

## What you must not do
{{role_prohibitions}}

## Output format
{{role_output_format}}
```

Bootstrap substitutes the easy fields (`project_name`, `owner`) and scaffolds the file as `origin: project`; you author the role-specific behavioral content by hand (role prose is inherently project-specific). Adding a "qa" or "reviewer-lead" agent later = copy the template, fill it.

### 4.5 Generated regions in CLAUDE.md / AGENTS.md

These files are **part hand-written** (architecture, critical files) and **part generated** (the routing cheat-sheet, the wiki-skill table). Generation happens **only between fenced markers**, so `sync` refreshes the routing block without clobbering your prose:

```markdown
<!-- kit:routing:start -->
### Model routing (generated from ai-agents/ai-agents.yml)
| Task type | Owner | How |
|---|---|---|
| wiki | **Codex** | open a Codex tab / delegate via companion |
| planning, complex feature | **Claude** | this tab |
| review | **both** | `stateful-review` |
<!-- kit:routing:end -->
```

A standalone `ai-agents/ROUTING.md` is also generated as the human tab cheat-sheet.

### 4.6 How routing is actually enforced (the honest mechanics)

Neither Claude Code nor Codex hot-swaps the **top-level** model per task mid-session, so routing is a **human + delegation contract**, enforced three ways — all fed by the one manifest:

1. **Human tab selection.** The generated routing block (in CLAUDE.md, AGENTS.md, `ROUTING.md`) means whichever tab you're in, the agent can tell you "wiki work is routed to Codex — open a Codex tab," and you always know which tab. Passive but always correct.
2. **Delegating skills (optional, v1.1).** Skills that *can* hand off (wiki, review) get a generated preamble: "this task type is routed to `{{model}}`; if you are not that model, delegate via the companion rather than doing it inline." Reuses the exact companion mechanism `stateful-review` already uses. This is the active safety net; deferrable past v1.
3. **Codex project model.** `.codex/config.toml`'s model is generated from `models.codex.id`, so a Codex tab in the project automatically runs the routed model.

---

## 5. Tooling behavior

**`compile-skills.mjs`** (the core — build it first). Pure function: (manifest + kit skill sources) → per-model skill files with origin headers. No network, no commits, idempotent.

**`bootstrap.mjs`** (new project). Run from inside a fresh git repo:
1. Refuse if `ai-agents/` already exists (unless `--force`).
2. Collect answers interactively or from `--config answers.yml`: name, slug, owner, language, one-line overview, models (claude/codex/both), initial routing, roles to scaffold.
3. Write `ai-agents/ai-agents.yml`; copy the `generic/ai-agents/` skeleton.
4. Run `compile-skills.mjs` → emit `.claude` / `.codex` skills.
5. Generate `CLAUDE.md`, `AGENTS.md` (with the routing block), `.codex/config.toml`.
6. Scaffold requested role skills from the template (`origin: project`).
7. Stamp `kit_version`; print a "next steps" checklist (fill role content, write the overview).
8. **No commits** (respects the standing commit-authorization rule).

**`sync.mjs`** (existing project). Run from a project:
1. Read the project's `ai-agents.yml` + `kit_version`; warn on schema incompatibility.
2. Recompile all `origin: kit` skills → overwrite. **Never touches `origin: project`.**
3. Regenerate only the fenced regions of `CLAUDE.md`/`AGENTS.md`, and the `.codex/config.toml` model line.
4. Print a diff report. **No commits.**

---

## 6. Migration plan

Geoconflict is the *origin* of the kit, so the sequence is: extract the kit **from** geoconflict → re-apply it **to** geoconflict (dogfood) → use it for the new project.

- **Phase 0 — Decisions.** ✅ this blueprint.
- **Phase 1 — Stand up `fkit`.** New repo. Build `compile-skills.mjs` first. Move generic skill bodies in as single-source `skill.md`. Author templates + the manifest schema. Sub-steps:
  - **Reconcile drift:** adopt the Claude 131-line `process-review` as canonical; discard the stale Codex copy (it'll be regenerated).
  - **De-hardcode:** `Mark`→`{{owner}}`, `Geoconflict`→`{{project_name}}`, domain refs → moved to the project layer, across generic bodies.
  - **Finish the rename:** wiki skill sources use `wiki-vault` only (no `karpathy-vault`).
- **Phase 2 — Author geoconflict's manifest** (`examples/geoconflict.ai-agents.yml` + the in-repo copy), capturing today's reality (producer=claude, wiki=codex, ids, owner).
- **Phase 3 — Dogfood: `sync` the kit back into geoconflict.** Diff the regenerated skills against current behavior. Intended changes only: Codex `process-review` gains the ledger system; hardcoded names become owner-driven. Everything else should be a no-op. This validates the kit reproduces the working setup.
- **Phase 4 — Bootstrap the new project.** `bootstrap.mjs` in the new repo; fill its manifest; write its overview + role content; set routing.
- **Phase 5 — Ongoing.** Improve a skill once in the kit → `sync` everywhere. Add a role → fill the template. Re-route → edit manifest + `sync`.

---

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Confusing generated vs hand-edited files | `origin:` headers + fenced regions + a "do not hand-edit" header on generated files. |
| Codex skill discovery changes when wiki moves global→project | The user already runs `plan-task`/`process-review` from `.codex/skills/`, so project-local discovery works. **Decision needed:** remove the global `~/.codex/skills/wiki-*` (true project-level routing) vs keep them as a fallback. |
| Model ids go stale (`claude-opus-4-8`, `gpt-5.5`) | Centralized in `models:`; one-line bump. Note Codex auto-migrates ids (config shows `gpt-5.1→5.2→5.3` chain) — pin the id the project actually uses. |
| Secrets leaking into templates | Manifest holds only non-secret identity/routing; templates never bake DSNs/creds (producer rule). |
| Sync clobbering hand edits | Sync only rewrites `origin: kit` files + fenced regions; `origin: project` is untouchable. |
| Over-engineering v1 | Defer the active delegation stub (§4.6.2) to v1.1; v1 = manifest + generated cheat-sheet + generated config. |

---

## 8. Open decisions (small — not blockers)

1. **Kit name** — `fkit` (working) vs `agent-os` / `crew` / other.
2. **Kit ↔ project linkage** — plain copy + `sync` (what "template + bootstrap" implies) vs `git subtree`/submodule for tighter tracking. Recommend plain copy for v1.
3. **Wiki globals** — remove `~/.codex/skills/wiki-*` for true project-level routing, or keep as fallback (see §7).
4. **v1 scope of enforcement** — cheat-sheet only (recommended v1) vs include the active delegation stub now.

---

## 9. Appendix — worked geoconflict manifest

See the `models:` / `roles:` / `routing:` / `skills:` example in §4.2 — that block *is* geoconflict's manifest, capturing the current setup (producer=Claude, wiki=Codex, review=both, ids `claude-opus-4-8` / `gpt-5.5`, owner Mark). It becomes `examples/geoconflict.ai-agents.yml` in the kit and `ai-agents/ai-agents.yml` in this repo.
