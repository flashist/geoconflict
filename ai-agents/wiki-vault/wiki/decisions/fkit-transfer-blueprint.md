# fkit transfer blueprint — extracting the agent OS into a reusable kit

**Date**: 2026-07-03
**Status**: proposed

> Design approved 2026-07-03; the blueprint itself records "not yet built" as of writing. Parts have since shipped — see Consequences.
>
> Source: `ai-agents/knowledge-base/fkit-transfer-blueprint.md` (renamed from `ai-agents-kit-transfer-blueprint.md`), `ai-agents/ai-agents.yml`

## Context

Geoconflict already contained roughly 80% of a two-model agent operating system, split across two CLIs on disk: project instructions in two files, two config locations, skills in four places, and cross-model delegation wired ad hoc. **This is extraction, not creation.** The job is to cleave the generic machinery from the project content, single-source the shared parts, make model routing an editable file, and add a bootstrap/sync so a new project can instantiate the whole thing.

Four concrete gaps motivated it:

1. **Hardcoded identity in the machinery** — the owner's name and the project name were baked into skills and the wiki schema.
2. **Shared-skill drift** — the same review skill existed on both model sides and the second copy was **42 lines behind**, missing the entire review-ledger system, the severity discipline, and the defect-vs-frontier-move classification. Accidental drift from two hand-maintained copies.
3. **Routing was implicit and global, not project-level** — wiki work already went to one model, but that lived in a user-global directory visible to *every* project, and "which model owns what" was tribal knowledge.
4. **An in-flight rename** — four commands still referenced the old vault name while other files used the new one.

## Decision

Four decisions were approved on 2026-07-03:

1. **Distribution** — a template repo plus a bootstrap script, with a `sync` script to re-pull generic updates. Plugins are a later north-star.
2. **Shared skills** — a single canonical source **compiled** into per-model variants, which is what permanently kills the drift.
3. **Model routing** — a declarative manifest, `ai-agents/ai-agents.yml`, that skills consult and from which derived config is generated.
4. **First deliverable** — the blueprint and migration plan, before any files change.

### The generic / project seam

**Generic (transfers anywhere):** the `ai-agents/` skeleton; the review engine; the task lifecycle skills; the wiki engine — the four wiki skills plus the wiki schema *skeleton* (page templates); the role-agent template; and the dual two-CLI pattern itself.

**Project-specific (authored per project):** the project overview, architecture, and critical-files content; the producer's domain knowledge; the wiki schema's **Domain Reference** section; the announcements skill; everything under `knowledge-base/`, `sprints/`, `tasks/`, `reviews/`, and `wiki-vault/wiki/`; and the model choices and routing.

### The manifest

One file answers every part of the ask. It carries the project identity (name, slug, owner, wiki path), the model ids in **one** place so versions are bumped once, the **roles** (the terminal-tab agents), and the **routing** table mapping task type → owning model. The two-CLI config is *generated from* the manifest rather than hand-maintained, so there is no double entry.

Routing as recorded in the manifest: **wiki → Codex; planning → Claude; review → both; routine-fix → Codex; complex-feature → Claude; default → Claude.** Roles: producer → Claude, coder → Claude, reviewer → both.

### Compile and the two namespaces

Each generic skill has **one** source body; a compile step substitutes placeholders from the manifest and emits per-model files, writing an **origin header** into every generated file:

- `origin: kit` — generated; `sync` overwrites it; **never hand-edit in-project**.
- `origin: project` — hand-authored in this repo; `sync` never touches it.

The producer skill becomes the first instance of a reusable **role-agent** scaffold, so adding another role is fill-in-the-blanks rather than a rewrite.

## Consequences

- **The vault rename shipped.** The wiki now lives at `ai-agents/wiki-vault/`, and the commit that carried it rewrote the old `karpathy-vault/` references across the knowledge base and task files — a path-only change with no new synthesized knowledge.
- **The manifest exists in-repo** and its routing table is mirrored into the project instructions, which state that a task type owned by another model is handed to that model's tab.
- **The role set has since grown well beyond the blueprint's sketch** — seven live fkit roles with a defined owner vocabulary and a hook-enforced task-lifecycle gate. See [[systems/agent-conventions]].
- **The wiki role became the exclusive write gateway** for `ai-agents/wiki-vault/`; reads are decentralized, writes are not.
- ⚠️ **Status is unresolved in this vault.** The blueprint is recorded as `proposed`, and the wiki has no source confirming which remaining pieces (bootstrap, sync, compile step, role-agent template) were actually built. Treat the built/unbuilt split above as *what the sources show*, not as a completeness claim.
- ⚠️ **The manifest pins a model id that the architecture survey flagged as likely stale config** — it was not verified against any current model list.

## Related

- [[systems/agent-conventions]] — the standing rules the toolkit ships with
- [[systems/producer-workflow]] — the role skill the blueprint generalizes into a template
- [[systems/project-operations]] — the operational handbook and role definitions
- [[decisions/sprint-backlog]] — where unsprinted toolkit-migration work is tracked
